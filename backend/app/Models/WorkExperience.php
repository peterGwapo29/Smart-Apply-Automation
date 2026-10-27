<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkExperience extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_profile_id',
        'resume_id',
        'company_name',
        'job_title',
        'classification',
        'is_current',
        'start_date',
        'end_date',
        'responsibilities',
        'technologies_used',
        'raw_source_text',
        'review_status',
    ];

    protected function casts(): array
    {
        return [
            'is_current' => 'boolean',
            'technologies_used' => 'array',
        ];
    }

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(CandidateProfile::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
