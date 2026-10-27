<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobMatch extends Model
{
    use HasFactory;

    protected $table = 'job_matches';

    protected $fillable = [
        'user_id',
        'candidate_profile_id',
        'job_listing_id',
        'overall_score',
        'technical_score',
        'experience_score',
        'responsibilities_score',
        'work_arrangement_score',
        'salary_score',
        'eligibility_status',
        'eligibility_evaluations',
        'score_breakdown',
        'matched_skills',
        'matched_responsibilities',
        'disqualification_reasons',
        'semantic_analysis',
        'scoring_version',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'overall_score' => 'decimal:2',
            'technical_score' => 'decimal:2',
            'experience_score' => 'decimal:2',
            'responsibilities_score' => 'decimal:2',
            'work_arrangement_score' => 'decimal:2',
            'salary_score' => 'decimal:2',
            'eligibility_evaluations' => 'array',
            'score_breakdown' => 'array',
            'matched_skills' => 'array',
            'matched_responsibilities' => 'array',
            'disqualification_reasons' => 'array',
            'semantic_analysis' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(CandidateProfile::class);
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class);
    }
}
