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
        Schema::table('candidate_preferences', function (Blueprint $table) {
            $table->decimal('min_match_threshold', 5, 2)->default(70.00)->after('salary_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('candidate_preferences', function (Blueprint $table) {
            $table->dropColumn('min_match_threshold');
        });
    }
};
