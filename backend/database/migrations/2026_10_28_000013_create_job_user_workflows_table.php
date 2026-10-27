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
        Schema::create('job_user_workflows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('job_listing_id')->constrained('job_listings')->onDelete('cascade');

            // Personal review state: new, review_required, saved, interested, not_interested, archived
            $table->string('review_status', 30)->default('new');
            $table->boolean('is_bookmarked')->default(false);
            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            // Snapshots for change and stale detection
            $table->string('last_reviewed_content_hash', 64)->nullable();
            $table->decimal('last_reviewed_match_score', 5, 2)->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'job_listing_id']);
            $table->index(['user_id', 'review_status']);
            $table->index(['user_id', 'is_bookmarked']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_user_workflows');
    }
};
