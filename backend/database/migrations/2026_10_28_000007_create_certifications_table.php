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
        Schema::create('certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_profile_id')->constrained('candidate_profiles')->onDelete('cascade');
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->onDelete('set null');
            $table->string('name');
            $table->string('issuing_organization')->nullable();
            $table->string('issue_date')->nullable();
            $table->string('expiration_date')->nullable();
            $table->string('credential_id')->nullable();
            $table->string('credential_url')->nullable();
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
        Schema::dropIfExists('certifications');
    }
};
