<?php

namespace App\Services\Contracts;

interface AiProviderInterface
{
    /**
     * Generate a tailored, evidence-backed cover letter.
     * Returns ['cover_letter' => string, 'metadata' => array]
     */
    public function generateCoverLetter(array $candidateEvidence, array $jobContext, array $options = []): array;

    /**
     * Generate a concise application introduction (length-constrained).
     */
    public function generateIntroduction(array $candidateEvidence, array $jobContext, int $maxWords = 150): string;

    /**
     * Generate a structured draft answer for a screening question.
     * Returns:
     * [
     *   'category' => string,
     *   'draft_answer' => string,
     *   'confidence' => 'high'|'medium'|'low'|'unknown',
     *   'requires_review' => bool,
     *   'review_reason' => ?string,
     *   'evidence_references' => array
     * ]
     */
    public function answerScreeningQuestion(string $question, array $candidateEvidence, array $jobContext): array;
}
