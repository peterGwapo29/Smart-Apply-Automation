<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Provide token for local developer user or credentials.
     */
    public function token(Request $request): JsonResponse
    {
        $email = $request->input('email', 'peter@jobstreet-automation.local');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = User::create([
                'name' => 'Peter Candidate',
                'email' => $email,
                'password' => Hash::make('password123'),
            ]);
        }

        $token = $user->createToken('dashboard-access-token')->plainTextToken;

        return response()->json([
            'status' => 'ok',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Return authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user() ?? User::first();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json([
            'status' => 'ok',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
}
