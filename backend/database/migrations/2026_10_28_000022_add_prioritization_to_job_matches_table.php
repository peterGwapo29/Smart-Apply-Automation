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
        Schema::table('job_matches', function (Blueprint $table) {
            $table->decimal('priority_score', 5, 2)->default(0.00)->after('salary_score');
            $table->string('priority_tier', 30)->default('medium_priority')->after('priority_score');
            $table->string('qualification_status', 30)->default('requires_review')->after('priority_tier');
            $table->string('evaluation_confidence', 20)->default('medium')->after('qualification_status');
            $table->json('qualification_breakdown')->nullable()->after('evaluation_confidence');

            $table->index(['user_id', 'priority_tier'], 'idx_job_matches_user_tier');
            $table->index(['user_id', 'qualification_status'], 'idx_job_matches_user_qual_status');
            $table->index(['user_id', 'priority_score'], 'idx_job_matches_user_priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_matches', function (Blueprint $table) {
            $table->dropIndex('idx_job_matches_user_tier');
            $table->dropIndex('idx_job_matches_user_qual_status');
            $table->dropIndex('idx_job_matches_user_priority');

            $table->dropColumn([
                'priority_score',
                'priority_tier',
                'qualification_status',
                'evaluation_confidence',
                'qualification_breakdown',
            ]);
        });
    }
};
