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
        Schema::create('work_experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_profile_id')->constrained('candidate_profiles')->onDelete('cascade');
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->onDelete('set null');
            $table->string('company_name');
            $table->string('job_title');
            $table->string('classification', 50)->default('employment');
            $table->boolean('is_current')->default(false);
            $table->string('start_date')->nullable();
            $table->string('end_date')->nullable();
            $table->text('responsibilities')->nullable();
            $table->json('technologies_used')->nullable();
            $table->text('raw_source_text')->nullable();
            $table->string('review_status', 30)->default('confirmed');
            $table->timestamps();

            $table->index(['candidate_profile_id', 'classification']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_experiences');
    }
};
