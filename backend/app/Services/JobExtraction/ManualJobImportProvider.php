<?php

namespace App\Services\JobExtraction;

use App\Services\Contracts\JobExtractionProviderInterface;

class ManualJobImportProvider implements JobExtractionProviderInterface
{
    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function extract(array $input): array
    {
        $title = trim($input['title'] ?? '');
        $companyName = trim($input['company_name'] ?? '');
        $location = trim($input['location'] ?? '');
        $rawDescription = trim($input['description'] ?? '');
        $rawSalary = trim($input['salary_raw'] ?? '');
        $employmentType = trim($input['employment_type'] ?? '');
        $explicitQuickApply = $input['quick_apply_status'] ?? null;
        $applicationMethod = trim($input['application_method'] ?? '');

        // If explicit arrays are provided, use them; otherwise, parse from rawDescription
        $responsibilities = is_array($input['responsibilities'] ?? null)
            ? array_values(array_filter(array_map('trim', $input['responsibilities'])))
            : $this->extractSectionItems($rawDescription, ['responsibilities', 'duties', 'what you\'ll do', 'scope of work', 'key responsibilities']);

        $requiredQualifications = is_array($input['required_qualifications'] ?? null)
            ? array_values(array_filter(array_map('trim', $input['required_qualifications'])))
            : $this->extractSectionItems($rawDescription, ['requirements', 'required qualifications', 'qualifications', 'what you\'ll need', 'minimum qualifications', 'key skills']);

        $preferredQualifications = is_array($input['preferred_qualifications'] ?? null)
            ? array_values(array_filter(array_map('trim', $input['preferred_qualifications'])))
            : $this->extractSectionItems($rawDescription, ['preferred qualifications', 'nice to have', 'bonus points', 'good to have', 'desirable skills']);

        // Salary parsing
        $salaryInfo = $this->parseSalary($rawSalary, $rawDescription);

        // Quick Apply status determination
        $quickApplyStatus = $this->determineQuickApplyStatus($explicitQuickApply, $applicationMethod, $rawDescription);

        if (empty($applicationMethod)) {
            $applicationMethod = match ($quickApplyStatus) {
                'available' => 'quick_apply',
                'unavailable' => 'external',
                default => 'unknown',
            };
        }

        return [
            'title' => $title,
            'company_name' => $companyName ?: null,
            'location' => $location ?: null,
            'description' => $rawDescription ?: null,
            'responsibilities' => !empty($responsibilities) ? $responsibilities : null,
            'required_qualifications' => !empty($requiredQualifications) ? $requiredQualifications : null,
            'preferred_qualifications' => !empty($preferredQualifications) ? $preferredQualifications : null,
            'salary_min' => $input['salary_min'] ?? $salaryInfo['min'],
            'salary_max' => $input['salary_max'] ?? $salaryInfo['max'],
            'salary_currency' => $input['salary_currency'] ?? $salaryInfo['currency'],
            'salary_raw' => $rawSalary ?: $salaryInfo['raw'],
            'employment_type' => $employmentType ?: $this->detectEmploymentType($rawDescription),
            'application_method' => $applicationMethod,
            'quick_apply_status' => $quickApplyStatus,
            'retrieval_method' => $input['retrieval_method'] ?? 'manual_paste',
            'extraction_status' => 'complete',
            'review_status' => $input['review_status'] ?? 'pending_review',
        ];
    }

    /**
     * Parse structured items out of a text section.
     *
     * @param string $text
     * @param string[] $headers
     * @return string[]
     */
    protected function extractSectionItems(string $text, array $headers): array
    {
        if (empty($text)) {
            return [];
        }

        $lines = preg_split('/\r\n|\r|\n/', $text);
        if (!$lines) {
            return [];
        }

        $capturing = false;
        $items = [];

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                continue;
            }

            // Check if this line is a heading
            $lower = mb_strtolower($trimmed);
            $isMatchingHeader = false;
            foreach ($headers as $header) {
                if (str_contains($lower, $header) && (strlen($trimmed) < 60)) {
                    $isMatchingHeader = true;
                    break;
                }
            }

            if ($isMatchingHeader) {
                $capturing = true;
                continue;
            }

            // If we are capturing and hit another generic heading, stop
            if ($capturing && (preg_match('/^(about (us|the company)|benefits|compensation|salary|how to apply|who we are|location|summary)/i', $trimmed) || (strlen($trimmed) < 40 && str_ends_with($trimmed, ':')))) {
                break;
            }

            if ($capturing) {
                // Strip bullet markers (-, *, •, \d+., \d+\))
                $cleanItem = preg_replace('/^([-*•\x{2022}\x{25E6}\x{25AA}\x{2023}]|\d+[\.)])\s*/u', '', $trimmed);
                if (strlen($cleanItem) > 3) {
                    $items[] = $cleanItem;
                }
                if (count($items) >= 20) {
                    break;
                }
            }
        }

        return $items;
    }

    /**
     * Parse salary numbers and currency from salary string or description.
     *
     * @return array{min: ?float, max: ?float, currency: ?string, raw: ?string}
     */
    protected function parseSalary(string $rawSalary, string $description): array
    {
        $searchTarget = !empty($rawSalary) ? $rawSalary : $description;
        if (empty($searchTarget)) {
            return ['min' => null, 'max' => null, 'currency' => null, 'raw' => null];
        }

        $currency = null;
        if (preg_match('/(PHP|Php|₱)/i', $searchTarget)) {
            $currency = 'PHP';
        } elseif (preg_match('/(USD|\$)/', $searchTarget)) {
            $currency = 'USD';
        }

        // Look for ranges: e.g. 50,000 - 80,000 or 50k - 80k or Php 60,000 - Php 90,000
        if (preg_match('/(?:PHP|Php|₱|\$)?\s*([\d,]+(?:\.\d+)?|\d+k)\s*(?:-|to|–)\s*(?:PHP|Php|₱|\$)?\s*([\d,]+(?:\.\d+)?|\d+k)/i', $searchTarget, $matches)) {
            $minVal = $this->parseAmount($matches[1]);
            $maxVal = $this->parseAmount($matches[2]);

            return [
                'min' => $minVal,
                'max' => $maxVal,
                'currency' => $currency ?? 'PHP',
                'raw' => !empty($rawSalary) ? $rawSalary : trim($matches[0]),
            ];
        }

        // Look for single value: e.g. PHP 50,000
        if (preg_match('/(?:PHP|Php|₱|\$)\s*([\d,]+(?:\.\d+)?|\d+k)/i', $searchTarget, $matches)) {
            $val = $this->parseAmount($matches[1]);

            return [
                'min' => $val,
                'max' => null,
                'currency' => $currency ?? 'PHP',
                'raw' => !empty($rawSalary) ? $rawSalary : trim($matches[0]),
            ];
        }

        return [
            'min' => null,
            'max' => null,
            'currency' => $currency,
            'raw' => !empty($rawSalary) ? $rawSalary : null,
        ];
    }

    protected function parseAmount(string $amount): ?float
    {
        $clean = strtolower(str_replace(',', '', trim($amount)));
        if (str_ends_with($clean, 'k')) {
            $num = floatval(substr($clean, 0, -1));
            return $num * 1000;
        }

        $val = floatval($clean);
        return $val > 0 ? $val : null;
    }

    /**
     * Determine Quick Apply status strictly based on evidence.
     */
    protected function determineQuickApplyStatus(?string $explicit, string $method, string $description): string
    {
        if (!empty($explicit) && in_array($explicit, ['available', 'unavailable', 'unknown', 'requires_review'], true)) {
            return $explicit;
        }

        if (strtolower($method) === 'quick_apply') {
            return 'available';
        }

        $descLower = mb_strtolower($description);

        $hasQuickApplyKeyword = (bool) preg_match('/(quick\s*apply|easy\s*apply|one-click\s*apply)/i', $descLower);
        $hasExternalKeyword = (bool) preg_match('/(apply\s*(on|via|through)\s*(our|company)?\s*(website|portal)|(?:email|send|forward|submit)\s*(?:your\s*)?(?:cv|resume)?[^.\n]*?to|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|https?:\/\/[^\s]+)/i', $descLower);

        if ($hasQuickApplyKeyword && $hasExternalKeyword) {
            return 'requires_review';
        }

        if ($hasQuickApplyKeyword) {
            return 'available';
        }

        if ($hasExternalKeyword) {
            return 'unavailable';
        }

        return 'unknown';
    }

    protected function detectEmploymentType(string $text): ?string
    {
        $lower = mb_strtolower($text);
        if (str_contains($lower, 'full-time') || str_contains($lower, 'full time')) {
            return 'Full-time';
        }
        if (str_contains($lower, 'part-time') || str_contains($lower, 'part time')) {
            return 'Part-time';
        }
        if (str_contains($lower, 'contract') || str_contains($lower, 'freelance')) {
            return 'Contract';
        }
        if (str_contains($lower, 'internship')) {
            return 'Internship';
        }

        return null;
    }
}
