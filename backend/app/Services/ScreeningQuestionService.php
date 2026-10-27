<?php

namespace App\Services;

use App\Models\JobApplication;
use App\Models\JobApplicationAnswer;
use App\Services\Contracts\AiProviderInterface;
use Illuminate\Support\Collection;

class ScreeningQuestionService
{
    public function __construct(
        protected CandidateEvidenceService $evidenceService,
        protected AiProviderInterface $aiProvider
    ) {}

    /**
     * Process an array of questions, ground with evidence, and store answers.
     */
    public function draftAnswers(JobApplication $application, array $questions): Collection
    {
        $profile = $application->candidateProfile;
        $job = $application->jobListing;

        $evidence = $this->evidenceService->compileEvidence($profile);
        $jobContext = [
            'title' => $job->title,
            'company_name' => $job->company_name,
            'skills' => $job->skills ?? [],
        ];

        $results = collect();

        foreach ($questions as $q) {
            $questionText = is_array($q) ? ($q['question'] ?? '') : (string)$q;
            $questionText = trim($questionText);
            if (empty($questionText)) {
                continue;
            }

            // Analyze and answer using AI provider
            $answerData = $this->aiProvider->answerScreeningQuestion($questionText, $evidence, $jobContext);

            // Find existing or create new
            $existing = JobApplicationAnswer::where('job_application_id', $application->id)
                ->where('question', $questionText)
                ->first();

            if ($existing) {
                // If candidate already edited manually, preserve candidate edit unless forced
                if (!$existing->is_candidate_edited) {
                    $existing->update([
                        'category' => $answerData['category'],
                        'draft_answer' => $answerData['draft_answer'],
                        'confidence' => $answerData['confidence'],
                        'requires_review' => $answerData['requires_review'],
                        'review_reason' => $answerData['review_reason'],
                        'evidence_references' => $answerData['evidence_references'],
                    ]);
                }
                $results->push($existing);
            } else {
                $created = JobApplicationAnswer::create([
                    'job_application_id' => $application->id,
                    'question' => $questionText,
                    'category' => $answerData['category'],
                    'draft_answer' => $answerData['draft_answer'],
                    'confidence' => $answerData['confidence'],
                    'requires_review' => $answerData['requires_review'],
                    'review_reason' => $answerData['review_reason'],
                    'evidence_references' => $answerData['evidence_references'],
                    'is_candidate_edited' => false,
                ]);
                $results->push($created);
            }
        }

        return $results;
    }

    /**
     * Update an individual question answer with candidate review/edits.
     */
    public function updateAnswer(JobApplicationAnswer $answer, array $data): JobApplicationAnswer
    {
        $update = [];
        if (isset($data['draft_answer'])) {
            $update['draft_answer'] = $data['draft_answer'];
            $update['is_candidate_edited'] = true;
            // Once candidate confirms answer, confidence is high and review flag can be cleared
            $update['confidence'] = 'high';
            $update['requires_review'] = false;
            $update['review_reason'] = null;
        }

        if (isset($data['requires_review'])) {
            $update['requires_review'] = (bool)$data['requires_review'];
        }

        $answer->update($update);

        return $answer->fresh();
    }
}
