<?php

namespace Tests\Feature;

use App\Models\CandidateProfile;
use App\Models\CandidatePreference;
use App\Models\JobDiscoveryRun;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\JobUserWorkflow;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobSearchAndActiveListingAuditTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private CandidateProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'Peter Candidate',
            'email' => 'peter@jobstreet-automation.local',
            'headline' => 'Senior Full Stack Developer',
            'location' => 'Taguig, Philippines',
        ]);

        CandidatePreference::create([
            'candidate_profile_id' => $this->profile->id,
            'min_salary' => 80000,
            'preferred_salary' => 120000,
            'salary_currency' => 'PHP',
            'work_arrangements' => ['remote', 'hybrid'],
            'notice_period_weeks' => 2,
            'min_match_threshold' => 70,
        ]);
    }

    private function createSampleListing(array $attributes = []): JobListing
    {
        return JobListing::create(array_merge([
            'user_id' => $this->user->id,
            'source_platform' => 'authorized_feed',
            'source_job_id' => 'job_' . uniqid(),
            'canonical_url' => 'https://smartapply.local/jobs/' . uniqid(),
            'title' => 'Software Engineer',
            'company_name' => 'Acme Tech',
            'location' => 'Taguig, Philippines',
            'description' => 'Standard engineering position.',
            'responsibilities' => ['Build clean APIs'],
            'required_qualifications' => ['Software Engineering'],
            'preferred_qualifications' => [],
            'salary_min' => 90000,
            'salary_max' => 130000,
            'salary_currency' => 'PHP',
            'salary_raw' => 'PHP 90,000 - 130,000',
            'employment_type' => 'Full-time',
            'application_method' => 'quick_apply',
            'quick_apply_status' => 'available',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'retrieval_method' => 'authorized_feed',
            'first_detected_at' => now(),
            'last_observed_at' => now(),
            'extraction_status' => 'complete',
            'content_hash' => hash('sha256', uniqid()),
            'review_status' => 'pending_review',
        ], $attributes));
    }

    public function test_search_laravel_returns_only_matching_laravel_jobs(): void
    {
        $jobLaravel = $this->createSampleListing([
            'title' => 'Senior Laravel / PHP Full-Stack Engineer',
            'company_name' => 'Metro Global Tech Solutions',
            'required_qualifications' => ['PHP', 'Laravel', 'MySQL'],
        ]);

        $jobPython = $this->createSampleListing([
            'title' => 'Senior Python & Django Developer',
            'company_name' => 'PyWorks Analytics',
            'required_qualifications' => ['Python', 'Django'],
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=Laravel');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $jobLaravel->id);
    }

    public function test_search_react_does_not_return_laravel_only_jobs_with_incidental_mention(): void
    {
        // Job with Laravel title/skills and incidental mention in body
        $laravelJob = $this->createSampleListing([
            'title' => 'Senior Laravel / PHP Full-Stack Engineer',
            'company_name' => 'Metro Global Tech Solutions',
            'required_qualifications' => ['PHP', 'Laravel'],
            'description' => 'Seeking an experienced backend engineer. Hands-on experience with Vue or React is a plus.',
        ]);

        // Real React Job
        $reactJob = $this->createSampleListing([
            'title' => 'Staff React & Frontend Engineer',
            'company_name' => 'FinScale Technologies',
            'required_qualifications' => ['React', 'TypeScript', 'Next.js'],
            'description' => 'Lead frontend architecture in React and TypeScript.',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=React%20Engineer');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $reactJob->id);
    }

    public function test_search_nonexistent_keyword_returns_empty_result_set(): void
    {
        $this->createSampleListing(['title' => 'Senior Laravel Engineer']);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=GolangRustBlockchainSpecialist999');

        $response->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_search_company_name_and_location_filtering(): void
    {
        $jobTaguig = $this->createSampleListing([
            'title' => 'Laravel Developer',
            'company_name' => 'Metro Global Tech Solutions',
            'location' => 'Taguig, Metro Manila, Philippines',
        ]);

        $jobCebu = $this->createSampleListing([
            'title' => 'Full-Stack Developer',
            'company_name' => 'Apex Cloud Systems Australia',
            'location' => 'Cebu City, Philippines',
        ]);

        // Search by company
        $resCompany = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=Metro%20Global');
        $resCompany->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $jobTaguig->id);

        // Search by location
        $resLoc = $this->actingAs($this->user)
            ->getJson('/api/jobs?location=Cebu');
        $resLoc->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $jobCebu->id);
    }

    public function test_search_results_strictly_exclude_expired_listings(): void
    {
        $activeJob = $this->createSampleListing([
            'title' => 'Active Laravel Developer',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'expires_at' => now()->addDays(14),
        ]);

        $expiredJob = $this->createSampleListing([
            'title' => 'Expired Laravel Developer',
            'listing_status' => JobListing::STATUS_EXPIRED,
            'expires_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=Laravel');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $activeJob->id);
    }

    public function test_search_results_strictly_exclude_closed_and_withdrawn_listings(): void
    {
        $activeJob = $this->createSampleListing([
            'title' => 'Active Backend Developer',
            'listing_status' => JobListing::STATUS_ACTIVE,
        ]);

        $closedJob = $this->createSampleListing([
            'title' => 'Closed Backend Developer',
            'listing_status' => JobListing::STATUS_CLOSED,
        ]);

        $withdrawnJob = $this->createSampleListing([
            'title' => 'Withdrawn Backend Developer',
            'listing_status' => JobListing::STATUS_WITHDRAWN,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=Backend');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $activeJob->id);
    }

    public function test_unknown_and_unavailable_listings_are_excluded_from_actionable_results(): void
    {
        $activeJob = $this->createSampleListing([
            'title' => 'Senior Engineer',
            'listing_status' => JobListing::STATUS_ACTIVE,
        ]);

        $unknownJob = $this->createSampleListing([
            'title' => 'Senior Engineer Two',
            'listing_status' => JobListing::STATUS_UNKNOWN,
        ]);

        $unavailableJob = $this->createSampleListing([
            'title' => 'Senior Engineer Three',
            'listing_status' => JobListing::STATUS_UNAVAILABLE,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $activeJob->id);
    }

    public function test_prioritized_recommendations_exclude_inactive_jobs_even_with_high_priority_score(): void
    {
        $activeJob = $this->createSampleListing([
            'title' => 'Active High Fit Job',
            'listing_status' => JobListing::STATUS_ACTIVE,
        ]);

        $expiredJob = $this->createSampleListing([
            'title' => 'Expired High Fit Job',
            'listing_status' => JobListing::STATUS_EXPIRED,
            'expires_at' => now()->subDay(),
        ]);

        JobMatch::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $activeJob->id,
            'overall_score' => 85.0,
            'priority_score' => 88.0,
            'priority_tier' => 'top_priority',
            'qualification_status' => 'qualified',
            'calculated_at' => now(),
        ]);

        JobMatch::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $expiredJob->id,
            'overall_score' => 95.0,
            'priority_score' => 99.0,
            'priority_tier' => 'top_priority',
            'qualification_status' => 'qualified',
            'calculated_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs/prioritized');

        $response->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $activeJob->id)
            ->assertJsonPath('meta.tier_counts.top_priority', 1);
    }

    public function test_prioritized_recommendations_support_search_and_platform_filters(): void
    {
        $laravelJob = $this->createSampleListing([
            'title' => 'Top Laravel Architect',
            'source_platform' => 'authorized_feed',
        ]);

        $pythonJob = $this->createSampleListing([
            'title' => 'Top Python Architect',
            'source_platform' => 'authorized_feed',
        ]);

        JobMatch::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $laravelJob->id,
            'overall_score' => 85.0,
            'priority_score' => 90.0,
            'priority_tier' => 'top_priority',
            'qualification_status' => 'qualified',
            'calculated_at' => now(),
        ]);

        JobMatch::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $pythonJob->id,
            'overall_score' => 80.0,
            'priority_score' => 85.0,
            'priority_tier' => 'top_priority',
            'qualification_status' => 'qualified',
            'calculated_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs/prioritized?search=Laravel');

        $response->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $laravelJob->id);
    }

    public function test_archived_tab_includes_both_user_archived_and_inactive_expired_listings(): void
    {
        $userArchivedJob = $this->createSampleListing([
            'title' => 'User Archived Active Job',
            'listing_status' => JobListing::STATUS_ACTIVE,
        ]);

        JobUserWorkflow::create([
            'user_id' => $this->user->id,
            'job_listing_id' => $userArchivedJob->id,
            'review_status' => 'archived',
        ]);

        $expiredJob = $this->createSampleListing([
            'title' => 'System Expired Job',
            'listing_status' => JobListing::STATUS_EXPIRED,
            'expires_at' => now()->subDay(),
        ]);

        $activeJob = $this->createSampleListing([
            'title' => 'Normal Active Job',
            'listing_status' => JobListing::STATUS_ACTIVE,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?tab=archived');

        $response->assertOk()
            ->assertJsonPath('meta.total', 2);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($userArchivedJob->id, $ids);
        $this->assertContains($expiredJob->id, $ids);
        $this->assertNotContains($activeJob->id, $ids);
    }

    public function test_unconfigured_discovery_source_returns_clear_status_and_does_not_pollute_active_jobs(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/discovery/runs', [
                'source_platform' => 'jobstreet',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertStringContainsString('JOBSTREET_API_KEY', $response->json('message'));
        $this->assertEquals(0, JobListing::where('source_platform', 'jobstreet')->count());
    }

    public function test_active_summary_counts_strictly_match_active_only_dataset(): void
    {
        $active1 = $this->createSampleListing(['listing_status' => JobListing::STATUS_ACTIVE]);
        $active2 = $this->createSampleListing(['listing_status' => JobListing::STATUS_ACTIVE]);
        $expired = $this->createSampleListing([
            'listing_status' => JobListing::STATUS_EXPIRED,
            'expires_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs/summary');

        $response->assertOk()
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.archived', 1);
    }

    public function test_cross_user_isolation_is_maintained_across_search_and_triage(): void
    {
        $otherUser = User::factory()->create();

        $this->createSampleListing([
            'user_id' => $otherUser->id,
            'title' => 'Secret Enterprise Laravel Job',
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/jobs?search=Secret');

        $response->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_pagination_does_not_leak_inactive_or_unmatched_records(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->createSampleListing([
                'title' => "Active Laravel Position {$i}",
                'listing_status' => JobListing::STATUS_ACTIVE,
            ]);
        }

        for ($i = 0; $i < 5; $i++) {
            $this->createSampleListing([
                'title' => "Expired Laravel Position {$i}",
                'listing_status' => JobListing::STATUS_EXPIRED,
                'expires_at' => now()->subDays(2),
            ]);
        }

        $resPage1 = $this->actingAs($this->user)
            ->getJson('/api/jobs?per_page=3&page=1&search=Laravel');

        $resPage1->assertOk()
            ->assertJsonPath('meta.total', 5)
            ->assertJsonCount(3, 'data');

        $resPage2 = $this->actingAs($this->user)
            ->getJson('/api/jobs?per_page=3&page=2&search=Laravel');

        $resPage2->assertOk()
            ->assertJsonPath('meta.total', 5)
            ->assertJsonCount(2, 'data');
    }

    public function test_revalidation_updates_status_to_unknown_when_source_is_unconfigured(): void
    {
        $job = $this->createSampleListing([
            'source_platform' => 'jobstreet',
            'listing_status' => JobListing::STATUS_ACTIVE,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/jobs/{$job->id}/revalidate", ['force_fresh' => true]);

        $response->assertOk()
            ->assertJsonPath('data.listing_status', JobListing::STATUS_UNKNOWN)
            ->assertJsonPath('data.is_actionable', false);

        $this->assertDatabaseHas('job_listings', [
            'id' => $job->id,
            'listing_status' => JobListing::STATUS_UNKNOWN,
        ]);
    }
}
