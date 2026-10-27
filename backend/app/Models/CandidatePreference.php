<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CandidatePreference extends Model
{
    use HasFactory;

    protected $table = 'candidate_preferences';

    protected $fillable = [
        'candidate_profile_id',
        'work_arrangements',
        'employment_types',
        'preferred_locations',
        'min_salary',
        'preferred_salary',
        'salary_currency',
        'salary_period',
        'notice_period_weeks',
        'hard_disqualifiers',
        'min_match_threshold',
    ];

    protected function casts(): array
    {
        return [
            'work_arrangements' => 'array',
            'employment_types' => 'array',
            'preferred_locations' => 'array',
            'min_salary' => 'decimal:2',
            'preferred_salary' => 'decimal:2',
            'notice_period_weeks' => 'integer',
            'hard_disqualifiers' => 'array',
            'min_match_threshold' => 'decimal:2',
        ];
    }

    public function candidateProfile(): BelongsTo
    {
        return $this->belongsTo(CandidateProfile::class);
    }
}
