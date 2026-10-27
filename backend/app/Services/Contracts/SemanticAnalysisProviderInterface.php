<?php

namespace App\Services\Contracts;

interface SemanticAnalysisProviderInterface
{
    /**
     * Analyze semantic overlap between job requirements and candidate evidence.
     *
     * @param array<string, mixed> $jobRequirements
     * @param array<string, mixed> $candidateEvidence
     * @return array<string, mixed>
     */
    public function analyzeOverlap(array $jobRequirements, array $candidateEvidence): array;
}
