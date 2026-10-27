<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\EncryptedPdfException;
use App\Exceptions\ScannedPdfException;
use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmResumeRequest;
use App\Http\Requests\UploadResumeRequest;
use App\Models\CandidateProfile;
use App\Models\CandidateSkill;
use App\Models\Certification;
use App\Models\EducationRecord;
use App\Models\PortfolioProject;
use App\Models\Resume;
use App\Models\Skill;
use App\Models\User;
use App\Models\WorkExperience;
use App\Services\PdfParserService;
use App\Services\StructuredResumeExtractor;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class ResumeController extends Controller
{
    /**
     * Resolve the current authenticated user (with fallback to default user in local development).
     */
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * List resume versions for the user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $resumes = Resume::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get([
                'id',
                'original_filename',
                'file_size',
                'mime_type',
                'content_hash',
                'is_active',
                'processing_status',
                'error_message',
                'created_at',
                'updated_at',
            ]);

        return response()->json([
            'status' => 'ok',
            'resumes' => $resumes,
        ]);
    }

    /**
     * Upload and parse a new resume.
     */
    public function store(
        UploadResumeRequest $request,
        PdfParserService $parserService,
        StructuredResumeExtractor $extractor
    ): JsonResponse {
        $user = $this->resolveUser($request);
        $file = $request->file('file');

        $originalFilename = $file->getClientOriginalName();
        $fileSize = $file->getSize();
        $contentHash = hash_file('sha256', $file->getRealPath());

        // Store privately outside public web directory
        $storageDir = 'resumes/' . $user->id;
        $fileName = $contentHash . '.pdf';
        $path = $file->storeAs($storageDir, $fileName);

        $resume = Resume::create([
            'user_id' => $user->id,
            'file_path' => $path,
            'original_filename' => $originalFilename,
            'file_size' => $fileSize,
            'mime_type' => 'application/pdf',
            'content_hash' => $contentHash,
            'is_active' => false,
            'processing_status' => 'parsing',
        ]);

        $absolutePath = Storage::path($path);

        try {
            $extractedText = $parserService->extractText($absolutePath);
            $parsedData = $extractor->extract($extractedText);

            $resume->update([
                'processing_status' => 'parsed',
                'parsed_data' => $parsedData,
                'raw_text' => $extractedText,
                'error_message' => null,
            ]);

            return response()->json([
                'status' => 'ok',
                'message' => 'Resume uploaded and parsed successfully.',
                'resume' => [
                    'id' => $resume->id,
                    'original_filename' => $resume->original_filename,
                    'file_size' => $resume->file_size,
                    'processing_status' => $resume->processing_status,
                    'is_active' => $resume->is_active,
                    'created_at' => $resume->created_at,
                ],
                'proposed_profile' => $parsedData,
            ], 201);
        } catch (ScannedPdfException $e) {
            $resume->update([
                'processing_status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'error_type' => 'scanned_pdf',
                'message' => $e->getMessage(),
                'resume_id' => $resume->id,
            ], 422);
        } catch (EncryptedPdfException $e) {
            $resume->update([
                'processing_status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'error_type' => 'encrypted_pdf',
                'message' => $e->getMessage(),
                'resume_id' => $resume->id,
            ], 422);
        } catch (InvalidArgumentException $e) {
            $resume->update([
                'processing_status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'error_type' => 'invalid_pdf',
                'message' => $e->getMessage(),
                'resume_id' => $resume->id,
            ], 422);
        } catch (Exception $e) {
            Log::error('Resume parsing failure: ' . $e->getMessage());
            $resume->update([
                'processing_status' => 'failed',
                'error_message' => 'An unexpected error occurred while parsing the resume.',
            ]);

            return response()->json([
                'status' => 'error',
                'error_type' => 'server_error',
                'message' => 'An error occurred while parsing the resume.',
                'resume_id' => $resume->id,
            ], 500);
        }
    }

    /**
     * Retrieve resume details and parsed draft.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $resume = Resume::where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'status' => 'ok',
            'resume' => [
                'id' => $resume->id,
                'original_filename' => $resume->original_filename,
                'file_size' => $resume->file_size,
                'processing_status' => $resume->processing_status,
                'is_active' => $resume->is_active,
                'error_message' => $resume->error_message,
                'created_at' => $resume->created_at,
                'updated_at' => $resume->updated_at,
            ],
            'proposed_profile' => $resume->parsed_data,
        ]);
    }

    /**
     * Confirm reviewed profile and activate resume.
     */
    public function confirm(ConfirmResumeRequest $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);

        $resume = Resume::where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        DB::beginTransaction();
        try {
            // 1. Candidate Profile basic information
            $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

            if ($request->has('basic_info')) {
                $basicInfo = $request->input('basic_info', []);
                $profile->update(array_filter([
                    'full_name' => $basicInfo['full_name'] ?? $profile->full_name,
                    'email' => $basicInfo['email'] ?? $profile->email,
                    'phone' => $basicInfo['phone'] ?? $profile->phone,
                    'location' => $basicInfo['location'] ?? $profile->location,
                    'headline' => $basicInfo['headline'] ?? $profile->headline,
                    'summary' => $basicInfo['summary'] ?? $profile->summary,
                ], fn($val) => !is_null($val)));
            }

            // 2. Sync Skills
            if ($request->has('skills')) {
                $submittedSkills = $request->input('skills', []);
                // Remove existing candidate skills to replace with confirmed set
                CandidateSkill::where('candidate_profile_id', $profile->id)->delete();

                foreach ($submittedSkills as $item) {
                    $displayName = trim($item['display_name'] ?? '');
                    if (empty($displayName)) {
                        continue;
                    }
                    $nameKey = strtolower($displayName);
                    $category = $item['category'] ?? 'other';

                    $skill = Skill::firstOrCreate(
                        ['name' => $nameKey],
                        ['display_name' => $displayName, 'category' => $category]
                    );

                    CandidateSkill::updateOrCreate(
                        [
                            'candidate_profile_id' => $profile->id,
                            'skill_id' => $skill->id,
                        ],
                        [
                            'category_override' => $category,
                            'raw_extracted_text' => $item['raw_extracted_text'] ?? $displayName,
                            'review_status' => $item['review_status'] ?? 'confirmed',
                        ]
                    );
                }
            }

            // 3. Work Experiences
            if ($request->has('work_experiences')) {
                $submittedExp = $request->input('work_experiences', []);
                WorkExperience::where('candidate_profile_id', $profile->id)->delete();

                foreach ($submittedExp as $exp) {
                    WorkExperience::create([
                        'candidate_profile_id' => $profile->id,
                        'resume_id' => $resume->id,
                        'company_name' => $exp['company_name'],
                        'job_title' => $exp['job_title'],
                        'classification' => $exp['classification'] ?? 'employment',
                        'is_current' => !empty($exp['is_current']),
                        'start_date' => $exp['start_date'] ?? null,
                        'end_date' => $exp['end_date'] ?? null,
                        'responsibilities' => $exp['responsibilities'] ?? null,
                        'technologies_used' => $exp['technologies_used'] ?? [],
                        'raw_source_text' => $exp['raw_source_text'] ?? null,
                        'review_status' => $exp['review_status'] ?? 'confirmed',
                    ]);
                }
            }

            // 4. Portfolio Projects (kept strictly distinct from employment)
            if ($request->has('portfolio_projects')) {
                $submittedProjects = $request->input('portfolio_projects', []);
                PortfolioProject::where('candidate_profile_id', $profile->id)->delete();

                foreach ($submittedProjects as $proj) {
                    PortfolioProject::create([
                        'candidate_profile_id' => $profile->id,
                        'resume_id' => $resume->id,
                        'name' => $proj['name'],
                        'description' => $proj['description'] ?? null,
                        'technologies_used' => $proj['technologies_used'] ?? [],
                        'project_url' => $proj['project_url'] ?? null,
                        'repository_url' => $proj['repository_url'] ?? null,
                        'category' => $proj['category'] ?? 'personal',
                        'raw_source_text' => $proj['raw_source_text'] ?? null,
                        'review_status' => $proj['review_status'] ?? 'confirmed',
                    ]);
                }
            }

            // 5. Education
            if ($request->has('education')) {
                $submittedEdu = $request->input('education', []);
                EducationRecord::where('candidate_profile_id', $profile->id)->delete();

                foreach ($submittedEdu as $edu) {
                    EducationRecord::create([
                        'candidate_profile_id' => $profile->id,
                        'resume_id' => $resume->id,
                        'institution_name' => $edu['institution_name'],
                        'qualification' => $edu['qualification'] ?? null,
                        'field_of_study' => $edu['field_of_study'] ?? null,
                        'start_date' => $edu['start_date'] ?? null,
                        'completion_date' => $edu['completion_date'] ?? null,
                        'status' => $edu['status'] ?? 'graduated',
                        'raw_source_text' => $edu['raw_source_text'] ?? null,
                        'review_status' => $edu['review_status'] ?? 'confirmed',
                    ]);
                }
            }

            // 6. Certifications
            if ($request->has('certifications')) {
                $submittedCerts = $request->input('certifications', []);
                Certification::where('candidate_profile_id', $profile->id)->delete();

                foreach ($submittedCerts as $cert) {
                    Certification::create([
                        'candidate_profile_id' => $profile->id,
                        'resume_id' => $resume->id,
                        'name' => $cert['name'],
                        'issuing_organization' => $cert['issuing_organization'] ?? null,
                        'issue_date' => $cert['issue_date'] ?? null,
                        'expiration_date' => $cert['expiration_date'] ?? null,
                        'credential_id' => $cert['credential_id'] ?? null,
                        'credential_url' => $cert['credential_url'] ?? null,
                        'raw_source_text' => $cert['raw_source_text'] ?? null,
                        'review_status' => $cert['review_status'] ?? 'confirmed',
                    ]);
                }
            }

            // 7. Update active resume version without deleting history
            Resume::where('user_id', $user->id)->update(['is_active' => false]);
            $resume->update([
                'is_active' => true,
                'processing_status' => 'confirmed',
            ]);

            DB::commit();

            return response()->json([
                'status' => 'ok',
                'message' => 'Candidate profile confirmed and saved successfully.',
                'resume_id' => $resume->id,
                'is_active' => true,
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Profile confirmation transaction failed: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save confirmed candidate profile: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retry parsing for an existing resume.
     */
    public function retry(
        Request $request,
        int $id,
        PdfParserService $parserService,
        StructuredResumeExtractor $extractor
    ): JsonResponse {
        $user = $this->resolveUser($request);

        $resume = Resume::where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        $absolutePath = Storage::path($resume->file_path);

        try {
            $extractedText = $parserService->extractText($absolutePath);
            $parsedData = $extractor->extract($extractedText);

            $resume->update([
                'processing_status' => 'parsed',
                'parsed_data' => $parsedData,
                'raw_text' => $extractedText,
                'error_message' => null,
            ]);

            return response()->json([
                'status' => 'ok',
                'message' => 'Resume re-parsed successfully.',
                'resume_id' => $resume->id,
                'proposed_profile' => $parsedData,
            ]);
        } catch (Exception $e) {
            $resume->update([
                'processing_status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'resume_id' => $resume->id,
            ], 422);
        }
    }
}
