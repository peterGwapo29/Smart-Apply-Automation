<?php

namespace App\Services;

use App\Models\JobApplication;
use App\Models\JobApplicationMaterial;
use App\Services\Contracts\AiProviderInterface;

class CoverLetterService
{
    public function __construct(
        protected CandidateEvidenceService $evidenceService,
        protected AiProviderInterface $aiProvider
    ) {}

    /**
     * Generate or regenerate materials (cover letter & introduction) for an application.
     */
    public function generateMaterials(JobApplication $application, array $options = []): JobApplicationMaterial
    {
        $profile = $application->candidateProfile;
        $job = $application->jobListing;

        $evidence = $this->evidenceService->compileEvidence($profile);
        $jobContext = [
            'title' => $job->title,
            'company_name' => $job->company_name,
            'location' => $job->location,
            'skills' => $job->skills ?? [],
            'description' => $job->description_raw ?? '',
        ];

        $coverResult = $this->aiProvider->generateCoverLetter($evidence, $jobContext, $options);
        $introText = $this->aiProvider->generateIntroduction($evidence, $jobContext);

        $material = $application->material()->first();

        if ($material) {
            $newVersion = $material->version + 1;
            $material->update([
                'cover_letter' => $coverResult['cover_letter'],
                'cover_letter_metadata' => $coverResult['metadata'],
                'introduction' => $introText,
                'version' => $newVersion,
                'is_candidate_edited' => false,
            ]);
        } else {
            $material = JobApplicationMaterial::create([
                'job_application_id' => $application->id,
                'cover_letter' => $coverResult['cover_letter'],
                'cover_letter_metadata' => $coverResult['metadata'],
                'introduction' => $introText,
                'version' => 1,
                'is_candidate_edited' => false,
            ]);
        }

        return $material->fresh(['selectedResume']);
    }

    /**
     * Save candidate manual edits to application materials.
     */
    public function updateMaterials(JobApplication $application, array $data): JobApplicationMaterial
    {
        $material = $application->material()->firstOrCreate([
            'job_application_id' => $application->id,
        ]);

        $updateData = [];
        if (isset($data['cover_letter'])) {
            $updateData['cover_letter'] = $data['cover_letter'];
            $updateData['is_candidate_edited'] = true;
        }
        if (isset($data['introduction'])) {
            $updateData['introduction'] = $data['introduction'];
            $updateData['is_candidate_edited'] = true;
        }

        $material->update($updateData);

        return $material->fresh(['selectedResume']);
    }
}
