<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ExecuteJobDiscoveryJob;
use App\Models\JobDiscoveryRun;
use App\Models\User;
use App\Services\Discovery\JobDiscoveryService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobDiscoveryController extends Controller
{
    public function __construct(
        protected JobDiscoveryService $discoveryService
    ) {}

    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrFail();
    }

    /**
     * Get list of supported discovery sources and compliance/auth status.
     */
    public function sources(): JsonResponse
    {
        $sources = $this->discoveryService->getAvailableSources();

        return response()->json([
            'success' => true,
            'sources' => $sources,
        ]);
    }

    /**
     * Get user's discovery run history.
     */
    public function runs(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $runs = JobDiscoveryRun::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $runs->items(),
            'meta' => [
                'current_page' => $runs->currentPage(),
                'last_page' => $runs->lastPage(),
                'per_page' => $runs->perPage(),
                'total' => $runs->total(),
            ],
        ]);
    }

    /**
     * Trigger an on-demand job discovery run.
     */
    public function triggerRun(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $validated = $request->validate([
            'source_platform' => 'nullable|string|in:authorized_feed,jobstreet,linkedin,onlinejobs_ph',
            'keywords' => 'nullable|string|max:200',
            'location' => 'nullable|string|max:150',
            'work_arrangement' => 'nullable|string|in:all,remote,hybrid,on_site',
            'min_salary' => 'nullable|numeric|min:0',
            'is_async' => 'nullable|boolean',
        ]);

        $source = $validated['source_platform'] ?? 'authorized_feed';
        $criteria = array_filter([
            'keywords' => $validated['keywords'] ?? null,
            'location' => $validated['location'] ?? null,
            'work_arrangement' => $validated['work_arrangement'] ?? null,
            'min_salary' => $validated['min_salary'] ?? null,
        ]);

        if (!empty($validated['is_async'])) {
            ExecuteJobDiscoveryJob::dispatch($user, $criteria, $source);

            return response()->json([
                'success' => true,
                'message' => 'Job discovery task has been queued for background execution.',
            ], 202);
        }

        $run = $this->discoveryService->executeRun($user, $criteria, $source);

        return response()->json([
            'success' => true,
            'message' => "Discovery run completed with {$run->new_listings} new job(s).",
            'run' => $run,
        ], 201);
    }

    /**
     * Get detailed status of a specific run.
     */
    public function showRun(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $run = JobDiscoveryRun::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'run' => $run,
        ]);
    }

    /**
     * Cancel an ongoing or pending run.
     */
    public function cancelRun(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $run = JobDiscoveryRun::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if (in_array($run->status, [JobDiscoveryRun::STATUS_PENDING, JobDiscoveryRun::STATUS_RUNNING], true)) {
            $run->update([
                'status' => JobDiscoveryRun::STATUS_CANCELLED,
                'completed_at' => Carbon::now(),
                'error_message' => 'Cancelled by user request.',
            ]);
        }

        return response()->json([
            'success' => true,
            'run' => $run->fresh(),
        ]);
    }
}
