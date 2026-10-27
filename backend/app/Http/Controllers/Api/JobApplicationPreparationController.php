<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobApplicationAnswer;
use App\Models\JobApplicationMaterial;
use App\Models\Resume;
use App\Services\ApplicationReadinessService;
use App\Services\CandidateEvidenceService;
use App\Services\CoverLetterService;
use App\Services\ResumeSelectionService;
use App\Services\ScreeningQuestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobApplicationPreparationController extends Controller
{
    public function __construct(
        protected CandidateEvidenceService $evidenceService,
        protected ResumeSelectionService $resumeSelectionService,
        protected CoverLetterService $coverLetterService,
        protected ScreeningQuestionService $screeningQuestionService,
        protected ApplicationReadinessService $readinessService
    ) {}

    /**
     * Get the consolidated preparation workspace for an application.
     */
    public function workspace(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->with([
                'candidateProfile',
                'jobListing',
                'material.selectedResume',
                'answers',
                'readiness',
            ])
            ->firstOrFail();

        $evidence = $this->evidenceService->compileEvidence($application->candidateProfile);
        $resumes = Resume::where('user_id', $user->id)
            ->where('processing_status', 'completed')
            ->select('id', 'original_filename', 'is_active', 'created_at')
            ->orderBy('is_active', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'application' => $application,
            'job' => $application->jobListing,
            'evidence_summary' => [
                'verified_professional_years' => $evidence['verified_professional_years'],
                'recent_role' => $evidence['employment_history'][0] ?? null,
                'skills_count' => count($evidence['skills']),
                'projects_count' => count($evidence['practical_projects']),
                'notice_period_weeks' => $evidence['preferences']['notice_period_weeks'] ?? 2,
            ],
            'available_resumes' => $resumes,
            'material' => $application->material,
            'answers' => $application->answers,
            'readiness' => $application->readiness,
        ]);
    }

    /**
     * Recommend optimal resume version.
     */
    public function recommendResume(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['candidateProfile', 'jobListing'])
            ->firstOrFail();

        $recommendation = $this->resumeSelectionService->recommendResume(
            $application->candidateProfile,
            $application->jobListing
        );

        return response()->json([
            'success' => true,
            'recommendation' => $recommendation,
        ]);
    }

    /**
     * Select / override resume version.
     */
    public function selectResume(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'resume_id' => 'required|integer|exists:resumes,id',
            'rationale' => 'nullable|string|max:1000',
        ]);

        // Verify resume belongs to user
        $resume = Resume::where('id', $validated['resume_id'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $material = JobApplicationMaterial::firstOrCreate(
            ['job_application_id' => $application->id],
            ['version' => 1]
        );

        $material->update([
            'selected_resume_id' => $resume->id,
            'resume_selection_rationale' => $validated['rationale'] ?? "Selected resume version: {$resume->original_filename}",
        ]);

        $readiness = $this->readinessService->evaluateReadiness($application);

        return response()->json([
            'success' => true,
            'material' => $material->fresh(['selectedResume']),
            'readiness' => $readiness,
        ]);
    }

    /**
     * Generate or regenerate tailored cover letter and introduction.
     */
    public function generateMaterials(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['candidateProfile', 'jobListing', 'material'])
            ->firstOrFail();

        $material = $this->coverLetterService->generateMaterials($application);

        // If no resume is selected yet, also auto-recommend and attach
        if (!$material->selected_resume_id) {
            $rec = $this->resumeSelectionService->recommendResume($application->candidateProfile, $application->jobListing);
            if ($rec['recommended_resume']) {
                $material->update([
                    'selected_resume_id' => $rec['recommended_resume']->id,
                    'resume_selection_rationale' => $rec['rationale'],
                ]);
            }
        }

        $readiness = $this->readinessService->evaluateReadiness($application);

        return response()->json([
            'success' => true,
            'material' => $material->fresh(['selectedResume']),
            'readiness' => $readiness,
        ]);
    }

    /**
     * Update application materials with candidate manual edits.
     */
    public function updateMaterials(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'cover_letter' => 'nullable|string',
            'introduction' => 'nullable|string|max:2000',
        ]);

        $material = $this->coverLetterService->updateMaterials($application, $validated);
        $readiness = $this->readinessService->evaluateReadiness($application);

        return response()->json([
            'success' => true,
            'material' => $material,
            'readiness' => $readiness,
        ]);
    }

    /**
     * Draft screening question answers.
     */
    public function draftScreeningQuestions(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'questions' => 'required|array|min:1',
            'questions.*' => 'required',
        ]);

        $answers = $this->screeningQuestionService->draftAnswers($application, $validated['questions']);
        $readiness = $this->readinessService->evaluateReadiness($application);

        return response()->json([
            'success' => true,
            'answers' => $answers,
            'readiness' => $readiness,
        ]);
    }

    /**
     * Update/review a single screening question answer.
     */
    public function updateScreeningQuestion(Request $request, int $id, int $questionId): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $answer = JobApplicationAnswer::where('id', $questionId)
            ->where('job_application_id', $application->id)
            ->firstOrFail();

        $validated = $request->validate([
            'draft_answer' => 'required|string',
            'requires_review' => 'nullable|boolean',
        ]);

        $updated = $this->screeningQuestionService->updateAnswer($answer, $validated);
        $readiness = $this->readinessService->evaluateReadiness($application);

        return response()->json([
            'success' => true,
            'answer' => $updated,
            'readiness' => $readiness,
        ]);
    }

    /**
     * Evaluate / refresh readiness.
     */
    public function evaluateReadiness(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $application = JobApplication::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $readiness = $this->readinessService->evaluateReadiness($application);

        return response()->json([
            'success' => true,
            'application' => $application->fresh(),
            'readiness' => $readiness,
        ]);
    }
}
