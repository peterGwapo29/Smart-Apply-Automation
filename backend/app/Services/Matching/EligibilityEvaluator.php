<?php

namespace App\Services\Matching;

use App\Models\CandidateProfile;
use App\Models\CandidatePreference;
use App\Models\JobListing;

class EligibilityEvaluator
{
    /**
     * Evaluate eligibility and mandatory constraints independently of the numerical score.
     *
     * @param CandidateProfile $profile
     * @param CandidatePreference|null $preferences
     * @param JobListing $job
     * @param float $professionalYears
     * @return array{
     *     status: string,
     *     evaluations: array<string, array{status: string, reason: string, details?: mixed}>,
     *     disqualification_reasons: array<string>
     * }
     */
    public function evaluate(
        CandidateProfile $profile,
        ?CandidatePreference $preferences,
        JobListing $job,
        float $professionalYears
    ): array {
        $evaluations = [];
        $disqualifications = [];
        $requiresReview = false;

        $desc = mb_strtolower($job->description ?? '');
        $qualifications = array_merge(
            $job->required_qualifications ?? [],
            $job->preferred_qualifications ?? []
        );

        // 1. Mandatory Certifications Check
        $certEvaluation = $this->evaluateCertifications($profile, $qualifications, $desc);
        $evaluations['certifications'] = $certEvaluation;
        if ($certEvaluation['status'] === 'unmet') {
            $disqualifications[] = $certEvaluation['reason'];
        } elseif ($certEvaluation['status'] === 'requires_manual_review' || $certEvaluation['status'] === 'unknown') {
            $requiresReview = true;
        }

        // 2. Minimum Professional Years Check
        $yearsEvaluation = $this->evaluateExperienceDuration($qualifications, $desc, $professionalYears);
        $evaluations['minimum_experience'] = $yearsEvaluation;
        if ($yearsEvaluation['status'] === 'unmet') {
            $disqualifications[] = $yearsEvaluation['reason'];
        } elseif ($yearsEvaluation['status'] === 'requires_manual_review' || $yearsEvaluation['status'] === 'unknown') {
            $requiresReview = true;
        }

        // 3. Work Arrangement & Location Disqualifier Check
        $arrangementEvaluation = $this->evaluateWorkArrangement($preferences, $job);
        $evaluations['work_arrangement'] = $arrangementEvaluation;
        if ($arrangementEvaluation['status'] === 'unmet') {
            $disqualifications[] = $arrangementEvaluation['reason'];
        }

        // 4. Stated Work Authorization / Visa
        $authEvaluation = $this->evaluateWorkAuthorization($desc);
        $evaluations['work_authorization'] = $authEvaluation;
        if ($authEvaluation['status'] === 'requires_manual_review') {
            $requiresReview = true;
        }

        // Determine overall status
        $overallStatus = 'eligible';
        if (!empty($disqualifications)) {
            $overallStatus = 'disqualified';
        } elseif ($requiresReview) {
            $overallStatus = 'requires_review';
        }

        return [
            'status' => $overallStatus,
            'evaluations' => $evaluations,
            'disqualification_reasons' => $disqualifications,
        ];
    }

    /**
     * Check if job explicitly demands certifications that candidate may or may not possess.
     */
    protected function evaluateCertifications(CandidateProfile $profile, array $qualifications, string $description): array
    {
        $mandatoryKeywords = ['must have certification', 'required certification', 'cpa license', 'bar license', 'pmp certified', 'aws certified'];
        $detectedRequirement = null;

        foreach ($mandatoryKeywords as $kw) {
            if (str_contains($description, $kw)) {
                $detectedRequirement = $kw;
                break;
            }
        }

        if (!$detectedRequirement) {
            return [
                'status' => 'met',
                'reason' => 'No explicit mandatory professional certification or license identified.',
            ];
        }

        // Check verified candidate certifications
        $candidateCerts = $profile->certifications ?? collect();
        foreach ($candidateCerts as $cert) {
            if (str_contains(mb_strtolower($cert->name), str_replace(['required certification in ', 'must have certification in '], '', $detectedRequirement))) {
                return [
                    'status' => 'met',
                    'reason' => "Verified candidate certification matches requirement: {$cert->name}.",
                ];
            }
        }

        // Missing from profile is NOT proof candidate lacks it; flag for review
        return [
            'status' => 'requires_manual_review',
            'reason' => "Listing mentions mandatory requirement: '{$detectedRequirement}'. Verified profile does not reference this certification.",
        ];
    }

    /**
     * Check minimum professional years stated in qualifications or description.
     */
    protected function evaluateExperienceDuration(array $qualifications, string $description, float $professionalYears): array
    {
        $allText = implode("\n", $qualifications) . "\n" . $description;
        $requiredYears = null;

        // Look for patterns like "5+ years", "at least 3 years", "minimum of 4 years"
        if (preg_match('/(?:at\s*least|minimum\s*(?:of)?|\b)(\d+)\+?\s*years?(?:\s*(?:of)?\s*(?:relevant|professional|work)?\s*experience)?/i', $allText, $matches)) {
            $requiredYears = floatval($matches[1]);
        }

        if ($requiredYears === null) {
            return [
                'status' => 'met',
                'reason' => 'No explicit minimum professional years stated.',
                'details' => ['required_years' => null, 'candidate_years' => $professionalYears],
            ];
        }

        if ($professionalYears >= $requiredYears) {
            return [
                'status' => 'met',
                'reason' => "Candidate possesses {$professionalYears} verified professional years, satisfying the {$requiredYears}+ years requirement.",
                'details' => ['required_years' => $requiredYears, 'candidate_years' => $professionalYears],
            ];
        }

        // If candidate is within 80% of requirement, require manual review rather than hard disqualification
        if ($professionalYears >= ($requiredYears * 0.75)) {
            return [
                'status' => 'requires_manual_review',
                'reason' => "Candidate has {$professionalYears} verified professional years, close to the {$requiredYears}+ years requested.",
                'details' => ['required_years' => $requiredYears, 'candidate_years' => $professionalYears],
            ];
        }

        return [
            'status' => 'unmet',
            'reason' => "Job requires at least {$requiredYears} professional years; verified profile demonstrates {$professionalYears} years.",
            'details' => ['required_years' => $requiredYears, 'candidate_years' => $professionalYears],
        ];
    }

    /**
     * Check candidate work arrangement preferences against job requirements.
     */
    protected function evaluateWorkArrangement(?CandidatePreference $preferences, JobListing $job): array
    {
        if (!$preferences || empty($preferences->hard_disqualifiers)) {
            return [
                'status' => 'met',
                'reason' => 'No strict work arrangement disqualifiers configured.',
            ];
        }

        $disqualifiers = $preferences->hard_disqualifiers;
        $jobDesc = mb_strtolower($job->description ?? '');
        $jobTitle = mb_strtolower($job->title ?? '');

        // Check strict remote requirement
        if (!empty($disqualifiers['require_remote_only'])) {
            $isOnSiteStrict = str_contains($jobDesc, 'strictly on-site') || str_contains($jobDesc, '100% on-site') || str_contains($jobDesc, 'must report to office daily');
            if ($isOnSiteStrict) {
                return [
                    'status' => 'unmet',
                    'reason' => 'Candidate strictly requires remote work, but listing specifies 100% on-site presence.',
                ];
            }
        }

        return [
            'status' => 'met',
            'reason' => 'Work arrangement aligns with candidate parameters.',
        ];
    }

    /**
     * Check work authorization signals.
     */
    protected function evaluateWorkAuthorization(string $description): array
    {
        $authKeywords = ['must be a citizen', 'security clearance required', 'no visa sponsorship', 'philippines citizen only'];
        foreach ($authKeywords as $kw) {
            if (str_contains($description, $kw)) {
                return [
                    'status' => 'requires_manual_review',
                    'reason' => "Job specifies work authorization criteria: '{$kw}'. Please verify eligibility.",
                ];
            }
        }

        return [
            'status' => 'met',
            'reason' => 'No restrictive authorization or security clearance restrictions identified.',
        ];
    }
}
