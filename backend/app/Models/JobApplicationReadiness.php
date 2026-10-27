<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplicationReadiness extends Model
{
    use HasFactory;

    protected $table = 'job_application_readiness';

    protected $fillable = [
        'job_application_id',
        'is_ready',
        'blocking_issues',
        'warnings',
        'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'is_ready' => 'boolean',
            'blocking_issues' => 'array',
            'warnings' => 'array',
            'evaluated_at' => 'datetime',
        ];
    }

    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }
}
