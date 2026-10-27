<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'canonical_url' => 'nullable|string|max:2048',
            'url' => 'nullable|string|max:2048',
            'title' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'responsibilities' => 'nullable|array',
            'responsibilities.*' => 'string',
            'required_qualifications' => 'nullable|array',
            'required_qualifications.*' => 'string',
            'preferred_qualifications' => 'nullable|array',
            'preferred_qualifications.*' => 'string',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0',
            'salary_currency' => 'nullable|string|max:10',
            'salary_raw' => 'nullable|string|max:255',
            'employment_type' => 'nullable|string|max:100',
            'application_method' => 'nullable|string|max:100',
            'quick_apply_status' => 'nullable|in:available,unavailable,unknown,requires_review',
            'retrieval_method' => 'nullable|string|max:50',
            'review_status' => 'nullable|in:pending_review,confirmed,rejected',
        ];
    }
}
