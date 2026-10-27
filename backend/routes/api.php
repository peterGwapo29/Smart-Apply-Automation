<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\JobApplicationController;
use App\Http\Controllers\Api\JobApplicationPreparationController;
use App\Http\Controllers\Api\JobApplicationExecutionController;
use App\Http\Controllers\Api\PlatformAccountController;
use App\Http\Controllers\Api\JobDiscoveryController;
use App\Http\Controllers\Api\JobListingController;
use App\Http\Controllers\Api\JobMatchingController;
use App\Http\Controllers\Api\JobQualificationController;
use App\Http\Controllers\Api\JobWorkflowController;
use App\Http\Controllers\Api\ResumeController;
use Illuminate\Support\Facades\Route;

// Health Checks
Route::get('/health', [HealthController::class, 'index']);
Route::get('/health/db', [HealthController::class, 'database']);

// Authentication & Developer Tokens
Route::post('/auth/token', [AuthController::class, 'token']);
Route::get('/auth/me', [AuthController::class, 'me']);

// Resume Ingestion & Versioning
Route::get('/resumes', [ResumeController::class, 'index']);
Route::post('/resumes', [ResumeController::class, 'store']);
Route::get('/resumes/{id}', [ResumeController::class, 'show']);
Route::post('/resumes/{id}/confirm', [ResumeController::class, 'confirm']);
Route::post('/resumes/{id}/retry', [ResumeController::class, 'retry']);

// Candidate Profile Management
Route::get('/candidate-profile', [CandidateProfileController::class, 'show']);
Route::put('/candidate-profile', [CandidateProfileController::class, 'update']);
Route::get('/candidate-profile/preferences', [JobMatchingController::class, 'getPreferences']);
Route::put('/candidate-profile/preferences', [JobMatchingController::class, 'updatePreferences']);

Route::post('/candidate-profile/skills', [CandidateProfileController::class, 'addSkill']);
Route::delete('/candidate-profile/skills/{id}', [CandidateProfileController::class, 'deleteSkill']);

Route::post('/candidate-profile/experiences', [CandidateProfileController::class, 'addExperience']);
Route::delete('/candidate-profile/experiences/{id}', [CandidateProfileController::class, 'deleteExperience']);

Route::post('/candidate-profile/projects', [CandidateProfileController::class, 'addProject']);
Route::delete('/candidate-profile/projects/{id}', [CandidateProfileController::class, 'deleteProject']);

// Job Matching Engine (Phase 4)
Route::post('/jobs/match-all', [JobMatchingController::class, 'matchAll']);
Route::get('/jobs/matches', [JobMatchingController::class, 'indexMatches']);
Route::post('/jobs/{id}/match', [JobMatchingController::class, 'match']);
Route::get('/jobs/{id}/match', [JobMatchingController::class, 'show']);

// AI Job Qualification & Prioritization (Phase 9)
Route::get('/jobs/prioritized', [JobQualificationController::class, 'prioritized']);
Route::get('/jobs/{id}/qualification', [JobQualificationController::class, 'show']);
Route::post('/jobs/{id}/qualification/recalculate', [JobQualificationController::class, 'recalculate']);

// Job Listings & Ingestion (Phase 3 & Phase 5)
Route::get('/jobs/check', [JobListingController::class, 'checkUrl']);
Route::get('/jobs/summary', [JobListingController::class, 'summary']);
Route::get('/jobs/dashboard-summary', [JobListingController::class, 'summary']);
Route::get('/jobs', [JobListingController::class, 'index']);
Route::post('/jobs/import', [JobListingController::class, 'import']);
Route::get('/jobs/{id}', [JobListingController::class, 'show']);
Route::put('/jobs/{id}', [JobListingController::class, 'update']);
Route::delete('/jobs/{id}', [JobListingController::class, 'destroy']);

// Job Workflow & Review Actions (Phase 5)
Route::patch('/jobs/{id}/review', [JobWorkflowController::class, 'updateReview']);
Route::post('/jobs/{id}/bookmark', [JobWorkflowController::class, 'bookmark']);
Route::delete('/jobs/{id}/bookmark', [JobWorkflowController::class, 'unbookmark']);

// Application Agent Foundation (Phase 6)
Route::get('/applications', [JobApplicationController::class, 'index']);
Route::post('/applications', [JobApplicationController::class, 'store']);
Route::get('/applications/{id}', [JobApplicationController::class, 'show']);
Route::post('/applications/{id}/queue', [JobApplicationController::class, 'queue']);
Route::post('/applications/{id}/retry', [JobApplicationController::class, 'retry']);
Route::post('/applications/{id}/transition', [JobApplicationController::class, 'transition']);
Route::get('/applications/{id}/activity', [JobApplicationController::class, 'activity']);

// AI Application Preparation (Phase 7)
Route::get('/applications/{id}/workspace', [JobApplicationPreparationController::class, 'workspace']);
Route::post('/applications/{id}/recommend-resume', [JobApplicationPreparationController::class, 'recommendResume']);
Route::post('/applications/{id}/select-resume', [JobApplicationPreparationController::class, 'selectResume']);
Route::post('/applications/{id}/generate-materials', [JobApplicationPreparationController::class, 'generateMaterials']);
Route::put('/applications/{id}/materials', [JobApplicationPreparationController::class, 'updateMaterials']);
Route::post('/applications/{id}/screening-questions/draft', [JobApplicationPreparationController::class, 'draftScreeningQuestions']);
Route::put('/applications/{id}/screening-questions/{questionId}', [JobApplicationPreparationController::class, 'updateScreeningQuestion']);
Route::get('/applications/{id}/readiness', [JobApplicationPreparationController::class, 'evaluateReadiness']);

// Automated Job Discovery (Phase 8)
Route::get('/discovery/sources', [JobDiscoveryController::class, 'sources']);
Route::get('/discovery/runs', [JobDiscoveryController::class, 'runs']);
Route::post('/discovery/runs', [JobDiscoveryController::class, 'triggerRun']);
Route::get('/discovery/runs/{id}', [JobDiscoveryController::class, 'showRun']);
Route::post('/discovery/runs/{id}/cancel', [JobDiscoveryController::class, 'cancelRun']);

// Phase 10: Platform Accounts, Revalidation, Execution & Assistance
Route::post('/jobs/revalidate-all', [JobApplicationExecutionController::class, 'revalidateAll']);
Route::post('/jobs/{id}/revalidate', [JobApplicationExecutionController::class, 'revalidate']);
Route::get('/platform-accounts', [PlatformAccountController::class, 'index']);
Route::put('/platform-accounts/{platform}', [PlatformAccountController::class, 'update']);
Route::get('/applications/{id}/execution-workspace', [JobApplicationExecutionController::class, 'workspace']);
Route::post('/applications/{id}/authorize-execution', [JobApplicationExecutionController::class, 'authorizeExecution']);
Route::post('/applications/{id}/verify-submission', [JobApplicationExecutionController::class, 'verifySubmission']);
Route::post('/applications/{id}/record-ambiguous', [JobApplicationExecutionController::class, 'recordAmbiguous']);




