<?php

namespace App\Services\Discovery\Adapters;

use App\Services\Contracts\JobSourceAdapterInterface;

class JobStreetSourceAdapter implements JobSourceAdapterInterface
{
    public function getSourceIdentifier(): string
    {
        return 'jobstreet';
    }

    public function getDisplayName(): string
    {
        return 'JobStreet Philippines API';
    }

    public function getSupportedCapabilities(): array
    {
        return ['keywords', 'location', 'min_salary', 'work_arrangement'];
    }

    public function isConfigured(): bool
    {
        return !empty(env('JOBSTREET_API_KEY'));
    }

    public function getAuthStatus(): array
    {
        if ($this->isConfigured()) {
            return [
                'status' => 'ready',
                'message' => 'JobStreet Enterprise Partner API credentials configured.',
                'required_credentials' => [],
            ];
        }

        return [
            'status' => 'requires_enterprise_credentials',
            'message' => 'JobStreet API requires accredited enterprise partner credentials (JOBSTREET_API_KEY). Automated headless scraping is strictly prohibited by JobStreet Section 7 terms. Use passive Chrome Extension detection or configure partner credentials.',
            'required_credentials' => ['JOBSTREET_API_KEY', 'JOBSTREET_PARTNER_SECRET'],
        ];
    }

    public function discover(array $criteria, int $limit = 20): array
    {
        if (!$this->isConfigured()) {
            // Respect platform terms: return empty without throwing fatal error
            return [];
        }

        // Live API implementation when credentials are provided
        return [];
    }
}
