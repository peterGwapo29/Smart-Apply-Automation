<?php

namespace App\Services;

use App\Models\CandidateProfile;
use App\Models\JobListing;
use App\Models\Resume;
use Illuminate\Support\Collection;

class ResumeSelectionService
{
    /**
     * Recommend the best resume version for a given job listing.
     *
     * @return array{
     *   recommended_resume: ?Resume,
     *   rationale: string,
     *   all_candidates: array
     * }
     */
    public function recommendResume(CandidateProfile $profile, JobListing $job): array
    {
        $userId = $profile->user_id;
        $resumes = Resume::where('user_id', $userId)
            ->where('processing_status', 'completed')
            ->orderBy('is_active', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        if ($resumes->isEmpty()) {
            return [
                'recommended_resume' => null,
                'rationale' => 'No processed resume versions found for candidate profile.',
                'all_candidates' => [],
            ];
        }

        $jobSkills = array_map('strtolower', (array)($job->skills ?? []));
        $jobTitle = strtolower($job->title ?? '');
        $jobDesc = strtolower($job->description_raw ?? '');

        $scoredResumes = [];

        foreach ($resumes as $resume) {
            $score = 0;
            $matchedHighlights = [];
            $parsed = $resume->parsed_data ?? [];
            $rawText = strtolower($resume->raw_text ?? '');

            // 1. Skill overlap score (up to 50 points)
            $parsedSkills = [];
            if (!empty($parsed['skills']) && is_array($parsed['skills'])) {
                foreach ($parsed['skills'] as $s) {
                    $sName = is_array($s) ? ($s['name'] ?? '') : $s;
                    if ($sName) {
                        $parsedSkills[] = strtolower($sName);
                    }
                }
            }

            $matchedSkillsCount = 0;
            foreach ($jobSkills as $js) {
                if (in_array($js, $parsedSkills, true) || (strlen($js) >= 3 && str_contains($rawText, $js))) {
                    $matchedSkillsCount++;
                    if (count($matchedHighlights) < 3) {
                        $matchedHighlights[] = $js;
                    }
                }
            }

            if (!empty($jobSkills)) {
                $skillRatio = $matchedSkillsCount / count($jobSkills);
                $score += round($skillRatio * 50);
            } else {
                $score += 30; // default if job has no explicit skills array
            }

            // 2. Title and domain keyword overlap (up to 30 points)
            $titleWords = array_filter(explode(' ', preg_replace('/[^a-z0-9 ]/', '', $jobTitle)));
            $titleMatches = 0;
            foreach ($titleWords as $tw) {
                if (strlen($tw) > 2 && str_contains($rawText, $tw)) {
                    $titleMatches++;
                }
            }
            if (!empty($titleWords)) {
                $score += min(30, round(($titleMatches / count($titleWords)) * 30));
            }

            // 3. Active status baseline preference (20 points)
            if ($resume->is_active) {
                $score += 20;
            }

            $scoredResumes[] = [
                'resume' => $resume,
                'score' => $score,
                'matched_skills_count' => $matchedSkillsCount,
                'matched_highlights' => $matchedHighlights,
            ];
        }

        // Sort descending by score
        usort($scoredResumes, fn($a, $b) => $b['score'] <=> $a['score']);

        $top = $scoredResumes[0];
        $topResume = $top['resume'];

        // Build explanatory rationale
        $highlightsStr = !empty($top['matched_highlights'])
            ? 'specifically highlighting '.implode(', ', array_slice($top['matched_highlights'], 0, 3))
            : 'aligning with general job keywords';

        $activeNote = $topResume->is_active ? ' (currently active default resume)' : '';
        $rationale = sprintf(
            'Recommended "%s"%s with score %d/100, matching %d job skill(s) and %s.',
            $topResume->original_filename,
            $activeNote,
            $top['score'],
            $top['matched_skills_count'],
            $highlightsStr
        );

        $allCandidates = array_map(function ($item) {
            return [
                'id' => $item['resume']->id,
                'filename' => $item['resume']->original_filename,
                'is_active' => (bool)$item['resume']->is_active,
                'score' => $item['score'],
                'matched_skills_count' => $item['matched_skills_count'],
            ];
        }, $scoredResumes);

        return [
            'recommended_resume' => $topResume,
            'rationale' => $rationale,
            'all_candidates' => $allCandidates,
        ];
    }
}
