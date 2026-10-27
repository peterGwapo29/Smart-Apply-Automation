<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\PdfTestFactory;
use Tests\TestCase;

class ResumeUploadTest extends TestCase
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
     * Test uploading a valid text-based PDF successfully extracts structured data.
     */
    public function test_user_can_upload_and_parse_valid_pdf(): void
    {
        $file = PdfTestFactory::createValidPdf();

        $response = $this->actingAs($this->user)
            ->postJson('/api/resumes', [
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'ok',
                'message' => 'Resume uploaded and parsed successfully.',
            ])
            ->assertJsonStructure([
                'resume' => [
                    'id',
                    'original_filename',
                    'file_size',
                    'processing_status',
                    'is_active',
                ],
                'proposed_profile' => [
                    'basic_info',
                    'skills',
                    'work_experiences',
                    'portfolio_projects',
                    'education',
                    'certifications',
                ],
            ]);

        $this->assertDatabaseHas('resumes', [
            'user_id' => $this->user->id,
            'is_active' => false,
            'processing_status' => 'parsed',
        ]);
    }

    /**
     * Test uploading a file that is not a real PDF is rejected.
     */
    public function test_upload_rejects_fake_pdf(): void
    {
        $file = PdfTestFactory::createFakePdf();

        $response = $this->actingAs($this->user)
            ->postJson('/api/resumes', [
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * Test uploading an empty or scanned PDF detects missing text and flags OCR requirement.
     */
    public function test_upload_detects_scanned_image_only_pdf_and_requests_ocr(): void
    {
        $file = PdfTestFactory::createScannedPdf();

        $response = $this->actingAs($this->user)
            ->postJson('/api/resumes', [
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_type' => 'scanned_pdf',
            ]);
    }

    /**
     * Test uploading an oversized file is rejected by validation.
     */
    public function test_upload_rejects_oversized_pdf(): void
    {
        // 6 MB fake file
        $file = UploadedFile::fake()->create('large.pdf', 6144, 'application/pdf');

        $response = $this->actingAs($this->user)
            ->postJson('/api/resumes', [
                'file' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /**
     * Test that resume history lists all uploaded versions.
     */
    public function test_resumes_endpoint_lists_historical_versions(): void
    {
        $file1 = PdfTestFactory::createValidPdf();
        $file2 = PdfTestFactory::createValidPdf();

        $this->actingAs($this->user)->postJson('/api/resumes', ['file' => $file1]);
        $this->actingAs($this->user)->postJson('/api/resumes', ['file' => $file2]);

        $response = $this->actingAs($this->user)->getJson('/api/resumes');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'resumes');
    }
}
