<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_application_readiness', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_application_id')->unique()->constrained('job_applications')->cascadeOnDelete();
            $table->boolean('is_ready')->default(false);
            $table->json('blocking_issues')->nullable();
            $table->json('warnings')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->index('is_ready');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_application_readiness');
    }
};
