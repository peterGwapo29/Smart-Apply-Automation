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
        Schema::create('job_application_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_application_id')->constrained('job_applications')->cascadeOnDelete();
            $table->text('question');
            $table->string('category', 64)->default('general_qualification');
            $table->text('draft_answer')->nullable();
            $table->string('confidence', 32)->default('unknown');
            $table->boolean('requires_review')->default(false);
            $table->string('review_reason', 255)->nullable();
            $table->json('evidence_references')->nullable();
            $table->boolean('is_candidate_edited')->default(false);
            $table->timestamps();

            $table->index('job_application_id');
            $table->index('category');
            $table->index('confidence');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_application_answers');
    }
};
