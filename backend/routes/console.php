<?php

use App\Models\User;
use App\Services\Discovery\JobDiscoveryService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Artisan::command('jobs:discover {--source=authorized_feed} {--user=}', function (JobDiscoveryService $discoveryService) {
    $source = (string)$this->option('source');
    $userId = $this->option('user');

    $users = $userId ? User::where('id', $userId)->get() : User::all();

    if ($users->isEmpty()) {
        $this->warn('No matching users found for job discovery.');
        return 0;
    }

    $this->info("Starting automated job discovery for source: {$source}");

    foreach ($users as $user) {
        $this->line("Running discovery for User #{$user->id} ({$user->email})...");
        $run = $discoveryService->executeRun($user, [], $source);
        $this->info("Completed Run #{$run->id}: {$run->new_listings} new, {$run->updated_listings} updated, {$run->duplicates_ignored} unchanged (Status: {$run->status})");
    }

    return 0;
})->purpose('Execute automated job discovery across supported source adapters');

// Daily automated discovery schedule
Schedule::command('jobs:discover --source=authorized_feed')->dailyAt('06:00');
