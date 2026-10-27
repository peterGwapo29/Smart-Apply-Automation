<?php

namespace Tests\Feature;

use App\Models\CandidatePreference;
use App\Models\CandidateProfile;
use App\Models\CandidateSkill;
use App\Models\JobApplication;
use App\Models\JobApplicationAnswer;
use App\Models\JobApplicationMaterial;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\Skill;
use App\Models\User;
use App\Models\WorkExperience;
use App\Models\PortfolioProject;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationPreparationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private CandidateProfile $profile;
    private JobListing $job;
    private Resume $resume1;
    private Resume $resume2;
    private JobApplication $application;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '+639171234567',
            'location' => 'Manila, Philippines',
            'headline' => 'Senior Full-Stack Engineer',
            'summary' => 'Experienced in PHP, Laravel, and React.',
        ]);

        CandidatePreference::create([
            'candidate_profile_id' => $this->profile->id,
            'min_salary' => 80000,
            'preferred_salary' => 120000,
            'salary_currency' => 'PHP',
            'notice_period_weeks' => 2,
        ]);

        // Verified professional employment (2 years)
        WorkExperience::create([
            'candidate_profile_id' => $this->profile->id,
            'company_name' => 'Tech Corp',
            'job_title' => 'Software Engineer',
            'classification' => 'employment',
            'is_current' => false,
            'start_date' => Carbon::now()->subMonths(24)->toDateString(),
            'end_date' => Carbon::now()->toDateString(),
            'responsibilities' => 'Built high-throughput backend APIs and optimized database queries.',
            'technologies_used' => ['PHP', 'Laravel', 'MySQL'],
        ]);

        // Personal project (1 year) - must NOT be added to employment duration
        WorkExperience::create([
            'candidate_profile_id' => $this->profile->id,
            'company_name' => 'Side Project',
            'job_title' => 'Personal Hobby App',
            'classification' => 'personal_project',
            'is_current' => false,
            'start_date' => Carbon::now()->subMonths(12)->toDateString(),
            'end_date' => Carbon::now()->toDateString(),
            'responsibilities' => 'Experimental hobby app.',
            'technologies_used' => ['Flutter'],
        ]);

        // Skills
        $phpSkill = Skill::firstOrCreate([
            'name' => 'PHP',
            'display_name' => 'PHP',
            'category' => 'technical',
        ]);
        CandidateSkill::create([
            'candidate_profile_id' => $this->profile->id,
            'skill_id' => $phpSkill->id,
            'proficiency_level' => 'expert',
            'years_of_experience' => 4,
        ]);

        // Resumes
        $this->resume1 = Resume::create([
            'user_id' => $this->user->id,
            'file_path' => 'resumes/resume1.pdf',
            'original_filename' => 'PHP_Fullstack_Resume.pdf',
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
            'content_hash' => hash('sha256', 'resume1_sample'),
            'is_active' => true,
            'processing_status' => 'completed',
            'raw_text' => 'Full-Stack Developer skilled in PHP, Laravel, React and MySQL.',
            'parsed_data' => ['skills' => ['PHP', 'Laravel', 'React']],
        ]);

        $this->resume2 = Resume::create([
            'user_id' => $this->user->id,
            'file_path' => 'resumes/resume2.pdf',
            'original_filename' => 'General_Resume.pdf',
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
            'content_hash' => hash('sha256', 'resume2_sample'),
            'is_active' => false,
            'processing_status' => 'completed',
            'raw_text' => 'Junior generalist with broad programming basics.',
            'parsed_data' => ['skills' => ['Python']],
        ]);

        // Job Listing
        $this->job = JobListing::create([
            'user_id' => $this->user->id,
            'title' => 'Senior Laravel Developer',
            'company_name' => 'Innovate Inc',
            'location' => 'Remote, Philippines',
            'skills' => ['PHP', 'Laravel', 'MySQL'],
            'description_raw' => 'We are seeking an experienced Laravel engineer to lead backend architecture.',
            'url' => 'https://ph.jobstreet.com/job/7770001',
            'canonical_url' => 'https://ph.jobstreet.com/job/7770001',
            'content_hash' => hash('sha256', 'job_prep_test'),
            'source' => 'manual',
            'platform' => 'jobstreet',
        ]);

        $this->application = JobApplication::create([
            'user_id' => $this->user->id,
            'candidate_profile_id' => $this->profile->id,
            'job_listing_id' => $this->job->id,
            'status' => JobApplication::STATUS_PREPARING,
            'idempotency_key' => 'app_prep_test_1',
        ]);
    }

    public function test_workspace_endpoint_returns_consolidated_preparation_data(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/applications/{$this->application->id}/workspace");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('application.id', $this->application->id)
            ->assertJsonPath('job.title', 'Senior Laravel Developer')
            ->assertJsonPath('evidence_summary.verified_professional_years', 2)
            ->assertJsonPath('evidence_summary.notice_period_weeks', 2);
    }

    public function test_personal_projects_are_strictly_excluded_from_verified_employment_duration(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/applications/{$this->application->id}/workspace");

        $response->assertOk();
        // 24 months employment = 2.0 years. Personal project of 12 months should NOT increase this to 3.0.
        $this->assertEquals(2.0, $response->json('evidence_summary.verified_professional_years'));
    }

    public function test_recommend_resume_recommends_best_matching_version_with_rationale(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/recommend-resume");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('recommendation.recommended_resume.id', $this->resume1->id);

        $rationale = $response->json('recommendation.rationale');
        $this->assertStringContainsString('PHP_Fullstack_Resume.pdf', $rationale);
    }

    public function test_select_resume_attaches_version_and_updates_material(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/select-resume", [
                'resume_id' => $this->resume1->id,
                'rationale' => 'Candidate chose primary Laravel resume.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('material.selected_resume_id', $this->resume1->id);

        $this->assertDatabaseHas('job_application_materials', [
            'job_application_id' => $this->application->id,
            'selected_resume_id' => $this->resume1->id,
        ]);
    }

    public function test_generate_materials_creates_tailored_cover_letter_and_introduction(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/generate-materials");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('material.version', 1)
            ->assertJsonPath('material.is_candidate_edited', false);

        $coverLetter = $response->json('material.cover_letter');
        $intro = $response->json('material.introduction');

        $this->assertNotEmpty($coverLetter);
        $this->assertStringContainsString('Innovate Inc', $coverLetter);
        $this->assertStringContainsString('Tech Corp', $coverLetter);
        $this->assertStringContainsString('2 years', $coverLetter);

        $this->assertNotEmpty($intro);
        $this->assertStringContainsString('Senior Full-Stack Engineer', $intro);
    }

    public function test_candidate_can_edit_materials_and_flag_persists(): void
    {
        // First generate
        $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/generate-materials");

        // Now edit
        $response = $this->actingAs($this->user)
            ->putJson("/api/applications/{$this->application->id}/materials", [
                'cover_letter' => 'Customized candidate cover letter content.',
                'introduction' => 'Customized introduction summary.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('material.cover_letter', 'Customized candidate cover letter content.')
            ->assertJsonPath('material.is_candidate_edited', true);

        $this->assertDatabaseHas('job_application_materials', [
            'job_application_id' => $this->application->id,
            'is_candidate_edited' => true,
        ]);
    }

    public function test_screening_questions_grounding_and_unknown_handling(): void
    {
        $questions = [
            'How many years of experience do you have with PHP?',
            'What is your required notice period to start?',
            'What is your target salary?',
            'Are you legally authorized to work in the Philippines?',
            'Do you hold an active AWS Certified Solutions Architect license?', // Unknown / not in profile
        ];

        $response = $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/screening-questions/draft", [
                'questions' => $questions,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $answers = $response->json('answers');
        $this->assertCount(5, $answers);

        // Check PHP experience
        $phpAns = collect($answers)->firstWhere('category', 'technology_tenure');
        $this->assertNotNull($phpAns);
        $this->assertEquals('high', $phpAns['confidence']);
        $this->assertFalse($phpAns['requires_review']);
        $this->assertStringContainsString('2 years', $phpAns['draft_answer']);

        // Check availability
        $availAns = collect($answers)->firstWhere('category', 'availability');
        $this->assertNotNull($availAns);
        $this->assertStringContainsString('2 weeks', $availAns['draft_answer']);

        // Check unknown AWS license (anti-hallucination check)
        $licenseAns = collect($answers)->first(fn($a) => str_contains($a['question'], 'AWS'));
        $this->assertNotNull($licenseAns);
        $this->assertEquals('unknown', $licenseAns['confidence']);
        $this->assertTrue($licenseAns['requires_review']);
        $this->assertStringContainsString('unknown', strtolower($licenseAns['draft_answer']));
    }

    public function test_candidate_can_update_screening_question_to_resolve_review_flag(): void
    {
        $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/screening-questions/draft", [
                'questions' => ['Do you hold an active AWS license?'],
            ]);

        $answer = JobApplicationAnswer::where('job_application_id', $this->application->id)->first();
        $this->assertTrue($answer->requires_review);

        $response = $this->actingAs($this->user)
            ->putJson("/api/applications/{$this->application->id}/screening-questions/{$answer->id}", [
                'draft_answer' => 'Yes, verified AWS Certified Developer certification.',
                'requires_review' => false,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('answer.confidence', 'high')
            ->assertJsonPath('answer.requires_review', false)
            ->assertJsonPath('answer.is_candidate_edited', true);
    }

    public function test_readiness_evaluation_and_blocking_issues(): void
    {
        // Initially, no resume selected and no cover letter -> must NOT be ready
        $response = $this->actingAs($this->user)
            ->getJson("/api/applications/{$this->application->id}/readiness");

        $response->assertOk()
            ->assertJsonPath('readiness.is_ready', false);

        $blockingCodes = collect($response->json('readiness.blocking_issues'))->pluck('code')->all();
        $this->assertContains('MISSING_RESUME', $blockingCodes);
        $this->assertContains('MISSING_COVER_LETTER', $blockingCodes);

        // Generate materials (which selects resume + drafts cover letter)
        $this->actingAs($this->user)
            ->postJson("/api/applications/{$this->application->id}/generate-materials");

        // Check readiness again -> should now be ready
        $response2 = $this->actingAs($this->user)
            ->getJson("/api/applications/{$this->application->id}/readiness");

        $response2->assertOk()
            ->assertJsonPath('readiness.is_ready', true)
            ->assertJsonPath('application.status', JobApplication::STATUS_READY);

        // Readiness must NEVER set status to submitted
        $this->assertNotEquals(JobApplication::STATUS_SUBMITTED, $response2->json('application.status'));
    }

    public function test_candidate_cannot_access_or_modify_another_users_application_preparation(): void
    {
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)
            ->getJson("/api/applications/{$this->application->id}/workspace")
            ->assertNotFound();

        $this->actingAs($otherUser)
            ->postJson("/api/applications/{$this->application->id}/generate-materials")
            ->assertNotFound();
    }
}
