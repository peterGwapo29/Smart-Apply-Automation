<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class InvalidApplicationTransitionException extends Exception
{
    public function __construct(
        public readonly string $fromStatus,
        public readonly string $toStatus,
        public readonly array $allowedTransitions = []
    ) {
        $allowed = empty($allowedTransitions) ? 'none (terminal state)' : implode(', ', $allowedTransitions);
        parent::__construct("Invalid application transition from [{$fromStatus}] to [{$toStatus}]. Allowed: [{$allowed}].", 422);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'error_code' => 'INVALID_STATUS_TRANSITION',
            'message' => $this->getMessage(),
            'from_status' => $this->fromStatus,
            'to_status' => $this->toStatus,
            'allowed_transitions' => $this->allowedTransitions,
        ], 422);
    }
}
