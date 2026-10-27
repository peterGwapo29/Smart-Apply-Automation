<?php

namespace App\Services\Discovery\Adapters;

use App\Services\Contracts\JobSourceAdapterInterface;

class OnlineJobsPhSourceAdapter implements JobSourceAdapterInterface
{
    public function getSourceIdentifier(): string
    {
        return 'onlinejobs_ph';
    }

    public function getDisplayName(): string
    {
        return 'OnlineJobs.ph Partner API';
    }

    public function getSupportedCapabilities(): array
    {
        return ['keywords', 'min_salary'];
    }

    public function isConfigured(): bool
    {
        return !empty(env('ONLINEJOBS_API_KEY'));
    }

    public function getAuthStatus(): array
    {
        if ($this->isConfigured()) {
            return [
                'status' => 'ready',
                'message' => 'OnlineJobs.ph developer API token configured.',
                'required_credentials' => [],
            ];
        }

        return [
            'status' => 'requires_enterprise_credentials',
            'message' => 'OnlineJobs.ph integration requires developer API token (ONLINEJOBS_API_KEY). Automated scraping without authorization violates platform terms.',
            'required_credentials' => ['ONLINEJOBS_API_KEY'],
        ];
    }

    public function discover(array $criteria, int $limit = 20): array
    {
        if (!$this->isConfigured()) {
            return [];
        }

        return [];
    }
}
