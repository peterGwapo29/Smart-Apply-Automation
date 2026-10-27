<?php

namespace Tests\Feature;

use App\Models\CandidateProfile;
use App\Models\JobApplication;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\User;
use App\Models\UserPlatformAccount;
use App\Services\ApplicationReadinessService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationExecutionAndActiveListingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected CandidateProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'peter@jobstreet-automation.local',
            'name' => 'Peter Candidate',
        ]);

        $this->profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'Peter Candidate',
            'email' => 'peter@jobstreet-automation.local',
            'phone' => '+639123456789',
            'location' => 'Makati, Philippines',
        ]);
    }

    public function test_active_listings_appear_in_default_results_while_expired_are_excluded(): void
    {
        // Active listing
        $activeJob = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/active-101',
            'title' => 'Senior Laravel Engineer',
            'company_name' => 'Tech Corp',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'expires_at' => Carbon::now()->addDays(14),
            'content_hash' => hash('sha256', 'active-101'),
        ]);

        // Expired listing (past expiration timestamp)
        $expiredJob = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/expired-102',
            'title' => 'Expired PHP Developer',
            'company_name' => 'Old Corp',
            'listing_status' => JobListing::STATUS_EXPIRED,
            'expires_at' => Carbon::now()->subDays(2),
            'content_hash' => hash('sha256', 'expired-102'),
        ]);

        // Closed listing
        $closedJob = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'linkedin',
            'canonical_url' => 'https://www.linkedin.com/jobs/view/closed-103',
            'title' => 'Closed React Architect',
            'company_name' => 'Closed Corp',
            'listing_status' => JobListing::STATUS_CLOSED,
            'content_hash' => hash('sha256', 'closed-103'),
        ]);

        // Default GET /api/jobs must return only activeJob
        $response = $this->actingAs($this->user)->getJson('/api/jobs');
        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($activeJob->id, $ids);
        $this->assertNotContains($expiredJob->id, $ids);
        $this->assertNotContains($closedJob->id, $ids);

        // Summary KPI counts only active listings
        $summary = $this->actingAs($this->user)->getJson('/api/jobs/dashboard-summary');
        $summary->assertStatus(200);
        $this->assertEquals(1, $summary->json('summary.total'));

        // If include_inactive=true is explicitly requested, expired jobs are visible
        $historyResponse = $this->actingAs($this->user)->getJson('/api/jobs?include_inactive=true');
        $historyResponse->assertStatus(200);
        $historyIds = collect($historyResponse->json('data'))->pluck('id')->all();
        $this->assertContains($activeJob->id, $historyIds);
        $this->assertContains($expiredJob->id, $historyIds);
        $this->assertContains($closedJob->id, $historyIds);
    }

    public function test_high_scoring_expired_job_cannot_appear_in_prioritized_recommendations(): void
    {
        $expiredJob = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/expired-high-score',
            'title' => 'Staff Backend Engineer',
            'company_name' => 'Elite Corp',
            'listing_status' => JobListing::STATUS_EXPIRED,
            'expires_at' => Carbon::now()->subDay(),
            'content_hash' => hash('sha256', 'expired-high-score'),
        ]);

        // Attach very high priority match
        JobMatch::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $expiredJob->id,
            'overall_score' => 98.00,
            'priority_score' => 99.00,
            'priority_tier' => 'top_priority',
            'qualification_status' => 'qualified',
            'eligibility_status' => 'eligible',
            'calculated_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/jobs/prioritized');
        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($expiredJob->id, $ids, 'Expired job must not be recommended even with top priority score.');
    }

    public function test_revalidation_detects_expiration_and_blocks_application_readiness(): void
    {
        $job = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/past-date',
            'title' => 'Fullstack Developer',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'expires_at' => Carbon::now()->subMinutes(30),
            'content_hash' => hash('sha256', 'past-date'),
        ]);

        $app = JobApplication::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $job->id,
            'status' => JobApplication::STATUS_QUEUED,
            'idempotency_key' => 'app-test-reval-1',
        ]);

        // Call revalidate endpoint
        $reval = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/revalidate");
        $reval->assertStatus(200);
        $this->assertFalse($reval->json('data.is_active'));
        $this->assertEquals(JobListing::STATUS_EXPIRED, $reval->json('data.listing_status'));

        // Fresh check on DB
        $job->refresh();
        $this->assertEquals(JobListing::STATUS_EXPIRED, $job->listing_status);

        // Evaluate readiness via readiness service
        $readinessService = app(ApplicationReadinessService::class);
        $readiness = $readinessService->evaluateReadiness($app);

        $this->assertFalse($readiness->is_ready);
        $blockerCodes = collect($readiness->blocking_issues)->pluck('code')->all();
        $this->assertContains('INACTIVE_JOB_LISTING', $blockerCodes);
    }

    public function test_platform_accounts_endpoint_lists_official_urls_and_updates_status(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/platform-accounts');
        $response->assertStatus(200);

        $accounts = collect($response->json('accounts'));
        $this->assertTrue($accounts->contains('platform', 'jobstreet'));
        $this->assertTrue($accounts->contains('platform', 'linkedin'));
        $this->assertTrue($accounts->contains('platform', 'onlinejobs_ph'));

        // Candidate confirms they registered/logged into JobStreet
        $update = $this->actingAs($this->user)->putJson('/api/platform-accounts/jobstreet', [
            'access_status' => UserPlatformAccount::ACCESS_ACCESS_VERIFIED,
            'verified_username_or_email' => 'peter@example.com',
            'supported_capability' => UserPlatformAccount::CAPABILITY_BROWSER_ASSISTED,
        ]);

        $update->assertStatus(200);
        $this->assertEquals(UserPlatformAccount::ACCESS_ACCESS_VERIFIED, $update->json('account.access_status'));
        $this->assertTrue($update->json('account.is_verified'));

        // Verify database persistence
        $this->assertDatabaseHas('user_platform_accounts', [
            'user_id' => $this->user->id,
            'platform' => 'jobstreet',
            'access_status' => 'access_verified',
            'verified_username_or_email' => 'peter@example.com',
        ]);
    }

    public function test_execution_authorization_and_submission_verification_workflow(): void
    {
        $job = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/exec-test',
            'title' => 'Senior Backend Engineer',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'expires_at' => Carbon::now()->addDays(7),
            'content_hash' => hash('sha256', 'exec-test'),
        ]);

        $app = JobApplication::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $job->id,
            'status' => JobApplication::STATUS_READY,
            'idempotency_key' => 'app-test-exec-1',
        ]);

        // 1. Authorize execution
        $authRes = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/authorize-execution");
        $authRes->assertStatus(200);
        $this->assertNotNull($authRes->json('authorized_at'));

        // 2. Fetch assistance workspace
        $wsRes = $this->actingAs($this->user)->getJson("/api/applications/{$app->id}/execution-workspace");
        $wsRes->assertStatus(200);
        $this->assertTrue($wsRes->json('data.can_execute'));

        // 3. User completes submission and provides confirmation evidence
        $subRes = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/verify-submission", [
            'verification_level' => 'user_confirmed',
            'evidence_type' => 'jobstreet_confirmation_dialog',
            'evidence_note' => 'Candidate observed successful application confirmation dialog on JobStreet.',
        ]);

        $subRes->assertStatus(200);
        $this->assertEquals(JobApplication::STATUS_SUBMITTED, $subRes->json('application.status'));
        $this->assertEquals('user_confirmed', $subRes->json('application.submission_verification_level'));

        // 4. Submitted state is immutable; cannot re-authorize
        $reAuth = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/authorize-execution");
        $reAuth->assertStatus(422);
    }

    public function test_ambiguous_submission_transitions_to_confirmation_required_without_auto_retry(): void
    {
        $job = JobListing::create([
            'user_id' => $this->user->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/timeout-test',
            'title' => 'DevOps Engineer',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'content_hash' => hash('sha256', 'timeout-test'),
        ]);

        $app = JobApplication::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $job->id,
            'status' => JobApplication::STATUS_READY,
            'idempotency_key' => 'app-test-ambiguous-1',
        ]);

        // Record ambiguous outcome
        $ambRes = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/record-ambiguous", [
            'reason' => 'Browser lost connection after clicking apply button.',
        ]);

        $ambRes->assertStatus(200);
        $this->assertEquals(JobApplication::STATUS_CONFIRMATION_REQUIRED, $ambRes->json('status_code'));

        $app->refresh();
        $this->assertEquals(JobApplication::STATUS_CONFIRMATION_REQUIRED, $app->status);
        $this->assertEquals(JobApplication::VERIFICATION_AMBIGUOUS, $app->submission_verification_level);
        $this->assertNull($app->next_retry_at, 'Ambiguous outcome must never schedule automated retries.');
    }

    public function test_cross_user_isolation_prevents_unauthorized_access(): void
    {
        $otherUser = User::factory()->create([
            'email' => 'other@example.com',
            'name' => 'Other User',
        ]);

        $otherProfile = CandidateProfile::create([
            'user_id' => $otherUser->id,
            'full_name' => 'Other Candidate',
            'email' => 'other@example.com',
        ]);

        $otherJob = JobListing::create([
            'user_id' => $otherUser->id,
            'source_platform' => 'jobstreet',
            'canonical_url' => 'https://www.jobstreet.com.ph/job/other-1',
            'title' => 'Other Job',
            'listing_status' => JobListing::STATUS_ACTIVE,
            'content_hash' => hash('sha256', 'other-1'),
        ]);

        $otherApp = JobApplication::create([
            'user_id' => $otherUser->id,
            'candidate_profile_id' => $otherProfile->id,
            'job_listing_id' => $otherJob->id,
            'status' => JobApplication::STATUS_READY,
            'idempotency_key' => 'other-app-1',
        ]);

        // User cannot revalidate or authorize another user's job/app
        $resReval = $this->actingAs($this->user)->postJson("/api/jobs/{$otherJob->id}/revalidate");
        $resReval->assertStatus(404);

        $resAuth = $this->actingAs($this->user)->postJson("/api/applications/{$otherApp->id}/authorize-execution");
        $resAuth->assertStatus(404);
    }

    public function test_platform_accounts_endpoint_provides_backward_and_forward_compatible_structure(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/platform-accounts');
        $response->assertStatus(200);

        // Verify both 'accounts' and 'data' keys are present with identical content
        $accounts = $response->json('accounts');
        $data = $response->json('data');

        $this->assertIsArray($accounts);
        $this->assertIsArray($data);
        $this->assertSame($accounts, $data);
        $this->assertCount(4, $accounts);

        // Verify every account has required structure and zero credential exposure
        foreach ($accounts as $acc) {
            $this->assertArrayHasKey('platform', $acc);
            $this->assertArrayHasKey('display_name', $acc);
            $this->assertArrayHasKey('access_status', $acc);
            $this->assertArrayHasKey('supported_capability', $acc);
            $this->assertArrayHasKey('is_verified', $acc);
            $this->assertArrayNotHasKey('password', $acc);
            $this->assertArrayNotHasKey('token', $acc);
            $this->assertArrayNotHasKey('cookie', $acc);
        }
    }

    public function test_platform_account_update_endpoint_provides_dual_data_and_account_structure(): void
    {
        $update = $this->actingAs($this->user)->putJson('/api/platform-accounts/linkedin', [
            'access_status' => UserPlatformAccount::ACCESS_ACCESS_VERIFIED,
            'verified_username_or_email' => 'candidate.linkedin@example.com',
            'supported_capability' => UserPlatformAccount::CAPABILITY_MANUAL_ONLY,
        ]);

        $update->assertStatus(200);

        $account = $update->json('account');
        $data = $update->json('data');

        $this->assertIsArray($account);
        $this->assertIsArray($data);
        $this->assertSame($account, $data);
        $this->assertEquals('linkedin', $data['platform']);
        $this->assertEquals(UserPlatformAccount::ACCESS_ACCESS_VERIFIED, $data['access_status']);
        $this->assertEquals('candidate.linkedin@example.com', $data['verified_username_or_email']);
        $this->assertTrue($data['is_verified']);
    }

    public function test_platform_accounts_isolation_and_empty_handling(): void
    {
        $newUser = User::factory()->create();

        // Fresh user has no custom records yet, default catalog should still resolve cleanly
        $response = $this->actingAs($newUser)->getJson('/api/platform-accounts');
        $response->assertStatus(200);
        $accounts = collect($response->json('data'));

        $this->assertCount(4, $accounts);
        $jobstreet = $accounts->firstWhere('platform', 'jobstreet');
        $this->assertEquals(UserPlatformAccount::ACCESS_SETUP_REQUIRED, $jobstreet['access_status']);
        $this->assertFalse($jobstreet['is_verified']);
        $this->assertNull($jobstreet['verified_username_or_email']);
    }
}
