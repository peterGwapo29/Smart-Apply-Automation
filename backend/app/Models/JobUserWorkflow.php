<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobUserWorkflow extends Model
{
    use HasFactory;

    protected $table = 'job_user_workflows';

    protected $fillable = [
        'user_id',
        'job_listing_id',
        'review_status',
        'is_bookmarked',
        'notes',
        'reviewed_at',
        'last_reviewed_content_hash',
        'last_reviewed_match_score',
    ];

    protected function casts(): array
    {
        return [
            'is_bookmarked' => 'boolean',
            'reviewed_at' => 'datetime',
            'last_reviewed_match_score' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class);
    }
}
