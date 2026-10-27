<?php

namespace App\Services\Ai;

use App\Services\Contracts\AiProviderInterface;

class LocalDeterministicAiProvider implements AiProviderInterface
{
    /**
     * Generate a tailored, evidence-backed cover letter.
     */
    public function generateCoverLetter(array $candidateEvidence, array $jobContext, array $options = []): array
    {
        $candidateName = $candidateEvidence['headline'] ? explode('-', $candidateEvidence['headline'])[0] : 'Candidate';
        $jobTitle = $jobContext['title'] ?? 'Open Role';
        $companyName = $jobContext['company_name'] ?? 'Hiring Team';
        $location = $jobContext['location'] ?? 'your office';
        $jobSkills = (array)($jobContext['skills'] ?? []);

        // 1. Evidence extraction
        $verifiedYears = $candidateEvidence['verified_professional_years'] ?? 0;
        $recentRole = !empty($candidateEvidence['employment_history']) ? $candidateEvidence['employment_history'][0] : null;
        $candidateSkills = $candidateEvidence['skills'] ?? [];
        $practicalProjects = $candidateEvidence['practical_projects'] ?? [];
        $preferences = $candidateEvidence['preferences'] ?? [];

        // Match skills
        $matchedSkillNames = [];
        $evidenceSkillIds = [];
        foreach ($candidateSkills as $cs) {
            foreach ($jobSkills as $js) {
                if (strcasecmp($cs['name'], $js) === 0) {
                    $matchedSkillNames[] = $cs['name'];
                    $evidenceSkillIds[] = $cs['id'];
                    break;
                }
            }
        }

        if (empty($matchedSkillNames) && !empty($candidateSkills)) {
            // Pick top 3 candidate skills
            $matchedSkillNames = array_column(array_slice($candidateSkills, 0, 3), 'name');
            $evidenceSkillIds = array_column(array_slice($candidateSkills, 0, 3), 'id');
        }

        $skillsSentence = !empty($matchedSkillNames)
            ? 'My core technical proficiency in '.implode(', ', array_slice($matchedSkillNames, 0, 4)).' aligns directly with the requirements outlined for this position.'
            : 'My background demonstrates a solid foundation in modern software engineering principles and collaborative development.';

        // 2. Build paragraphs
        $opening = sprintf(
            "Dear Hiring Manager at %s,\n\nI am writing to express my enthusiastic interest in the %s position. With %s years of verified professional experience in software development, I am eager to contribute to %s's engineering initiatives.",
            $companyName,
            $jobTitle,
            $verifiedYears > 0 ? (string)$verifiedYears : 'substantive',
            $companyName
        );

        $experienceParagraph = '';
        $evidenceExpIds = [];
        if ($recentRole) {
            $evidenceExpIds[] = $recentRole['id'];
            $expDuration = $recentRole['months_duration'] ? round($recentRole['months_duration'] / 12, 1).' years' : 'my tenure';
            $experienceParagraph = sprintf(
                "In my most recent role as %s at %s (%s), %s. %s",
                $recentRole['job_title'],
                $recentRole['company_name'],
                $expDuration,
                !empty($recentRole['responsibilities'])
                    ? 'I actively handled key development responsibilities including '.strtolower(substr($recentRole['responsibilities'], 0, 180)).'...'
                    : 'I delivered scalable solutions while collaborating closely with cross-functional teams',
                $skillsSentence
            );
        } else {
            $experienceParagraph = sprintf(
                "Throughout my professional background, I have focused on building resilient systems and clean architectures. %s",
                $skillsSentence
            );
        }

        $projectParagraph = '';
        $evidenceProjIds = [];
        if (!empty($practicalProjects)) {
            $firstProj = $practicalProjects[0];
            $evidenceProjIds[] = $firstProj['id'];
            $projName = $firstProj['name'] ?? ($firstProj['job_title'] ?? 'project');
            $projectParagraph = sprintf(
                "Beyond standard production deliverables, I have deepened my hands-on expertise through practical projects such as %s, demonstrating effective implementation of modern architecture and problem-solving.",
                $projName
            );
        }

        $noticeWeeks = $preferences['notice_period_weeks'] ?? 2;
        $availabilityText = $noticeWeeks === 0
            ? "I am available to start immediately."
            : sprintf("I can transition smoothly with a standard %d-week notice period.", $noticeWeeks);

        $closing = sprintf(
            "I welcome the opportunity to discuss how my verified background and hands-on skills can support %s's goals. %s Thank you for your time and consideration.\n\nSincerely,\nCandidate",
            $companyName,
            $availabilityText
        );

        $bodyParts = array_filter([$opening, $experienceParagraph, $projectParagraph, $closing]);
        $fullLetter = implode("\n\n", $bodyParts);

        $metadata = [
            'provider' => 'local_deterministic',
            'verified_years' => $verifiedYears,
            'referenced_experiences' => $evidenceExpIds,
            'referenced_projects' => $evidenceProjIds,
            'referenced_skills' => $evidenceSkillIds,
            'word_count' => str_word_count($fullLetter),
        ];

        return [
            'cover_letter' => $fullLetter,
            'metadata' => $metadata,
        ];
    }

    /**
     * Generate a concise application introduction (length-constrained).
     */
    public function generateIntroduction(array $candidateEvidence, array $jobContext, int $maxWords = 150): string
    {
        $jobTitle = $jobContext['title'] ?? 'Software Engineer';
        $companyName = $jobContext['company_name'] ?? 'your organization';
        $verifiedYears = $candidateEvidence['verified_professional_years'] ?? 0;
        $headline = $candidateEvidence['headline'] ?? 'Software Engineer';

        $skills = array_column(array_slice($candidateEvidence['skills'] ?? [], 0, 4), 'name');
        $skillsStr = !empty($skills) ? ' specializing in '.implode(', ', $skills) : '';

        $intro = sprintf(
            "Experienced %s with %s years of verified professional experience%s. Proven track record of architecting scalable applications and collaborating in agile teams. Excited to bring targeted technical skills and reliability to the %s role at %s.",
            $headline,
            $verifiedYears > 0 ? (string)$verifiedYears : 'solid',
            $skillsStr,
            $jobTitle,
            $companyName
        );

        // Constrain words
        $words = explode(' ', $intro);
        if (count($words) > $maxWords) {
            $intro = implode(' ', array_slice($words, 0, $maxWords)).'...';
        }

        return $intro;
    }

    /**
     * Generate a structured draft answer for a screening question.
     */
    public function answerScreeningQuestion(string $question, array $candidateEvidence, array $jobContext): array
    {
        $qLower = strtolower(trim($question));

        // 1. Availability / Notice period
        if (str_contains($qLower, 'notice') || str_contains($qLower, 'start') || str_contains($qLower, 'available') || str_contains($qLower, 'how soon')) {
            $weeks = $candidateEvidence['preferences']['notice_period_weeks'] ?? 2;
            $answer = $weeks === 0
                ? "I am available to start immediately."
                : sprintf("I am available to commence employment within %d weeks from an offer confirmation.", $weeks);

            return [
                'category' => 'availability',
                'draft_answer' => $answer,
                'confidence' => 'high',
                'requires_review' => false,
                'review_reason' => null,
                'evidence_references' => [
                    'source' => 'candidate_preferences.notice_period_weeks',
                    'value' => $weeks,
                ],
            ];
        }

        // 2. Salary / Compensation
        if (str_contains($qLower, 'salary') || str_contains($qLower, 'compensation') || str_contains($qLower, 'pay') || str_contains($qLower, 'rate')) {
            $pref = $candidateEvidence['preferences'] ?? [];
            $minSalary = $pref['min_salary'] ?? null;
            $targetSalary = $pref['preferred_salary'] ?? null;
            $currency = $pref['salary_currency'] ?? 'PHP';

            if ($targetSalary) {
                $answer = sprintf("My target compensation is %s %s/month (minimum %s %s), open to negotiation based on total benefits and role scope.", $currency, number_format((float)$targetSalary, 2), $currency, number_format((float)$minSalary, 2));
                return [
                    'category' => 'salary_expectation',
                    'draft_answer' => $answer,
                    'confidence' => 'high',
                    'requires_review' => false,
                    'review_reason' => null,
                    'evidence_references' => [
                        'source' => 'candidate_preferences.salary',
                        'min' => $minSalary,
                        'preferred' => $targetSalary,
                        'currency' => $currency,
                    ],
                ];
            } else {
                return [
                    'category' => 'salary_expectation',
                    'draft_answer' => "Negotiable and aligned with company standard compensation benchmarks.",
                    'confidence' => 'medium',
                    'requires_review' => true,
                    'review_reason' => 'No explicit salary preference configured in candidate profile.',
                    'evidence_references' => [],
                ];
            }
        }

        // 3. Work Authorization / Citizenship / Visa
        if (str_contains($qLower, 'authorized') || str_contains($qLower, 'eligible') || str_contains($qLower, 'sponsorship') || str_contains($qLower, 'visa') || str_contains($qLower, 'citizen') || str_contains($qLower, 'permit')) {
            $auth = $candidateEvidence['work_authorization_status'] ?? null;
            $citizenship = $candidateEvidence['citizenship'] ?? null;

            if ($auth || $citizenship) {
                $statusText = $auth ? "Status: {$auth}." : "";
                $citizenText = $citizenship ? " Citizenship: {$citizenship}." : "";
                $answer = sprintf("Yes, I am legally authorized to work.%s%s No employer sponsorship required.", $statusText, $citizenText);

                return [
                    'category' => 'work_authorization',
                    'draft_answer' => $answer,
                    'confidence' => 'high',
                    'requires_review' => true, // Always flagged for legal review
                    'review_reason' => 'Legal commitment / work authorization response requires human verification before submission.',
                    'evidence_references' => [
                        'source' => 'candidate_profile',
                        'citizenship' => $citizenship,
                        'work_authorization_status' => $auth,
                    ],
                ];
            } else {
                return [
                    'category' => 'work_authorization',
                    'draft_answer' => "Information unknown. Please review and input your current legal work authorization status.",
                    'confidence' => 'unknown',
                    'requires_review' => true,
                    'review_reason' => 'Candidate profile does not contain verified work authorization or citizenship records.',
                    'evidence_references' => [],
                ];
            }
        }

        // 4. Technology tenure / specific skill experience
        $candidateSkills = $candidateEvidence['skills'] ?? [];
        foreach ($candidateSkills as $s) {
            $sNameLower = strtolower($s['name']);
            if (str_contains($qLower, $sNameLower) && strlen($sNameLower) >= 2) {
                $years = $s['years_of_experience'] ?? 1;
                $answer = sprintf("I have %s years of verified experience working with %s (Proficiency: %s).", (string)$years, $s['name'], ucfirst($s['proficiency_level'] ?? 'proficient'));

                return [
                    'category' => 'technology_tenure',
                    'draft_answer' => $answer,
                    'confidence' => 'high',
                    'requires_review' => false,
                    'review_reason' => null,
                    'evidence_references' => [
                        'source' => 'candidate_skills',
                        'candidate_skill_id' => $s['id'],
                        'skill_name' => $s['name'],
                        'years' => $years,
                    ],
                ];
            }
        }

        // 5. Total professional experience
        if (str_contains($qLower, 'how many years') || str_contains($qLower, 'total experience') || str_contains($qLower, 'years of professional')) {
            $years = $candidateEvidence['verified_professional_years'] ?? 0;
            $answer = sprintf("I have %s years of verified professional employment experience.", (string)$years);

            return [
                'category' => 'years_experience',
                'draft_answer' => $answer,
                'confidence' => 'high',
                'requires_review' => false,
                'review_reason' => null,
                'evidence_references' => [
                    'source' => 'candidate_evidence.verified_professional_years',
                    'years' => $years,
                ],
            ];
        }

        // 6. Yes/No queries
        $isYesNo = preg_match('/^(do you|are you|can you|will you|have you)/i', $qLower);
        if ($isYesNo) {
            // Check if asking about education
            if (str_contains($qLower, 'degree') || str_contains($qLower, 'bachelor') || str_contains($qLower, 'master') || str_contains($qLower, 'graduate')) {
                $education = $candidateEvidence['education'] ?? [];
                if (!empty($education)) {
                    $firstEdu = $education[0];
                    return [
                        'category' => 'yes_no',
                        'draft_answer' => sprintf("Yes, I hold a %s in %s from %s.", $firstEdu['degree'], $firstEdu['field_of_study'], $firstEdu['institution']),
                        'confidence' => 'high',
                        'requires_review' => false,
                        'review_reason' => null,
                        'evidence_references' => [
                            'source' => 'education_records',
                            'education_id' => $firstEdu['id'],
                        ],
                    ];
                }
            }

            // Check if asking about license/certification
            if (str_contains($qLower, 'certif') || str_contains($qLower, 'license')) {
                $certs = $candidateEvidence['certifications'] ?? [];
                if (!empty($certs)) {
                    $cNames = array_column($certs, 'name');
                    return [
                        'category' => 'yes_no',
                        'draft_answer' => "Yes, I hold certifications including: ".implode(', ', $cNames).".",
                        'confidence' => 'medium',
                        'requires_review' => true,
                        'review_reason' => 'Confirm certification exact match with job qualification requirement.',
                        'evidence_references' => [
                            'source' => 'certifications',
                            'cert_ids' => array_column($certs, 'id'),
                        ],
                    ];
                }
            }

            // If we cannot verify, return unknown and flag for candidate review (Anti-Hallucination)
            return [
                'category' => 'yes_no',
                'draft_answer' => "Status unknown. Requires candidate manual verification.",
                'confidence' => 'unknown',
                'requires_review' => true,
                'review_reason' => 'Candidate profile does not contain verified records answering this qualification question. Please confirm manually.',
                'evidence_references' => [],
            ];
        }

        // 7. General fallback
        return [
            'category' => 'general_qualification',
            'draft_answer' => "Please review and confirm answer based on your specific background.",
            'confidence' => 'unknown',
            'requires_review' => true,
            'review_reason' => 'Question could not be resolved deterministically from candidate profile evidence.',
            'evidence_references' => [],
        ];
    }
}
