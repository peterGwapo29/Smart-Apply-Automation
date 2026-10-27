<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobListingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'peter@jobstreet-automation.local',
        ]);
    }

    /**
     * Test importing a full job listing with sections and salary parsing.
     */
    public function test_user_can_import_job_listing_with_parsed_sections(): void
    {
        $payload = [
            'canonical_url' => 'https://www.jobstreet.com.ph/job/79512345?ref=search-standalone&sol=123',
            'title' => 'Senior Full Stack Laravel Developer',
            'company_name' => 'Tech Solutions PH',
            'location' => 'Bonifacio Global City, Taguig',
            'description' => "We are looking for a Senior Developer.\n\nKey Responsibilities:\n- Build robust REST APIs with Laravel 11\n- Develop modern UI using React and TypeScript\n- Implement automated CI/CD pipelines\n\nRequirements:\n- 5+ years of PHP experience\n- Strong proficiency in MySQL and index optimization\n\nSalary:\nPHP 90,000 - 130,000 monthly\n\nApply now with Quick Apply for fast processing!",
            'employment_type' => 'Full-time',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/jobs/import', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'is_duplicate' => false,
                'job' => [
                    'title' => 'Senior Full Stack Laravel Developer',
                    'company_name' => 'Tech Solutions PH',
                    'source_platform' => 'jobstreet',
                    'source_job_id' => '79512345',
                    'quick_apply_status' => 'available',
                    'salary_currency' => 'PHP',
                    'salary_min' => '90000.00',
                    'salary_max' => '130000.00',
                ],
            ]);

        $jobData = $response->json('job');
        $this->assertEquals('https://jobstreet.com.ph/job/79512345', $jobData['canonical_url']);
        $this->assertCount(3, $jobData['responsibilities']);
        $this->assertCount(2, $jobData['required_qualifications']);
        $this->assertDatabaseHas('job_listings', [
            'id' => $jobData['id'],
            'source_job_id' => '79512345',
            'quick_apply_status' => 'available',
        ]);
        $this->assertDatabaseHas('job_listing_histories', [
            'job_listing_id' => $jobData['id'],
            'event_type' => 'created',
        ]);
    }

    /**
     * Test missing optional fields handled gracefully.
     */
    public function test_importing_minimal_job_listing_succeeds(): void
    {
        $payload = [
            'title' => 'Junior Web Developer',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/jobs/import', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'job' => [
                    'title' => 'Junior Web Developer',
                    'company_name' => null,
                    'quick_apply_status' => 'unknown',
                ],
            ]);
    }

    /**
     * Test Quick Apply evidence evaluation.
     */
    public function test_quick_apply_evidence_states(): void
    {
        // 1. External application evidence -> unavailable
        $resp1 = $this->actingAs($this->user)->postJson('/api/jobs/import', [
            'title' => 'DevOps Engineer 1',
            'description' => 'Please apply directly via our company careers portal: https://careers.external.com/jobs/123',
        ]);
        $resp1->assertStatus(201);
        $this->assertEquals('unavailable', $resp1->json('job.quick_apply_status'));

        // 2. Conflicting evidence -> requires_review
        $resp2 = $this->actingAs($this->user)->postJson('/api/jobs/import', [
            'title' => 'DevOps Engineer 2',
            'description' => 'You can use quick apply or email your CV directly to jobs@company.com',
        ]);
        $resp2->assertStatus(201);
        $this->assertEquals('requires_review', $resp2->json('job.quick_apply_status'));

        // 3. No evidence -> unknown
        $resp3 = $this->actingAs($this->user)->postJson('/api/jobs/import', [
            'title' => 'DevOps Engineer 3',
            'description' => 'We are hiring experienced engineers. Good luck with the application.',
        ]);
        $resp3->assertStatus(201);
        $this->assertEquals('unknown', $resp3->json('job.quick_apply_status'));
    }

    /**
     * Test layered deduplication: re-importing the same URL updates observation timestamp, preserves first_detected_at, and logs history.
     */
    public function test_reimporting_same_listing_triggers_duplicate_update(): void
    {
        $url = 'https://www.jobstreet.com.ph/job/88899911?ref=search';

        $firstResp = $this->actingAs($this->user)->postJson('/api/jobs/import', [
            'canonical_url' => $url,
            'title' => 'Original Title',
            'description' => 'Original description for testing.',
        ]);

        $firstResp->assertStatus(201);
        $firstId = $firstResp->json('job.id');
        $firstDetectedAt = $firstResp->json('job.first_detected_at');

        // Sleep 1 second to ensure timestamp difference
        sleep(1);

        // Second import with same URL but updated title & salary
        $secondResp = $this->actingAs($this->user)->postJson('/api/jobs/import', [
            'canonical_url' => $url,
            'title' => 'Updated Title',
            'description' => 'Original description for testing. Salary: PHP 120,000',
        ]);

        $secondResp->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'is_duplicate' => true,
            ]);

        $updatedJob = $secondResp->json('job');
        $this->assertEquals($firstId, $updatedJob['id']);
        $this->assertEquals('Updated Title', $updatedJob['title']);
        $this->assertEquals($firstDetectedAt, $updatedJob['first_detected_at']);
        $this->assertNotEquals($firstDetectedAt, $updatedJob['last_observed_at']);

        // Check history log
        $this->assertDatabaseHas('job_listing_histories', [
            'job_listing_id' => $firstId,
            'event_type' => 'observed',
        ]);
    }

    /**
     * Test URL check endpoint for passive extension detection.
     */
    public function test_check_url_endpoint(): void
    {
        $url = 'https://www.jobstreet.com.ph/job/55544433?tracking=xyz';

        // Check before import -> exists = false
        $check1 = $this->actingAs($this->user)->getJson('/api/jobs/check?url=' . urlencode($url));
        $check1->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'exists' => false,
                'source_job_id' => '55544433',
            ]);

        // Ingest job
        $this->actingAs($this->user)->postJson('/api/jobs/import', [
            'canonical_url' => $url,
            'title' => 'QA Automation Lead',
        ]);

        // Check after import -> exists = true
        $check2 = $this->actingAs($this->user)->getJson('/api/jobs/check?url=' . urlencode($url));
        $check2->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'exists' => true,
                'source_job_id' => '55544433',
                'job' => [
                    'title' => 'QA Automation Lead',
                ],
            ]);
    }

    /**
     * Test listing query with filters and search.
     */
    public function test_user_can_filter_and_search_job_listings(): void
    {
        JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/1',
            'title' => 'Frontend React Engineer',
            'company_name' => 'Acme Digital',
            'quick_apply_status' => 'available',
            'content_hash' => hash('sha256', 'job1'),
        ]);

        JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/2',
            'title' => 'Backend Python Developer',
            'company_name' => 'Beta Global',
            'quick_apply_status' => 'unavailable',
            'content_hash' => hash('sha256', 'job2'),
        ]);

        // Filter by Quick Apply Available
        $respFilter = $this->actingAs($this->user)->getJson('/api/jobs?quick_apply_status=available');
        $respFilter->assertStatus(200);
        $this->assertCount(1, $respFilter->json('data'));
        $this->assertEquals('Frontend React Engineer', $respFilter->json('data.0.title'));

        // Search by company name
        $respSearch = $this->actingAs($this->user)->getJson('/api/jobs?search=Beta');
        $respSearch->assertStatus(200);
        $this->assertCount(1, $respSearch->json('data'));
        $this->assertEquals('Backend Python Developer', $respSearch->json('data.0.title'));
    }

    /**
     * Test updating and deleting a job listing.
     */
    public function test_user_can_update_and_delete_job_listing(): void
    {
        $job = JobListing::create([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://jobstreet.com.ph/job/999',
            'title' => 'Test Job',
            'quick_apply_status' => 'unknown',
            'content_hash' => hash('sha256', 'job999'),
        ]);

        // Update
        $updateResp = $this->actingAs($this->user)->putJson("/api/jobs/{$job->id}", [
            'quick_apply_status' => 'available',
            'review_status' => 'confirmed',
        ]);
        $updateResp->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'job' => [
                    'quick_apply_status' => 'available',
                    'review_status' => 'confirmed',
                ],
            ]);

        // Delete
        $deleteResp = $this->actingAs($this->user)->deleteJson("/api/jobs/{$job->id}");
        $deleteResp->assertStatus(200);

        $this->assertDatabaseMissing('job_listings', ['id' => $job->id]);
    }
}
