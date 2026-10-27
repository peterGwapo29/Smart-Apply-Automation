<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateJobReviewRequest;
use App\Models\JobListing;
use App\Models\JobUserWorkflow;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobWorkflowController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * Update or create workflow review status & notes for a job.
     */
    public function updateReview(UpdateJobReviewRequest $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)
            ->with('latestMatch')
            ->find($id);

        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $workflow = JobUserWorkflow::firstOrNew([
            'user_id' => $user->id,
            'job_listing_id' => $job->id,
        ]);

        $workflow->review_status = $request->validated('review_status');

        if ($request->has('notes')) {
            $workflow->notes = $request->input('notes');
        }

        $workflow->reviewed_at = now();
        $workflow->last_reviewed_content_hash = $job->content_hash;
        $workflow->last_reviewed_match_score = $job->latestMatch?->overall_score;
        $workflow->save();

        // Also keep job_listings.review_status aligned for backwards compatibility
        $job->update(['review_status' => $workflow->review_status]);

        return response()->json([
            'status' => 'success',
            'message' => 'Review status updated successfully.',
            'workflow' => $workflow,
        ]);
    }

    /**
     * Set bookmark status to true.
     */
    public function bookmark(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);

        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $workflow = JobUserWorkflow::firstOrCreate(
            ['user_id' => $user->id, 'job_listing_id' => $job->id],
            ['review_status' => 'new']
        );

        $workflow->is_bookmarked = true;
        $workflow->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Job bookmarked successfully.',
            'workflow' => $workflow,
        ]);
    }

    /**
     * Set bookmark status to false.
     */
    public function unbookmark(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $job = JobListing::where('user_id', $user->id)->find($id);

        if (!$job) {
            return response()->json([
                'status' => 'error',
                'message' => 'Job listing not found.',
            ], 404);
        }

        $workflow = JobUserWorkflow::firstOrCreate(
            ['user_id' => $user->id, 'job_listing_id' => $job->id],
            ['review_status' => 'new']
        );

        $workflow->is_bookmarked = false;
        $workflow->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Job unbookmarked successfully.',
            'workflow' => $workflow,
        ]);
    }
}
