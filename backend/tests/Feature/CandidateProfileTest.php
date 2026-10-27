<?php

namespace Tests\Feature;

use App\Models\CandidateProfile;
use App\Models\CandidateSkill;
use App\Models\PortfolioProject;
use App\Models\Resume;
use App\Models\User;
use App\Models\WorkExperience;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\PdfTestFactory;
use Tests\TestCase;

class CandidateProfileTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->user = User::factory()->create([
            'email' => 'peter@jobstreet-automation.local',
        ]);
    }

    /**
     * Test confirming a parsed resume populates candidate profile, skills, experiences, and projects.
     */
    public function test_user_can_confirm_and_activate_resume(): void
    {
        $file = PdfTestFactory::createValidPdf();
        $uploadRes = $this->actingAs($this->user)->postJson('/api/resumes', ['file' => $file]);
        $resumeId = $uploadRes->json('resume.id');

        $confirmPayload = [
            'basic_info' => [
                'full_name' => 'John Confirmed',
                'email' => 'john.confirmed@example.com',
                'phone' => '+63 912 345 6789',
                'location' => 'Manila, Philippines',
                'headline' => 'Senior Full-Stack Engineer',
                'summary' => 'Seasoned full-stack engineer building scalable systems.',
            ],
            'skills' => [
                ['display_name' => 'PHP', 'category' => 'backend', 'raw_extracted_text' => 'PHP', 'review_status' => 'confirmed'],
                ['display_name' => 'Laravel', 'category' => 'backend', 'raw_extracted_text' => 'Laravel', 'review_status' => 'confirmed'],
                ['display_name' => 'React', 'category' => 'frontend', 'raw_extracted_text' => 'React', 'review_status' => 'confirmed'],
                ['display_name' => 'MySQL', 'category' => 'database', 'raw_extracted_text' => 'MySQL', 'review_status' => 'confirmed'],
            ],
            'work_experiences' => [
                [
                    'company_name' => 'Tech Corp',
                    'job_title' => 'Senior Developer',
                    'classification' => 'employment',
                    'is_current' => true,
                    'start_date' => '2021',
                    'end_date' => 'Present',
                    'responsibilities' => 'Built backend APIs and microservices.',
                    'technologies_used' => ['PHP', 'Laravel', 'MySQL'],
                    'review_status' => 'confirmed',
                ],
                [
                    'company_name' => 'Upwork Clients',
                    'job_title' => 'Freelance Web Developer',
                    'classification' => 'freelance',
                    'is_current' => false,
                    'start_date' => '2019',
                    'end_date' => '2021',
                    'responsibilities' => 'Developed custom client web applications.',
                    'technologies_used' => ['React', 'JavaScript'],
                    'review_status' => 'confirmed',
                ],
            ],
            'portfolio_projects' => [
                [
                    'name' => 'Golden Resort Booking System',
                    'description' => 'Real-time resort booking platform with payment gateway integration.',
                    'technologies_used' => ['Laravel', 'MySQL', 'React'],
                    'category' => 'personal',
                    'review_status' => 'confirmed',
                ],
            ],
            'education' => [
                [
                    'institution_name' => 'State University',
                    'qualification' => 'Bachelor of Science',
                    'field_of_study' => 'Information Technology',
                    'completion_date' => '2019',
                    'status' => 'graduated',
                    'review_status' => 'confirmed',
                ],
            ],
            'certifications' => [
                [
                    'name' => 'AWS Certified Developer',
                    'issuing_organization' => 'Amazon Web Services',
                    'issue_date' => '2022',
                    'review_status' => 'confirmed',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson("/api/resumes/{$resumeId}/confirm", $confirmPayload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'resume_id' => $resumeId,
                'is_active' => true,
            ]);

        // Verify Candidate Profile
        $this->assertDatabaseHas('candidate_profiles', [
            'user_id' => $this->user->id,
            'full_name' => 'John Confirmed',
            'headline' => 'Senior Full-Stack Engineer',
        ]);

        // Verify Resume is active and confirmed
        $this->assertDatabaseHas('resumes', [
            'id' => $resumeId,
            'is_active' => true,
            'processing_status' => 'confirmed',
        ]);

        // Verify Work Experiences
        $this->assertDatabaseHas('work_experiences', [
            'company_name' => 'Tech Corp',
            'classification' => 'employment',
        ]);
        $this->assertDatabaseHas('work_experiences', [
            'company_name' => 'Upwork Clients',
            'classification' => 'freelance',
        ]);

        // Verify Portfolio Projects kept separate from employment
        $this->assertDatabaseHas('portfolio_projects', [
            'name' => 'Golden Resort Booking System',
            'category' => 'personal',
        ]);
        $this->assertDatabaseMissing('work_experiences', [
            'company_name' => 'Golden Resort Booking System',
        ]);
    }

    /**
     * Test replacing active resume preserves historical versions without deleting history.
     */
    public function test_subsequent_resume_confirmation_preserves_history(): void
    {
        $file1 = PdfTestFactory::createValidPdf();
        $res1 = $this->actingAs($this->user)->postJson('/api/resumes', ['file' => $file1]);
        $resumeId1 = $res1->json('resume.id');
        $this->actingAs($this->user)->postJson("/api/resumes/{$resumeId1}/confirm", []);

        $file2 = PdfTestFactory::createValidPdf();
        $res2 = $this->actingAs($this->user)->postJson('/api/resumes', ['file' => $file2]);
        $resumeId2 = $res2->json('resume.id');
        $this->actingAs($this->user)->postJson("/api/resumes/{$resumeId2}/confirm", []);

        // Both resumes exist in database
        $this->assertDatabaseCount('resumes', 2);

        // Resume 1 is inactive
        $this->assertDatabaseHas('resumes', [
            'id' => $resumeId1,
            'is_active' => false,
        ]);

        // Resume 2 is active
        $this->assertDatabaseHas('resumes', [
            'id' => $resumeId2,
            'is_active' => true,
        ]);
    }

    /**
     * Test fetching candidate profile returns organized structure.
     */
    public function test_candidate_profile_retrieval_returns_grouped_skills(): void
    {
        $profile = CandidateProfile::create([
            'user_id' => $this->user->id,
            'full_name' => 'Peter Candidate',
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/candidate-profile');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'profile',
                'skills' => [
                    'backend',
                    'frontend',
                    'database',
                    'tools',
                    'other',
                ],
                'work_experiences',
                'portfolio_projects',
                'education',
                'certifications',
            ]);
    }

    /**
     * Test manual skill addition and duplicate prevention.
     */
    public function test_manual_skill_addition_and_deduplication(): void
    {
        $profile = CandidateProfile::create(['user_id' => $this->user->id]);

        // Add Skill 1
        $res1 = $this->actingAs($this->user)->postJson('/api/candidate-profile/skills', [
            'display_name' => 'Docker',
            'category' => 'tools',
        ]);
        $res1->assertStatus(201);

        // Add same Skill again with different casing
        $res2 = $this->actingAs($this->user)->postJson('/api/candidate-profile/skills', [
            'display_name' => 'docker',
            'category' => 'tools',
        ]);
        $res2->assertStatus(201);

        // Assert only 1 candidate skill record exists
        $this->assertDatabaseCount('candidate_skills', 1);
    }
}
