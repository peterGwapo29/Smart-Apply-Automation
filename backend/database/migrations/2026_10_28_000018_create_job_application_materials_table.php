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
        Schema::create('job_application_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_application_id')->constrained('job_applications')->cascadeOnDelete();
            $table->foreignId('selected_resume_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->text('resume_selection_rationale')->nullable();
            $table->mediumText('cover_letter')->nullable();
            $table->json('cover_letter_metadata')->nullable();
            $table->text('introduction')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_candidate_edited')->default(false);
            $table->timestamps();

            $table->index('job_application_id');
            $table->index('selected_resume_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_application_materials');
    }
};
