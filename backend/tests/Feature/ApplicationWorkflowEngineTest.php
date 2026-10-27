<?php

namespace Tests\Feature;

use App\Exceptions\InvalidApplicationTransitionException;
use App\Models\CandidateProfile;
use App\Models\JobApplication;
use App\Models\JobApplicationActivity;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\User;
use App\Services\Application\ApplicationWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ApplicationWorkflowEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected CandidateProfile $profile;
    protected ApplicationWorkflowService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'peter@jobstreet-automation.local',
        ]);

        $this->profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'Peter Candidate',
            'email' => $this->user->email,
        ]);

        $this->service = app(ApplicationWorkflowService::class);
    }

    protected function createJob(array $attributes = []): JobListing
    {
        return JobListing::create(array_merge([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://www.jobstreet.com.ph/job/' . uniqid(),
            'title' => 'Senior Full Stack Engineer',
            'company_name' => 'Acme Tech Solutions',
            'location' => 'BGC, Taguig',
            'description' => 'Job description content',
            'required_qualifications' => ['PHP', 'Laravel', 'React'],
            'salary_min' => 90000.00,
            'salary_max' => 140000.00,
            'content_hash' => hash('sha256', 'content_' . uniqid()),
            'quick_apply_status' => 'available',
            'last_observed_at' => now(),
        ], $attributes));
    }

    public function test_can_create_application_for_valid_job(): void
    {
        Queue::fake();
        $job = $this->createJob();

        $response = $this->actingAs($this->user)->postJson('/api/applications', [
            'job_listing_id' => $job->id,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'created' => true,
                'application' => [
                    'job_listing_id' => $job->id,
                    'status' => 'queued',
                    'attempt_count' => 0,
                    'max_retries' => 3,
                ],
            ]);

        $this->assertDatabaseHas('job_applications', [
            'user_id' => $this->user->id,
            'job_listing_id' => $job->id,
            'status' => 'queued',
        ]);

        $this->assertDatabaseHas('job_application_activities', [
            'event_type' => 'created',
            'to_status' => 'queued',
        ]);
    }

    public function test_cannot_create_application_for_nonexistent_or_other_users_job(): void
    {
        $otherUser = User::factory()->create();
        $otherJob = JobListing::create([
            'user_id' => $otherUser->id,
            'canonical_url' => 'https://www.jobstreet.com.ph/job/' . uniqid(),
            'title' => 'Other Job',
            'content_hash' => hash('sha256', 'other'),
        ]);

        // Nonexistent ID
        $this->actingAs($this->user)->postJson('/api/applications', [
            'job_listing_id' => 99999,
        ])->assertStatus(422);

        // Job owned by another user -> 404 (via findOrFail in service)
        $this->actingAs($this->user)->postJson('/api/applications', [
            'job_listing_id' => $otherJob->id,
        ])->assertStatus(404);
    }

    public function test_repeated_creation_requests_return_existing_application_without_duplicate(): void
    {
        $job = $this->createJob();

        // First request: created
        $res1 = $this->actingAs($this->user)->postJson('/api/applications', [
            'job_listing_id' => $job->id,
            'idempotency_key' => 'custom-idemp-12345',
        ]);
        $res1->assertStatus(201);
        $appId = $res1->json('application.id');

        // Repeated request: existing returned with 200 OK
        $res2 = $this->actingAs($this->user)->postJson('/api/applications', [
            'job_listing_id' => $job->id,
            'idempotency_key' => 'custom-idemp-12345',
        ]);
        $res2->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'created' => false,
                'application' => [
                    'id' => $appId,
                ],
            ]);

        // Exactly one application and one created activity
        $this->assertDatabaseCount('job_applications', 1);
        $this->assertEquals(1, JobApplicationActivity::where('event_type', 'created')->count());
    }

    public function test_state_machine_valid_transitions_succeed_with_activity_log(): void
    {
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        // queued -> preparing
        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Starting preparation', null, 'agent:worker');
        $this->assertEquals(JobApplication::STATUS_PREPARING, $app->status);
        $this->assertNotNull($app->preparation_started_at);

        // preparing -> ready
        $app = $this->service->transition($app, JobApplication::STATUS_READY, 'All requirements satisfied', null, 'agent:worker');
        $this->assertEquals(JobApplication::STATUS_READY, $app->status);
        $this->assertNotNull($app->ready_at);

        // ready -> submitted
        $app = $this->service->transition($app, JobApplication::STATUS_SUBMITTED, 'Submission verified via confirmation receipt', null, 'agent:worker');
        $this->assertEquals(JobApplication::STATUS_SUBMITTED, $app->status);
        $this->assertNotNull($app->submitted_at);

        // Verify activities
        $activities = $app->activities()->get();
        $this->assertCount(4, $activities); // created, preparing, ready, submitted
    }

    public function test_state_machine_invalid_transition_throws_422(): void
    {
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        // queued directly to submitted is strictly forbidden
        $response = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/transition", [
            'to_status' => JobApplication::STATUS_SUBMITTED,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_code' => 'INVALID_STATUS_TRANSITION',
                'from_status' => 'queued',
                'to_status' => 'submitted',
            ]);
    }

    public function test_terminal_submitted_state_cannot_revert_to_earlier_status(): void
    {
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Prep');
        $app = $this->service->transition($app, JobApplication::STATUS_READY, 'Ready');
        $app = $this->service->transition($app, JobApplication::STATUS_SUBMITTED, 'Submitted');

        $this->assertTrue($app->isTerminal());

        // Attempting to revert to queued throws 422
        $response = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/transition", [
            'to_status' => JobApplication::STATUS_QUEUED,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_code' => 'INVALID_STATUS_TRANSITION',
            ]);
    }

    public function test_transient_failure_records_attempts_and_schedules_bounded_exponential_backoff(): void
    {
        Queue::fake();
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        // Start prep (attempt 1)
        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Attempt 1');
        $app->increment('attempt_count');

        // First transient failure: delay = 30s * 2^0 = 30s
        $app = $this->service->handleTransientFailure($app, 'TIMEOUT', 'Connection to server timed out');

        $this->assertEquals(JobApplication::STATUS_QUEUED, $app->status);
        $this->assertEquals('TIMEOUT', $app->last_error_code);
        $this->assertNotNull($app->next_retry_at);
        $this->assertTrue($app->next_retry_at->isAfter(now()));

        // Start prep (attempt 2)
        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Attempt 2');
        $app->increment('attempt_count');

        // Second transient failure: delay = 30s * 2^1 = 60s
        $app = $this->service->handleTransientFailure($app, 'RATE_LIMITED', 'Rate limited by platform');
        $this->assertEquals('RATE_LIMITED', $app->last_error_code);
    }

    public function test_exceeding_max_retries_transitions_application_to_failed(): void
    {
        Queue::fake();
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        $app->update(['attempt_count' => 3, 'max_retries' => 3]);
        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Final attempt');

        $app = $this->service->handleTransientFailure($app, 'SERVER_ERROR', '500 Internal Error');

        $this->assertEquals(JobApplication::STATUS_FAILED, $app->status);
        $this->assertEquals('SERVER_ERROR', $app->last_error_code);
        $this->assertNull($app->next_retry_at);
    }

    public function test_manual_retry_resets_error_and_returns_to_queued(): void
    {
        Queue::fake();
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Preparing');
        $app = $this->service->transition($app, JobApplication::STATUS_FAILED, 'Worker aborted');
        $app->update([
            'last_error_code' => 'CRASH',
            'last_error_message' => 'Something crashed',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/applications/{$app->id}/retry");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'application' => [
                    'id' => $app->id,
                    'status' => 'queued',
                    'last_error_code' => null,
                ],
            ]);

        $this->assertDatabaseHas('job_applications', [
            'id' => $app->id,
            'status' => 'queued',
            'last_error_code' => null,
        ]);
    }

    public function test_stuck_preparing_recovery_mechanism(): void
    {
        Queue::fake();
        $job = $this->createJob();
        $result = $this->service->createOrRetrieve($this->user, $job->id);
        $app = $result['application'];

        // Application entered preparing 30 minutes ago and worker died
        $app = $this->service->transition($app, JobApplication::STATUS_PREPARING, 'Worker started');
        $app->update([
            'last_processed_at' => now()->subMinutes(30),
            'attempt_count' => 1,
            'max_retries' => 3,
        ]);

        $recoveredCount = $this->service->recoverStuckApplications(15);
        $this->assertEquals(1, $recoveredCount);

        $app->refresh();
        $this->assertEquals(JobApplication::STATUS_QUEUED, $app->status);
    }

    public function test_user_cannot_view_or_modify_another_users_application(): void
    {
        $otherUser = User::factory()->create();
        $otherJob = JobListing::create([
            'user_id' => $otherUser->id,
            'canonical_url' => 'https://www.jobstreet.com.ph/job/' . uniqid(),
            'title' => 'Other Job',
            'content_hash' => hash('sha256', 'other'),
        ]);
        $result = $this->service->createOrRetrieve($otherUser, $otherJob->id);
        $otherApp = $result['application'];

        // GET other user's app -> 404
        $this->actingAs($this->user)->getJson("/api/applications/{$otherApp->id}")
            ->assertStatus(404);

        // POST retry other user's app -> 404
        $this->actingAs($this->user)->postJson("/api/applications/{$otherApp->id}/retry")
            ->assertStatus(404);
    }

    public function test_can_list_and_filter_applications(): void
    {
        $job1 = $this->createJob(['title' => 'Job 1']);
        $job2 = $this->createJob(['title' => 'Job 2']);

        $app1 = $this->service->createOrRetrieve($this->user, $job1->id)['application'];
        $app2 = $this->service->createOrRetrieve($this->user, $job2->id)['application'];

        $this->service->transition($app2, JobApplication::STATUS_PREPARING, 'Prep');
        $this->service->transition($app2, JobApplication::STATUS_READY, 'Ready');

        // List all
        $resAll = $this->actingAs($this->user)->getJson('/api/applications');
        $resAll->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('counts.total', 2)
            ->assertJsonPath('counts.queued', 1)
            ->assertJsonPath('counts.ready', 1);

        // Filter status=ready
        $resReady = $this->actingAs($this->user)->getJson('/api/applications?status=ready');
        $resReady->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $app2->id);
    }
}
