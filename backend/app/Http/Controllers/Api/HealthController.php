<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class HealthController extends Controller
{
    /**
     * Application availability health check.
     */
    public function index(Request $request): JsonResponse
    {
        $response = [
            'status' => 'ok',
            'service' => 'jobstreet-quick-apply-api',
        ];

        // Optional database check when query parameter `include_db=1` is provided
        if ($request->boolean('include_db')) {
            try {
                DB::connection()->getPdo();
                $response['database'] = 'connected';
            } catch (Throwable $e) {
                Log::error('Health check database connection failure: ' . $e->getMessage());
                return response()->json([
                    'status' => 'error',
                    'service' => 'jobstreet-quick-apply-api',
                    'database' => 'disconnected',
                    'message' => 'Database service is currently unreachable.',
                ], 503);
            }
        }

        return response()->json($response, 200);
    }

    /**
     * Dedicated database health check endpoint.
     */
    public function database(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            return response()->json([
                'status' => 'ok',
                'service' => 'jobstreet-quick-apply-api',
                'database' => 'connected',
            ], 200);
        } catch (Throwable $e) {
            Log::error('Database health endpoint failure: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'service' => 'jobstreet-quick-apply-api',
                'database' => 'disconnected',
                'message' => 'Database service is currently unreachable.',
            ], 503);
        }
    }
}
