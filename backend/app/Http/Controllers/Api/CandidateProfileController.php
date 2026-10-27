<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CandidateProfile;
use App\Models\CandidateSkill;
use App\Models\Certification;
use App\Models\EducationRecord;
use App\Models\PortfolioProject;
use App\Models\Resume;
use App\Models\Skill;
use App\Models\User;
use App\Models\WorkExperience;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CandidateProfileController extends Controller
{
    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * Get candidate profile with all relational data.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $profile = CandidateProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'full_name' => $user->name,
                'email' => $user->email,
            ]
        );

        $activeResume = Resume::where('user_id', $user->id)
            ->where('is_active', true)
            ->first([
                'id',
                'original_filename',
                'file_size',
                'created_at',
                'updated_at',
            ]);

        // Fetch skills with pivot metadata
        $skills = CandidateSkill::with('skill')
            ->where('candidate_profile_id', $profile->id)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'skill_id' => $item->skill_id,
                    'name' => $item->skill->name,
                    'display_name' => $item->skill->display_name,
                    'category' => $item->category_override ?? $item->skill->category,
                    'raw_extracted_text' => $item->raw_extracted_text,
                    'review_status' => $item->review_status,
                ];
            });

        // Group skills by category
        $groupedSkills = [
            'backend' => $skills->where('category', 'backend')->values(),
            'frontend' => $skills->where('category', 'frontend')->values(),
            'database' => $skills->where('category', 'database')->values(),
            'tools' => $skills->where('category', 'tools')->values(),
            'other' => $skills->where('category', 'other')->values(),
        ];

        $experiences = WorkExperience::where('candidate_profile_id', $profile->id)
            ->orderBy('is_current', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $projects = PortfolioProject::where('candidate_profile_id', $profile->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $education = EducationRecord::where('candidate_profile_id', $profile->id)
            ->orderBy('completion_date', 'desc')
            ->get();

        $certifications = Certification::where('candidate_profile_id', $profile->id)
            ->orderBy('issue_date', 'desc')
            ->get();

        return response()->json([
            'status' => 'ok',
            'profile' => [
                'id' => $profile->id,
                'full_name' => $profile->full_name,
                'email' => $profile->email,
                'phone' => $profile->phone,
                'location' => $profile->location,
                'headline' => $profile->headline,
                'summary' => $profile->summary,
                'created_at' => $profile->created_at,
                'updated_at' => $profile->updated_at,
            ],
            'active_resume' => $activeResume,
            'skills' => $groupedSkills,
            'all_skills' => $skills,
            'work_experiences' => $experiences,
            'portfolio_projects' => $projects,
            'education' => $education,
            'certifications' => $certifications,
        ]);
    }

    /**
     * Update basic profile fields.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        $validated = $request->validate([
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
            'headline' => 'nullable|string|max:255',
            'summary' => 'nullable|string',
        ]);

        $profile->update($validated);

        return response()->json([
            'status' => 'ok',
            'message' => 'Candidate profile updated successfully.',
            'profile' => $profile,
        ]);
    }

    /**
     * Add a skill manually.
     */
    public function addSkill(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        $validated = $request->validate([
            'display_name' => 'required|string|max:100',
            'category' => 'nullable|string|in:backend,frontend,database,tools,other',
        ]);

        $category = $validated['category'] ?? 'other';
        $skill = Skill::firstOrCreate(
            ['name' => strtolower(trim($validated['display_name']))],
            ['display_name' => trim($validated['display_name']), 'category' => $category]
        );

        $candidateSkill = CandidateSkill::updateOrCreate(
            [
                'candidate_profile_id' => $profile->id,
                'skill_id' => $skill->id,
            ],
            [
                'category_override' => $category,
                'raw_extracted_text' => $validated['display_name'],
                'review_status' => 'confirmed',
            ]
        );

        return response()->json([
            'status' => 'ok',
            'message' => 'Skill added successfully.',
            'skill' => $candidateSkill,
        ], 201);
    }

    /**
     * Delete a candidate skill.
     */
    public function deleteSkill(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::where('user_id', $user->id)->firstOrFail();

        CandidateSkill::where('candidate_profile_id', $profile->id)
            ->where('id', $id)
            ->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Skill removed successfully.',
        ]);
    }

    /**
     * Add a work experience manually.
     */
    public function addExperience(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'job_title' => 'required|string|max:255',
            'classification' => 'nullable|string|max:50',
            'is_current' => 'nullable|boolean',
            'start_date' => 'nullable|string|max:50',
            'end_date' => 'nullable|string|max:50',
            'responsibilities' => 'nullable|string',
            'technologies_used' => 'nullable|array',
        ]);

        $exp = WorkExperience::create([
            'candidate_profile_id' => $profile->id,
            'company_name' => $validated['company_name'],
            'job_title' => $validated['job_title'],
            'classification' => $validated['classification'] ?? 'employment',
            'is_current' => !empty($validated['is_current']),
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'responsibilities' => $validated['responsibilities'] ?? null,
            'technologies_used' => $validated['technologies_used'] ?? [],
            'review_status' => 'confirmed',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Work experience added successfully.',
            'experience' => $exp,
        ], 201);
    }

    /**
     * Delete a work experience.
     */
    public function deleteExperience(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::where('user_id', $user->id)->firstOrFail();

        WorkExperience::where('candidate_profile_id', $profile->id)
            ->where('id', $id)
            ->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Work experience deleted successfully.',
        ]);
    }

    /**
     * Add a portfolio project manually.
     */
    public function addProject(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::firstOrCreate(['user_id' => $user->id]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'technologies_used' => 'nullable|array',
            'project_url' => 'nullable|string|max:255',
            'repository_url' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:50',
        ]);

        $project = PortfolioProject::create([
            'candidate_profile_id' => $profile->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'technologies_used' => $validated['technologies_used'] ?? [],
            'project_url' => $validated['project_url'] ?? null,
            'repository_url' => $validated['repository_url'] ?? null,
            'category' => $validated['category'] ?? 'personal',
            'review_status' => 'confirmed',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Portfolio project added successfully.',
            'project' => $project,
        ], 201);
    }

    /**
     * Delete a portfolio project.
     */
    public function deleteProject(Request $request, int $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $profile = CandidateProfile::where('user_id', $user->id)->firstOrFail();

        PortfolioProject::where('candidate_profile_id', $profile->id)
            ->where('id', $id)
            ->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Portfolio project deleted successfully.',
        ]);
    }
}
