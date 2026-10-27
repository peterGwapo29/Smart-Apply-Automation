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
        Schema::table('job_listings', function (Blueprint $table) {
            $table->string('listing_status', 30)->default('active')->index()->after('quick_apply_status');
            $table->timestamp('expires_at')->nullable()->index()->after('last_observed_at');
            $table->timestamp('last_verified_at')->nullable()->after('expires_at');
            $table->string('verification_source', 50)->nullable()->after('last_verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_listings', function (Blueprint $table) {
            $table->dropColumn([
                'listing_status',
                'expires_at',
                'last_verified_at',
                'verification_source',
            ]);
        });
    }
};
