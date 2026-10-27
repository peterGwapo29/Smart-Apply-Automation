<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateJobApplicationRequest;
use App\Http\Requests\TransitionJobApplicationRequest;
use App\Models\JobApplication;
use App\Models\User;
use App\Services\Application\ApplicationWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * List applications for the authenticated candidate.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $query = JobApplication::where('user_id', $user->id)
            ->with(['jobListing.latestMatch']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('job_id')) {
            $query->where('job_listing_id', $request->query('job_id'));
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $applications = $query->orderBy('updated_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $applications->items(),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
            'counts' => [
                'total' => JobApplication::where('user_id', $user->id)->count(),
                'queued' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_QUEUED)->count(),
                'preparing' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_PREPARING)->count(),
                'needs_review' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_NEEDS_REVIEW)->count(),
                'ready' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_READY)->count(),
                'submitted' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_SUBMITTED)->count(),
                'failed' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_FAILED)->count(),
                'confirmation_required' => JobApplication::where('user_id', $user->id)->where('status', JobApplication::STATUS_CONFIRMATION_REQUIRED)->count(),
            ],
        ]);
    }

    /**
     * Create or retrieve an application record (idempotent).
     */
    public function store(CreateJobApplicationRequest $request, ApplicationWorkflowService $service): JsonResponse
    {
        $user = $this->resolveUser($request);

        $idempotencyKey = $request->header('Idempotency-Key')
            ?? $request->input('idempotency_key');

        $result = $service->createOrRetrieve(
            $user,
            $request->validated('job_listing_id'),
            $idempotencyKey,
            'user'
        );

        $application = $result['application']->load(['jobListing.latestMatch', 'activities']);

        return response()->json([
            'status' => 'success',
            'created' => $result['created'],
            'message' => $result['created']
                ? 'Application record created and queued.'
                : 'Existing application record retrieved.',
            'application' => $application,
        ], $result['created'] ? 201 : 200);
    }

    /**
     * Get application details with recent activity.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $application = JobApplication::where('user_id', $user->id)
            ->with([
                'jobListing.latestMatch',
                'activities' => function ($q) {
                    $q->limit(20);
                },
                'tasks' => function ($q) {
                    $q->limit(10);
                },
            ])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'application' => $application,
        ]);
    }

    /**
     * Queue or re-queue an application.
     */
    public function queue(Request $request, int $id, ApplicationWorkflowService $service): JsonResponse
    {
        $user = $this->resolveUser($request);

        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);
        $updated = $service->queue($application, 'user');

        return response()->json([
            'status' => 'success',
            'message' => 'Application queued successfully.',
            'application' => $updated,
        ]);
    }

    /**
     * Manual retry for a failed or recoverable application.
     */
    public function retry(Request $request, int $id, ApplicationWorkflowService $service): JsonResponse
    {
        $user = $this->resolveUser($request);

        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);
        $updated = $service->retry($application, 'user');

        return response()->json([
            'status' => 'success',
            'message' => 'Application retry scheduled.',
            'application' => $updated,
        ]);
    }

    /**
     * Explicit state transition with validation.
     */
    public function transition(
        TransitionJobApplicationRequest $request,
        int $id,
        ApplicationWorkflowService $service
    ): JsonResponse {
        $user = $this->resolveUser($request);

        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);

        $toStatus = $request->validated('to_status');
        $message = $request->validated('message') ?? "Manual transition to [{$toStatus}] requested by user.";
        $metadata = $request->validated('metadata') ?? [];

        if ($request->filled('notes')) {
            $metadata['notes'] = $request->validated('notes');
        }

        $updated = $service->transition($application, $toStatus, $message, $metadata, 'user');

        return response()->json([
            'status' => 'success',
            'message' => "Application status transitioned to {$toStatus}.",
            'application' => $updated,
        ]);
    }

    /**
     * Get paginated activity history.
     */
    public function activity(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $application = JobApplication::where('user_id', $user->id)->findOrFail($id);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $activities = $application->activities()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $activities->items(),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }
}
