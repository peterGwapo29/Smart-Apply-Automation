<?php

namespace App\Services\Contracts;

interface JobExtractionProviderInterface
{
    /**
     * Extract structured job fields from the given input.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function extract(array $input): array;
}
