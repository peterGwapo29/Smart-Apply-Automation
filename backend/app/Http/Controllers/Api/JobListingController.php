<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportJobRequest;
use App\Http\Requests\UpdateJobListingRequest;
use App\Models\CandidatePreference;
use App\Models\JobListing;
use App\Models\JobListingHistory;
use App\Models\JobMatch;
use App\Models\JobUserWorkflow;
use App\Models\User;
use App\Services\JobExtraction\JobExtractionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobListingController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * Enrich a JobListing model with computed workflow & staleness flags.
     *
     * @param JobListing $job
     * @param \DateTimeInterface|null $profileUpdatedAt
     * @return array<string, mixed>
     */
    protected function enrichJob(JobListing $job, ?\DateTimeInterface $profileUpdatedAt = null): array
    {
        $data = $job->toArray();
        $latestMatch = $job->latestMatch;
        $workflow = $job->workflow;

        $isMatchStale = false;
        if ($latestMatch && $latestMatch->calculated_at) {
            $calcAt = $latestMatch->calculated_at;
            if ($job->updated_at && $calcAt->lt($job->updated_at)) {
                $isMatchStale = true;
            } elseif ($profileUpdatedAt && $calcAt->lt($profileUpdatedAt)) {
                $isMatchStale = true;
            }
        }

        $listingChanged = false;
        if ($workflow && !empty($workflow->last_reviewed_content_hash)) {
            $listingChanged = ($workflow->last_reviewed_content_hash !== $job->content_hash);
        }

        $application = $job->application;

        $data['is_match_stale'] = $isMatchStale;
        $data['listing_changed_since_review'] = $listingChanged;
        $data['effective_review_status'] = $workflow?->review_status ?? $job->review_status ?? 'new';
        $data['is_bookmarked'] = (bool) ($workflow?->is_bookmarked ?? false);
        $data['workflow'] = $workflow ? $workflow->toArray() : null;
        $data['application'] = $application ? [
            'id' => $application->id,
            'status' => $application->status,
            'attempt_count' => $application->attempt_count,
            'max_retries' => $application->max_retries,
            'next_retry_at' => $application->next_retry_at,
            'last_error_code' => $application->last_error_code,
            'last_error_message' => $application->last_error_message,
            'ready_at' => $application->ready_at,
            'submitted_at' => $application->submitted_at,
        ] : null;

        return $data;
    }

    /**
     * Import or re-observe a job listing with deduplication.
     */
    public function import(ImportJobRequest $request, JobExtractionService $service): JsonResponse
    {
        $user = $this->resolveUser($request);

        $result = $service->ingest($user, $request->validated());

        return response()->json([
            'status' => 'success',
            'is_duplicate' => $result['is_duplicate'],
            'message' => $result['is_duplicate']
                ? 'Job listing was previously recorded. Observation timestamp and changes updated.'
                : 'Job listing successfully imported.',
            'job' => $result['job'],
        ], $result['is_duplicate'] ? 200 : 201);
    }

    /**
     * Get KPI summary counts for the job dashboard.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = $user->candidateProfile;
        $preference = $profile ? CandidatePreference::where('candidate_profile_id', $profile->id)->first() : null;
        $minMatchThreshold = (float) ($preference?->min_match_threshold ?? 70.00);

        $baseQuery = JobListing::where('job_listings.user_id', $user->id)
            ->leftJoin('job_user_workflows', function ($join) use ($user) {
                $join->on('job_listings.id', '=', 'job_user_workflows.job_listing_id')
                    ->where('job_user_workflows.user_id', '=', $user->id);
            })
            ->leftJoinSub(
                JobMatch::select('jm1.*')
                    ->from('job_matches as jm1')
                    ->joinSub(
                        JobMatch::selectRaw('job_listing_id, MAX(id) as max_id')->groupBy('job_listing_id'),
                        'jm2',
                        'jm1.id',
                        '=',
                        'jm2.max_id'
                    ),
                'latest_matches',
                'latest_matches.job_listing_id',
                '=',
                'job_listings.id'
            );

        $total = (clone $baseQuery)->count('job_listings.id');

        $new = (clone $baseQuery)
            ->where(function ($q) {
                $q->whereNull('job_user_workflows.review_status')
                    ->orWhere('job_user_workflows.review_status', 'new');
            })
            ->count('job_listings.id');

        $strongMatches = (clone $baseQuery)
            ->where('latest_matches.overall_score', '>=', $minMatchThreshold)
            ->count('job_listings.id');

        $reviewRequired = (clone $baseQuery)
            ->where(function ($q) {
                $q->where('job_user_workflows.review_status', 'review_required')
                    ->orWhere('latest_matches.eligibility_status', 'requires_review')
                    ->orWhere('job_listings.quick_apply_status', 'requires_review');
            })
            ->count('job_listings.id');

        $bookmarked = (clone $baseQuery)
            ->where('job_user_workflows.is_bookmarked', true)
            ->count('job_listings.id');

        $reviewed = (clone $baseQuery)
            ->whereIn('job_user_workflows.review_status', ['interested', 'saved', 'not_interested', 'archived'])
            ->count('job_listings.id');

        $notInterested = (clone $baseQuery)
            ->where('job_user_workflows.review_status', 'not_interested')
            ->count('job_listings.id');

        $disqualified = (clone $baseQuery)
            ->where('latest_matches.eligibility_status', 'disqualified')
            ->count('job_listings.id');

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total' => $total,
                'new' => $new,
                'strong_matches' => $strongMatches,
                'review_required' => $reviewRequired,
                'bookmarked' => $bookmarked,
                'reviewed' => $reviewed,
                'not_interested' => $notInterested,
                'disqualified' => $disqualified,
                'min_match_threshold' => $minMatchThreshold,
            ],
        ]);
    }

    /**
     * List job listings with comprehensive filters and sorting.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = $user->candidateProfile;
        $preference = $profile ? CandidatePreference::where('candidate_profile_id', $profile->id)->first() : null;
        $minMatchThreshold = (float) ($preference?->min_match_threshold ?? 70.00);

        $query = JobListing::where('job_listings.user_id', $user->id)
            ->leftJoin('job_user_workflows', function ($join) use ($user) {
                $join->on('job_listings.id', '=', 'job_user_workflows.job_listing_id')
                    ->where('job_user_workflows.user_id', '=', $user->id);
            })
            ->leftJoinSub(
                JobMatch::select('jm1.*')
                    ->from('job_matches as jm1')
                    ->joinSub(
                        JobMatch::selectRaw('job_listing_id, MAX(id) as max_id')->groupBy('job_listing_id'),
                        'jm2',
                        'jm1.id',
                        '=',
                        'jm2.max_id'
                    ),
                'latest_matches',
                'latest_matches.job_listing_id',
                '=',
                'job_listings.id'
            )
            ->select('job_listings.*');

        // Quick View Tab filtering
        $tab = $request->query('tab');
        if ($tab === 'strong_matches') {
            $query->where('latest_matches.overall_score', '>=', $minMatchThreshold);
        } elseif ($tab === 'review_queue') {
            $query->where(function ($q) {
                $q->whereNull('job_user_workflows.review_status')
                    ->orWhereIn('job_user_workflows.review_status', ['new', 'review_required'])
                    ->orWhere('latest_matches.eligibility_status', 'requires_review');
            });
        } elseif ($tab === 'bookmarked') {
            $query->where('job_user_workflows.is_bookmarked', true);
        } elseif ($tab === 'interested') {
            $query->where('job_user_workflows.review_status', 'interested');
        } elseif ($tab === 'archived') {
            $query->where('job_user_workflows.review_status', 'archived');
        }

        // Search in title, company, location, description
        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('job_listings.title', 'like', $search)
                    ->orWhere('job_listings.company_name', 'like', $search)
                    ->orWhere('job_listings.location', 'like', $search)
                    ->orWhere('job_listings.description', 'like', $search);
            });
        }

        // Technology keyword search in qualifications and description
        if ($request->filled('technology')) {
            $tech = trim($request->input('technology'));
            $query->where(function ($q) use ($tech) {
                $q->where('job_listings.required_qualifications', 'like', "%{$tech}%")
                    ->orWhere('job_listings.preferred_qualifications', 'like', "%{$tech}%")
                    ->orWhere('job_listings.description', 'like', "%{$tech}%")
                    ->orWhere('job_listings.title', 'like', "%{$tech}%");
            });
        }

        // Company filter
        if ($request->filled('company')) {
            $query->where('job_listings.company_name', 'like', '%' . trim($request->input('company')) . '%');
        }

        // Location filter
        if ($request->filled('location')) {
            $query->where('job_listings.location', 'like', '%' . trim($request->input('location')) . '%');
        }

        // Work arrangement filter
        if ($request->filled('work_arrangement')) {
            $arrangement = trim($request->input('work_arrangement'));
            $query->where(function ($q) use ($arrangement) {
                $q->where('job_listings.employment_type', 'like', "%{$arrangement}%")
                    ->orWhere('job_listings.location', 'like', "%{$arrangement}%")
                    ->orWhere('job_listings.description', 'like', "%{$arrangement}%");
            });
        }

        // Quick Apply status filter
        if ($request->filled('quick_apply_status')) {
            $query->where('job_listings.quick_apply_status', $request->input('quick_apply_status'));
        }

        // Review status filter
        if ($request->filled('review_status')) {
            $status = $request->input('review_status');
            if ($status === 'new') {
                $query->where(function ($q) {
                    $q->whereNull('job_user_workflows.review_status')
                        ->orWhere('job_user_workflows.review_status', 'new');
                });
            } else {
                $query->where('job_user_workflows.review_status', $status);
            }
        }

        // Bookmark filter
        if ($request->has('is_bookmarked') && $request->input('is_bookmarked') !== null && $request->input('is_bookmarked') !== '') {
            $isBookmarked = filter_var($request->input('is_bookmarked'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isBookmarked !== null) {
                if ($isBookmarked) {
                    $query->where('job_user_workflows.is_bookmarked', true);
                } else {
                    $query->where(function ($q) {
                        $q->whereNull('job_user_workflows.is_bookmarked')
                            ->orWhere('job_user_workflows.is_bookmarked', false);
                    });
                }
            }
        }

        // Reviewed vs unreviewed filter
        if ($request->has('is_reviewed') && $request->input('is_reviewed') !== null && $request->input('is_reviewed') !== '') {
            $isReviewed = filter_var($request->input('is_reviewed'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isReviewed !== null) {
                if ($isReviewed) {
                    $query->whereIn('job_user_workflows.review_status', ['interested', 'saved', 'not_interested', 'archived']);
                } else {
                    $query->where(function ($q) {
                        $q->whereNull('job_user_workflows.review_status')
                            ->orWhereIn('job_user_workflows.review_status', ['new', 'review_required']);
                    });
                }
            }
        }

        // Salary range filters
        if ($request->filled('min_salary')) {
            $minSalary = (float) $request->input('min_salary');
            $query->where(function ($q) use ($minSalary) {
                $q->where('job_listings.salary_max', '>=', $minSalary)
                    ->orWhere('job_listings.salary_min', '>=', $minSalary);
            });
        }
        if ($request->filled('max_salary')) {
            $maxSalary = (float) $request->input('max_salary');
            $query->where(function ($q) use ($maxSalary) {
                $q->where('job_listings.salary_min', '<=', $maxSalary);
            });
        }

        // Match score filters
        if ($request->filled('min_score')) {
            $minScore = (float) $request->input('min_score');
            $query->where('latest_matches.overall_score', '>=', $minScore);
        }
        if ($request->filled('max_score')) {
            $maxScore = (float) $request->input('max_score');
            $query->where('latest_matches.overall_score', '<=', $maxScore);
        }

        // Eligibility filter
        if ($request->filled('eligibility')) {
            $query->where('latest_matches.eligibility_status', $request->input('eligibility'));
        }

        // Listing changed since review filter
        if ($request->has('is_changed') && filter_var($request->input('is_changed'), FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNotNull('job_user_workflows.last_reviewed_content_hash')
                ->whereColumn('job_user_workflows.last_reviewed_content_hash', '!=', 'job_listings.content_hash');
        }

        // Stale match filter
        if ($request->has('is_stale') && filter_var($request->input('is_stale'), FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNotNull('latest_matches.calculated_at')
                ->whereColumn('latest_matches.calculated_at', '<', 'job_listings.updated_at');
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'newest');
        switch ($sortBy) {
            case 'highest_match':
                $query->orderByRaw('latest_matches.overall_score IS NULL, latest_matches.overall_score DESC');
                break;
            case 'lowest_match':
                $query->orderByRaw('latest_matches.overall_score IS NULL, latest_matches.overall_score ASC');
                break;
            case 'salary_high':
                $query->orderByRaw('job_listings.salary_max IS NULL, job_listings.salary_max DESC');
                break;
            case 'updated':
                $query->orderBy('job_listings.updated_at', 'desc');
                break;
            case 'recently_reviewed':
                $query->orderByRaw('job_user_workflows.reviewed_at IS NULL, job_user_workflows.reviewed_at DESC');
                break;
            case 'unreviewed_first':
                $query->orderByRaw("CASE WHEN job_user_workflows.review_status IN ('interested', 'saved', 'not_interested', 'archived') THEN 1 ELSE 0 END ASC")
                    ->orderBy('job_listings.created_at', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('job_listings.last_observed_at', 'desc');
                break;
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);

        $jobs = $query->with(['latestMatch', 'workflow', 'application'])
            ->paginate($perPage);

        $profileUpdatedAt = $profile?->updated_at;
        $enrichedItems = collect($jobs->items())->map(function (JobListing $job) use ($profileUpdatedAt) {
            return $this->enrichJob($job, $profileUpdatedAt);
        });

        return response()->json([
            'status' => 'success',
            'data' => $enrichedItems,
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
            'min_match_threshold' => $minMatchThreshold,
        ]);
    }

    /**
     * Get single job listing with history, match, and workflow.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = $user->candidateProfile;

        $job = JobListing::where('user_id', $user->id)
            ->with(['histories' => function ($q) {
                $q->orderBy('created_at', 'desc');
            }, 'latestMatch', 'workflow', 'application'])
            ->find($id);

        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'job' => $this->enrichJob($job, $profile?->updated_at),
        ]);
    }

    /**
     * Update job listing fields.
     */
    public function update(UpdateJobListingRequest $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);

        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $validated = $request->validated();
        $changes = [];

        foreach ($validated as $field => $val) {
            if ($job->{$field} !== $val) {
                $changes[$field] = ['old' => $job->{$field}, 'new' => $val];
                $job->{$field} = $val;
            }
        }

        $job->save();

        if (!empty($changes)) {
            JobListingHistory::create([
                'job_listing_id' => $job->id,
                'event_type' => 'manual_edit',
                'changed_fields' => $changes,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Job listing updated successfully.',
            'job' => $job->fresh(['histories', 'workflow', 'latestMatch']),
        ]);
    }

    /**
     * Delete a job listing.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);

        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $job->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Job listing deleted successfully.',
        ]);
    }

    /**
     * Check if a URL or Source Job ID already exists in the system.
     */
    public function checkUrl(Request $request, JobExtractionService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $url = trim($request->query('url', ''));

        if (empty($url)) {
            return response()->json([
                'status' => 'error',
                'message' => 'URL parameter is required.',
            ], 422);
        }

        $canonicalUrl = $service->normalizeCanonicalUrl($url);
        $platform = $service->detectPlatform($canonicalUrl);
        $sourceJobId = $service->extractSourceJobId($canonicalUrl);

        $existing = $service->findExistingRecord($user->id, $platform, $sourceJobId, $canonicalUrl, '');
        if ($existing) {
            $existing->load(['latestMatch', 'workflow', 'application']);
            $profile = $user->candidateProfile;
            $enriched = $this->enrichJob($existing, $profile?->updated_at);
        } else {
            $enriched = null;
        }

        return response()->json([
            'status' => 'success',
            'exists' => $existing !== null,
            'canonical_url' => $canonicalUrl,
            'source_platform' => $platform,
            'source_job_id' => $sourceJobId,
            'job' => $enriched,
        ]);
    }
}
