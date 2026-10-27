<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCandidatePreferencesRequest extends FormRequest
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
            'work_arrangements' => 'nullable|array',
            'work_arrangements.*' => 'string|in:remote,hybrid,on_site',
            'employment_types' => 'nullable|array',
            'employment_types.*' => 'string|max:50',
            'preferred_locations' => 'nullable|array',
            'preferred_locations.*' => 'string|max:100',
            'min_salary' => 'nullable|numeric|min:0',
            'preferred_salary' => 'nullable|numeric|min:0',
            'salary_currency' => 'nullable|string|max:10',
            'salary_period' => 'nullable|string|in:monthly,hourly,yearly',
            'notice_period_weeks' => 'nullable|integer|min:0|max:52',
            'hard_disqualifiers' => 'nullable|array',
            'min_match_threshold' => 'nullable|numeric|min:0|max:100',
        ];
    }
}
