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
        Schema::create('candidate_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_profile_id')->unique()->constrained()->onDelete('cascade');
            $table->json('work_arrangements')->nullable(); // e.g. ['remote', 'hybrid', 'on_site']
            $table->json('employment_types')->nullable();  // e.g. ['Full-time', 'Contract', 'Freelance']
            $table->json('preferred_locations')->nullable(); // e.g. ['Taguig', 'Makati', 'Remote']
            $table->decimal('min_salary', 12, 2)->nullable();
            $table->decimal('preferred_salary', 12, 2)->nullable();
            $table->string('salary_currency', 10)->default('PHP');
            $table->string('salary_period', 20)->default('monthly');
            $table->integer('notice_period_weeks')->default(2);
            $table->json('hard_disqualifiers')->nullable(); // e.g. ['disallow_on_site' => false, 'strict_salary' => false]
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidate_preferences');
    }
};
