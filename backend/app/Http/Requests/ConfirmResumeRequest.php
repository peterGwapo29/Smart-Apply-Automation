<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'basic_info' => 'nullable|array',
            'basic_info.full_name' => 'nullable|string|max:255',
            'basic_info.email' => 'nullable|email|max:255',
            'basic_info.phone' => 'nullable|string|max:50',
            'basic_info.location' => 'nullable|string|max:255',
            'basic_info.headline' => 'nullable|string|max:255',
            'basic_info.summary' => 'nullable|string',

            'skills' => 'nullable|array',
            'skills.*.display_name' => 'required_with:skills|string|max:100',
            'skills.*.category' => 'nullable|string|max:50',
            'skills.*.raw_extracted_text' => 'nullable|string',
            'skills.*.review_status' => 'nullable|string|in:pending_review,confirmed,corrected,rejected',

            'work_experiences' => 'nullable|array',
            'work_experiences.*.company_name' => 'required_with:work_experiences|string|max:255',
            'work_experiences.*.job_title' => 'required_with:work_experiences|string|max:255',
            'work_experiences.*.classification' => 'nullable|string|max:50',
            'work_experiences.*.is_current' => 'nullable|boolean',
            'work_experiences.*.start_date' => 'nullable|string|max:50',
            'work_experiences.*.end_date' => 'nullable|string|max:50',
            'work_experiences.*.responsibilities' => 'nullable|string',
            'work_experiences.*.technologies_used' => 'nullable|array',
            'work_experiences.*.review_status' => 'nullable|string|in:pending_review,confirmed,corrected,rejected',

            'portfolio_projects' => 'nullable|array',
            'portfolio_projects.*.name' => 'required_with:portfolio_projects|string|max:255',
            'portfolio_projects.*.description' => 'nullable|string',
            'portfolio_projects.*.technologies_used' => 'nullable|array',
            'portfolio_projects.*.project_url' => 'nullable|string|max:255',
            'portfolio_projects.*.repository_url' => 'nullable|string|max:255',
            'portfolio_projects.*.category' => 'nullable|string|max:50',
            'portfolio_projects.*.review_status' => 'nullable|string|in:pending_review,confirmed,corrected,rejected',

            'education' => 'nullable|array',
            'education.*.institution_name' => 'required_with:education|string|max:255',
            'education.*.qualification' => 'nullable|string|max:255',
            'education.*.field_of_study' => 'nullable|string|max:255',
            'education.*.completion_date' => 'nullable|string|max:50',
            'education.*.status' => 'nullable|string|max:50',
            'education.*.review_status' => 'nullable|string|in:pending_review,confirmed,corrected,rejected',

            'certifications' => 'nullable|array',
            'certifications.*.name' => 'required_with:certifications|string|max:255',
            'certifications.*.issuing_organization' => 'nullable|string|max:255',
            'certifications.*.issue_date' => 'nullable|string|max:50',
            'certifications.*.credential_id' => 'nullable|string|max:100',
            'certifications.*.credential_url' => 'nullable|string|max:255',
            'certifications.*.review_status' => 'nullable|string|in:pending_review,confirmed,corrected,rejected',
        ];
    }
}
