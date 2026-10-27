<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCandidatePreferencesRequest;
use App\Models\CandidatePreference;
use App\Models\CandidateProfile;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\User;
use App\Services\Matching\JobMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobMatchingController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * Calculate match score for a specific job listing.
     */
    public function match(Request $request, int $id, JobMatchingService $matchingService): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);
        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $match = $matchingService->match($user, $job);

        return response()->json([
            'status' => 'success',
            'message' => 'Job match score calculated successfully.',
            'match' => $match->load(['jobListing']),
        ]);
    }

    /**
     * Batch calculate match scores for all saved job listings.
     */
    public function matchAll(Request $request, JobMatchingService $matchingService): JsonResponse
    {
        $user = $this->resolveUser($request);

        $summary = $matchingService->matchAll($user);

        return response()->json([
            'status' => 'success',
            'message' => 'Batch job matching completed.',
            'data' => $summary,
        ]);
    }

    /**
     * Retrieve match record and explainability details for a specific job.
     */
    public function show(Request $request, int $id, JobMatchingService $matchingService): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);
        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $match = JobMatch::where('user_id', $user->id)
            ->where('job_listing_id', $job->id)
            ->first();

        // If not yet calculated, calculate on demand
        if (!$match) {
            $match = $matchingService->match($user, $job);
        }

        return response()->json([
            'status' => 'success',
            'match' => $match->load(['jobListing']),
        ]);
    }

    /**
     * List job listings along with their latest match scores.
     */
    public function indexMatches(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $query = JobMatch::where('user_id', $user->id)
            ->with(['jobListing']);

        if ($request->filled('min_score')) {
            $query->where('overall_score', '>=', floatval($request->query('min_score')));
        }

        if ($request->filled('eligibility')) {
            $query->where('eligibility_status', $request->query('eligibility'));
        }

        $matches = $query->orderBy('overall_score', 'desc')->paginate(25);

        return response()->json([
            'status' => 'success',
            'data' => $matches->items(),
            'meta' => [
                'current_page' => $matches->currentPage(),
                'last_page' => $matches->lastPage(),
                'total' => $matches->total(),
            ],
        ]);
    }

    /**
     * Get candidate matching preferences.
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $profile = CandidateProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['full_name' => $user->name, 'email' => $user->email]
        );

        $preferences = CandidatePreference::firstOrCreate(
            ['candidate_profile_id' => $profile->id],
            [
                'work_arrangements' => ['remote', 'hybrid'],
                'employment_types' => ['Full-time', 'Contract'],
                'preferred_locations' => ['Metro Manila', 'Remote'],
                'min_salary' => 60000.00,
                'preferred_salary' => 90000.00,
                'salary_currency' => 'PHP',
                'salary_period' => 'monthly',
                'notice_period_weeks' => 2,
                'hard_disqualifiers' => ['require_remote_only' => false],
            ]
        );

        return response()->json([
            'status' => 'success',
            'preferences' => $preferences,
        ]);
    }

    /**
     * Update candidate matching preferences.
     */
    public function updatePreferences(UpdateCandidatePreferencesRequest $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $profile = CandidateProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['full_name' => $user->name, 'email' => $user->email]
        );

        $preferences = CandidatePreference::firstOrCreate(
            ['candidate_profile_id' => $profile->id]
        );

        $preferences->update($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Candidate matching preferences updated successfully.',
            'preferences' => $preferences->fresh(),
        ]);
    }
}
