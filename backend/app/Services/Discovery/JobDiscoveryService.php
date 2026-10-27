<?php

namespace App\Services\Discovery;

use App\Models\CandidateProfile;
use App\Models\JobDiscoveryRun;
use App\Models\JobListing;
use App\Models\User;
use App\Services\Contracts\JobSourceAdapterInterface;
use App\Services\Discovery\Adapters\AuthorizedFeedAdapter;
use App\Services\Discovery\Adapters\JobStreetSourceAdapter;
use App\Services\Discovery\Adapters\LinkedInSourceAdapter;
use App\Services\Discovery\Adapters\OnlineJobsPhSourceAdapter;
use App\Services\JobExtraction\JobExtractionService;
use App\Services\Matching\JobMatchingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Throwable;

class JobDiscoveryService
{
    /**
     * @var array<string, JobSourceAdapterInterface>
     */
    protected array $adapters = [];

    public function __construct(
        protected JobExtractionService $extractionService,
        protected JobMatchingService $matchingService,
        AuthorizedFeedAdapter $feedAdapter,
        JobStreetSourceAdapter $jobstreetAdapter,
        LinkedInSourceAdapter $linkedinAdapter,
        OnlineJobsPhSourceAdapter $onlinejobsAdapter
    ) {
        $this->registerAdapter($feedAdapter);
        $this->registerAdapter($jobstreetAdapter);
        $this->registerAdapter($linkedinAdapter);
        $this->registerAdapter($onlinejobsAdapter);
    }

    public function registerAdapter(JobSourceAdapterInterface $adapter): self
    {
        $this->adapters[$adapter->getSourceIdentifier()] = $adapter;
        return $this;
    }

    /**
     * Get all registered discovery sources with capabilities and status.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableSources(): array
    {
        $sources = [];
        foreach ($this->adapters as $adapter) {
            $sources[] = [
                'identifier' => $adapter->getSourceIdentifier(),
                'display_name' => $adapter->getDisplayName(),
                'supported_capabilities' => $adapter->getSupportedCapabilities(),
                'is_configured' => $adapter->isConfigured(),
                'auth_status' => $adapter->getAuthStatus(),
            ];
        }
        return $sources;
    }

    public function getAdapter(string $identifier): ?JobSourceAdapterInterface
    {
        return $this->adapters[$identifier] ?? null;
    }

    /**
     * Execute a discovery run for a candidate user.
     *
     * @param User $user
     * @param array<string, mixed> $criteriaOverrides
     * @param string $sourceIdentifier
     * @param int $limit
     * @return JobDiscoveryRun
     */
    public function executeRun(
        User $user,
        array $criteriaOverrides = [],
        string $sourceIdentifier = 'authorized_feed',
        int $limit = 20
    ): JobDiscoveryRun {
        // Compile search criteria with defaults from candidate profile & preferences
        $criteria = $this->compileCriteria($user, $criteriaOverrides);

        $run = JobDiscoveryRun::create([
            'user_id' => $user->id,
            'source_platform' => $sourceIdentifier,
            'status' => JobDiscoveryRun::STATUS_RUNNING,
            'search_criteria' => $criteria,
            'started_at' => Carbon::now(),
        ]);

        $adapter = $this->getAdapter($sourceIdentifier);
        if (!$adapter) {
            $run->update([
                'status' => JobDiscoveryRun::STATUS_FAILED,
                'error_message' => "Requested source adapter '{$sourceIdentifier}' is not registered.",
                'completed_at' => Carbon::now(),
            ]);
            return $run;
        }

        // Check adapter configuration & compliance
        if (!$adapter->isConfigured()) {
            $status = $adapter->getAuthStatus();
            $run->update([
                'status' => JobDiscoveryRun::STATUS_COMPLETED_WITH_ERRORS,
                'error_message' => $status['message'],
                'completed_at' => Carbon::now(),
            ]);
            return $run;
        }

        $listingsFound = 0;
        $newListings = 0;
        $updatedListings = 0;
        $duplicatesIgnored = 0;
        $errors = [];

        try {
            $discoveredPayloads = $adapter->discover($criteria, $limit);
            $listingsFound = count($discoveredPayloads);

            foreach ($discoveredPayloads as $payload) {
                try {
                    // 1. Ingest via layered deduplication in JobExtractionService
                    $ingestResult = $this->extractionService->ingest($user, $payload);
                    $job = $ingestResult['job'];
                    $isDuplicate = $ingestResult['is_duplicate'];
                    $history = $ingestResult['history'];

                    if (!$isDuplicate) {
                        $newListings++;
                    } else {
                        // Check if fields were updated or purely re-observed
                        $changed = $history?->changed_fields ?? [];
                        if (isset($changed['status']) && $changed['status'] === 're-observed without content changes') {
                            $duplicatesIgnored++;
                        } else {
                            $updatedListings++;
                        }
                    }

                    // 2. Compute Match Score and Eligibility immediately
                    try {
                        $this->matchingService->match($user, $job);
                    } catch (Throwable $matchErr) {
                        Log::warning("Discovery match calculation skipped for job {$job->id}: {$matchErr->getMessage()}");
                    }
                } catch (Throwable $jobErr) {
                    $errors[] = $jobErr->getMessage();
                }
            }

            $finalStatus = !empty($errors)
                ? JobDiscoveryRun::STATUS_COMPLETED_WITH_ERRORS
                : JobDiscoveryRun::STATUS_COMPLETED;

            $run->update([
                'status' => $finalStatus,
                'listings_found' => $listingsFound,
                'new_listings' => $newListings,
                'updated_listings' => $updatedListings,
                'duplicates_ignored' => $duplicatesIgnored,
                'error_message' => !empty($errors) ? implode('; ', array_slice($errors, 0, 3)) : null,
                'completed_at' => Carbon::now(),
            ]);
        } catch (Throwable $e) {
            $run->update([
                'status' => JobDiscoveryRun::STATUS_FAILED,
                'error_message' => $e->getMessage(),
                'completed_at' => Carbon::now(),
            ]);
        }

        return $run->fresh();
    }

    /**
     * Merge candidate profile & preferences with run-specific criteria.
     */
    protected function compileCriteria(User $user, array $overrides = []): array
    {
        $profile = CandidateProfile::with('preference')->where('user_id', $user->id)->first();
        $pref = $profile?->preference;

        // Default keywords from profile headline / skills
        $defaultKeywords = '';
        if ($profile && !empty($profile->headline)) {
            $defaultKeywords = $profile->headline;
        }

        // Default location
        $defaultLocation = $profile?->location ?? 'Philippines';

        // Default work arrangements
        $defaultArrangement = 'all';
        if ($pref && !empty($pref->work_arrangements) && count($pref->work_arrangements) === 1) {
            $defaultArrangement = $pref->work_arrangements[0];
        }

        return [
            'keywords' => $overrides['keywords'] ?? $defaultKeywords,
            'location' => $overrides['location'] ?? $defaultLocation,
            'work_arrangement' => $overrides['work_arrangement'] ?? $defaultArrangement,
            'min_salary' => $overrides['min_salary'] ?? ($pref?->min_salary ? (float)$pref->min_salary : null),
        ];
    }
}
