<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'file_path',
        'original_filename',
        'file_size',
        'mime_type',
        'content_hash',
        'is_active',
        'processing_status',
        'parsed_data',
        'raw_text',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'file_size' => 'integer',
            'parsed_data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workExperiences(): HasMany
    {
        return $this->hasMany(WorkExperience::class);
    }

    public function portfolioProjects(): HasMany
    {
        return $this->hasMany(PortfolioProject::class);
    }

    public function educationRecords(): HasMany
    {
        return $this->hasMany(EducationRecord::class);
    }

    public function certifications(): HasMany
    {
        return $this->hasMany(Certification::class);
    }
}
