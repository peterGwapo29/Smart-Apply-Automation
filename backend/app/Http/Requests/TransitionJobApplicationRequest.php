<?php

namespace App\Http\Requests;

use App\Models\JobApplication;
use Illuminate\Foundation\Http\FormRequest;

class TransitionJobApplicationRequest extends FormRequest
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
            'to_status' => 'required|string|in:' . implode(',', JobApplication::ALL_STATUSES),
            'message' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
            'metadata' => 'nullable|array',
        ];
    }
}
