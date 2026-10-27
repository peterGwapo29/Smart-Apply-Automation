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
        Schema::create('job_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('source_platform', 50)->default('jobstreet');
            $table->string('source_job_id', 100)->nullable();
            $table->text('canonical_url');
            $table->string('title');
            $table->string('company_name')->nullable();
            $table->string('location')->nullable();
            $table->longText('description')->nullable();
            $table->json('responsibilities')->nullable();
            $table->json('required_qualifications')->nullable();
            $table->json('preferred_qualifications')->nullable();
            $table->decimal('salary_min', 12, 2)->nullable();
            $table->decimal('salary_max', 12, 2)->nullable();
            $table->string('salary_currency', 10)->nullable();
            $table->string('salary_raw')->nullable();
            $table->string('employment_type', 100)->nullable();
            $table->string('application_method', 100)->default('unknown');
            $table->string('quick_apply_status', 50)->default('unknown');
            $table->string('retrieval_method', 50)->default('manual_paste');
            $table->timestamp('first_detected_at')->useCurrent();
            $table->timestamp('last_observed_at')->useCurrent();
            $table->timestamp('last_extracted_at')->nullable();
            $table->string('extraction_status', 50)->default('complete');
            $table->string('content_hash', 64)->index();
            $table->string('review_status', 50)->default('pending_review');
            $table->timestamps();

            $table->index(['user_id', 'source_platform', 'source_job_id']);
            $table->index(['user_id', 'content_hash']);
            $table->index(['user_id', 'quick_apply_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_listings');
    }
};
