<?php

namespace App\Services\Application;

use App\Exceptions\InvalidApplicationTransitionException;
use App\Models\JobApplication;

class ApplicationStateMachine
{
    /**
     * Map of valid transitions from each state.
     *
     * @var array<string, array<string>>
     */
    protected const TRANSITION_MAP = [
        JobApplication::STATUS_QUEUED => [
            JobApplication::STATUS_PREPARING,
            JobApplication::STATUS_NEEDS_REVIEW,
            JobApplication::STATUS_FAILED,
        ],
        JobApplication::STATUS_PREPARING => [
            JobApplication::STATUS_NEEDS_REVIEW,
            JobApplication::STATUS_READY,
            JobApplication::STATUS_QUEUED, // when bounded retry is scheduled
            JobApplication::STATUS_FAILED,
            JobApplication::STATUS_CONFIRMATION_REQUIRED,
        ],
        JobApplication::STATUS_NEEDS_REVIEW => [
            JobApplication::STATUS_QUEUED,
            JobApplication::STATUS_READY,
        ],
        JobApplication::STATUS_READY => [
            JobApplication::STATUS_QUEUED, // rerun requested
            JobApplication::STATUS_SUBMITTED, // reliable submission confirmation
            JobApplication::STATUS_CONFIRMATION_REQUIRED, // ambiguous outcome
        ],
        JobApplication::STATUS_CONFIRMATION_REQUIRED => [
            JobApplication::STATUS_SUBMITTED,
            JobApplication::STATUS_READY,
            JobApplication::STATUS_FAILED,
        ],
        JobApplication::STATUS_FAILED => [
            JobApplication::STATUS_QUEUED, // explicit manual retry or recovery
        ],
        JobApplication::STATUS_SUBMITTED => [
            // Strictly terminal: immutable
        ],
    ];

    /**
     * Check if a transition is valid.
     */
    public function canTransition(string $fromStatus, string $toStatus): bool
    {
        $allowed = self::TRANSITION_MAP[$fromStatus] ?? [];
        return in_array($toStatus, $allowed, true);
    }

    /**
     * Get allowed next statuses from a given status.
     *
     * @return array<string>
     */
    public function getAllowedTransitions(string $fromStatus): array
    {
        return self::TRANSITION_MAP[$fromStatus] ?? [];
    }

    /**
     * Assert that a transition is valid, or throw InvalidApplicationTransitionException.
     *
     * @throws InvalidApplicationTransitionException
     */
    public function validateTransition(string $fromStatus, string $toStatus): void
    {
        if (!$this->canTransition($fromStatus, $toStatus)) {
            throw new InvalidApplicationTransitionException(
                $fromStatus,
                $toStatus,
                $this->getAllowedTransitions($fromStatus)
            );
        }
    }
}
