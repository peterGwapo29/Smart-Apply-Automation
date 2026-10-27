<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobApplication extends Model
{
    use HasFactory;

    public const STATUS_QUEUED = 'queued';
    public const STATUS_PREPARING = 'preparing';
    public const STATUS_NEEDS_REVIEW = 'needs_review';
    public const STATUS_READY = 'ready';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CONFIRMATION_REQUIRED = 'confirmation_required';

    public const ALL_STATUSES = [
        self::STATUS_QUEUED,
        self::STATUS_PREPARING,
        self::STATUS_NEEDS_REVIEW,
        self::STATUS_READY,
        self::STATUS_SUBMITTED,
        self::STATUS_FAILED,
        self::STATUS_CONFIRMATION_REQUIRED,
    ];

    protected $table = 'job_applications';

    protected $fillable = [
        'user_id',
        'candidate_profile_id',
        'job_listing_id',
        'status',
        'idempotency_key',
        'attempt_count',
        'max_retries',
        'next_retry_at',
        'last_error_code',
        'last_error_message',
        'last_processed_at',
        'preparation_started_at',
        'ready_at',
        'submitted_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'attempt_count' => 'integer',
            'max_retries' => 'integer',
            'next_retry_at' => 'datetime',
            'last_processed_at' => 'datetime',
            'preparation_started_at' => 'datetime',
            'ready_at' => 'datetime',
            'submitted_at' => 'datetime',
            'metadata' => 'array',
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

    public function activities(): HasMany
    {
        return $this->hasMany(JobApplicationActivity::class)->orderBy('created_at', 'desc');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(JobApplicationTask::class)->orderBy('created_at', 'desc');
    }

    public function material(): HasOne
    {
        return $this->hasOne(JobApplicationMaterial::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(JobApplicationAnswer::class)->orderBy('id', 'asc');
    }

    public function readiness(): HasOne
    {
        return $this->hasOne(JobApplicationReadiness::class);
    }

    public function isTerminal(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    public function isRecoverable(): bool
    {
        return in_array($this->status, [
            self::STATUS_FAILED,
            self::STATUS_CONFIRMATION_REQUIRED,
            self::STATUS_PREPARING,
        ], true);
    }
}
