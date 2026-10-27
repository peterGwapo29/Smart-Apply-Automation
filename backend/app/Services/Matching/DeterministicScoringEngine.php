<?php

namespace App\Services\Matching;

use App\Models\CandidatePreference;
use App\Models\CandidateProfile;
use App\Models\JobListing;
use Carbon\Carbon;

class DeterministicScoringEngine
{
    /**
     * Compute the deterministic match score (0-100) and explainability matrix.
     *
     * @param CandidateProfile $profile
     * @param CandidatePreference|null $preferences
     * @param JobListing $job
     * @return array{
     *     overall_score: float,
     *     technical_score: float,
     *     experience_score: float,
     *     responsibilities_score: float,
     *     work_arrangement_score: float,
     *     salary_score: float,
     *     score_breakdown: array<string, mixed>,
     *     matched_skills: array<string, mixed>,
     *     matched_responsibilities: array<mixed>,
     *     professional_years: float
     * }
     */
    public function calculate(CandidateProfile $profile, ?CandidatePreference $preferences, JobListing $job): array
    {
        $weights = config('scoring.weights', [
            'technical_skills' => 40.0,
            'experience_seniority' => 25.0,
            'job_responsibilities' => 15.0,
            'work_arrangement' => 10.0,
            'salary_preferences' => 10.0,
        ]);

        // 1. Technical Skills Score (Weight: 40)
        $techResult = $this->calculateTechnicalSkills($profile, $job, $weights['technical_skills']);

        // 2. Relevant Experience and Seniority Score (Weight: 25)
        $expResult = $this->calculateExperienceAndSeniority($profile, $job, $weights['experience_seniority']);

        // 3. Job Responsibilities Score (Weight: 15)
        $respResult = $this->calculateResponsibilities($profile, $job, $weights['job_responsibilities']);

        // 4. Work Arrangement and Job Type Score (Weight: 10)
        $arrResult = $this->calculateWorkArrangement($preferences, $job, $weights['work_arrangement']);

        // 5. Salary and Preferences Score (Weight: 10)
        $salResult = $this->calculateSalary($preferences, $job, $weights['salary_preferences']);

        $overallScore = round(
            $techResult['score'] +
            $expResult['score'] +
            $respResult['score'] +
            $arrResult['score'] +
            $salResult['score'],
            2
        );

        $overallScore = min(max($overallScore, 0.0), 100.0);

        return [
            'overall_score' => $overallScore,
            'technical_score' => $techResult['score'],
            'experience_score' => $expResult['score'],
            'responsibilities_score' => $respResult['score'],
            'work_arrangement_score' => $arrResult['score'],
            'salary_score' => $salResult['score'],
            'professional_years' => $expResult['professional_years'],
            'score_breakdown' => [
                'weights' => $weights,
                'technical' => $techResult['breakdown'],
                'experience' => $expResult['breakdown'],
                'responsibilities' => $respResult['breakdown'],
                'work_arrangement' => $arrResult['breakdown'],
                'salary' => $salResult['breakdown'],
            ],
            'matched_skills' => $techResult['matched_skills'],
            'matched_responsibilities' => $respResult['matched_responsibilities'],
        ];
    }

    /**
     * Component A: Technical Skills (Max: 40 pts).
     */
    protected function calculateTechnicalSkills(CandidateProfile $profile, JobListing $job, float $maxWeight): array
    {
        $relatedMap = config('scoring.related_technologies', []);
        $subweights = config('scoring.skills_subweights', ['required' => 0.75, 'preferred' => 0.25]);

        // Candidate skills list (normalized lookup key with formatted display name)
        $candidateSkills = [];
        foreach ($profile->skills ?? [] as $sk) {
            $candidateSkills[strtolower($sk->name)] = $sk->display_name ?? ucfirst($sk->name);
        }

        // Job required and preferred skills
        $requiredReqs = $job->required_qualifications ?? [];
        $preferredReqs = $job->preferred_qualifications ?? [];

        // If listing does not have explicit arrays, extract potential skill words from description
        if (empty($requiredReqs) && empty($preferredReqs)) {
            $requiredReqs = $this->extractSkillsFromText($job->description ?? '');
        }

        $hasRequired = !empty($requiredReqs);
        $hasPreferred = !empty($preferredReqs);

        // Dynamic redistribution if one group is absent
        $wReq = $subweights['required'];
        $wPref = $subweights['preferred'];
        if ($hasRequired && !$hasPreferred) {
            $wReq = 1.0;
            $wPref = 0.0;
        } elseif (!$hasRequired && $hasPreferred) {
            $wReq = 0.0;
            $wPref = 1.0;
        } elseif (!$hasRequired && !$hasPreferred) {
            // No skills specified by job -> neutral 75% score
            return [
                'score' => round($maxWeight * 0.75, 2),
                'breakdown' => ['status' => 'No explicit technical qualifications detected in listing.'],
                'matched_skills' => ['exact' => [], 'related' => [], 'missing_required' => [], 'missing_preferred' => []],
            ];
        }

        $reqMatch = $this->evaluateSkillGroup($requiredReqs, $candidateSkills, $relatedMap);
        $prefMatch = $this->evaluateSkillGroup($preferredReqs, $candidateSkills, $relatedMap);

        $totalCoverage = ($reqMatch['coverage'] * $wReq) + ($prefMatch['coverage'] * $wPref);
        $score = round($totalCoverage * $maxWeight, 2);

        return [
            'score' => min($score, $maxWeight),
            'breakdown' => [
                'required_coverage_percent' => round($reqMatch['coverage'] * 100, 1),
                'preferred_coverage_percent' => round($prefMatch['coverage'] * 100, 1),
                'required_subweight' => $wReq,
                'preferred_subweight' => $wPref,
            ],
            'matched_skills' => [
                'exact' => array_unique(array_merge($reqMatch['exact'], $prefMatch['exact'])),
                'related' => array_unique(array_merge($reqMatch['related'], $prefMatch['related'])),
                'missing_required' => $reqMatch['missing'],
                'missing_preferred' => $prefMatch['missing'],
            ],
        ];
    }

    /**
     * Evaluate a group of skill requirements against candidate skills.
     */
    protected function evaluateSkillGroup(array $requirements, array $candidateSkills, array $relatedMap): array
    {
        if (empty($requirements)) {
            return ['coverage' => 1.0, 'exact' => [], 'related' => [], 'missing' => []];
        }

        $exactMatches = [];
        $relatedMatches = [];
        $missing = [];
        $totalEarnedCredit = 0.0;
        $totalItems = 0;

        foreach ($requirements as $req) {
            $reqLower = mb_strtolower(trim($req));
            if (empty($reqLower)) continue;

            $totalItems++;
            $matched = false;

            // Check exact skill match
            foreach ($candidateSkills as $name => $displayName) {
                $dispLower = mb_strtolower($displayName);
                if ($name === $reqLower || str_contains($reqLower, $name) || str_contains($reqLower, $dispLower)) {
                    $exactMatches[] = $displayName;
                    $totalEarnedCredit += 1.0;
                    $matched = true;
                    break;
                }
            }

            if ($matched) {
                continue;
            }

            // Check related technologies (0.5 partial credit)
            foreach ($candidateSkills as $name => $displayName) {
                $relatedList = $relatedMap[$name] ?? [];
                foreach ($relatedList as $relatedTech) {
                    if (str_contains($reqLower, $relatedTech)) {
                        $relatedMatches[] = "{$displayName} (related to {$relatedTech})";
                        $totalEarnedCredit += 0.5;
                        $matched = true;
                        break 2;
                    }
                }
            }

            if (!$matched) {
                // Shorten long sentences for clear display
                $missing[] = mb_strlen($req) > 50 ? mb_substr($req, 0, 47) . '...' : $req;
            }
        }

        $coverage = $totalItems > 0 ? min($totalEarnedCredit / $totalItems, 1.0) : 1.0;

        return [
            'coverage' => $coverage,
            'exact' => $exactMatches,
            'related' => $relatedMatches,
            'missing' => $missing,
        ];
    }

    /**
     * Component B: Relevant Experience and Seniority (Max: 25 pts).
     */
    protected function calculateExperienceAndSeniority(CandidateProfile $profile, JobListing $job, float $maxWeight): array
    {
        // Calculate strictly professional employment tenure
        $totalMonths = 0;
        $experiences = $profile->workExperiences ?? collect();

        foreach ($experiences as $exp) {
            // Strictly exclude personal or academic projects from professional duration!
            if (in_array($exp->classification, ['personal_project', 'academic_project'], true)) {
                continue;
            }

            $months = $this->calculateTenureMonths($exp->start_date, $exp->end_date, $exp->is_current);
            $totalMonths += $months;
        }

        $professionalYears = round($totalMonths / 12, 1);

        // Seniority Target
        $targetSeniority = $this->determineTargetSeniority($job->title ?? '', $job->description ?? '');
        $thresholds = config('scoring.seniority_years', [
            'intern' => 0.0,
            'junior' => 1.0,
            'mid' => 3.0,
            'senior' => 5.0,
            'lead' => 7.0,
        ]);

        $requiredYears = $thresholds[$targetSeniority] ?? 3.0;

        if ($requiredYears <= 0.0 || $professionalYears >= $requiredYears) {
            $score = $maxWeight;
            $ratio = 1.0;
        } else {
            // Proportional credit
            $ratio = min($professionalYears / $requiredYears, 1.0);
            $score = round($maxWeight * max($ratio, 0.4), 2);
        }

        return [
            'score' => min($score, $maxWeight),
            'professional_years' => $professionalYears,
            'breakdown' => [
                'professional_years' => $professionalYears,
                'target_seniority' => $targetSeniority,
                'required_years_benchmark' => $requiredYears,
                'tenure_satisfaction_ratio' => round($ratio * 100, 1),
            ],
        ];
    }

    /**
     * Component C: Job Responsibilities (Max: 15 pts).
     */
    protected function calculateResponsibilities(CandidateProfile $profile, JobListing $job, float $maxWeight): array
    {
        $duties = $job->responsibilities ?? [];
        if (empty($duties)) {
            // Neutral score if listing lacks responsibilities
            return [
                'score' => round($maxWeight * 0.70, 2),
                'breakdown' => ['status' => 'No explicit responsibilities listed in job.'],
                'matched_responsibilities' => [],
            ];
        }

        $experiences = $profile->workExperiences ?? collect();
        $projects = $profile->portfolioProjects ?? collect();

        $matchedList = [];
        $totalEarned = 0.0;

        foreach ($duties as $duty) {
            $dutyLower = mb_strtolower($duty);
            $words = array_filter(explode(' ', preg_replace('/[^\w\s]/u', '', $dutyLower)), fn($w) => strlen($w) > 3);
            $evidenceFound = null;
            $credit = 0.0;

            // 1. Check professional experiences for duty proof (1.0 credit)
            foreach ($experiences as $exp) {
                $expText = mb_strtolower(($exp->responsibilities ?? '') . ' ' . $exp->job_title);
                $matchesCount = 0;
                foreach ($words as $w) {
                    if (str_contains($expText, $w)) $matchesCount++;
                }
                if ($matchesCount >= 2 || (count($words) <= 2 && $matchesCount >= 1)) {
                    $evidenceFound = "Demonstrated at {$exp->company_name} ({$exp->job_title})";
                    $credit = 1.0;
                    break;
                }
            }

            // 2. Check portfolio projects if not found in experience (0.8 credit)
            if (!$evidenceFound) {
                foreach ($projects as $proj) {
                    $projText = mb_strtolower(($proj->description ?? '') . ' ' . $proj->name);
                    $matchesCount = 0;
                    foreach ($words as $w) {
                        if (str_contains($projText, $w)) $matchesCount++;
                    }
                    if ($matchesCount >= 2 || (count($words) <= 2 && $matchesCount >= 1)) {
                        $evidenceFound = "Demonstrated in Project '{$proj->name}'";
                        $credit = 0.8;
                        break;
                    }
                }
            }

            if ($evidenceFound) {
                $totalEarned += $credit;
                $matchedList[] = [
                    'duty' => $duty,
                    'evidence' => $evidenceFound,
                    'credit' => $credit,
                ];
            } else {
                $matchedList[] = [
                    'duty' => $duty,
                    'evidence' => 'No direct documented evidence in profile.',
                    'credit' => 0.0,
                ];
            }
        }

        $coverage = count($duties) > 0 ? min($totalEarned / count($duties), 1.0) : 0.7;
        $score = round($coverage * $maxWeight, 2);

        return [
            'score' => min($score, $maxWeight),
            'breakdown' => [
                'total_duties' => count($duties),
                'verified_duties' => count(array_filter($matchedList, fn($m) => $m['credit'] > 0)),
                'coverage_percent' => round($coverage * 100, 1),
            ],
            'matched_responsibilities' => $matchedList,
        ];
    }

    /**
     * Component D: Work Arrangement and Job Type (Max: 10 pts).
     */
    protected function calculateWorkArrangement(?CandidatePreference $preferences, JobListing $job, float $maxWeight): array
    {
        $jobType = mb_strtolower($job->employment_type ?? '');
        $jobDesc = mb_strtolower($job->description ?? '');

        // Detect job arrangement
        $isRemote = str_contains($jobDesc, 'remote') || str_contains($jobDesc, 'work from home') || str_contains($jobDesc, 'wfh');
        $isHybrid = str_contains($jobDesc, 'hybrid');
        $isOnSite = str_contains($jobDesc, 'on-site') || str_contains($jobDesc, 'office');

        if (!$preferences) {
            // Neutral baseline
            return [
                'score' => round($maxWeight * 0.70, 2),
                'breakdown' => ['status' => 'Candidate preferences not configured; neutral score assigned.'],
            ];
        }

        $preferredArrangements = array_map('strtolower', $preferences->work_arrangements ?? ['remote', 'hybrid']);
        $preferredTypes = array_map('strtolower', $preferences->employment_types ?? ['full-time']);

        $arrangementScore = 5.0; // default neutral
        if ($isRemote && in_array('remote', $preferredArrangements, true)) {
            $arrangementScore = 10.0;
        } elseif ($isHybrid && in_array('hybrid', $preferredArrangements, true)) {
            $arrangementScore = 9.0;
        } elseif ($isOnSite && in_array('on_site', $preferredArrangements, true)) {
            $arrangementScore = 8.0;
        } elseif ($isRemote || $isHybrid) {
            $arrangementScore = 7.0;
        }

        // Employment type alignment
        if (!empty($jobType) && !empty($preferredTypes)) {
            $matchedType = false;
            foreach ($preferredTypes as $pt) {
                if (str_contains($jobType, $pt)) {
                    $matchedType = true;
                    break;
                }
            }
            if (!$matchedType) {
                $arrangementScore = max($arrangementScore - 2.0, 3.0);
            }
        }

        $finalScore = round(($arrangementScore / 10.0) * $maxWeight, 2);

        return [
            'score' => min($finalScore, $maxWeight),
            'breakdown' => [
                'detected_arrangement' => $isRemote ? 'Remote' : ($isHybrid ? 'Hybrid' : ($isOnSite ? 'On-site' : 'Unspecified')),
                'candidate_preferred_arrangements' => $preferredArrangements,
            ],
        ];
    }

    /**
     * Component E: Salary and Preferences (Max: 10 pts).
     */
    protected function calculateSalary(?CandidatePreference $preferences, JobListing $job, float $maxWeight): array
    {
        $jobMin = $job->salary_min ? floatval($job->salary_min) : null;
        $jobMax = $job->salary_max ? floatval($job->salary_max) : null;

        // If listing does not disclose salary, assign neutral score (6.0/10) so candidate is not penalized
        if ($jobMin === null && $jobMax === null) {
            return [
                'score' => round($maxWeight * 0.60, 2),
                'breakdown' => ['status' => 'Undisclosed salary; neutral baseline score assigned.'],
            ];
        }

        if (!$preferences || empty($preferences->min_salary)) {
            return [
                'score' => round($maxWeight * 0.75, 2),
                'breakdown' => ['status' => 'No minimum salary expectation set in profile.'],
            ];
        }

        $candMin = floatval($preferences->min_salary);
        $candPref = $preferences->preferred_salary ? floatval($preferences->preferred_salary) : $candMin * 1.25;

        $targetJobSalary = $jobMax ?? $jobMin;

        if ($targetJobSalary >= $candPref) {
            $score = $maxWeight; // 100%
        } elseif ($targetJobSalary >= $candMin) {
            // Interpolate between 70% and 95%
            $ratio = ($targetJobSalary - $candMin) / max($candPref - $candMin, 1);
            $score = round($maxWeight * (0.70 + ($ratio * 0.25)), 2);
        } else {
            // Below candidate minimum
            $score = round($maxWeight * 0.20, 2);
        }

        return [
            'score' => min($score, $maxWeight),
            'breakdown' => [
                'job_salary_max' => $jobMax,
                'candidate_min' => $candMin,
                'candidate_preferred' => $candPref,
            ],
        ];
    }

    protected function determineTargetSeniority(string $title, string $description): string
    {
        $combined = mb_strtolower($title . ' ' . $description);
        if (str_contains($combined, 'lead') || str_contains($combined, 'principal') || str_contains($combined, 'architect')) {
            return 'lead';
        }
        if (str_contains($combined, 'senior') || str_contains($combined, 'sr.')) {
            return 'senior';
        }
        if (str_contains($combined, 'junior') || str_contains($combined, 'jr.') || str_contains($combined, 'entry level')) {
            return 'junior';
        }
        if (str_contains($combined, 'intern')) {
            return 'intern';
        }

        return 'mid';
    }

    protected function calculateTenureMonths(?string $startDate, ?string $endDate, bool $isCurrent): int
    {
        if (empty($startDate)) {
            return 12; // default 1 year fallback if date unstated
        }

        try {
            $start = Carbon::parse($startDate);
            $end = ($isCurrent || empty($endDate) || str_contains(strtolower($endDate), 'present'))
                ? Carbon::now()
                : Carbon::parse($endDate);

            return max($start->diffInMonths($end), 1);
        } catch (\Throwable) {
            return 12;
        }
    }

    protected function extractSkillsFromText(string $text): array
    {
        $lexicon = ['php', 'laravel', 'react', 'next.js', 'vue', 'angular', 'javascript', 'typescript', 'mysql', 'docker', 'aws', 'rest api', 'git', 'tailwind', 'python', 'node.js'];
        $found = [];
        $lower = mb_strtolower($text);
        foreach ($lexicon as $sk) {
            if (str_contains($lower, $sk)) {
                $found[] = ucfirst($sk);
            }
        }
        return $found;
    }
}
