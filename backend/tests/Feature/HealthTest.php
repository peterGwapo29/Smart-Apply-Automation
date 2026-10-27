<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    /**
     * Test GET /api/health returns the expected JSON structure.
     */
    public function test_health_endpoint_returns_ok_status(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertExactJson([
                'status' => 'ok',
                'service' => 'jobstreet-quick-apply-api',
            ]);
    }

    /**
     * Test GET /api/health/db returns database connectivity status.
     */
    public function test_database_health_endpoint_returns_connected(): void
    {
        $response = $this->getJson('/api/health/db');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'service' => 'jobstreet-quick-apply-api',
                'database' => 'connected',
            ]);
    }
}
