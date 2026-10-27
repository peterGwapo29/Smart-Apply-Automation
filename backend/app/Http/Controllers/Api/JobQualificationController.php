<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CandidateProfile;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\User;
use App\Services\Matching\JobMatchingService;
use App\Services\Matching\JobQualificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobQualificationController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * List user's jobs ordered by prioritization score with filtering.
     *
     * GET /api/jobs/prioritized
     */
    public function prioritized(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $query = JobListing::where('job_listings.user_id', $user->id)
            ->join('job_matches', function ($join) use ($user) {
                $join->on('job_listings.id', '=', 'job_matches.job_listing_id')
                    ->where('job_matches.user_id', '=', $user->id);
            })
            ->select('job_listings.*', 'job_matches.priority_score', 'job_matches.priority_tier', 'job_matches.qualification_status', 'job_matches.overall_score as match_score', 'job_matches.evaluation_confidence', 'job_matches.calculated_at as evaluated_at');

        // Filter by Priority Tier
        if ($request->filled('priority_tier')) {
            $tiers = explode(',', $request->query('priority_tier'));
            $query->whereIn('job_matches.priority_tier', $tiers);
        }

        // Filter by Qualification Status
        if ($request->filled('qualification_status')) {
            $statuses = explode(',', $request->query('qualification_status'));
            $query->whereIn('job_matches.qualification_status', $statuses);
        }

        // Filter by min priority score
        if ($request->filled('min_priority')) {
            $query->where('job_matches.priority_score', '>=', floatval($request->query('min_priority')));
        }

        // Filter by min match score
        if ($request->filled('min_match')) {
            $query->where('job_matches.overall_score', '>=', floatval($request->query('min_match')));
        }

        // Filter by source platform
        if ($request->filled('source')) {
            $query->where('job_listings.source', $request->query('source'));
        }

        // Filter by listing status (active by default if requested)
        if ($request->query('active_only') === 'true' || $request->query('active_only') === '1') {
            $query->whereNotIn('job_listings.status', ['closed', 'expired']);
        }

        // Sort by priority_score DESC, then match_score DESC, then id DESC (deterministic tie-breaking)
        $query->orderBy('job_matches.priority_score', 'desc')
            ->orderBy('job_matches.overall_score', 'desc')
            ->orderBy('job_listings.id', 'desc');

        $perPage = min(50, max(5, intval($request->query('per_page', 15))));
        $paginator = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'meta' => [
                'tier_counts' => [
                    'top_priority' => JobMatch::where('user_id', $user->id)->where('priority_tier', 'top_priority')->count(),
                    'high_priority' => JobMatch::where('user_id', $user->id)->where('priority_tier', 'high_priority')->count(),
                    'medium_priority' => JobMatch::where('user_id', $user->id)->where('priority_tier', 'medium_priority')->count(),
                    'low_priority' => JobMatch::where('user_id', $user->id)->where('priority_tier', 'low_priority')->count(),
                    'requires_review' => JobMatch::where('user_id', $user->id)->where('priority_tier', 'requires_review')->count(),
                    'not_recommended' => JobMatch::where('user_id', $user->id)->where('priority_tier', 'not_recommended')->count(),
                ],
            ],
        ]);
    }

    /**
     * Retrieve detailed qualification breakdown & evidence citations for a job listing.
     *
     * GET /api/jobs/{id}/qualification
     */
    public function show(Request $request, int $id, JobMatchingService $matchingService): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);
        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found or access unauthorized.',
            ], 404);
        }

        $match = JobMatch::where('user_id', $user->id)
            ->where('job_listing_id', $job->id)
            ->first();

        // Calculate on-the-fly if missing or never qualified
        if (!$match || empty($match->qualification_breakdown)) {
            $match = $matchingService->match($user, $job);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'job_id' => $job->id,
                'job_title' => $job->title,
                'company_name' => $job->company_name,
                'source' => $job->source,
                'source_url' => $job->job_url,
                'match_score' => floatval($match->overall_score),
                'priority_score' => floatval($match->priority_score),
                'priority_tier' => $match->priority_tier,
                'qualification_status' => $match->qualification_status,
                'evaluation_confidence' => $match->evaluation_confidence,
                'breakdown' => $match->qualification_breakdown,
                'evaluated_at' => $match->calculated_at?->toIso8601String(),
                'is_stale' => $match->calculated_at && $job->updated_at && $job->updated_at->greaterThan($match->calculated_at),
            ],
        ]);
    }

    /**
     * Re-run matching, qualification and prioritization for a job listing.
     *
     * POST /api/jobs/{id}/qualification/recalculate
     */
    public function recalculate(Request $request, int $id, JobMatchingService $matchingService): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);
        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found or access unauthorized.',
            ], 404);
        }

        $match = $matchingService->match($user, $job);

        return response()->json([
            'status' => 'success',
            'message' => 'Job qualification and prioritization recalculated successfully.',
            'data' => [
                'job_id' => $job->id,
                'match_score' => floatval($match->overall_score),
                'priority_score' => floatval($match->priority_score),
                'priority_tier' => $match->priority_tier,
                'qualification_status' => $match->qualification_status,
                'evaluation_confidence' => $match->evaluation_confidence,
                'breakdown' => $match->qualification_breakdown,
                'evaluated_at' => $match->calculated_at?->toIso8601String(),
            ],
        ]);
    }
}
