<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplicationTask extends Model
{
    use HasFactory;

    protected $table = 'job_application_tasks';

    protected $fillable = [
        'job_application_id',
        'task_type',
        'status',
        'attempt_count',
        'available_at',
        'started_at',
        'completed_at',
        'error_code',
        'error_message',
        'idempotency_key',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'attempt_count' => 'integer',
            'available_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }
}
