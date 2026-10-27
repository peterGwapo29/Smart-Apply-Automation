<?php

namespace App\Services\Application;

use App\Exceptions\InvalidApplicationTransitionException;
use App\Jobs\PrepareJobApplicationJob;
use App\Models\CandidateProfile;
use App\Models\JobApplication;
use App\Models\JobApplicationActivity;
use App\Models\JobApplicationTask;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ApplicationWorkflowService
{
    public function __construct(
        protected ApplicationStateMachine $stateMachine
    ) {}

    /**
     * Create or retrieve an application record for a candidate/job pair.
     * Enforces unique constraint, transaction safety, and idempotency.
     */
    public function createOrRetrieve(
        User $user,
        int $jobListingId,
        ?string $idempotencyKey = null,
        ?string $actor = 'user'
    ): array {
        $job = JobListing::where('user_id', $user->id)->findOrFail($jobListingId);

        $profile = $user->candidateProfile ?? CandidateProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['full_name' => $user->name, 'email' => $user->email]
        );

        $idempotencyKey = $idempotencyKey
            ? trim($idempotencyKey)
            : hash('sha256', "app:{$user->id}:{$job->id}");

        return DB::transaction(function () use ($user, $profile, $job, $idempotencyKey, $actor) {
            $existing = JobApplication::where('user_id', $user->id)
                ->where('job_listing_id', $job->id)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return [
                    'application' => $existing,
                    'created' => false,
                ];
            }

            $application = JobApplication::create([
                'user_id' => $user->id,
                'candidate_profile_id' => $profile->id,
                'job_listing_id' => $job->id,
                'status' => JobApplication::STATUS_QUEUED,
                'idempotency_key' => $idempotencyKey,
                'attempt_count' => 0,
                'max_retries' => 3,
                'last_processed_at' => now(),
            ]);

            JobApplicationActivity::create([
                'job_application_id' => $application->id,
                'event_type' => 'created',
                'from_status' => null,
                'to_status' => JobApplication::STATUS_QUEUED,
                'message' => 'Job application initialized and placed in queue.',
                'metadata' => [
                    'job_title' => $job->title,
                    'company_name' => $job->company_name,
                ],
                'actor' => $actor,
                'created_at' => now(),
            ]);

            return [
                'application' => $application,
                'created' => true,
            ];
        });
    }

    /**
     * Transition application to a new status with validation and activity logging.
     *
     * @throws InvalidApplicationTransitionException
     */
    public function transition(
        JobApplication $application,
        string $toStatus,
        string $message,
        ?array $metadata = null,
        ?string $actor = 'system'
    ): JobApplication {
        $fromStatus = $application->status;

        // Centralized backend transition validation
        $this->stateMachine->validateTransition($fromStatus, $toStatus);

        return DB::transaction(function () use ($application, $fromStatus, $toStatus, $message, $metadata, $actor) {
            $application->status = $toStatus;
            $application->last_processed_at = now();

            if ($toStatus === JobApplication::STATUS_PREPARING && !$application->preparation_started_at) {
                $application->preparation_started_at = now();
            } elseif ($toStatus === JobApplication::STATUS_READY) {
                $application->ready_at = now();
            } elseif ($toStatus === JobApplication::STATUS_SUBMITTED) {
                $application->submitted_at = now();
            }

            $application->save();

            JobApplicationActivity::create([
                'job_application_id' => $application->id,
                'event_type' => 'status_transition',
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'message' => $message,
                'metadata' => $metadata,
                'actor' => $actor,
                'created_at' => now(),
            ]);

            return $application->fresh(['jobListing', 'activities']);
        });
    }

    /**
     * Queue an application for preparation.
     */
    public function queue(JobApplication $application, ?string $actor = 'user'): JobApplication
    {
        if ($application->status === JobApplication::STATUS_QUEUED) {
            return $application;
        }

        $this->stateMachine->validateTransition($application->status, JobApplication::STATUS_QUEUED);

        $application->last_error_code = null;
        $application->last_error_message = null;
        $application->next_retry_at = null;
        $application->save();

        $updated = $this->transition(
            $application,
            JobApplication::STATUS_QUEUED,
            'Application queued for preparation.',
            null,
            $actor
        );

        PrepareJobApplicationJob::dispatch($updated->id);

        return $updated;
    }

    /**
     * Execute the workflow preparation logic.
     */
    public function processPreparation(JobApplication $application): JobApplication
    {
        // Must be in queued to transition to preparing
        if ($application->status !== JobApplication::STATUS_QUEUED) {
            $this->stateMachine->validateTransition($application->status, JobApplication::STATUS_PREPARING);
        }

        $application = $this->transition(
            $application,
            JobApplication::STATUS_PREPARING,
            "Application preparation worker started (attempt #{$application->attempt_count}).",
            ['attempt' => $application->attempt_count + 1],
            'agent:worker'
        );

        $application->increment('attempt_count');

        $job = $application->jobListing;
        $profile = $application->candidateProfile;

        // 1. Verify candidate has confirmed resume or structured profile data
        if (!$profile || empty($profile->full_name) || empty($profile->email)) {
            return $this->transition(
                $application,
                JobApplication::STATUS_NEEDS_REVIEW,
                'Candidate profile is missing mandatory contact information (full name or email).',
                ['reason' => 'INCOMPLETE_PROFILE'],
                'agent:worker'
            );
        }

        // 2. Check job match eligibility
        $match = $job->latestMatch;
        if ($match && $match->eligibility_status === 'disqualified') {
            $application->last_error_code = 'HARD_DISQUALIFICATION';
            $application->last_error_message = 'Job listing failed mandatory eligibility constraints.';
            $application->save();

            return $this->transition(
                $application,
                JobApplication::STATUS_FAILED,
                'Application preparation terminated: candidate is disqualified based on hard requirements.',
                ['disqualifiers' => $match->disqualification_reasons],
                'agent:worker'
            );
        }

        if ($match && $match->eligibility_status === 'requires_review') {
            return $this->transition(
                $application,
                JobApplication::STATUS_NEEDS_REVIEW,
                'Application requires candidate review: mandatory requirements require human confirmation.',
                ['reason' => 'ELIGIBILITY_REVIEW_REQUIRED'],
                'agent:worker'
            );
        }

        // 3. Mark application as prepared and ready for next authorized step
        return $this->transition(
            $application,
            JobApplication::STATUS_READY,
            'Application preparation complete. Record is ready for user review and next authorized step.',
            [
                'match_score' => $match?->overall_score,
                'qualifications_verified' => true,
            ],
            'agent:worker'
        );
    }

    /**
     * Record transient failure and schedule bounded exponential backoff retry.
     */
    public function handleTransientFailure(
        JobApplication $application,
        string $errorCode,
        string $errorMessage,
        ?array $metadata = null
    ): JobApplication {
        // Sanitize error message to prevent secret or stack trace leakage
        $sanitizedMessage = substr(strip_tags($errorMessage), 0, 500);

        $application->last_error_code = $errorCode;
        $application->last_error_message = $sanitizedMessage;

        if ($application->attempt_count < $application->max_retries) {
            // Bounded exponential backoff: delay = min(30 * 2^(attempts-1), 900)
            $delaySeconds = (int) min(30 * (2 ** max(0, $application->attempt_count - 1)), 900);
            $nextRetry = now()->addSeconds($delaySeconds);

            $application->next_retry_at = $nextRetry;
            $application->save();

            $updated = $this->transition(
                $application,
                JobApplication::STATUS_QUEUED,
                "Transient error [{$errorCode}]: retry {$application->attempt_count}/{$application->max_retries} scheduled for {$nextRetry->toIso8601String()}.",
                array_merge($metadata ?? [], ['next_retry_in_seconds' => $delaySeconds]),
                'agent:worker'
            );

            PrepareJobApplicationJob::dispatch($application->id)->delay($nextRetry);

            return $updated;
        }

        $application->next_retry_at = null;
        $application->save();

        return $this->transition(
            $application,
            JobApplication::STATUS_FAILED,
            "Max preparation attempts ({$application->max_retries}) exceeded. Error: {$sanitizedMessage}",
            array_merge($metadata ?? [], ['error_code' => $errorCode]),
            'agent:worker'
        );
    }

    /**
     * Manual retry for an application in a recoverable state.
     */
    public function retry(JobApplication $application, ?string $actor = 'user'): JobApplication
    {
        if (!$application->isRecoverable()) {
            throw new InvalidApplicationTransitionException(
                $application->status,
                JobApplication::STATUS_QUEUED,
                $this->stateMachine->getAllowedTransitions($application->status)
            );
        }

        $application->last_error_code = null;
        $application->last_error_message = null;
        $application->next_retry_at = null;
        $application->save();

        $updated = $this->transition(
            $application,
            JobApplication::STATUS_QUEUED,
            'Manual retry triggered by user. Application re-entered queue.',
            null,
            $actor
        );

        PrepareJobApplicationJob::dispatch($updated->id);

        return $updated;
    }

    /**
     * Recover stuck applications in preparing status after timeout.
     */
    public function recoverStuckApplications(int $timeoutMinutes = 15): int
    {
        $stuck = JobApplication::where('status', JobApplication::STATUS_PREPARING)
            ->where('last_processed_at', '<', now()->subMinutes($timeoutMinutes))
            ->get();

        $recovered = 0;
        foreach ($stuck as $app) {
            if ($app->attempt_count < $app->max_retries) {
                $this->transition(
                    $app,
                    JobApplication::STATUS_QUEUED,
                    "Recovered stuck processing task after {$timeoutMinutes} minutes of inactivity.",
                    null,
                    'system:recovery'
                );
                PrepareJobApplicationJob::dispatch($app->id);
            } else {
                $this->transition(
                    $app,
                    JobApplication::STATUS_FAILED,
                    "Application aborted: stuck in preparing for >{$timeoutMinutes} minutes and max retries reached.",
                    null,
                    'system:recovery'
                );
            }
            $recovered++;
        }

        return $recovered;
    }
}
