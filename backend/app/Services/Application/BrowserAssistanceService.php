<?php

namespace App\Services\Application;

use App\Models\JobApplication;
use App\Models\JobApplicationActivity;
use App\Models\User;
use App\Models\UserPlatformAccount;
use App\Services\Listing\ListingAvailabilityService;
use Carbon\Carbon;
use InvalidArgumentException;

class BrowserAssistanceService
{
    public function __construct(
        protected ApplicationWorkflowService $workflowService,
        protected ListingAvailabilityService $availabilityService
    ) {}

    /**
     * Compile complete execution and browser assistance payload.
     *
     * @param JobApplication $application
     * @param User $user
     * @return array<string, mixed>
     */
    public function getAssistanceWorkspace(JobApplication $application, User $user): array
    {
        $application->loadMissing([
            'jobListing',
            'material.selectedResume',
            'answers',
            'readiness',
        ]);

        $job = $application->jobListing;

        // Platform account state
        $platformAccount = UserPlatformAccount::where('user_id', $user->id)
            ->where('platform', $job->source_platform)
            ->first();

        $accountStatus = $platformAccount?->access_status ?? UserPlatformAccount::ACCESS_SETUP_REQUIRED;
        $capability = $platformAccount?->supported_capability ?? UserPlatformAccount::CAPABILITY_MANUAL_ONLY;

        // Verification of active status
        $listingFresh = $this->availabilityService->isVerificationFresh($job);

        // Checklist states
        $checklist = [
            [
                'id' => 'listing_active',
                'title' => 'Job Listing Active & Available',
                'completed' => $job->isActionable(),
                'required' => true,
                'detail' => $job->listing_status,
            ],
            [
                'id' => 'platform_access',
                'title' => 'Platform Account Access',
                'completed' => $platformAccount ? $platformAccount->isVerified() : false,
                'required' => true,
                'detail' => $accountStatus,
            ],
            [
                'id' => 'resume_selected',
                'title' => 'Tailored Résumé Attached',
                'completed' => (bool) ($application->material?->selected_resume_id),
                'required' => true,
                'detail' => $application->material?->selectedResume?->original_filename,
            ],
            [
                'id' => 'cover_letter_reviewed',
                'title' => 'Tailored Cover Letter Prepared',
                'completed' => !empty(trim($application->material?->cover_letter ?? '')),
                'required' => true,
                'detail' => $application->material?->cover_letter ? strlen($application->material->cover_letter) . ' chars' : 'Missing',
            ],
            [
                'id' => 'screening_answers_verified',
                'title' => 'Screening Questions Verified',
                'completed' => $application->answers->every(fn($a) => !$a->requires_review && !empty(trim($a->draft_answer ?? ''))),
                'required' => true,
                'detail' => $application->answers->count() . ' question(s)',
            ],
            [
                'id' => 'user_authorization',
                'title' => 'Explicit User Authorization Granted',
                'completed' => (bool) $application->authorized_at,
                'required' => true,
                'detail' => $application->authorized_at?->toIso8601String() ?? 'Pending authorization',
            ],
        ];

        return [
            'application_id' => $application->id,
            'status' => $application->status,
            'job' => [
                'id' => $job->id,
                'title' => $job->title,
                'company_name' => $job->company_name,
                'location' => $job->location,
                'canonical_url' => $job->canonical_url,
                'source_platform' => $job->source_platform,
                'listing_status' => $job->listing_status,
                'expires_at' => $job->expires_at?->toIso8601String(),
                'last_verified_at' => $job->last_verified_at?->toIso8601String(),
                'is_actionable' => $job->isActionable(),
            ],
            'platform_account' => [
                'platform' => $job->source_platform,
                'access_status' => $accountStatus,
                'supported_capability' => $capability,
                'is_verified' => $platformAccount ? $platformAccount->isVerified() : false,
                'last_verified_at' => $platformAccount?->last_verified_at?->toIso8601String(),
            ],
            'materials' => [
                'selected_resume' => $application->material?->selectedResume ? [
                    'id' => $application->material->selectedResume->id,
                    'original_filename' => $application->material->selectedResume->original_filename,
                ] : null,
                'cover_letter' => $application->material?->cover_letter,
                'introduction' => $application->material?->introduction,
            ],
            'screening_answers' => $application->answers->map(fn($a) => [
                'id' => $a->id,
                'question' => $a->question,
                'draft_answer' => $a->draft_answer,
                'confidence' => $a->confidence,
                'requires_review' => (bool) $a->requires_review,
                'category' => $a->category,
            ])->values()->all(),
            'checklist' => $checklist,
            'can_execute' => $application->status === JobApplication::STATUS_READY && $job->isActionable() && (bool) $application->authorized_at,
            'submission' => [
                'level' => $application->submission_verification_level,
                'evidence_type' => $application->submission_evidence_type,
                'evidence_note' => $application->submission_evidence_note,
                'authorized_at' => $application->authorized_at?->toIso8601String(),
                'submitted_at' => $application->submitted_at?->toIso8601String(),
            ],
        ];
    }

    /**
     * Record explicit candidate authorization for application submission.
     */
    public function authorizeExecution(JobApplication $application, User $user): JobApplication
    {
        $job = $application->jobListing;

        if (!$job->isActionable()) {
            throw new InvalidArgumentException("Cannot authorize execution for inactive or expired job listing [{$job->listing_status}].");
        }

        if ($application->status === JobApplication::STATUS_SUBMITTED) {
            throw new InvalidArgumentException('Application is already submitted and cannot be re-authorized.');
        }

        $application->update([
            'authorized_at' => Carbon::now(),
        ]);

        JobApplicationActivity::create([
            'job_application_id' => $application->id,
            'event_type' => 'authorization_granted',
            'from_status' => $application->status,
            'to_status' => $application->status,
            'message' => 'Candidate granted explicit authorization for application submission.',
            'actor' => 'user',
            'metadata' => [
                'authorized_at' => now()->toIso8601String(),
                'job_id' => $job->id,
            ],
            'created_at' => now(),
        ]);

        return $application;
    }

    /**
     * Record submission outcome based on documented evidence.
     */
    public function verifySubmission(
        JobApplication $application,
        User $user,
        string $verificationLevel,
        ?string $evidenceType = null,
        ?string $evidenceNote = null
    ): JobApplication {
        $allowedLevels = [
            JobApplication::VERIFICATION_PLATFORM_CONFIRMED,
            JobApplication::VERIFICATION_USER_CONFIRMED,
            JobApplication::VERIFICATION_AMBIGUOUS,
            JobApplication::VERIFICATION_FAILED,
        ];

        if (!in_array($verificationLevel, $allowedLevels, true)) {
            throw new InvalidArgumentException("Invalid verification level: {$verificationLevel}");
        }

        // Terminal submitted state cannot be overridden
        if ($application->status === JobApplication::STATUS_SUBMITTED) {
            return $application;
        }

        $sanitizedNote = $evidenceNote ? substr(strip_tags($evidenceNote), 0, 500) : null;
        $sanitizedType = $evidenceType ? substr(strip_tags($evidenceType), 0, 100) : 'manual_confirmation';

        // 1. Ambiguous outcome -> Transition to STATUS_CONFIRMATION_REQUIRED, never automatically retry
        if ($verificationLevel === JobApplication::VERIFICATION_AMBIGUOUS) {
            $application->submission_verification_level = JobApplication::VERIFICATION_AMBIGUOUS;
            $application->submission_evidence_type = $sanitizedType;
            $application->submission_evidence_note = $sanitizedNote;
            $application->save();

            return $this->workflowService->transition(
                $application,
                JobApplication::STATUS_CONFIRMATION_REQUIRED,
                "Submission outcome ambiguous ({$sanitizedType}): Automatic retry disabled to prevent duplicates. Requires candidate review.",
                [
                    'verification_level' => JobApplication::VERIFICATION_AMBIGUOUS,
                    'note' => $sanitizedNote,
                ],
                'user'
            );
        }

        // 2. Failed outcome -> Transition to STATUS_FAILED
        if ($verificationLevel === JobApplication::VERIFICATION_FAILED) {
            $application->submission_verification_level = JobApplication::VERIFICATION_FAILED;
            $application->submission_evidence_type = $sanitizedType;
            $application->submission_evidence_note = $sanitizedNote;
            $application->last_error_code = 'SUBMISSION_VERIFICATION_FAILED';
            $application->last_error_message = $sanitizedNote ?? 'Application submission failed verification.';
            $application->save();

            return $this->workflowService->transition(
                $application,
                JobApplication::STATUS_FAILED,
                "Submission failed verification [{$sanitizedType}]: {$sanitizedNote}",
                ['verification_level' => JobApplication::VERIFICATION_FAILED],
                'user'
            );
        }

        // 3. Confirmed outcome (platform_confirmed or user_confirmed) -> Transition to STATUS_SUBMITTED
        $application->submission_verification_level = $verificationLevel;
        $application->submission_evidence_type = $sanitizedType;
        $application->submission_evidence_note = $sanitizedNote;
        $application->submitted_at = Carbon::now();
        $application->save();

        return $this->workflowService->transition(
            $application,
            JobApplication::STATUS_SUBMITTED,
            "Application successfully submitted with verification level [{$verificationLevel}] via {$sanitizedType}.",
            [
                'verification_level' => $verificationLevel,
                'evidence_type' => $sanitizedType,
                'evidence_note' => $sanitizedNote,
            ],
            'user'
        );
    }
}
