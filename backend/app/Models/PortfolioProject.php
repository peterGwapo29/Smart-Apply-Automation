<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_profile_id',
        'resume_id',
        'name',
        'description',
        'technologies_used',
        'project_url',
        'repository_url',
        'category',
        'raw_source_text',
        'review_status',
    ];

    protected function casts(): array
    {
        return [
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
