<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplicationMaterial extends Model
{
    use HasFactory;

    protected $table = 'job_application_materials';

    protected $fillable = [
        'job_application_id',
        'selected_resume_id',
        'resume_selection_rationale',
        'cover_letter',
        'cover_letter_metadata',
        'introduction',
        'version',
        'is_candidate_edited',
    ];

    protected function casts(): array
    {
        return [
            'cover_letter_metadata' => 'array',
            'version' => 'integer',
            'is_candidate_edited' => 'boolean',
        ];
    }

    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }

    public function selectedResume(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'selected_resume_id');
    }
}
