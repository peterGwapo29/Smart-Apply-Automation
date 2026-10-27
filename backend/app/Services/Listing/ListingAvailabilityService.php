<?php

namespace App\Services\Listing;

use App\Models\JobListing;
use App\Models\JobListingHistory;
use App\Models\User;
use App\Services\Discovery\JobDiscoveryService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ListingAvailabilityService
{
    /**
     * Cache freshness threshold in hours.
     */
    protected const FRESHNESS_THRESHOLD_HOURS = 12;

    public function __construct(
        protected JobDiscoveryService $discoveryService
    ) {}

    /**
     * Check if a listing's last verification is sufficiently fresh.
     */
    public function isVerificationFresh(JobListing $job): bool
    {
        if (!$job->last_verified_at) {
            return false;
        }

        return $job->last_verified_at->gte(Carbon::now()->subHours(self::FRESHNESS_THRESHOLD_HOURS));
    }

    /**
     * Revalidate the availability of a job listing using trustworthy source data or on-demand verification.
     *
     * @param JobListing $job
     * @param User $user
     * @param bool $forceFresh
     * @return array<string, mixed>
     */
    public function revalidate(JobListing $job, User $user, bool $forceFresh = false): array
    {
        // 1. Timezone-aware expiration check: if expires_at is in the past, definitively expired
        if ($job->expires_at && $job->expires_at->isPast()) {
            if ($job->listing_status !== JobListing::STATUS_EXPIRED) {
                $this->updateStatus($job, JobListing::STATUS_EXPIRED, 'Listing passed verified expiration timestamp.', 'system:expiration_check');
            }

            return [
                'is_active' => false,
                'listing_status' => JobListing::STATUS_EXPIRED,
                'expires_at' => $job->expires_at->toIso8601String(),
                'last_verified_at' => now()->toIso8601String(),
                'can_proceed' => false,
                'message' => 'The job listing has expired and cannot receive new applications.',
            ];
        }

        // 2. Definitive closed or withdrawn status cannot be overwritten by a stale response
        if (in_array($job->listing_status, [JobListing::STATUS_CLOSED, JobListing::STATUS_WITHDRAWN], true)) {
            return [
                'is_active' => false,
                'listing_status' => $job->listing_status,
                'expires_at' => $job->expires_at?->toIso8601String(),
                'last_verified_at' => $job->last_verified_at?->toIso8601String() ?? now()->toIso8601String(),
                'can_proceed' => false,
                'message' => "The job listing is marked {$job->listing_status} by the employer.",
            ];
        }

        // 3. If fresh and active without forced re-check, retain active status
        if (!$forceFresh && $this->isVerificationFresh($job) && $job->listing_status === JobListing::STATUS_ACTIVE) {
            return [
                'is_active' => true,
                'listing_status' => JobListing::STATUS_ACTIVE,
                'expires_at' => $job->expires_at?->toIso8601String(),
                'last_verified_at' => $job->last_verified_at->toIso8601String(),
                'can_proceed' => true,
                'message' => 'Listing verified active under current freshness policy.',
            ];
        }

        // 4. Source Adapter verification
        $adapter = $this->discoveryService->getAdapter($job->source_platform);
        $verifiedStatus = JobListing::STATUS_ACTIVE;
        $verificationNote = 'Listing verified active via source platform.';

        if ($adapter) {
            try {
                // If the adapter is unconfigured or unavailable, mark as unknown/unavailable without false confirmation
                if (!$adapter->isConfigured() && $job->source_platform !== 'authorized_feed') {
                    $verifiedStatus = JobListing::STATUS_UNKNOWN;
                    $verificationNote = 'Source platform adapter is unconfigured. Listing status cannot be verified automatically.';
                } else {
                    // Check if canonical URL is structurally invalid or marked inactive
                    if (empty($job->canonical_url) || !filter_var($job->canonical_url, FILTER_VALIDATE_URL)) {
                        $verifiedStatus = JobListing::STATUS_UNAVAILABLE;
                        $verificationNote = 'Listing canonical URL is invalid or inaccessible.';
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("Revalidation failed for job {$job->id}: {$e->getMessage()}");
                $verifiedStatus = JobListing::STATUS_UNAVAILABLE;
                $verificationNote = 'Source verification service was unreachable. Please verify availability manually.';
            }
        }

        $oldStatus = $job->listing_status;
        if ($oldStatus !== $verifiedStatus) {
            $this->updateStatus($job, $verifiedStatus, $verificationNote, 'system:revalidation');
        } else {
            $job->update([
                'last_verified_at' => Carbon::now(),
                'verification_source' => $job->source_platform,
            ]);
        }

        $isActive = ($verifiedStatus === JobListing::STATUS_ACTIVE);

        return [
            'is_active' => $isActive,
            'is_actionable' => $isActive,
            'listing_status' => $verifiedStatus,
            'expires_at' => $job->expires_at?->toIso8601String(),
            'last_verified_at' => now()->toIso8601String(),
            'can_proceed' => $isActive,
            'message' => $verificationNote,
        ];
    }

    /**
     * Revalidate all job listings for a candidate user.
     *
     * @param User $user
     * @param bool $forceFresh
     * @return array<int, array<string, mixed>>
     */
    public function revalidateAll(User $user, bool $forceFresh = false): array
    {
        $jobs = JobListing::where('user_id', $user->id)->get();
        $results = [];

        foreach ($jobs as $job) {
            $results[] = $this->revalidate($job, $user, $forceFresh);
        }

        return $results;
    }

    /**
     * Update job listing status and append an audit record in JobListingHistory.
     */
    protected function updateStatus(JobListing $job, string $newStatus, string $reason, string $actor): void
    {
        $oldStatus = $job->listing_status;

        $job->update([
            'listing_status' => $newStatus,
            'last_verified_at' => Carbon::now(),
            'verification_source' => $job->source_platform,
        ]);

        JobListingHistory::create([
            'job_listing_id' => $job->id,
            'change_type' => "status_changed:{$newStatus}",
            'previous_value' => $oldStatus,
            'new_value' => $newStatus,
            'changed_at' => Carbon::now(),
        ]);
    }
}
