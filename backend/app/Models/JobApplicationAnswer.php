<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplicationAnswer extends Model
{
    use HasFactory;

    protected $table = 'job_application_answers';

    protected $fillable = [
        'job_application_id',
        'question',
        'category',
        'draft_answer',
        'confidence',
        'requires_review',
        'review_reason',
        'evidence_references',
        'is_candidate_edited',
    ];

    protected function casts(): array
    {
        return [
            'requires_review' => 'boolean',
            'evidence_references' => 'array',
            'is_candidate_edited' => 'boolean',
        ];
    }

    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }
}
