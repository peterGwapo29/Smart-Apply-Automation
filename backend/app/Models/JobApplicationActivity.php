<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplicationActivity extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'job_application_activities';

    protected $fillable = [
        'job_application_id',
        'event_type',
        'from_status',
        'to_status',
        'message',
        'metadata',
        'actor',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }
}
