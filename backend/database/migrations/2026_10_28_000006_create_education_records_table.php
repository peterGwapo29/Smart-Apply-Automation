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
        Schema::create('education_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_profile_id')->constrained('candidate_profiles')->onDelete('cascade');
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->onDelete('set null');
            $table->string('institution_name');
            $table->string('qualification')->nullable();
            $table->string('field_of_study')->nullable();
            $table->string('start_date')->nullable();
            $table->string('completion_date')->nullable();
            $table->string('status', 50)->default('graduated');
            $table->text('raw_source_text')->nullable();
            $table->string('review_status', 30)->default('confirmed');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('education_records');
    }
};
