<?php

namespace Database\Seeders;

use App\Models\CandidateProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'peter@jobstreet-automation.local'],
            [
                'name' => 'Peter Candidate',
                'password' => Hash::make('password123'),
            ]
        );

        CandidateProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'full_name' => 'Peter Candidate',
                'email' => 'peter@jobstreet-automation.local',
                'location' => 'Philippines',
                'headline' => 'Full-Stack Software Engineer',
                'summary' => 'Experienced software developer specializing in modern web applications and automation systems.',
            ]
        );

        // Create or refresh development personal access token
        $user->tokens()->where('name', 'dev-dashboard-token')->delete();
        $user->createToken('dev-dashboard-token');
    }
}
