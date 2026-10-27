<?php

namespace Tests\Feature;

use App\Models\CandidatePreference;
use App\Models\CandidateProfile;
use App\Models\CandidateSkill;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\PortfolioProject;
use App\Models\Skill;
use App\Models\User;
use App\Models\WorkExperience;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobQualificationAndPrioritizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected CandidateProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'Peter Candidate',
            'location' => 'Taguig, Metro Manila',
        ]);

        CandidatePreference::create([
            'candidate_profile_id' => $this->profile->id,
            'work_arrangements' => ['remote', 'hybrid'],
            'employment_types' => ['Full-time', 'Contract'],
            'min_salary' => 60000.00,
            'preferred_salary' => 90000.00,
            'salary_currency' => 'PHP',
            'salary_period' => 'monthly',
        ]);

        // Seed skills
        $php = Skill::firstOrCreate(['name' => 'php'], ['display_name' => 'PHP', 'category' => 'backend']);
        $laravel = Skill::firstOrCreate(['name' => 'laravel'], ['display_name' => 'Laravel', 'category' => 'backend']);
        $react = Skill::firstOrCreate(['name' => 'react'], ['display_name' => 'React', 'category' => 'frontend']);

        foreach ([$php, $laravel, $react] as $sk) {
            CandidateSkill::create([
                'candidate_profile_id' => $this->profile->id,
                'skill_id' => $sk->id,
                'review_status' => 'confirmed',
            ]);
        }

        // 3 years of verified employment
        WorkExperience::create([
            'candidate_profile_id' => $this->profile->id,
            'company_name' => 'Tech Corp',
            'job_title' => 'Software Engineer',
            'classification' => 'employment',
            'start_date' => '2021-01-01',
            'end_date' => '2024-01-01',
            'responsibilities' => 'Developed robust Laravel and PHP backends and React frontends.',
            'technologies_used' => ['php', 'laravel', 'react'],
        ]);
    }

    protected function createJob(array $attributes = []): JobListing
    {
        static $counter = 5000;
        $counter++;
        $title = $attributes['title'] ?? "Job {$counter}";

        return JobListing::create(array_merge([
            'user_id' => $this->user->id,
            'job_url' => "https://jobstreet.com.ph/job/{$counter}",
            'canonical_url' => "https://jobstreet.com.ph/job/{$counter}",
            'content_hash' => hash('sha256', "job_{$counter}_{$title}"),
            'title' => $title,
            'company_name' => 'Fintech Innovators',
            'location' => 'Remote',
            'work_arrangement' => 'Remote',
            'employment_type' => 'Full-time',
            'description' => 'Test job description.',
        ], $attributes));
    }

    public function test_job_matching_automatically_calculates_priority_and_qualification(): void
    {
        $job = $this->createJob([
            'title' => 'Senior Laravel Developer',
            'skills' => ['php', 'laravel', 'react'],
            'required_qualifications' => ['At least 2 years of professional Laravel experience'],
            'salary_min' => 70000.00,
            'salary_max' => 100000.00,
            'salary_currency' => 'PHP',
            'description' => 'We are seeking a seasoned Laravel engineer with strong PHP skills.',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");

        $response->assertStatus(200);
        $match = JobMatch::where('job_listing_id', $job->id)->first();
        $this->assertNotNull($match);

        // Assert Phase 9 attributes are populated
        $this->assertNotNull($match->priority_score);
        $this->assertGreaterThan(60.00, floatval($match->priority_score));
        $this->assertEquals('qualified', $match->qualification_status);
        $this->assertContains($match->priority_tier, ['top_priority', 'high_priority']);
        $this->assertIsArray($match->qualification_breakdown);
        $this->assertNotEmpty($match->qualification_breakdown['matched_requirements']);
        $this->assertNotEmpty($match->qualification_breakdown['explanation']);
    }

    public function test_disqualification_when_hard_constraint_violated_sets_not_recommended_tier(): void
    {
        $job = $this->createJob([
            'title' => 'Principal Architect',
            'company_name' => 'Enterprise Corp',
            'location' => 'Cebu',
            'work_arrangement' => 'On-site',
            'skills' => ['kubernetes', 'c++'],
            'required_qualifications' => [
                'Must have at least 10 years of professional software development experience',
                'Must possess active Philippine Bar license',
            ],
            'description' => 'Mandatory 10+ years experience and legal license required.',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");

        $response->assertStatus(200);
        $match = JobMatch::where('job_listing_id', $job->id)->first();

        $this->assertEquals('disqualified', $match->qualification_status);
        $this->assertEquals('not_recommended', $match->priority_tier);
        $this->assertLessThanOrEqual(35.00, floatval($match->priority_score));
        $this->assertNotEmpty($match->qualification_breakdown['blocking_issues']);
    }

    public function test_ambiguous_requirement_flags_requires_review_tier(): void
    {
        $job = $this->createJob([
            'title' => 'Software Engineer',
            'company_name' => 'Global Logistics',
            'skills' => ['php', 'laravel'],
            'required_qualifications' => ['Must have certification in AWS Certified Solutions Architect'],
            'description' => 'Looking for software engineer. Must have certification in AWS Certified Solutions Architect.',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");

        $response->assertStatus(200);
        $match = JobMatch::where('job_listing_id', $job->id)->first();

        $this->assertEquals('requires_review', $match->qualification_status);
        $this->assertEquals('requires_review', $match->priority_tier);
        $this->assertNotEmpty($match->qualification_breakdown['warnings']);
    }

    public function test_personal_projects_are_strictly_excluded_from_professional_employment_tenure(): void
    {
        // Add 5 years of personal portfolio projects
        PortfolioProject::create([
            'candidate_profile_id' => $this->profile->id,
            'name' => 'Side Open Source Project',
            'description' => 'Personal hobby project for 5 years',
            'technologies_used' => ['php', 'laravel'],
        ]);

        // Job requiring 5 years of professional experience
        $job = $this->createJob([
            'title' => 'Lead Engineer',
            'company_name' => 'Scale Tech',
            'skills' => ['php', 'laravel'],
            'required_qualifications' => ['Minimum 5 years of professional experience'],
            'description' => 'Minimum 5 years of verified professional experience.',
        ]);

        $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");

        $match = JobMatch::where('job_listing_id', $job->id)->first();
        // Candidate has 3 years employment + hobby projects. 3 years < 5 years, so not eligible/qualified!
        $this->assertNotEquals('qualified', $match->qualification_status);
        $this->assertNotEquals('top_priority', $match->priority_tier);

        // Assert explanation cites strictly 3 years verified professional employment
        $breakdown = $match->qualification_breakdown;
        $this->assertStringContainsString('3 years', $breakdown['explanation']);
    }

    public function test_unlisted_salary_does_not_penalize_priority_score_as_zero(): void
    {
        $jobNoSalary = $this->createJob([
            'title' => 'Laravel Developer',
            'company_name' => 'Tech Studio',
            'skills' => ['php', 'laravel'],
            'salary_min' => null,
            'salary_max' => null,
            'description' => 'Competitive salary and flexible perks.',
        ]);

        $this->actingAs($this->user)->postJson("/api/jobs/{$jobNoSalary->id}/match");
        $match = JobMatch::where('job_listing_id', $jobNoSalary->id)->first();

        // Preference alignment should be generous/neutral (>= 80%) not 0
        $scoreFactors = $match->qualification_breakdown['score_factors'];
        $this->assertGreaterThanOrEqual(80.0, floatval($scoreFactors['preference_alignment']));
    }

    public function test_prioritized_jobs_api_sorts_and_filters(): void
    {
        // Job A: High match & qualified
        $jobA = $this->createJob([
            'title' => 'Senior Laravel Specialist',
            'company_name' => 'Elite Agency',
            'skills' => ['php', 'laravel', 'react'],
            'salary_min' => 80000.00,
            'salary_max' => 120000.00,
            'description' => 'Great senior opportunity.',
        ]);

        // Job B: Mismatched skills & on-site
        $jobB = $this->createJob([
            'title' => 'Rust Systems Developer',
            'company_name' => 'Embedded Systems',
            'location' => 'Davao',
            'work_arrangement' => 'On-site',
            'skills' => ['rust', 'c', 'assembly'],
            'salary_min' => 30000.00,
            'salary_max' => 40000.00,
            'description' => 'Systems programming on-site.',
        ]);

        $this->actingAs($this->user)->postJson("/api/jobs/{$jobA->id}/match");
        $this->actingAs($this->user)->postJson("/api/jobs/{$jobB->id}/match");

        $response = $this->actingAs($this->user)->getJson('/api/jobs/prioritized');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(2, $data);
        // First job in descending priority order must be Job A
        $this->assertEquals($jobA->id, $data[0]['id']);
        $this->assertGreaterThan($data[1]['priority_score'], $data[0]['priority_score']);

        // Test filtering by priority tier
        $tier = $data[0]['priority_tier'];
        $filterResponse = $this->actingAs($this->user)->getJson("/api/jobs/prioritized?priority_tier={$tier}");
        $filterResponse->assertStatus(200);
        $filterData = $filterResponse->json('data');
        $this->assertNotEmpty($filterData);
        $this->assertEquals($tier, $filterData[0]['priority_tier']);
    }

    public function test_candidate_profile_isolation_prevents_cross_user_access(): void
    {
        $otherUser = User::factory()->create();

        $otherJob = JobListing::create([
            'user_id' => $otherUser->id,
            'job_url' => 'https://jobstreet.com.ph/job/8888',
            'canonical_url' => 'https://jobstreet.com.ph/job/8888',
            'content_hash' => hash('sha256', 'other_job'),
            'title' => 'Confidential Job',
            'company_name' => 'Secret Corp',
            'description' => 'Secret role.',
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/jobs/{$otherJob->id}/qualification");
        $response->assertStatus(404);

        $recalcResponse = $this->actingAs($this->user)->postJson("/api/jobs/{$otherJob->id}/qualification/recalculate");
        $recalcResponse->assertStatus(404);
    }

    public function test_recalculate_endpoint_refreshes_qualification_breakdown(): void
    {
        $job = $this->createJob([
            'title' => 'Fullstack Developer',
            'company_name' => 'Fintech Hub',
            'skills' => ['php', 'laravel'],
            'description' => 'Fullstack position.',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/qualification/recalculate");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'message',
            'data' => [
                'job_id',
                'match_score',
                'priority_score',
                'priority_tier',
                'qualification_status',
                'evaluation_confidence',
                'breakdown' => [
                    'qualification_status',
                    'priority_score',
                    'priority_tier',
                    'matched_requirements',
                    'explanation',
                ],
            ],
        ]);
    }
}
