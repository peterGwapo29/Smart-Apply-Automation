<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\JobListingController;
use App\Http\Controllers\Api\JobMatchingController;
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

// Job Listings & Ingestion (Phase 3 & Phase 5)
Route::get('/jobs/check', [JobListingController::class, 'checkUrl']);
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

