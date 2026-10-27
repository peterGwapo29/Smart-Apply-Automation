<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPlatformAccount;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformAccountController extends Controller
{
    /**
     * Official verified platform registration and sign-in URLs.
     */
    protected const OFFICIAL_URLS = [
        'jobstreet' => [
            'display_name' => 'JobStreet',
            'registration_url' => 'https://myjobstreet.jobstreet.com.ph/registration/simple-signup.php',
            'login_url' => 'https://myjobstreet.jobstreet.com.ph/home/login.php',
            'default_capability' => UserPlatformAccount::CAPABILITY_BROWSER_ASSISTED,
        ],
        'linkedin' => [
            'display_name' => 'LinkedIn',
            'registration_url' => 'https://www.linkedin.com/signup',
            'login_url' => 'https://www.linkedin.com/login',
            'default_capability' => UserPlatformAccount::CAPABILITY_MANUAL_ONLY,
        ],
        'onlinejobs_ph' => [
            'display_name' => 'OnlineJobs.ph',
            'registration_url' => 'https://www.onlinejobs.ph/jobseekers/account',
            'login_url' => 'https://www.onlinejobs.ph/login',
            'default_capability' => UserPlatformAccount::CAPABILITY_MANUAL_ONLY,
        ],
        'authorized_feed' => [
            'display_name' => 'Authorized Feed',
            'registration_url' => null,
            'login_url' => null,
            'default_capability' => UserPlatformAccount::CAPABILITY_AUTHORIZED_INTEGRATION,
        ],
    ];

    protected function resolveUser(Request $request): User
    {
        return $request->user() ?? User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            ['name' => 'Peter Candidate', 'password' => bcrypt('password123')]
        );
    }

    /**
     * List all platform account access statuses for the user.
     *
     * GET /api/platform-accounts
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $accounts = UserPlatformAccount::where('user_id', $user->id)->get()->keyBy('platform');

        $result = [];
        foreach (self::OFFICIAL_URLS as $platform => $config) {
            $account = $accounts->get($platform);

            // Authorized feed does not require candidate accounts
            $isFeed = ($platform === 'authorized_feed');
            $accessStatus = $account?->access_status ?? ($isFeed ? UserPlatformAccount::ACCESS_INTEGRATION_CONNECTED : UserPlatformAccount::ACCESS_SETUP_REQUIRED);
            $capability = $account?->supported_capability ?? $config['default_capability'];

            $result[] = [
                'platform' => $platform,
                'display_name' => $config['display_name'],
                'access_status' => $accessStatus,
                'supported_capability' => $capability,
                'is_verified' => in_array($accessStatus, [UserPlatformAccount::ACCESS_ACCESS_VERIFIED, UserPlatformAccount::ACCESS_INTEGRATION_CONNECTED], true),
                'verified_username_or_email' => $account?->verified_username_or_email,
                'last_verified_at' => $account?->last_verified_at?->toIso8601String(),
                'registration_url' => $config['registration_url'],
                'login_url' => $config['login_url'],
            ];
        }

        return response()->json([
            'status' => 'success',
            'accounts' => $result,
            'data' => $result,
        ]);
    }

    /**
     * Update candidate's platform access status (e.g. confirming manual login/registration).
     * Strictly zero password or credential collection.
     *
     * PUT /api/platform-accounts/{platform}
     */
    public function update(Request $request, string $platform): JsonResponse
    {
        $user = $this->resolveUser($request);

        if (!array_key_exists($platform, self::OFFICIAL_URLS)) {
            return response()->json([
                'status' => 'error',
                'message' => "Unknown or unsupported platform: {$platform}",
            ], 404);
        }

        $validated = $request->validate([
            'access_status' => 'required|string|in:not_connected,setup_required,access_unverified,access_verified,integration_connected,reauthentication_required,restricted,unavailable',
            'verified_username_or_email' => 'nullable|string|max:150',
            'supported_capability' => 'nullable|string|in:manual_only,browser_assisted,authorized_integration,unavailable',
        ]);

        $defaultCap = self::OFFICIAL_URLS[$platform]['default_capability'];

        $account = UserPlatformAccount::updateOrCreate(
            ['user_id' => $user->id, 'platform' => $platform],
            [
                'access_status' => $validated['access_status'],
                'supported_capability' => $validated['supported_capability'] ?? $defaultCap,
                'verified_username_or_email' => $validated['verified_username_or_email'] ?? null,
                'last_verified_at' => in_array($validated['access_status'], [UserPlatformAccount::ACCESS_ACCESS_VERIFIED, UserPlatformAccount::ACCESS_INTEGRATION_CONNECTED], true) ? Carbon::now() : null,
            ]
        );

        $accountPayload = [
            'platform' => $account->platform,
            'display_name' => self::OFFICIAL_URLS[$platform]['display_name'],
            'access_status' => $account->access_status,
            'supported_capability' => $account->supported_capability,
            'is_verified' => $account->isVerified(),
            'verified_username_or_email' => $account->verified_username_or_email,
            'last_verified_at' => $account->last_verified_at?->toIso8601String(),
            'registration_url' => self::OFFICIAL_URLS[$platform]['registration_url'],
            'login_url' => self::OFFICIAL_URLS[$platform]['login_url'],
        ];

        return response()->json([
            'status' => 'success',
            'message' => "Platform account status for {$platform} updated to {$account->access_status}.",
            'account' => $accountPayload,
            'data' => $accountPayload,
        ]);
    }
}
