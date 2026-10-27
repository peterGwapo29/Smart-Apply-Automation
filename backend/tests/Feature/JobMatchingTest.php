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

class JobMatchingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected CandidateProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'peter@jobstreet-automation.local',
        ]);

        $this->profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'Peter Candidate',
            'location' => 'Taguig, Metro Manila',
        ]);

        // Seed default preferences
        CandidatePreference::create([
            'candidate_profile_id' => $this->profile->id,
            'work_arrangements' => ['remote', 'hybrid'],
            'employment_types' => ['Full-time', 'Contract'],
            'min_salary' => 60000.00,
            'preferred_salary' => 90000.00,
            'salary_currency' => 'PHP',
            'salary_period' => 'monthly',
        ]);

        // Seed candidate skills
        $php = Skill::firstOrCreate(['name' => 'php'], ['display_name' => 'PHP', 'category' => 'backend']);
        $laravel = Skill::firstOrCreate(['name' => 'laravel'], ['display_name' => 'Laravel', 'category' => 'backend']);
        $react = Skill::firstOrCreate(['name' => 'react'], ['display_name' => 'React', 'category' => 'frontend']);
        $mysql = Skill::firstOrCreate(['name' => 'mysql'], ['display_name' => 'MySQL', 'category' => 'database']);

        foreach ([$php, $laravel, $react, $mysql] as $sk) {
            CandidateSkill::create([
                'candidate_profile_id' => $this->profile->id,
                'skill_id' => $sk->id,
                'review_status' => 'confirmed',
            ]);
        }

        // Seed 4 years of verified professional experience
        WorkExperience::create([
            'candidate_profile_id' => $this->profile->id,
            'company_name' => 'Acme Soft Inc.',
            'job_title' => 'Software Engineer',
            'classification' => 'employment',
            'is_current' => false,
            'start_date' => '2020-01',
            'end_date' => '2024-01',
            'responsibilities' => 'Developed REST APIs in Laravel and optimized SQL database queries.',
            'technologies_used' => ['PHP', 'Laravel', 'MySQL'],
            'review_status' => 'confirmed',
        ]);

        // Seed a personal project (must NOT count as professional tenure, but provides technical proof)
        PortfolioProject::create([
            'candidate_profile_id' => $this->profile->id,
            'name' => 'Golden Resort Booking System',
            'category' => 'personal',
            'description' => 'Built real-time booking platform with React and Next.js.',
            'technologies_used' => ['React', 'Next.js'],
            'review_status' => 'confirmed',
        ]);
    }

    /**
     * Test deterministic matching score calculation with exact and related skills.
     */
    public function test_deterministic_matching_calculates_accurate_score(): void
    {
        $job = JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/79512345',
            'title' => 'Senior Laravel Developer',
            'company_name' => 'NextGen Cloud',
            'location' => 'Remote',
            'description' => 'We are hiring a Senior Laravel Developer. 100% remote work available.',
            'responsibilities' => [
                'Developed REST APIs in Laravel',
                'Design optimized database schema and queries',
            ],
            'required_qualifications' => [
                'PHP',
                'Laravel',
            ],
            'preferred_qualifications' => [
                'Next.js', // Candidate has React -> related technology (0.5 partial credit)
            ],
            'salary_min' => 80000,
            'salary_max' => 110000,
            'salary_currency' => 'PHP',
            'employment_type' => 'Full-time',
            'content_hash' => hash('sha256', 'job123'),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/jobs/{$job->id}/match");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'match' => [
                    'job_listing_id' => $job->id,
                    'eligibility_status' => 'eligible',
                ],
            ]);

        $match = $response->json('match');
        $this->assertGreaterThan(75.0, floatval($match['overall_score']));
        $this->assertGreaterThan(0.0, floatval($match['technical_score']));
        $this->assertGreaterThan(0.0, floatval($match['experience_score']));
        $this->assertGreaterThan(0.0, floatval($match['responsibilities_score']));
        $this->assertEquals(10.0, floatval($match['work_arrangement_score'])); // 100% remote matches candidate preference
        $this->assertEquals(10.0, floatval($match['salary_score'])); // 110k exceeds candidate preferred 90k

        // Check matched skills
        $this->assertContains('PHP', $match['matched_skills']['exact']);
        $this->assertContains('Laravel', $match['matched_skills']['exact']);
    }

    /**
     * Test personal projects are strictly excluded from professional employment duration.
     */
    public function test_personal_projects_do_not_inflate_professional_duration(): void
    {
        // Add a 5-year personal project
        WorkExperience::create([
            'candidate_profile_id' => $this->profile->id,
            'company_name' => 'Independent Lab',
            'job_title' => 'Hobbyist Creator',
            'classification' => 'personal_project', // Personal project!
            'is_current' => false,
            'start_date' => '2015-01',
            'end_date' => '2020-01',
            'responsibilities' => 'Built hobby apps',
            'review_status' => 'confirmed',
        ]);

        $job = JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/1001',
            'title' => 'Mid Laravel Engineer',
            'content_hash' => hash('sha256', 'mid_job'),
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");
        $response->assertStatus(200);

        // Professional years should reflect strictly the 4 years from Acme Soft, not the 5 years from hobby project!
        $expBreakdown = $response->json('match.score_breakdown.experience');
        $this->assertEquals(4.0, $expBreakdown['professional_years']);
    }

    /**
     * Test eligibility status becomes requires_review when an unverified mandatory license is mentioned.
     */
    public function test_eligibility_status_requires_review_on_ambiguous_or_unverified_mandatory_license(): void
    {
        $job = JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/1002',
            'title' => 'FinTech Compliance Engineer',
            'description' => 'Candidate must have certification in CPA License to audit financial systems.',
            'content_hash' => hash('sha256', 'fintech_job'),
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");
        $response->assertStatus(200);

        // Missing from profile must NOT be marked disqualified (could be missing resume info); requires_review!
        $this->assertEquals('requires_review', $response->json('match.eligibility_status'));
        $this->assertEquals('requires_manual_review', $response->json('match.eligibility_evaluations.certifications.status'));
    }

    /**
     * Test hard disqualification when candidate strictly requires remote but job is strictly on-site.
     */
    public function test_disqualification_when_hard_constraint_is_violated(): void
    {
        // Set hard disqualifier: candidate strictly requires remote
        $pref = CandidatePreference::where('candidate_profile_id', $this->profile->id)->first();
        $pref->update([
            'hard_disqualifiers' => ['require_remote_only' => true],
        ]);

        $job = JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/1003',
            'title' => 'Bank Core Developer',
            'description' => 'This role is strictly on-site at our head office. Must report to office daily.',
            'content_hash' => hash('sha256', 'bank_job'),
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/match");
        $response->assertStatus(200);

        $this->assertEquals('disqualified', $response->json('match.eligibility_status'));
        $this->assertNotEmpty($response->json('match.disqualification_reasons'));
    }

    /**
     * Test batch matching (/api/jobs/match-all).
     */
    public function test_batch_matching_processes_all_jobs(): void
    {
        JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/2001',
            'title' => 'Job 1',
            'content_hash' => hash('sha256', 'batch1'),
        ]);

        JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/2002',
            'title' => 'Job 2',
            'content_hash' => hash('sha256', 'batch2'),
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/jobs/match-all');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'total_matched' => 2,
                ],
            ]);

        $this->assertEquals(2, JobMatch::where('user_id', $this->user->id)->count());
    }

    /**
     * Test candidate preferences retrieval and update.
     */
    public function test_candidate_preferences_endpoints(): void
    {
        // GET
        $getResp = $this->actingAs($this->user)->getJson('/api/candidate-profile/preferences');
        $getResp->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'preferences' => [
                    'min_salary' => '60000.00',
                ],
            ]);

        // PUT
        $putResp = $this->actingAs($this->user)->putJson('/api/candidate-profile/preferences', [
            'min_salary' => 75000,
            'preferred_salary' => 110000,
            'work_arrangements' => ['remote'],
        ]);
        $putResp->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'preferences' => [
                    'min_salary' => '75000.00',
                    'preferred_salary' => '110000.00',
                    'work_arrangements' => ['remote'],
                ],
            ]);
    }
}
