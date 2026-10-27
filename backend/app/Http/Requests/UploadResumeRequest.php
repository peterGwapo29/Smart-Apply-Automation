<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'mimetypes:application/pdf,application/x-pdf',
                'mimes:pdf',
                'max:5120', // 5 MB max
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'A resume PDF file is required.',
            'file.mimetypes' => 'The uploaded file must be a valid PDF document.',
            'file.mimes' => 'The uploaded file must have a .pdf extension.',
            'file.max' => 'The resume file size must not exceed 5 MB.',
        ];
    }
}
