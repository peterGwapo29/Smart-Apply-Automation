<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CandidateProfileController;
use App\Http\Controllers\Api\HealthController;
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

Route::post('/candidate-profile/skills', [CandidateProfileController::class, 'addSkill']);
Route::delete('/candidate-profile/skills/{id}', [CandidateProfileController::class, 'deleteSkill']);

Route::post('/candidate-profile/experiences', [CandidateProfileController::class, 'addExperience']);
Route::delete('/candidate-profile/experiences/{id}', [CandidateProfileController::class, 'deleteExperience']);

Route::post('/candidate-profile/projects', [CandidateProfileController::class, 'addProject']);
Route::delete('/candidate-profile/projects/{id}', [CandidateProfileController::class, 'deleteProject']);
