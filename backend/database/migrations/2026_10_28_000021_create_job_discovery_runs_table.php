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
        Schema::create('job_discovery_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('source_platform', 50)->default('authorized_feed');
            $table->string('status', 30)->default('pending'); // pending, running, completed, completed_with_errors, failed, cancelled
            $table->json('search_criteria')->nullable();
            $table->unsignedInteger('listings_found')->default(0);
            $table->unsignedInteger('new_listings')->default(0);
            $table->unsignedInteger('updated_listings')->default(0);
            $table->unsignedInteger('duplicates_ignored')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'source_platform']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_discovery_runs');
    }
};
