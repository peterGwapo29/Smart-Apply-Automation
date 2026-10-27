<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\Discovery\JobDiscoveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ExecuteJobDiscoveryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public array $criteria = [],
        public string $sourcePlatform = 'authorized_feed'
    ) {}

    public function handle(JobDiscoveryService $discoveryService): void
    {
        $discoveryService->executeRun($this->user, $this->criteria, $this->sourcePlatform);
    }
}
