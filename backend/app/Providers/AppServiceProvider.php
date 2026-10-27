<?php

namespace App\Providers;

use App\Services\Contracts\JobExtractionProviderInterface;
use App\Services\Contracts\SemanticAnalysisProviderInterface;
use App\Services\JobExtraction\ManualJobImportProvider;
use App\Services\Matching\LocalDeterministicSemanticProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(JobExtractionProviderInterface::class, ManualJobImportProvider::class);
        $this->app->bind(SemanticAnalysisProviderInterface::class, LocalDeterministicSemanticProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
