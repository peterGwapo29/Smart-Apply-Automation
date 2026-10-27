<?php

namespace App\Services\Matching;

use App\Models\CandidateProfile;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\User;
use App\Services\Contracts\SemanticAnalysisProviderInterface;
use Illuminate\Support\Facades\DB;

class JobMatchingService
{
    protected JobQualificationService $qualificationService;

    public function __construct(
        protected DeterministicScoringEngine $scoringEngine,
        protected EligibilityEvaluator $eligibilityEvaluator,
        protected SemanticAnalysisProviderInterface $semanticProvider,
        ?JobQualificationService $qualificationService = null
    ) {
        $this->qualificationService = $qualificationService ?? app(JobQualificationService::class);
    }

    /**
     * Compute and persist match score between candidate profile and a job listing.
     */
    public function match(User $user, JobListing $job): JobMatch
    {
        // Load candidate profile with complete relations
        $profile = CandidateProfile::with([
            'skills',
            'workExperiences',
            'portfolioProjects',
            'certifications',
            'preference',
        ])->firstOrCreate(
            ['user_id' => $user->id],
            ['full_name' => $user->name, 'email' => $user->email]
        );

        $preferences = $profile->preference;

        // 1. Component A: Calculate Deterministic Scores
        $scoreResult = $this->scoringEngine->calculate($profile, $preferences, $job);

        // 2. Component C: Evaluate Eligibility & Disqualifiers
        $eligibilityResult = $this->eligibilityEvaluator->evaluate(
            $profile,
            $preferences,
            $job,
            $scoreResult['professional_years']
        );

        // 3. Component B: Semantic Overlap Analysis (Offline / Privacy-safe)
        $semanticResult = $this->semanticProvider->analyzeOverlap(
            [
                'responsibilities' => $job->responsibilities ?? [],
                'required_qualifications' => $job->required_qualifications ?? [],
                'preferred_qualifications' => $job->preferred_qualifications ?? [],
            ],
            [
                'experiences' => $profile->workExperiences ? $profile->workExperiences->toArray() : [],
                'projects' => $profile->portfolioProjects ? $profile->portfolioProjects->toArray() : [],
            ]
        );

        // Persist to database
        $match = DB::transaction(function () use ($user, $profile, $job, $scoreResult, $eligibilityResult, $semanticResult) {
            return JobMatch::updateOrCreate(
                [
                    'candidate_profile_id' => $profile->id,
                    'job_listing_id' => $job->id,
                ],
                [
                    'user_id' => $user->id,
                    'overall_score' => $scoreResult['overall_score'],
                    'technical_score' => $scoreResult['technical_score'],
                    'experience_score' => $scoreResult['experience_score'],
                    'responsibilities_score' => $scoreResult['responsibilities_score'],
                    'work_arrangement_score' => $scoreResult['work_arrangement_score'],
                    'salary_score' => $scoreResult['salary_score'],
                    'eligibility_status' => $eligibilityResult['status'],
                    'eligibility_evaluations' => $eligibilityResult['evaluations'],
                    'disqualification_reasons' => $eligibilityResult['disqualification_reasons'],
                    'score_breakdown' => $scoreResult['score_breakdown'],
                    'matched_skills' => $scoreResult['matched_skills'],
                    'matched_responsibilities' => $scoreResult['matched_responsibilities'],
                    'semantic_analysis' => $semanticResult,
                    'scoring_version' => config('scoring.version', '1.0.0'),
                    'calculated_at' => now(),
                ]
            );
        });

        // 4. Component D: AI Job Qualification & Prioritization (Phase 9)
        return $this->qualificationService->evaluateAndPrioritize($match, $profile, $job);
    }

    /**
     * Compute matches for all saved job listings of a user.
     *
     * @return array{total_matched: int, average_score: float}
     */
    public function matchAll(User $user): array
    {
        $jobs = JobListing::where('user_id', $user->id)->activeOnly()->get();
        $scores = [];

        foreach ($jobs as $job) {
            $match = $this->match($user, $job);
            $scores[] = floatval($match->overall_score);
        }

        $avg = count($scores) > 0 ? round(array_sum($scores) / count($scores), 2) : 0.0;

        return [
            'total_matched' => count($jobs),
            'average_score' => $avg,
        ];
    }
}
