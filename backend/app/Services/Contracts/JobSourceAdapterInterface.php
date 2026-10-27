<?php

namespace App\Services\Contracts;

interface JobSourceAdapterInterface
{
    /**
     * Unique source platform identifier (e.g. 'authorized_feed', 'jobstreet', 'linkedin', 'onlinejobs_ph').
     */
    public function getSourceIdentifier(): string;

    /**
     * Human-readable source name.
     */
    public function getDisplayName(): string;

    /**
     * List of search filters supported by this source.
     *
     * @return string[]
     */
    public function getSupportedCapabilities(): array;

    /**
     * Whether the adapter has required credentials and configuration.
     */
    public function isConfigured(): bool;

    /**
     * Current authorization and compliance status.
     *
     * @return array{
     *   status: 'ready'|'unconfigured'|'requires_enterprise_credentials'|'error',
     *   message: string,
     *   required_credentials: string[]
     * }
     */
    public function getAuthStatus(): array;

    /**
     * Execute discovery search using supported criteria.
     *
     * @param array<string, mixed> $criteria
     * @param int $limit
     * @return array<int, array<string, mixed>> Normalized job payload array
     */
    public function discover(array $criteria, int $limit = 20): array;
}
