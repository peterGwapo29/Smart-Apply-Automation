<?php

namespace App\Providers;

use App\Services\Contracts\AiProviderInterface;
use App\Services\Contracts\JobExtractionProviderInterface;
use App\Services\Contracts\SemanticAnalysisProviderInterface;
use App\Services\Ai\LocalDeterministicAiProvider;
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
        $this->app->bind(AiProviderInterface::class, LocalDeterministicAiProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
