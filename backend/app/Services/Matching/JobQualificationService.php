<?php

namespace App\Services\Matching;

use App\Models\CandidateProfile;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Services\CandidateEvidenceService;
use Carbon\Carbon;

class JobQualificationService
{
    public function __construct(
        protected CandidateEvidenceService $evidenceService
    ) {}

    /**
     * Evaluate qualification status, compute priority score, assign tier,
     * and construct an evidence-grounded breakdown.
     */
    public function evaluateAndPrioritize(
        JobMatch $match,
        CandidateProfile $profile,
        JobListing $job
    ): JobMatch {
        $evidence = $this->evidenceService->compileEvidence($profile);

        // 1. Determine Qualification Status from Match Eligibility
        $eligibilityStatus = $match->eligibility_status ?? 'requires_review';
        $qualificationStatus = match ($eligibilityStatus) {
            'eligible' => 'qualified',
            'disqualified' => 'disqualified',
            default => 'requires_review',
        };

        // 2. Calculate Mandatory Requirement Coverage (0-100)
        $mandatoryCoverage = 100.0;
        if ($qualificationStatus === 'disqualified') {
            $mandatoryCoverage = 0.0;
        } elseif ($qualificationStatus === 'requires_review') {
            $mandatoryCoverage = 50.0;
        }

        // 3. Calculate Preference Alignment (0-100)
        $prefAlignment = $this->calculatePreferenceAlignment($evidence, $job);

        // 4. Calculate Listing Freshness (0-100)
        $listingFreshness = $this->calculateListingFreshness($job);

        // 5. Calculate Application Preparation Readiness (0-100)
        $preparationReadiness = $this->calculatePreparationReadiness($profile, $match);

        // 6. Compute Weighted Priority Score (0-100)
        $matchScore = floatval($match->overall_score ?? 0.0);
        $rawPriorityScore = (
            ($matchScore * 0.40) +
            ($mandatoryCoverage * 0.25) +
            ($prefAlignment * 0.15) +
            ($listingFreshness * 0.10) +
            ($preparationReadiness * 0.10)
        );

        // If disqualified, cap priority score at 35.00
        if ($qualificationStatus === 'disqualified') {
            $rawPriorityScore = min($rawPriorityScore, 35.00);
        }

        $priorityScore = round(max(0.0, min(100.0, $rawPriorityScore)), 2);

        // 7. Assign Priority Tier
        $priorityTier = $this->determinePriorityTier($qualificationStatus, $priorityScore);

        // 8. Determine Confidence
        $confidence = $this->determineConfidence($qualificationStatus, $job, $match);

        // 9. Build Structured, Evidence-Grounded Breakdown
        $breakdown = $this->buildQualificationBreakdown(
            $match,
            $job,
            $evidence,
            $qualificationStatus,
            $priorityScore,
            $priorityTier,
            [
                'match_score' => $matchScore,
                'mandatory_coverage' => $mandatoryCoverage,
                'preference_alignment' => $prefAlignment,
                'listing_freshness' => $listingFreshness,
                'preparation_readiness' => $preparationReadiness,
            ]
        );

        // Update JobMatch attributes
        $match->priority_score = $priorityScore;
        $match->priority_tier = $priorityTier;
        $match->qualification_status = $qualificationStatus;
        $match->evaluation_confidence = $confidence;
        $match->qualification_breakdown = $breakdown;
        $match->save();

        return $match;
    }

    /**
     * Calculate candidate preference alignment for salary and work arrangement.
     */
    protected function calculatePreferenceAlignment(array $evidence, JobListing $job): float
    {
        $prefs = $evidence['preferences'] ?? [];
        $minSalary = $prefs['min_salary'] ?? null;
        $salaryScores = [];

        // Salary alignment
        if ($minSalary !== null && ($job->salary_min !== null || $job->salary_max !== null)) {
            $jobMax = $job->salary_max ?? $job->salary_min;
            if ($jobMax >= $minSalary) {
                $salaryScores[] = 100.0;
            } else {
                $deficitRatio = max(0.0, ($jobMax / $minSalary));
                $salaryScores[] = round($deficitRatio * 50.0, 2);
            }
        } else {
            // Neutral when salary is unlisted (never penalize missing salary as insufficient)
            $salaryScores[] = 85.0;
        }

        // Work arrangement alignment
        $candidateArrangements = array_map('strtolower', (array)($prefs['work_arrangements'] ?? []));
        $jobArrangement = strtolower($job->work_arrangement ?? 'unspecified');

        if (empty($candidateArrangements) || $jobArrangement === 'unspecified') {
            $arrangementScore = 80.0;
        } elseif (in_array($jobArrangement, $candidateArrangements, true)) {
            $arrangementScore = 100.0;
        } elseif ($jobArrangement === 'remote' && (in_array('hybrid', $candidateArrangements, true) || in_array('remote', $candidateArrangements, true))) {
            $arrangementScore = 100.0;
        } else {
            $arrangementScore = 30.0;
        }

        return round(($salaryScores[0] * 0.60) + ($arrangementScore * 0.40), 2);
    }

    /**
     * Calculate listing freshness score based on age.
     */
    protected function calculateListingFreshness(JobListing $job): float
    {
        if ($job->status === 'closed' || $job->status === 'expired') {
            return 10.0;
        }

        $date = $job->posted_at ?? $job->created_at ?? Carbon::now();
        $days = Carbon::parse($date)->diffInDays(Carbon::now());

        if ($days <= 7) {
            return 100.0;
        }
        if ($days <= 14) {
            return 80.0;
        }
        if ($days <= 30) {
            return 50.0;
        }

        return 25.0;
    }

    /**
     * Calculate preparation readiness score.
     */
    protected function calculatePreparationReadiness(CandidateProfile $profile, JobMatch $match): float
    {
        $score = 0.0;

        // Check if candidate has uploaded/confirmed resume
        $hasResume = \App\Models\Resume::where('user_id', $profile->user_id)->exists();
        if ($hasResume) {
            $score += 40.0;
        }

        // Check if candidate has verified technical skills matching this job
        $matchedSkills = (array)($match->matched_skills ?? []);
        if (!empty($matchedSkills)) {
            $score += 40.0;
        }

        // Check verified professional experience
        $hasWorkExp = $profile->workExperiences()->whereIn('classification', ['employment', 'contract', 'freelance'])->exists();
        if ($hasWorkExp) {
            $score += 20.0;
        }

        return $score;
    }

    /**
     * Determine priority tier based on qualification status and priority score.
     */
    protected function determinePriorityTier(string $qualificationStatus, float $priorityScore): string
    {
        if ($qualificationStatus === 'disqualified') {
            return 'not_recommended';
        }

        if ($qualificationStatus === 'requires_review') {
            return 'requires_review';
        }

        if ($priorityScore >= 80.00) {
            return 'top_priority';
        }

        if ($priorityScore >= 65.00) {
            return 'high_priority';
        }

        if ($priorityScore >= 50.00) {
            return 'medium_priority';
        }

        return 'low_priority';
    }

    /**
     * Helper to safely extract flat list of matched skill names.
     */
    protected function extractMatchedSkillNames(JobMatch $match): array
    {
        $raw = (array)($match->matched_skills ?? []);
        $names = [];

        if (isset($raw['exact']) && is_array($raw['exact'])) {
            $names = array_merge($names, $raw['exact']);
        }
        if (isset($raw['related']) && is_array($raw['related'])) {
            $names = array_merge($names, $raw['related']);
        }

        foreach ($raw as $key => $val) {
            if (is_string($val)) {
                $names[] = $val;
            } elseif (is_array($val) && !in_array($key, ['missing_required', 'missing_preferred'], true)) {
                foreach ($val as $subVal) {
                    if (is_string($subVal)) {
                        $names[] = $subVal;
                    }
                }
            }
        }

        return array_values(array_unique(array_filter($names, 'is_string')));
    }

    /**
     * Determine evaluation confidence.
     */
    protected function determineConfidence(string $qualificationStatus, JobListing $job, JobMatch $match): string
    {
        $descLength = strlen($job->description ?? '');
        if ($descLength < 100) {
            return 'low';
        }

        if ($qualificationStatus === 'requires_review') {
            return 'medium';
        }

        $matchedSkillNames = $this->extractMatchedSkillNames($match);
        if ($qualificationStatus === 'qualified' && !empty($matchedSkillNames)) {
            return 'high';
        }

        return 'medium';
    }

    /**
     * Construct structured, evidence-grounded explanation and citations.
     */
    protected function buildQualificationBreakdown(
        JobMatch $match,
        JobListing $job,
        array $evidence,
        string $qualificationStatus,
        float $priorityScore,
        string $priorityTier,
        array $scoreFactors
    ): array {
        $matchedRequirements = [];
        $missingRequirements = [];
        $candidateSkills = $evidence['skills'] ?? [];
        $jobSkills = (array)($job->skills ?? []);
        $matchedSkillNames = $this->extractMatchedSkillNames($match);

        // 1. Map matched skills with actual candidate evidence IDs
        foreach ($matchedSkillNames as $mSkill) {
            $evidenceRecord = null;
            foreach ($candidateSkills as $cSkill) {
                if (strcasecmp($cSkill['name'], $mSkill) === 0) {
                    $evidenceRecord = $cSkill;
                    break;
                }
            }

            $matchedRequirements[] = [
                'type' => 'technical_skill',
                'name' => $mSkill,
                'evidence_id' => $evidenceRecord ? 'skill_'.$evidenceRecord['id'] : null,
                'evidence_label' => $evidenceRecord ? "Verified Skill: {$mSkill} ({$evidenceRecord['years_of_experience']} yrs)" : "Skill: {$mSkill}",
                'verified' => true,
            ];
        }

        // 2. Identify missing job skills
        foreach ($jobSkills as $jSkill) {
            $isMatched = false;
            foreach ($matchedSkillNames as $mSkill) {
                if (strcasecmp($jSkill, $mSkill) === 0) {
                    $isMatched = true;
                    break;
                }
            }
            if (!$isMatched) {
                $missingRequirements[] = [
                    'type' => 'technical_skill',
                    'name' => $jSkill,
                    'severity' => 'preferred',
                    'note' => 'Skill not found in verified candidate profile.',
                ];
            }
        }

        // 3. Professional Experience Evidence Mapping (Strict anti-inflation)
        $verifiedYears = $evidence['verified_professional_years'] ?? 0.0;
        $matchedRequirements[] = [
            'type' => 'employment_duration',
            'name' => 'Verified Professional Experience',
            'evidence_id' => 'employment_history_total',
            'evidence_label' => "{$verifiedYears} years verified professional employment",
            'verified' => true,
        ];

        // 4. Blocking Issues and Warnings
        $blockingIssues = (array)($match->disqualification_reasons ?? []);
        $warnings = [];

        $evaluations = (array)($match->eligibility_evaluations ?? []);
        foreach ($evaluations as $criterion => $eval) {
            if (is_array($eval) && ($eval['status'] ?? '') === 'requires_manual_review') {
                $warnings[] = [
                    'criterion' => $criterion,
                    'reason' => $eval['reason'] ?? 'Criterion requires candidate confirmation.',
                ];
            }
        }

        // 5. Human-readable explanation text
        $explanation = $this->generateHumanExplanation(
            $job,
            $qualificationStatus,
            $priorityScore,
            $priorityTier,
            $matchedSkillNames,
            $verifiedYears,
            $blockingIssues,
            $warnings
        );

        return [
            'qualification_status' => $qualificationStatus,
            'priority_score' => $priorityScore,
            'priority_tier' => $priorityTier,
            'score_factors' => $scoreFactors,
            'matched_requirements' => $matchedRequirements,
            'missing_requirements' => $missingRequirements,
            'blocking_issues' => $blockingIssues,
            'warnings' => $warnings,
            'practical_projects_count' => count($evidence['practical_projects'] ?? []),
            'explanation' => $explanation,
            'evaluated_at' => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Generate plain-language explainability text citing verified background.
     */
    protected function generateHumanExplanation(
        JobListing $job,
        string $qualificationStatus,
        float $priorityScore,
        string $priorityTier,
        array $matchedSkills,
        float $verifiedYears,
        array $blockingIssues,
        array $warnings
    ): string {
        $tierName = ucwords(str_replace('_', ' ', $priorityTier));

        if ($qualificationStatus === 'disqualified') {
            $reason = !empty($blockingIssues) ? implode('; ', $blockingIssues) : 'Hard qualification mismatch.';
            return "This position is classified as Not Recommended because of verified mandatory conflicts: {$reason}";
        }

        if ($qualificationStatus === 'requires_review') {
            $warningList = !empty($warnings) ? implode('; ', array_column($warnings, 'reason')) : 'Mandatory requirements require candidate review.';
            return "This position has strong potential ({$priorityScore}/100 priority score), but requires manual review before applying: {$warningList}";
        }

        $skillsPart = !empty($matchedSkills)
            ? 'Key verified skills including '.implode(', ', array_slice($matchedSkills, 0, 3)).' directly align with role demands.'
            : 'Candidate profile shows foundational qualifications for this role.';

        return "Classified as {$tierName} (Priority Score: {$priorityScore}/100). {$skillsPart} Verified professional experience: {$verifiedYears} years. No blocking eligibility constraints detected.";
    }
}
