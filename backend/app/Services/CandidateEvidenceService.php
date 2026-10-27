<?php

namespace App\Services;

use App\Models\CandidateProfile;
use App\Models\CandidatePreference;
use App\Models\WorkExperience;
use App\Models\PortfolioProject;
use App\Models\EducationRecord;
use App\Models\Certification;
use Carbon\Carbon;

class CandidateEvidenceService
{
    /**
     * Compile structured, provenance-tagged candidate evidence bundle.
     */
    public function compileEvidence(CandidateProfile $profile): array
    {
        $profile->loadMissing([
            'workExperiences',
            'portfolioProjects',
            'candidateSkills.skill',
            'educationRecords',
            'certifications',
            'preferences',
        ]);

        $employmentExperiences = [];
        $personalProjects = [];

        foreach ($profile->workExperiences as $exp) {
            $isEmployment = in_array($exp->classification, ['employment', 'contract', 'freelance'], true);
            $startDate = $exp->start_date ? Carbon::parse($exp->start_date) : null;
            $endDate = $exp->is_current ? Carbon::now() : ($exp->end_date ? Carbon::parse($exp->end_date) : null);
            $months = 0;
            if ($startDate && $endDate && $endDate->greaterThanOrEqualTo($startDate)) {
                $months = $startDate->diffInMonths($endDate);
            }

            $item = [
                'id' => $exp->id,
                'type' => 'work_experience',
                'company_name' => $exp->company_name,
                'job_title' => $exp->job_title,
                'classification' => $exp->classification,
                'is_current' => (bool)$exp->is_current,
                'start_date' => $exp->start_date,
                'end_date' => $exp->is_current ? 'Present' : $exp->end_date,
                'months_duration' => $months,
                'responsibilities' => $exp->responsibilities,
                'technologies_used' => $exp->technologies_used ?? [],
            ];

            if ($isEmployment) {
                $employmentExperiences[] = $item;
            } else {
                $item['provenance_note'] = 'Non-employment project (excluded from professional tenure)';
                $personalProjects[] = $item;
            }
        }

        // Add portfolio projects to practical projects list
        foreach ($profile->portfolioProjects as $proj) {
            $personalProjects[] = [
                'id' => $proj->id,
                'type' => 'portfolio_project',
                'name' => $proj->name,
                'description' => $proj->description,
                'category' => $proj->category,
                'project_url' => $proj->project_url,
                'technologies_used' => $proj->technologies_used ?? [],
                'provenance_note' => 'Portfolio project (demonstrates skill application, not employment)',
            ];
        }

        // Calculate verified professional employment years
        $totalEmploymentMonths = 0;
        foreach ($employmentExperiences as $emp) {
            $totalEmploymentMonths += $emp['months_duration'];
        }
        $professionalYears = round($totalEmploymentMonths / 12, 1);

        // Map skills with verified employment tenure
        $skills = [];
        foreach ($profile->candidateSkills as $cs) {
            $skillName = $cs->skill ? $cs->skill->name : 'Unknown';
            $skillMonths = 0;
            foreach ($employmentExperiences as $emp) {
                $techs = array_map('strtolower', (array)($emp['technologies_used'] ?? []));
                if (in_array(strtolower($skillName), $techs, true)) {
                    $skillMonths += $emp['months_duration'];
                }
            }
            $skillYears = round($skillMonths / 12, 1);

            $skills[] = [
                'id' => $cs->id,
                'skill_id' => $cs->skill_id,
                'name' => $skillName,
                'category' => $cs->category_override ?? ($cs->skill ? $cs->skill->category : null),
                'proficiency_level' => $cs->review_status ?? 'confirmed',
                'years_of_experience' => $skillYears,
            ];
        }

        // Map education
        $education = [];
        foreach ($profile->educationRecords as $edu) {
            $education[] = [
                'id' => $edu->id,
                'institution' => $edu->institution,
                'degree' => $edu->degree,
                'field_of_study' => $edu->field_of_study,
                'start_year' => $edu->start_year,
                'end_year' => $edu->end_year,
            ];
        }

        // Map certifications
        $certifications = [];
        foreach ($profile->certifications as $cert) {
            $certifications[] = [
                'id' => $cert->id,
                'name' => $cert->name,
                'issuing_organization' => $cert->issuing_organization,
                'issue_date' => $cert->issue_date,
            ];
        }

        // Map preferences
        $pref = $profile->preferences;
        $preferencesData = [
            'notice_period_weeks' => $pref ? $pref->notice_period_weeks : 2,
            'min_salary' => $pref ? $pref->min_salary : null,
            'preferred_salary' => $pref ? $pref->preferred_salary : null,
            'salary_currency' => $pref ? ($pref->salary_currency ?? 'PHP') : 'PHP',
            'work_arrangements' => $pref ? ($pref->work_arrangements ?? []) : [],
            'preferred_locations' => $pref ? ($pref->preferred_locations ?? []) : [],
        ];

        return [
            'profile_id' => $profile->id,
            'headline' => $profile->headline,
            'summary' => $profile->summary,
            'location' => [
                'city' => $profile->city ?? $profile->location,
                'state_province' => $profile->state_province ?? null,
                'country' => $profile->country ?? null,
                'raw' => $profile->location,
            ],
            'contact' => [
                'phone' => $profile->phone ?? $profile->phone_number,
                'email' => $profile->email,
                'linkedin_url' => $profile->linkedin_url ?? null,
                'github_url' => $profile->github_url ?? null,
                'portfolio_url' => $profile->portfolio_url ?? null,
            ],
            'citizenship' => $profile->citizenship ?? null,
            'work_authorization_status' => $profile->work_authorization_status ?? null,
            'verified_professional_years' => $professionalYears,
            'employment_history' => $employmentExperiences,
            'practical_projects' => $personalProjects,
            'skills' => $skills,
            'education' => $education,
            'certifications' => $certifications,
            'preferences' => $preferencesData,
        ];
    }
}
