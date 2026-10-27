<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobListing extends Model
{
    use HasFactory;

    protected $table = 'job_listings';

    protected $fillable = [
        'user_id',
        'source_platform',
        'source_job_id',
        'canonical_url',
        'title',
        'company_name',
        'location',
        'description',
        'responsibilities',
        'required_qualifications',
        'preferred_qualifications',
        'salary_min',
        'salary_max',
        'salary_currency',
        'salary_raw',
        'employment_type',
        'application_method',
        'quick_apply_status',
        'retrieval_method',
        'first_detected_at',
        'last_observed_at',
        'last_extracted_at',
        'extraction_status',
        'content_hash',
        'review_status',
    ];

    protected function casts(): array
    {
        return [
            'responsibilities' => 'array',
            'required_qualifications' => 'array',
            'preferred_qualifications' => 'array',
            'salary_min' => 'decimal:2',
            'salary_max' => 'decimal:2',
            'first_detected_at' => 'datetime',
            'last_observed_at' => 'datetime',
            'last_extracted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(JobListingHistory::class, 'job_listing_id');
    }

    public function jobMatches(): HasMany
    {
        return $this->hasMany(JobMatch::class);
    }

    public function latestMatch(): HasOne
    {
        return $this->hasOne(JobMatch::class)->latestOfMany();
    }

    public function workflow(): HasOne
    {
        return $this->hasOne(JobUserWorkflow::class, 'job_listing_id');
    }
}
