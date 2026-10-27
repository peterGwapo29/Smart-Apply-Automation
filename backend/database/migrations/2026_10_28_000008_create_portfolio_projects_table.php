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
        Schema::create('portfolio_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_profile_id')->constrained('candidate_profiles')->onDelete('cascade');
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->onDelete('set null');
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('technologies_used')->nullable();
            $table->string('project_url')->nullable();
            $table->string('repository_url')->nullable();
            $table->string('category', 50)->default('personal');
            $table->text('raw_source_text')->nullable();
            $table->string('review_status', 30)->default('confirmed');
            $table->timestamps();

            $table->index(['candidate_profile_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('portfolio_projects');
    }
};
