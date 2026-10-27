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
        Schema::create('job_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('candidate_profile_id')->constrained()->onDelete('cascade');
            $table->foreignId('job_listing_id')->constrained('job_listings')->onDelete('cascade');

            // Component Scores (0 to 100 overall, sub-components proportionally weighted)
            $table->decimal('overall_score', 5, 2)->default(0.00);
            $table->decimal('technical_score', 5, 2)->default(0.00);
            $table->decimal('experience_score', 5, 2)->default(0.00);
            $table->decimal('responsibilities_score', 5, 2)->default(0.00);
            $table->decimal('work_arrangement_score', 5, 2)->default(0.00);
            $table->decimal('salary_score', 5, 2)->default(0.00);

            // Eligibility & Explainability
            $table->string('eligibility_status', 30)->default('eligible'); // eligible, disqualified, requires_review
            $table->json('eligibility_evaluations')->nullable();
            $table->json('score_breakdown')->nullable();
            $table->json('matched_skills')->nullable();
            $table->json('matched_responsibilities')->nullable();
            $table->json('disqualification_reasons')->nullable();
            $table->json('semantic_analysis')->nullable();

            $table->string('scoring_version', 20)->default('1.0.0');
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();

            // Indexes
            $table->unique(['candidate_profile_id', 'job_listing_id']);
            $table->index(['user_id', 'overall_score']);
            $table->index(['user_id', 'eligibility_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_matches');
    }
};
