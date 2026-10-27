<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobListing;
use App\Models\User;
use App\Services\Application\BrowserAssistanceService;
use App\Services\Listing\ListingAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class JobApplicationExecutionController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * Revalidate availability of a job listing before application or on-demand.
     *
     * POST /api/jobs/{id}/revalidate
     */
    public function revalidate(Request $request, int $id, ListingAvailabilityService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $job = JobListing::where('user_id', $user->id)->findOrFail($id);

        $forceFresh = $request->boolean('force_fresh');
        $result = $service->revalidate($job, $user, $forceFresh);

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    /**
     * Batch revalidate availability of all job listings for user.
     *
     * POST /api/jobs/revalidate-all
     */
    public function revalidateAll(Request $request, ListingAvailabilityService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $forceFresh = $request->boolean('force_fresh', true);
        $results = $service->revalidateAll($user, $forceFresh);

        return response()->json([
            'status' => 'success',
            'message' => 'Batch listing revalidation completed.',
            'data' => $results,
        ]);
    }

    /**
     * Retrieve assistance payload and execution checklist for an application.
     *
     * GET /api/applications/{id}/execution-workspace
     */
    public function workspace(Request $request, int $id, BrowserAssistanceService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);

        $data = $service->getAssistanceWorkspace($application, $user);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Explicit candidate authorization for consequential application submission.
     *
     * POST /api/applications/{id}/authorize-execution
     */
    public function authorizeExecution(Request $request, int $id, BrowserAssistanceService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);

        try {
            $updated = $service->authorizeExecution($application, $user);

            return response()->json([
                'status' => 'success',
                'message' => 'Candidate authorization recorded successfully.',
                'authorized_at' => $updated->authorized_at?->toIso8601String(),
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Record submission outcome based on documented evidence.
     *
     * POST /api/applications/{id}/verify-submission
     */
    public function verifySubmission(Request $request, int $id, BrowserAssistanceService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'verification_level' => 'required|string|in:platform_confirmed,user_confirmed,ambiguous,failed',
            'evidence_type' => 'nullable|string|max:100',
            'evidence_note' => 'nullable|string|max:500',
        ]);

        try {
            $updated = $service->verifySubmission(
                $application,
                $user,
                $validated['verification_level'],
                $validated['evidence_type'] ?? null,
                $validated['evidence_note'] ?? null
            );

            return response()->json([
                'status' => 'success',
                'message' => "Application submission verified with status [{$updated->status}] and verification level [{$updated->submission_verification_level}].",
                'application' => [
                    'id' => $updated->id,
                    'status' => $updated->status,
                    'submission_verification_level' => $updated->submission_verification_level,
                    'submission_evidence_type' => $updated->submission_evidence_type,
                    'submission_evidence_note' => $updated->submission_evidence_note,
                    'submitted_at' => $updated->submitted_at?->toIso8601String(),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Record ambiguous submission outcome (e.g. timeout during submission).
     *
     * POST /api/applications/{id}/record-ambiguous
     */
    public function recordAmbiguous(Request $request, int $id, BrowserAssistanceService $service): JsonResponse
    {
        $user = $this->resolveUser($request);
        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $updated = $service->verifySubmission(
            $application,
            $user,
            JobApplication::VERIFICATION_AMBIGUOUS,
            'browser_timeout_or_unconfirmed',
            $validated['reason'] ?? 'Candidate reported ambiguous submission outcome. Auto-retry paused.'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Ambiguous outcome recorded. Application entered confirmation required state without automatic retries.',
            'status_code' => $updated->status,
        ]);
    }
}
