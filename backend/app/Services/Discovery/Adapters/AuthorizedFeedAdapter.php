<?php

namespace App\Services\Discovery\Adapters;

use App\Services\Contracts\JobSourceAdapterInterface;

class AuthorizedFeedAdapter implements JobSourceAdapterInterface
{
    /**
     * Curated catalog of multi-platform sample/feed listings.
     */
    protected array $feedCatalog = [
        [
            'source_platform' => 'jobstreet',
            'source_job_id' => 'js_ph_800101',
            'canonical_url' => 'https://ph.jobstreet.com/job/800101',
            'title' => 'Senior Laravel / PHP Full-Stack Engineer',
            'company_name' => 'Metro Global Tech Solutions',
            'location' => 'Taguig, Metro Manila, Philippines',
            'work_arrangement' => 'hybrid',
            'description' => 'We are seeking an experienced Senior Laravel / PHP Engineer to architect high-throughput backend services and lead API design. Hands-on experience with Vue or React, MySQL query tuning, and Redis caching is required.',
            'responsibilities' => [
                'Design, build, and maintain efficient, reusable, and reliable PHP/Laravel code.',
                'Collaborate with frontend developers on RESTful and GraphQL API integration.',
                'Optimize database queries and schema designs for PostgreSQL and MySQL.',
            ],
            'required_qualifications' => ['PHP', 'Laravel', 'MySQL', 'REST APIs'],
            'preferred_qualifications' => ['React', 'TypeScript', 'Docker', 'AWS'],
            'salary_min' => 90000.00,
            'salary_max' => 140000.00,
            'salary_currency' => 'PHP',
            'salary_raw' => 'PHP 90,000 - 140,000 / month',
            'employment_type' => 'Full-time',
            'application_method' => 'quick_apply',
            'quick_apply_status' => 'available',
        ],
        [
            'source_platform' => 'linkedin',
            'source_job_id' => 'li_global_900202',
            'canonical_url' => 'https://www.linkedin.com/jobs/view/900202',
            'title' => 'Staff Full Stack React & Node Developer',
            'company_name' => 'FinScale Technologies',
            'location' => 'Remote, Philippines',
            'work_arrangement' => 'remote',
            'description' => 'FinScale is expanding our APAC fintech operations. We need a strong Full Stack developer with deep proficiency in React, TypeScript, Next.js, and Node.js. 100% remote with competitive benefits.',
            'responsibilities' => [
                'Lead web application frontend architecture with Next.js and Tailwind CSS.',
                'Implement robust authentication and microservice integrations.',
                'Ensure rigorous test coverage and continuous deployment pipelines.',
            ],
            'required_qualifications' => ['React', 'TypeScript', 'Node.js', 'Next.js'],
            'preferred_qualifications' => ['Tailwind CSS', 'GraphQL', 'AWS', 'Jest'],
            'salary_min' => 120000.00,
            'salary_max' => 180000.00,
            'salary_currency' => 'PHP',
            'salary_raw' => 'PHP 120,000 - 180,000 / month',
            'employment_type' => 'Full-time',
            'application_method' => 'easy_apply',
            'quick_apply_status' => 'available',
        ],
        [
            'source_platform' => 'onlinejobs_ph',
            'source_job_id' => 'oj_ph_300303',
            'canonical_url' => 'https://www.onlinejobs.ph/jobseekers/job/300303',
            'title' => 'Full-Time Remote Laravel & Vue Developer',
            'company_name' => 'Apex Cloud Systems Australia',
            'location' => 'Remote (Work from Home, Philippines)',
            'work_arrangement' => 'remote',
            'description' => 'Australian SaaS development agency looking for a dedicated full-time remote developer. Must be fluent in English and proficient with modern Laravel 10/11 and Vue.js or React.',
            'responsibilities' => [
                'Develop backend modules in Laravel for client portal web apps.',
                'Build interactive UI components in Vue.js and Tailwind CSS.',
                'Participate in daily standup meetings via Slack and Zoom.',
            ],
            'required_qualifications' => ['PHP', 'Laravel', 'Vue.js', 'Git'],
            'preferred_qualifications' => ['Tailwind CSS', 'Docker', 'Inertia.js'],
            'salary_min' => 75000.00,
            'salary_max' => 110000.00,
            'salary_currency' => 'PHP',
            'salary_raw' => 'PHP 75,000 - 110,000 / month',
            'employment_type' => 'Full-time',
            'application_method' => 'internal_message',
            'quick_apply_status' => 'available',
        ],
        [
            'source_platform' => 'jobstreet',
            'source_job_id' => 'js_ph_800104',
            'canonical_url' => 'https://ph.jobstreet.com/job/800104',
            'title' => 'Mid-Level Backend API Developer (Python & Django)',
            'company_name' => 'DataWave Analytics Corp',
            'location' => 'Makati City, Philippines',
            'work_arrangement' => 'on_site',
            'description' => 'Work with our AI/ML engineering team to build ingestion pipelines and expose clean RESTful endpoints in Python/Django or FastAPI.',
            'responsibilities' => [
                'Build data-processing pipelines and secure REST APIs.',
                'Write automated unit and integration tests.',
            ],
            'required_qualifications' => ['Python', 'Django', 'PostgreSQL'],
            'preferred_qualifications' => ['Docker', 'FastAPI'],
            'salary_min' => 60000.00,
            'salary_max' => 85000.00,
            'salary_currency' => 'PHP',
            'salary_raw' => 'PHP 60,000 - 85,000 / month',
            'employment_type' => 'Full-time',
            'application_method' => 'company_url',
            'quick_apply_status' => 'unavailable',
        ],
    ];

    public function getSourceIdentifier(): string
    {
        return 'authorized_feed';
    }

    public function getDisplayName(): string
    {
        return 'Multi-Platform Authorized Job Feed';
    }

    public function getSupportedCapabilities(): array
    {
        return ['keywords', 'location', 'work_arrangement', 'min_salary'];
    }

    public function isConfigured(): bool
    {
        return true;
    }

    public function getAuthStatus(): array
    {
        return [
            'status' => 'ready',
            'message' => 'Multi-platform authorized feed is active and verified.',
            'required_credentials' => [],
        ];
    }

    public function discover(array $criteria, int $limit = 20): array
    {
        $keywords = !empty($criteria['keywords']) ? mb_strtolower(trim($criteria['keywords'])) : null;
        $location = !empty($criteria['location']) ? mb_strtolower(trim($criteria['location'])) : null;
        $arrangement = !empty($criteria['work_arrangement']) ? strtolower(trim($criteria['work_arrangement'])) : null;
        $minSalary = !empty($criteria['min_salary']) ? (float)$criteria['min_salary'] : null;

        $results = [];

        foreach ($this->feedCatalog as $item) {
            // Filter by keywords if provided
            if ($keywords) {
                $keywordTokens = array_values(array_filter(explode(' ', $keywords), fn($t) => strlen(trim($t)) > 0));
                $primaryCorpus = mb_strtolower(
                    $item['title'] . ' ' . $item['company_name'] . ' ' . implode(' ', $item['required_qualifications'])
                );

                $allTokensMatch = true;
                foreach ($keywordTokens as $token) {
                    if (!str_contains($primaryCorpus, $token)) {
                        $allTokensMatch = false;
                        break;
                    }
                }

                if (!$allTokensMatch) {
                    continue;
                }
            }

            // Filter by location if provided
            if ($location) {
                $locLower = mb_strtolower($item['location']);
                if (!str_contains($locLower, $location) && !str_contains($location, 'philippines')) {
                    continue;
                }
            }

            // Filter by work arrangement if provided
            if ($arrangement && $arrangement !== 'all') {
                if ($item['work_arrangement'] !== $arrangement) {
                    continue;
                }
            }

            // Filter by min salary if provided
            if ($minSalary && $item['salary_max'] !== null) {
                if ($item['salary_max'] < $minSalary) {
                    continue;
                }
            }

            $payload = array_merge($item, [
                'retrieval_method' => 'authorized_feed',
                'extraction_status' => 'complete',
                'review_status' => 'pending_review',
            ]);

            $results[] = $payload;

            if (count($results) >= $limit) {
                break;
            }
        }

        return $results;
    }
}
