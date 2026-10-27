<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobListingHistory extends Model
{
    use HasFactory;

    protected $table = 'job_listing_histories';

    protected $fillable = [
        'job_listing_id',
        'event_type',
        'changed_fields',
    ];

    protected function casts(): array
    {
        return [
            'changed_fields' => 'array',
        ];
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class, 'job_listing_id');
    }
}
