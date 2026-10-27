<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EducationRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_profile_id',
        'resume_id',
        'institution_name',
        'qualification',
        'field_of_study',
        'start_date',
        'completion_date',
        'status',
        'raw_source_text',
        'review_status',
    ];

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(CandidateProfile::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
