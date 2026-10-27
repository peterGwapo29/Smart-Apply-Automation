<?php

namespace Tests\Feature;

use App\Models\CandidateProfile;
use App\Models\CandidatePreference;
use App\Models\JobDiscoveryRun;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobDiscoveryTest extends TestCase
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
            'full_name' => 'Alex Developer',
            'email' => 'alex@example.com',
            'headline' => 'Senior Full-Stack Laravel Developer',
            'summary' => 'Experienced software engineer.',
            'phone' => '+639171112222',
            'location' => 'Taguig, Philippines',
        ]);

        CandidatePreference::create([
            'candidate_profile_id' => $this->profile->id,
            'min_salary' => 80000,
            'preferred_salary' => 120000,
            'salary_currency' => 'PHP',
            'work_arrangements' => ['remote', 'hybrid'],
            'notice_period_weeks' => 2,
        ]);
    }

    public function test_sources_endpoint_lists_all_adapters_and_compliance_status(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/discovery/sources');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $sources = collect($response->json('sources'));
        $this->assertGreaterThanOrEqual(4, $sources->count());

        $feed = $sources->firstWhere('identifier', 'authorized_feed');
        $this->assertNotNull($feed);
        $this->assertTrue($feed['is_configured']);
        $this->assertEquals('ready', $feed['auth_status']['status']);

        $js = $sources->firstWhere('identifier', 'jobstreet');
        $this->assertNotNull($js);
        $this->assertFalse($js['is_configured']);
        $this->assertEquals('requires_enterprise_credentials', $js['auth_status']['status']);
        $this->assertStringContainsString('Section 7', $js['auth_status']['message']);
    }

    public function test_unconfigured_source_reports_compliance_notice_safely(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/discovery/runs', [
                'source_platform' => 'jobstreet',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('run.status', JobDiscoveryRun::STATUS_COMPLETED_WITH_ERRORS);

        $this->assertStringContainsString('JOBSTREET_API_KEY', $response->json('run.error_message'));
    }

    public function test_authorized_feed_discovers_and_ingests_jobs_with_automatic_matching(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/discovery/runs', [
                'source_platform' => 'authorized_feed',
                'keywords' => 'Laravel',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('run.status', JobDiscoveryRun::STATUS_COMPLETED);

        $run = $response->json('run');
        $this->assertGreaterThan(0, $run['listings_found']);
        $this->assertGreaterThan(0, $run['new_listings']);

        // Verify jobs were created in database
        $this->assertDatabaseHas('job_listings', [
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'title' => 'Senior Laravel / PHP Full-Stack Engineer',
        ]);

        $job = JobListing::where('user_id', $this->user->id)->first();
        $this->assertNotNull($job);

        // Verify that JobMatchingService automatically calculated match scores!
        $match = JobMatch::where('job_listing_id', $job->id)
            ->where('candidate_profile_id', $this->profile->id)
            ->first();

        $this->assertNotNull($match, 'Discovery run must automatically trigger matching service for newly discovered jobs.');
        $this->assertGreaterThan(0, $match->overall_score);
    }

    public function test_repeated_discovery_deduplicates_and_does_not_create_duplicate_records(): void
    {
        // First run
        $this->actingAs($this->user)
            ->postJson('/api/discovery/runs', [
                'source_platform' => 'authorized_feed',
                'keywords' => 'Laravel',
            ]);

        $initialJobCount = JobListing::where('user_id', $this->user->id)->count();
        $this->assertGreaterThan(0, $initialJobCount);

        // Second run with same criteria
        $response = $this->actingAs($this->user)
            ->postJson('/api/discovery/runs', [
                'source_platform' => 'authorized_feed',
                'keywords' => 'Laravel',
            ]);

        $response->assertStatus(201);
        $run = $response->json('run');

        // Repeated run must create 0 new listings and ignore duplicates
        $this->assertEquals(0, $run['new_listings']);
        $this->assertGreaterThan(0, $run['duplicates_ignored']);

        $finalJobCount = JobListing::where('user_id', $this->user->id)->count();
        $this->assertEquals($initialJobCount, $finalJobCount, 'Deduplication must prevent duplicate job listing creation.');
    }

    public function test_runs_endpoint_lists_paginated_history_with_metrics(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/discovery/runs', [
                'source_platform' => 'authorized_feed',
            ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/discovery/runs');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertNotEmpty($response->json('data'));
        $this->assertEquals(1, $response->json('meta.total'));
    }

    public function test_user_cannot_access_another_users_discovery_run(): void
    {
        $otherUser = User::factory()->create();

        $run = JobDiscoveryRun::create([
            'user_id' => $otherUser->id,
            'source_platform' => 'authorized_feed',
            'status' => JobDiscoveryRun::STATUS_COMPLETED,
        ]);

        $this->actingAs($this->user)
            ->getJson("/api/discovery/runs/{$run->id}")
            ->assertNotFound();

        $this->actingAs($this->user)
            ->postJson("/api/discovery/runs/{$run->id}/cancel")
            ->assertNotFound();
    }

    public function test_artisan_jobs_discover_command_executes_successfully(): void
    {
        $this->artisan('jobs:discover', [
            '--source' => 'authorized_feed',
            '--user' => $this->user->id,
        ])->assertExitCode(0);

        $this->assertDatabaseHas('job_discovery_runs', [
            'user_id' => $this->user->id,
            'source_platform' => 'authorized_feed',
            'status' => JobDiscoveryRun::STATUS_COMPLETED,
        ]);
    }
}
