<?php

namespace App\Jobs;

use App\Models\JobApplication;
use App\Services\Application\ApplicationWorkflowService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class PrepareJobApplicationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1; // Handled explicitly through bounded retry state machine

    public function __construct(
        public int $applicationId
    ) {}

    public function handle(ApplicationWorkflowService $service): void
    {
        $application = JobApplication::find($this->applicationId);

        if (!$application) {
            return;
        }

        // Only process if status is queued
        if ($application->status !== JobApplication::STATUS_QUEUED) {
            return;
        }

        try {
            $service->processPreparation($application);
        } catch (Throwable $e) {
            $service->handleTransientFailure(
                $application,
                'WORKER_EXCEPTION',
                $e->getMessage(),
                ['exception_class' => get_class($e)]
            );
        }
    }
}
