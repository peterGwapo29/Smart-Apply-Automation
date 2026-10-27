<?php

namespace App\Services\JobExtraction;

use App\Models\JobListing;
use App\Models\JobListingHistory;
use App\Models\User;
use App\Services\Contracts\JobExtractionProviderInterface;
use Illuminate\Support\Facades\DB;

class JobExtractionService
{
    public function __construct(
        protected JobExtractionProviderInterface $provider
    ) {}

    /**
     * Set or swap provider dynamically (pluggable architecture).
     */
    public function setProvider(JobExtractionProviderInterface $provider): self
    {
        $this->provider = $provider;
        return $this;
    }

    /**
     * Process, deduplicate, and ingest a job listing.
     *
     * @param User $user
     * @param array<string, mixed> $payload
     * @return array{job: JobListing, is_duplicate: bool, history: ?JobListingHistory}
     */
    public function ingest(User $user, array $payload): array
    {
        // 1. Normalize Canonical URL
        $rawUrl = trim($payload['canonical_url'] ?? $payload['url'] ?? '');
        $canonicalUrl = $this->normalizeCanonicalUrl($rawUrl);

        // 2. Extract platform & source job ID
        $platform = $payload['source_platform'] ?? $this->detectPlatform($canonicalUrl);
        $sourceJobId = $payload['source_job_id'] ?? $this->extractSourceJobId($canonicalUrl);

        // 3. Delegate field extraction to provider
        $extracted = $this->provider->extract($payload);

        // 4. Generate content hash for fuzzy duplicate detection
        $contentHash = $this->generateContentHash(
            $extracted['title'] ?? '',
            $extracted['company_name'] ?? '',
            $extracted['location'] ?? '',
            $extracted['description'] ?? ''
        );

        return DB::transaction(function () use ($user, $platform, $sourceJobId, $canonicalUrl, $extracted, $contentHash) {
            // 5. Layered Deduplication Check
            $existing = $this->findExistingRecord($user->id, $platform, $sourceJobId, $canonicalUrl, $contentHash);

            $now = now();

            if ($existing) {
                // Duplicate / Re-observed Listing
                $changes = [];
                $updatableFields = [
                    'title', 'company_name', 'location', 'description',
                    'responsibilities', 'required_qualifications', 'preferred_qualifications',
                    'salary_min', 'salary_max', 'salary_currency', 'salary_raw',
                    'employment_type', 'application_method', 'quick_apply_status', 'review_status',
                ];

                foreach ($updatableFields as $field) {
                    if (array_key_exists($field, $extracted) && $extracted[$field] !== null) {
                        $oldVal = $existing->{$field};
                        $newVal = $extracted[$field];
                        
                        $isDifferent = false;
                        if (is_numeric($oldVal) && is_numeric($newVal)) {
                            $isDifferent = ((float)$oldVal != (float)$newVal);
                        } elseif (is_array($oldVal) || is_array($newVal)) {
                            $isDifferent = (json_encode($oldVal) !== json_encode($newVal));
                        } else {
                            $isDifferent = ($oldVal !== $newVal);
                        }

                        if ($isDifferent) {
                            $changes[$field] = ['old' => $oldVal, 'new' => $newVal];
                            $existing->{$field} = $newVal;
                        }
                    }
                }

                $existing->last_observed_at = $now;
                $existing->last_extracted_at = $now;
                if (!empty($sourceJobId) && empty($existing->source_job_id)) {
                    $existing->source_job_id = $sourceJobId;
                }
                $existing->content_hash = $contentHash;
                $existing->save();

                $history = JobListingHistory::create([
                    'job_listing_id' => $existing->id,
                    'event_type' => 'observed',
                    'changed_fields' => !empty($changes) ? $changes : ['status' => 're-observed without content changes'],
                ]);

                return [
                    'job' => $existing->fresh(['histories']),
                    'is_duplicate' => true,
                    'history' => $history,
                ];
            }

            // New Job Listing
            $listing = JobListing::create([
                'user_id' => $user->id,
                'source_platform' => $platform,
                'source_job_id' => $sourceJobId ?: null,
                'canonical_url' => $canonicalUrl,
                'title' => $extracted['title'],
                'company_name' => $extracted['company_name'],
                'location' => $extracted['location'],
                'description' => $extracted['description'],
                'responsibilities' => $extracted['responsibilities'],
                'required_qualifications' => $extracted['required_qualifications'],
                'preferred_qualifications' => $extracted['preferred_qualifications'],
                'salary_min' => $extracted['salary_min'],
                'salary_max' => $extracted['salary_max'],
                'salary_currency' => $extracted['salary_currency'],
                'salary_raw' => $extracted['salary_raw'],
                'employment_type' => $extracted['employment_type'],
                'application_method' => $extracted['application_method'],
                'quick_apply_status' => $extracted['quick_apply_status'],
                'retrieval_method' => $extracted['retrieval_method'],
                'first_detected_at' => $now,
                'last_observed_at' => $now,
                'last_extracted_at' => $now,
                'extraction_status' => $extracted['extraction_status'],
                'content_hash' => $contentHash,
                'review_status' => $extracted['review_status'],
            ]);

            $history = JobListingHistory::create([
                'job_listing_id' => $listing->id,
                'event_type' => 'created',
                'changed_fields' => ['action' => 'initial_import'],
            ]);

            return [
                'job' => $listing->fresh(['histories']),
                'is_duplicate' => false,
                'history' => $history,
            ];
        });
    }

    /**
     * Find existing job listing using layered deduplication.
     */
    public function findExistingRecord(int $userId, string $platform, ?string $sourceJobId, string $canonicalUrl, string $contentHash): ?JobListing
    {
        // Level 1: user_id + source_platform + source_job_id
        if (!empty($sourceJobId)) {
            $record = JobListing::where('user_id', $userId)
                ->where('source_platform', $platform)
                ->where('source_job_id', $sourceJobId)
                ->first();
            if ($record) {
                return $record;
            }
        }

        // Level 2: user_id + canonical_url
        if (!empty($canonicalUrl)) {
            $record = JobListing::where('user_id', $userId)
                ->where('canonical_url', $canonicalUrl)
                ->first();
            if ($record) {
                return $record;
            }
        }

        // Level 3: user_id + content_hash
        if (!empty($contentHash)) {
            $record = JobListing::where('user_id', $userId)
                ->where('content_hash', $contentHash)
                ->first();
            if ($record) {
                return $record;
            }
        }

        return null;
    }

    /**
     * Strip tracking/session queries while preserving canonical path and essential params.
     */
    public function normalizeCanonicalUrl(string $url): string
    {
        if (empty($url)) {
            return '';
        }

        $parsed = parse_url(trim($url));
        if (!$parsed || empty($parsed['host'])) {
            return trim($url);
        }

        $scheme = 'https';
        $host = mb_strtolower($parsed['host']);
        // Strip leading www.
        if (str_starts_with($host, 'www.')) {
            $host = substr($host, 4);
        }

        $path = rtrim($parsed['path'] ?? '', '/');

        // Clean query: strip UTM and tracking params
        $query = '';
        if (!empty($parsed['query'])) {
            parse_str($parsed['query'], $queryParams);
            $forbidden = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'tracking', 'searchid', 'correlationid', 'cid', 'sol', 'token', 'source'];
            foreach (array_keys($queryParams) as $key) {
                if (in_array(strtolower($key), $forbidden, true)) {
                    unset($queryParams[$key]);
                }
            }
            if (!empty($queryParams)) {
                ksort($queryParams);
                $query = '?' . http_build_query($queryParams);
            }
        }

        return "{$scheme}://{$host}{$path}{$query}";
    }

    public function detectPlatform(string $url): string
    {
        $lower = mb_strtolower($url);
        if (str_contains($lower, 'jobstreet') || str_contains($lower, 'seek')) {
            return 'jobstreet';
        }
        if (str_contains($lower, 'linkedin')) {
            return 'linkedin';
        }
        if (str_contains($lower, 'indeed')) {
            return 'indeed';
        }

        return 'other';
    }

    public function extractSourceJobId(string $url): ?string
    {
        // JobStreet Philippines pattern: /job/12345678 or /jobs/12345678
        if (preg_match('/\/jobs?\/(\d+)/i', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    public function generateContentHash(string $title, string $company, string $location, string $description): string
    {
        $normalized = mb_strtolower(trim($title)) . '|' .
            mb_strtolower(trim($company)) . '|' .
            mb_strtolower(trim($location)) . '|' .
            mb_substr(mb_strtolower(trim($description)), 0, 500);

        return hash('sha256', $normalized);
    }
}
