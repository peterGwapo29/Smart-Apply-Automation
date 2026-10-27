<?php

namespace App\Services\Discovery\Adapters;

use App\Services\Contracts\JobSourceAdapterInterface;

class LinkedInSourceAdapter implements JobSourceAdapterInterface
{
    public function getSourceIdentifier(): string
    {
        return 'linkedin';
    }

    public function getDisplayName(): string
    {
        return 'LinkedIn Talent Solutions API';
    }

    public function getSupportedCapabilities(): array
    {
        return ['keywords', 'location', 'work_arrangement'];
    }

    public function isConfigured(): bool
    {
        return !empty(env('LINKEDIN_CLIENT_ID')) && !empty(env('LINKEDIN_CLIENT_SECRET'));
    }

    public function getAuthStatus(): array
    {
        if ($this->isConfigured()) {
            return [
                'status' => 'ready',
                'message' => 'LinkedIn Talent Solutions OAuth credentials configured.',
                'required_credentials' => [],
            ];
        }

        return [
            'status' => 'requires_enterprise_credentials',
            'message' => 'LinkedIn Job Search requires enterprise partner program access (LINKEDIN_CLIENT_ID). Automated scraping violates Section 8.2 of LinkedIn User Agreement. Configure official API credentials to enable live LinkedIn discovery.',
            'required_credentials' => ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
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
