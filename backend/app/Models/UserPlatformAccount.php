<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPlatformAccount extends Model
{
    use HasFactory;

    public const ACCESS_NOT_CONNECTED = 'not_connected';
    public const ACCESS_SETUP_REQUIRED = 'setup_required';
    public const ACCESS_ACCESS_UNVERIFIED = 'access_unverified';
    public const ACCESS_ACCESS_VERIFIED = 'access_verified';
    public const ACCESS_INTEGRATION_CONNECTED = 'integration_connected';
    public const ACCESS_REAUTH_REQUIRED = 'reauthentication_required';
    public const ACCESS_RESTRICTED = 'restricted';
    public const ACCESS_UNAVAILABLE = 'unavailable';

    public const CAPABILITY_MANUAL_ONLY = 'manual_only';
    public const CAPABILITY_BROWSER_ASSISTED = 'browser_assisted';
    public const CAPABILITY_AUTHORIZED_INTEGRATION = 'authorized_integration';
    public const CAPABILITY_UNAVAILABLE = 'unavailable';

    protected $table = 'user_platform_accounts';

    protected $fillable = [
        'user_id',
        'platform',
        'access_status',
        'supported_capability',
        'last_verified_at',
        'verified_username_or_email',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'last_verified_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isVerified(): bool
    {
        return in_array($this->access_status, [
            self::ACCESS_ACCESS_VERIFIED,
            self::ACCESS_INTEGRATION_CONNECTED,
        ], true);
    }
}
