<?php

namespace App\Services;

use App\Models\JobApplication;
use App\Models\JobApplicationReadiness;
use App\Models\JobMatch;
use Carbon\Carbon;

class ApplicationReadinessService
{
    /**
     * Deterministically evaluate application readiness against all verification rules.
     */
    public function evaluateReadiness(JobApplication $application): JobApplicationReadiness
    {
        $application->loadMissing([
            'candidateProfile',
            'jobListing',
            'material.selectedResume',
            'answers',
        ]);

        $blockingIssues = [];
        $warnings = [];

        $material = $application->material;
        $answers = $application->answers;
        $profile = $application->candidateProfile;
        $job = $application->jobListing;

        // 1. Resume selection check
        if (!$material || !$material->selected_resume_id) {
            $blockingIssues[] = [
                'code' => 'MISSING_RESUME',
                'field' => 'selected_resume_id',
                'message' => 'No résumé version has been selected for this application.',
            ];
        }

        // 2. Cover letter check
        if (!$material || empty(trim($material->cover_letter ?? ''))) {
            $blockingIssues[] = [
                'code' => 'MISSING_COVER_LETTER',
                'field' => 'cover_letter',
                'message' => 'Tailored cover letter has not been generated or is empty.',
            ];
        }

        // 3. Application introduction warning
        if (!$material || empty(trim($material->introduction ?? ''))) {
            $warnings[] = [
                'code' => 'MISSING_INTRODUCTION',
                'field' => 'introduction',
                'message' => 'Concise application introduction is missing (recommended for fast-apply forms).',
            ];
        }

        // 4. Screening question checks
        $unresolvedQuestions = $answers->filter(fn($a) => $a->requires_review || $a->confidence === 'unknown' || empty(trim($a->draft_answer ?? '')));
        if ($unresolvedQuestions->isNotEmpty()) {
            $blockingIssues[] = [
                'code' => 'UNRESOLVED_SCREENING_QUESTIONS',
                'field' => 'screening_questions',
                'message' => sprintf('%d screening question(s) require candidate verification or missing answers.', $unresolvedQuestions->count()),
                'unresolved_question_ids' => $unresolvedQuestions->pluck('id')->all(),
            ];
        }

        // 5. Contact information warnings
        $hasPhone = !empty($profile->phone) || !empty($profile->phone_number);
        if (!$hasPhone) {
            $warnings[] = [
                'code' => 'MISSING_PHONE',
                'field' => 'phone_number',
                'message' => 'Candidate profile does not have a phone number on record.',
            ];
        }

        $hasLocation = !empty($profile->location) || !empty($profile->city) || !empty($profile->country);
        if (!$hasLocation) {
            $warnings[] = [
                'code' => 'MISSING_LOCATION',
                'field' => 'location',
                'message' => 'Candidate profile is missing location details.',
            ];
        }

        // 6. Active listing verification check (Phase 10 cross-project rule)
        if ($job && !$job->isActionable()) {
            $blockingIssues[] = [
                'code' => 'INACTIVE_JOB_LISTING',
                'field' => 'listing_status',
                'message' => "Job listing is marked [{$job->listing_status}] or has expired. Cannot proceed with application execution.",
            ];
        }

        // 7. Duplicate submission check
        if ($application->status === JobApplication::STATUS_SUBMITTED) {
            $blockingIssues[] = [
                'code' => 'ALREADY_SUBMITTED',
                'field' => 'status',
                'message' => 'This application has already been submitted and confirmed. Duplicate submissions are strictly prevented.',
            ];
        }

        // 8. Job match disqualification check
        $match = JobMatch::where('candidate_profile_id', $profile->id)
            ->where('job_listing_id', $job->id)
            ->first();

        if ($match && $match->eligibility_status === 'disqualified') {
            $blockingIssues[] = [
                'code' => 'MATCH_DISQUALIFIED',
                'field' => 'eligibility_status',
                'message' => 'Candidate was marked disqualified for this job listing based on hard preference constraints.',
            ];
        }

        $isReady = empty($blockingIssues);

        $readiness = JobApplicationReadiness::updateOrCreate(
            ['job_application_id' => $application->id],
            [
                'is_ready' => $isReady,
                'blocking_issues' => $blockingIssues,
                'warnings' => $warnings,
                'evaluated_at' => Carbon::now(),
            ]
        );

        // Update application state machine status if appropriate (never auto-submitting)
        if ($isReady && in_array($application->status, [JobApplication::STATUS_PREPARING, JobApplication::STATUS_NEEDS_REVIEW, JobApplication::STATUS_QUEUED], true)) {
            $oldStatus = $application->status;
            $application->update([
                'status' => JobApplication::STATUS_READY,
                'ready_at' => Carbon::now(),
            ]);
            $application->activities()->create([
                'event_type' => 'readiness_evaluated',
                'from_status' => $oldStatus,
                'to_status' => JobApplication::STATUS_READY,
                'message' => 'Application materials and answers validated. Status transitioned to ready.',
                'actor' => 'system',
                'metadata' => [
                    'warnings_count' => count($warnings),
                ],
            ]);
        } elseif (!$isReady && $application->status === JobApplication::STATUS_READY) {
            $application->update([
                'status' => JobApplication::STATUS_NEEDS_REVIEW,
                'ready_at' => null,
            ]);
            $application->activities()->create([
                'event_type' => 'readiness_evaluated',
                'from_status' => JobApplication::STATUS_READY,
                'to_status' => JobApplication::STATUS_NEEDS_REVIEW,
                'message' => sprintf('Application requires review due to %d blocking issue(s).', count($blockingIssues)),
                'actor' => 'system',
                'metadata' => [
                    'blocking_issues_count' => count($blockingIssues),
                ],
            ]);
        }

        return $readiness;
    }
}
