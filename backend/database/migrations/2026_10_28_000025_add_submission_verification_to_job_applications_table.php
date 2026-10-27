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
        Schema::table('job_applications', function (Blueprint $table) {
            $table->string('submission_verification_level', 50)->default('unconfirmed')->index()->after('status');
            $table->string('submission_evidence_type', 100)->nullable()->after('submission_verification_level');
            $table->text('submission_evidence_note')->nullable()->after('submission_evidence_type');
            $table->timestamp('authorized_at')->nullable()->after('ready_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropColumn([
                'submission_verification_level',
                'submission_evidence_type',
                'submission_evidence_note',
                'authorized_at',
            ]);
        });
    }
};
