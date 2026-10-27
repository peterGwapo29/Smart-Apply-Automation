<?php

namespace Tests\Feature;

use App\Models\CandidatePreference;
use App\Models\CandidateProfile;
use App\Models\JobListing;
use App\Models\JobMatch;
use App\Models\JobUserWorkflow;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobDashboardAndQueueTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected CandidateProfile $profile;
    protected CandidatePreference $preference;

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

        $this->preference = CandidatePreference::create([
            'candidate_profile_id' => $this->profile->id,
            'min_match_threshold' => 70.00,
        ]);
    }

    protected function createJob(array $attributes = []): JobListing
    {
        return JobListing::create(array_merge([
            'user_id' => $this->user->id,
            'canonical_url' => 'https://www.jobstreet.com.ph/job/' . uniqid(),
            'title' => 'Software Engineer',
            'company_name' => 'Acme Corp',
            'location' => 'Taguig, Philippines',
            'description' => 'Job description',
            'required_qualifications' => ['PHP', 'Laravel'],
            'preferred_qualifications' => ['React', 'TypeScript'],
            'salary_min' => 80000.00,
            'salary_max' => 120000.00,
            'content_hash' => hash('sha256', 'initial_content_' . uniqid()),
            'quick_apply_status' => 'available',
            'last_observed_at' => now(),
        ], $attributes));
    }

    protected function createMatch(JobListing $job, array $attributes = []): JobMatch
    {
        return JobMatch::create(array_merge([
            'user_id' => $this->user->id,
            'job_listing_id' => $job->id,
            'candidate_profile_id' => $this->profile->id,
            'overall_score' => 80.00,
            'technical_skills_score' => 80.00,
            'experience_score' => 80.00,
            'responsibilities_score' => 80.00,
            'work_arrangement_score' => 80.00,
            'salary_fit_score' => 80.00,
            'eligibility_status' => 'eligible',
            'calculated_at' => now(),
        ], $attributes));
    }

    public function test_dashboard_summary_returns_accurate_kpi_counts(): void
    {
        // Job 1: Strong match (85), unreviewed / new
        $job1 = $this->createJob(['title' => 'Lead Laravel Architect']);
        $this->createMatch($job1, [
            'overall_score' => 85.00,
            'technical_skills_score' => 90.00,
            'experience_score' => 85.00,
            'responsibilities_score' => 80.00,
            'work_arrangement_score' => 100.00,
            'salary_fit_score' => 70.00,
            'eligibility_status' => 'eligible',
        ]);

        // Job 2: Disqualified, bookmarked, saved
        $job2 = $this->createJob(['title' => 'Junior QA']);
        $this->createMatch($job2, [
            'overall_score' => 45.00,
            'technical_skills_score' => 40.00,
            'experience_score' => 40.00,
            'responsibilities_score' => 50.00,
            'work_arrangement_score' => 50.00,
            'salary_fit_score' => 40.00,
            'eligibility_status' => 'disqualified',
        ]);
        JobUserWorkflow::create([
            'user_id' => $this->user->id,
            'job_listing_id' => $job2->id,
            'review_status' => 'saved',
            'is_bookmarked' => true,
            'reviewed_at' => now(),
        ]);

        // Job 3: Requires review, marked not_interested
        $job3 = $this->createJob(['title' => 'Python Data Scientist']);
        $this->createMatch($job3, [
            'overall_score' => 60.00,
            'technical_skills_score' => 50.00,
            'experience_score' => 60.00,
            'responsibilities_score' => 60.00,
            'work_arrangement_score' => 80.00,
            'salary_fit_score' => 80.00,
            'eligibility_status' => 'requires_review',
        ]);
        JobUserWorkflow::create([
            'user_id' => $this->user->id,
            'job_listing_id' => $job3->id,
            'review_status' => 'not_interested',
            'is_bookmarked' => false,
            'reviewed_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/jobs/dashboard-summary');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'summary' => [
                    'total' => 3,
                    'new' => 1,
                    'strong_matches' => 1,
                    'review_required' => 1,
                    'bookmarked' => 1,
                    'reviewed' => 2, // saved, not_interested
                    'not_interested' => 1,
                    'disqualified' => 1,
                    'min_match_threshold' => 70.00,
                ],
            ]);
    }

    public function test_can_update_job_review_status_and_notes(): void
    {
        $job = $this->createJob();
        $this->createMatch($job, [
            'overall_score' => 88.50,
            'technical_skills_score' => 90.00,
            'experience_score' => 85.00,
            'responsibilities_score' => 90.00,
            'work_arrangement_score' => 90.00,
            'salary_fit_score' => 90.00,
            'eligibility_status' => 'eligible',
        ]);

        $response = $this->actingAs($this->user)->patchJson("/api/jobs/{$job->id}/review", [
            'review_status' => 'interested',
            'notes' => 'Excellent match with Laravel stack and good remote flexibility.',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Review status updated successfully.',
                'workflow' => [
                    'job_listing_id' => $job->id,
                    'review_status' => 'interested',
                    'notes' => 'Excellent match with Laravel stack and good remote flexibility.',
                    'last_reviewed_content_hash' => $job->content_hash,
                    'last_reviewed_match_score' => '88.50',
                ],
            ]);

        $this->assertDatabaseHas('job_user_workflows', [
            'user_id' => $this->user->id,
            'job_listing_id' => $job->id,
            'review_status' => 'interested',
        ]);
    }

    public function test_can_bookmark_and_unbookmark_job(): void
    {
        $job = $this->createJob();

        // Bookmark
        $resBookmark = $this->actingAs($this->user)->postJson("/api/jobs/{$job->id}/bookmark");
        $resBookmark->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'workflow' => [
                    'job_listing_id' => $job->id,
                    'is_bookmarked' => true,
                ],
            ]);

        $this->assertDatabaseHas('job_user_workflows', [
            'user_id' => $this->user->id,
            'job_listing_id' => $job->id,
            'is_bookmarked' => true,
        ]);

        // Unbookmark
        $resUnbookmark = $this->actingAs($this->user)->deleteJson("/api/jobs/{$job->id}/bookmark");
        $resUnbookmark->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'workflow' => [
                    'job_listing_id' => $job->id,
                    'is_bookmarked' => false,
                ],
            ]);

        $this->assertDatabaseHas('job_user_workflows', [
            'user_id' => $this->user->id,
            'job_listing_id' => $job->id,
            'is_bookmarked' => false,
        ]);
    }

    public function test_user_cannot_modify_another_users_job_workflow(): void
    {
        $otherUser = User::factory()->create();
        $otherJob = JobListing::create([
            'user_id' => $otherUser->id,
            'canonical_url' => 'https://www.jobstreet.com.ph/job/99999999',
            'title' => 'Other User Job',
            'company_name' => 'Other Corp',
            'content_hash' => hash('sha256', 'other'),
        ]);

        $response = $this->actingAs($this->user)->patchJson("/api/jobs/{$otherJob->id}/review", [
            'review_status' => 'interested',
        ]);

        $response->assertStatus(404);
    }

    public function test_filtering_by_tab_and_sorting(): void
    {
        $jobHigh = $this->createJob(['title' => 'High Salary Job', 'salary_max' => 180000.00]);
        $this->createMatch($jobHigh, [
            'overall_score' => 92.00,
            'technical_skills_score' => 90.00,
            'experience_score' => 95.00,
            'responsibilities_score' => 90.00,
            'work_arrangement_score' => 90.00,
            'salary_fit_score' => 90.00,
            'eligibility_status' => 'eligible',
        ]);
        JobUserWorkflow::create([
            'user_id' => $this->user->id,
            'job_listing_id' => $jobHigh->id,
            'review_status' => 'interested',
            'is_bookmarked' => true,
            'reviewed_at' => now(),
        ]);

        $jobLow = $this->createJob(['title' => 'Low Salary Job', 'salary_max' => 60000.00]);
        $this->createMatch($jobLow, [
            'overall_score' => 55.00,
            'technical_skills_score' => 50.00,
            'experience_score' => 60.00,
            'responsibilities_score' => 55.00,
            'work_arrangement_score' => 60.00,
            'salary_fit_score' => 50.00,
            'eligibility_status' => 'eligible',
        ]);

        // Filter tab=strong_matches (threshold is 70)
        $resStrong = $this->actingAs($this->user)->getJson('/api/jobs?tab=strong_matches');
        $resStrong->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $jobHigh->id);

        // Filter tab=bookmarked
        $resBookmarked = $this->actingAs($this->user)->getJson('/api/jobs?tab=bookmarked');
        $resBookmarked->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $jobHigh->id);

        // Sort by highest_match
        $resSortMatch = $this->actingAs($this->user)->getJson('/api/jobs?sort_by=highest_match');
        $resSortMatch->assertStatus(200);
        $items = $resSortMatch->json('data');
        $this->assertEquals($jobHigh->id, $items[0]['id']);
        $this->assertEquals($jobLow->id, $items[1]['id']);

        // Sort by salary_high
        $resSortSalary = $this->actingAs($this->user)->getJson('/api/jobs?sort_by=salary_high');
        $resSortSalary->assertStatus(200);
        $salaryItems = $resSortSalary->json('data');
        $this->assertEquals($jobHigh->id, $salaryItems[0]['id']);
    }

    public function test_listing_changed_since_review_flag(): void
    {
        $originalHash = hash('sha256', 'original_content');
        $job = $this->createJob(['content_hash' => $originalHash]);

        // Stamp review with original hash
        $this->actingAs($this->user)->patchJson("/api/jobs/{$job->id}/review", [
            'review_status' => 'interested',
        ]);

        // Initially, listing_changed_since_review is false
        $resBefore = $this->actingAs($this->user)->getJson("/api/jobs/{$job->id}");
        $resBefore->assertStatus(200)
            ->assertJsonPath('job.listing_changed_since_review', false);

        // Modify job content hash to simulate employer edit
        $newHash = hash('sha256', 'updated_employer_content');
        $job->update(['content_hash' => $newHash]);

        // Now, listing_changed_since_review is true
        $resAfter = $this->actingAs($this->user)->getJson("/api/jobs/{$job->id}");
        $resAfter->assertStatus(200)
            ->assertJsonPath('job.listing_changed_since_review', true);
    }

    public function test_stale_match_flag_triggers_when_job_updated_after_match(): void
    {
        $job = $this->createJob();

        // Match calculated 2 days ago
        $this->createMatch($job, [
            'calculated_at' => now()->subDays(2),
        ]);

        // Touch job updated_at to now
        $job->touch();

        $response = $this->actingAs($this->user)->getJson("/api/jobs/{$job->id}");
        $response->assertStatus(200)
            ->assertJsonPath('job.is_match_stale', true);
    }

    public function test_configurable_min_match_threshold_affects_summary(): void
    {
        $job = $this->createJob();
        $this->createMatch($job, [
            'overall_score' => 75.00,
            'technical_skills_score' => 75.00,
            'experience_score' => 75.00,
            'responsibilities_score' => 75.00,
            'work_arrangement_score' => 75.00,
            'salary_fit_score' => 75.00,
            'eligibility_status' => 'eligible',
        ]);

        // Default threshold 70 => strong_matches = 1
        $res1 = $this->actingAs($this->user)->getJson('/api/jobs/dashboard-summary');
        $res1->assertStatus(200)
            ->assertJsonPath('summary.strong_matches', 1);

        // Update preference threshold to 80.00
        $this->actingAs($this->user)->putJson('/api/candidate-profile/preferences', [
            'min_match_threshold' => 80.00,
        ])->assertStatus(200);

        // Score 75 is now below 80 => strong_matches = 0
        $res2 = $this->actingAs($this->user)->getJson('/api/jobs/dashboard-summary');
        $res2->assertStatus(200)
            ->assertJsonPath('summary.strong_matches', 0);
    }
}
