<?php

namespace App\Services;

class StructuredResumeExtractor
{
    /**
     * Standard skill lexicon with canonical display name and category.
     *
     * @var array<string, array{display: string, category: string, aliases: array<string>}>
     */
    protected array $skillLexicon = [
        'php' => ['display' => 'PHP', 'category' => 'backend', 'aliases' => ['php8', 'php7', 'php']],
        'laravel' => ['display' => 'Laravel', 'category' => 'backend', 'aliases' => ['laravel']],
        'nodejs' => ['display' => 'Node.js', 'category' => 'backend', 'aliases' => ['node.js', 'nodejs', 'node']],
        'express' => ['display' => 'Express', 'category' => 'backend', 'aliases' => ['express.js', 'express']],
        'restapi' => ['display' => 'REST APIs', 'category' => 'backend', 'aliases' => ['rest api', 'rest apis', 'restful api', 'restful apis', 'rest']],
        'python' => ['display' => 'Python', 'category' => 'backend', 'aliases' => ['python', 'python3']],
        'django' => ['display' => 'Django', 'category' => 'backend', 'aliases' => ['django']],
        'csharp' => ['display' => 'C#', 'category' => 'backend', 'aliases' => ['c#', 'csharp', '.net']],
        'java' => ['display' => 'Java', 'category' => 'backend', 'aliases' => ['java', 'spring boot', 'spring']],
        'graphql' => ['display' => 'GraphQL', 'category' => 'backend', 'aliases' => ['graphql']],

        'javascript' => ['display' => 'JavaScript', 'category' => 'frontend', 'aliases' => ['javascript', 'js', 'es6']],
        'typescript' => ['display' => 'TypeScript', 'category' => 'frontend', 'aliases' => ['typescript', 'ts']],
        'react' => ['display' => 'React', 'category' => 'frontend', 'aliases' => ['react', 'react.js', 'reactjs']],
        'nextjs' => ['display' => 'Next.js', 'category' => 'frontend', 'aliases' => ['next.js', 'nextjs', 'next']],
        'vue' => ['display' => 'Vue.js', 'category' => 'frontend', 'aliases' => ['vue.js', 'vuejs', 'vue']],
        'angular' => ['display' => 'Angular', 'category' => 'frontend', 'aliases' => ['angular', 'angularjs']],
        'html' => ['display' => 'HTML5', 'category' => 'frontend', 'aliases' => ['html5', 'html']],
        'css' => ['display' => 'CSS3', 'category' => 'frontend', 'aliases' => ['css3', 'css']],
        'tailwind' => ['display' => 'Tailwind CSS', 'category' => 'frontend', 'aliases' => ['tailwind css', 'tailwind', 'tailwindcss']],
        'bootstrap' => ['display' => 'Bootstrap', 'category' => 'frontend', 'aliases' => ['bootstrap']],
        'redux' => ['display' => 'Redux', 'category' => 'frontend', 'aliases' => ['redux', 'redux toolkit']],

        'mysql' => ['display' => 'MySQL', 'category' => 'database', 'aliases' => ['mysql']],
        'mariadb' => ['display' => 'MariaDB', 'category' => 'database', 'aliases' => ['mariadb']],
        'postgresql' => ['display' => 'PostgreSQL', 'category' => 'database', 'aliases' => ['postgresql', 'postgres']],
        'sqlite' => ['display' => 'SQLite', 'category' => 'database', 'aliases' => ['sqlite']],
        'mongodb' => ['display' => 'MongoDB', 'category' => 'database', 'aliases' => ['mongodb', 'mongo']],
        'redis' => ['display' => 'Redis', 'category' => 'database', 'aliases' => ['redis']],
        'firebase' => ['display' => 'Firebase', 'category' => 'database', 'aliases' => ['firebase', 'firestore']],
        'supabase' => ['display' => 'Supabase', 'category' => 'database', 'aliases' => ['supabase']],

        'git' => ['display' => 'Git', 'category' => 'tools', 'aliases' => ['git']],
        'github' => ['display' => 'GitHub', 'category' => 'tools', 'aliases' => ['github']],
        'gitlab' => ['display' => 'GitLab', 'category' => 'tools', 'aliases' => ['gitlab']],
        'postman' => ['display' => 'Postman', 'category' => 'tools', 'aliases' => ['postman']],
        'docker' => ['display' => 'Docker', 'category' => 'tools', 'aliases' => ['docker']],
        'vite' => ['display' => 'Vite', 'category' => 'tools', 'aliases' => ['vite', 'vitejs']],
        'composer' => ['display' => 'Composer', 'category' => 'tools', 'aliases' => ['composer']],
        'npm' => ['display' => 'npm', 'category' => 'tools', 'aliases' => ['npm', 'yarn', 'pnpm']],
        'linux' => ['display' => 'Linux', 'category' => 'tools', 'aliases' => ['linux', 'ubuntu']],
        'aws' => ['display' => 'AWS', 'category' => 'tools', 'aliases' => ['aws', 'amazon web services']],
    ];

    /**
     * Parse raw text into structured proposal format.
     */
    public function extract(string $text): array
    {
        $sections = $this->splitSections($text);

        $basicInfo = $this->extractBasicInfo($text, $sections);
        $skills = $this->extractSkills($text, $sections);
        $workExperiences = $this->extractExperience($text, $sections);
        $portfolioProjects = $this->extractProjects($text, $sections);
        $education = $this->extractEducation($text, $sections);
        $certifications = $this->extractCertifications($text, $sections);

        return [
            'basic_info' => $basicInfo,
            'skills' => $skills,
            'work_experiences' => $workExperiences,
            'portfolio_projects' => $portfolioProjects,
            'education' => $education,
            'certifications' => $certifications,
        ];
    }

    /**
     * Identify and split resume text by typical section headers.
     *
     * @return array<string, string>
     */
    protected function splitSections(string $text): array
    {
        $sectionPattern = '/^(?:[-#*=_ \t]*)(SUMMARY|PROFESSIONAL SUMMARY|PROFILE|EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT HISTORY|SKILLS|TECHNICAL SKILLS|PROJECTS|PORTFOLIO|PORTFOLIO PROJECTS|EDUCATION|ACADEMIC BACKGROUND|CERTIFICATIONS|CERTIFICATES)(?:[: \t*=_#-]*)$/mi';

        $lines = explode("\n", $text);
        $sections = [];
        $currentSection = 'HEADER';
        $currentContent = [];

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (preg_match($sectionPattern, $trimmed, $matches)) {
                $sections[$currentSection] = implode("\n", $currentContent);
                $matchedHeader = strtoupper($matches[1]);

                if (str_contains($matchedHeader, 'EXPERIENCE') || str_contains($matchedHeader, 'EMPLOYMENT')) {
                    $currentSection = 'EXPERIENCE';
                } elseif (str_contains($matchedHeader, 'PROJECT') || str_contains($matchedHeader, 'PORTFOLIO')) {
                    $currentSection = 'PROJECTS';
                } elseif (str_contains($matchedHeader, 'SKILL')) {
                    $currentSection = 'SKILLS';
                } elseif (str_contains($matchedHeader, 'EDUCATION') || str_contains($matchedHeader, 'ACADEMIC')) {
                    $currentSection = 'EDUCATION';
                } elseif (str_contains($matchedHeader, 'CERTIF')) {
                    $currentSection = 'CERTIFICATIONS';
                } elseif (str_contains($matchedHeader, 'SUMMARY') || str_contains($matchedHeader, 'PROFILE')) {
                    $currentSection = 'SUMMARY';
                } else {
                    $currentSection = $matchedHeader;
                }
                $currentContent = [];
            } else {
                $currentContent[] = $line;
            }
        }

        $sections[$currentSection] = implode("\n", $currentContent);
        return $sections;
    }

    /**
     * Extract contact and basic candidate details.
     */
    protected function extractBasicInfo(string $fullText, array $sections): array
    {
        $headerText = ($sections['HEADER'] ?? '') . "\n" . ($sections['SUMMARY'] ?? '');

        // Email extraction
        $email = null;
        if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $fullText, $matches)) {
            $email = strtolower($matches[0]);
        }

        // Phone extraction (supports international, Philippine numbers, standard hyphens)
        $phone = null;
        if (preg_match('/(?:\+?63\s?9\d{2}[-\s]?\d{3}[-\s]?\d{4})|(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/', $fullText, $matches)) {
            $phone = trim($matches[0]);
        }

        // Name heuristics: first non-empty line of the header text
        $name = null;
        $headerLines = array_filter(array_map('trim', explode("\n", $sections['HEADER'] ?? '')));
        foreach ($headerLines as $line) {
            // Ignore contact lines and short titles
            if (!str_contains($line, '@') && !preg_match('/\d{3}/', $line) && mb_strlen($line) >= 3 && mb_strlen($line) <= 50) {
                // If line looks like a person's name (letters and spaces only)
                if (preg_match('/^[-a-zA-Z\s.,\']+$/', $line)) {
                    $name = $line;
                    break;
                }
            }
        }

        // Summary text
        $summary = null;
        if (!empty($sections['SUMMARY'])) {
            $summary = trim($sections['SUMMARY']);
        }

        // Location heuristic
        $location = null;
        if (preg_match('/([A-Za-z\s]+),\s*(Philippines|PH|United States|USA|Singapore|Australia|Canada|UK|Remote)/i', $fullText, $matches)) {
            $location = trim($matches[0]);
        }

        return [
            'full_name' => $name,
            'email' => $email,
            'phone' => $phone,
            'location' => $location,
            'headline' => null,
            'summary' => $summary,
            'review_status' => 'pending_review',
        ];
    }

    /**
     * Extract technical skills and map to categories.
     *
     * @return array<array{name: string, display_name: string, category: string, raw_extracted_text: string, review_status: string}>
     */
    protected function extractSkills(string $fullText, array $sections): array
    {
        $skillsText = ($sections['SKILLS'] ?? '') . "\n" . $fullText;
        $extracted = [];
        $seen = [];

        foreach ($this->skillLexicon as $key => $skillDef) {
            foreach ($skillDef['aliases'] as $alias) {
                // Word boundary check (escaped for special characters like C#, .NET, etc.)
                $escaped = preg_quote($alias, '/');
                $pattern = '/(?<=^|[\s,;:(\/])' . $escaped . '(?=$|[\s,;:)\/.])/i';

                if (preg_match($pattern, $skillsText, $matches)) {
                    if (!isset($seen[$key])) {
                        $seen[$key] = true;
                        $extracted[] = [
                            'name' => strtolower($skillDef['display']),
                            'display_name' => $skillDef['display'],
                            'category' => $skillDef['category'],
                            'raw_extracted_text' => $matches[0],
                            'review_status' => 'pending_review',
                        ];
                    }
                    break;
                }
            }
        }

        return $extracted;
    }

    /**
     * Extract work experience blocks and classify engagement type.
     */
    protected function extractExperience(string $fullText, array $sections): array
    {
        $expText = $sections['EXPERIENCE'] ?? '';
        if (empty($expText)) {
            return [];
        }

        // Split experience blocks by date pattern or double newline
        $blocks = preg_split("/\n{2,}/", trim($expText));
        $experiences = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if (mb_strlen($block) < 15) {
                continue;
            }

            // Look for date pattern (e.g., 2021 - Present, Jan 2020 - Dec 2022, 2019 – 2021)
            $datePattern = '/(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4})\s*[-–—to]+\s*(?:(Present|Current|Now)|(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(\d{4}))/i';

            $startDate = null;
            $endDate = null;
            $isCurrent = false;

            if (preg_match($datePattern, $block, $dMatches)) {
                $startDate = $dMatches[2];
                if (!empty($dMatches[1])) {
                    $startDate = $dMatches[1] . ' ' . $startDate;
                }
                if (!empty($dMatches[3])) {
                    $isCurrent = true;
                    $endDate = 'Present';
                } elseif (!empty($dMatches[5])) {
                    $endDate = $dMatches[5];
                    if (!empty($dMatches[4])) {
                        $endDate = $dMatches[4] . ' ' . $endDate;
                    }
                }
            }

            // First line usually contains Job Title and/or Company
            $lines = array_filter(array_map('trim', explode("\n", $block)));
            $firstLine = reset($lines) ?: 'Position';
            $secondLine = next($lines) ?: '';

            $jobTitle = $firstLine;
            $company = $secondLine ?: 'Organization';

            if (str_contains($firstLine, ' at ') || str_contains($firstLine, ' - ') || str_contains($firstLine, ' | ')) {
                $parts = preg_split('/\s+(?:at|-|\|)\s+/i', $firstLine);
                if (count($parts) >= 2) {
                    $jobTitle = trim($parts[0]);
                    $company = trim($parts[1]);
                }
            }

            // Engagement classification heuristics
            $lowerBlock = strtolower($block);
            $classification = 'employment';

            if (str_contains($lowerBlock, 'freelance') || str_contains($lowerBlock, 'freelancer')) {
                $classification = 'freelance';
            } elseif (str_contains($lowerBlock, 'commission')) {
                $classification = 'commission';
            } elseif (str_contains($lowerBlock, 'contract') || str_contains($lowerBlock, 'contractor')) {
                $classification = 'contract';
            } elseif (str_contains($lowerBlock, 'capstone') || str_contains($lowerBlock, 'academic')) {
                $classification = 'academic_project';
            } elseif (str_contains($lowerBlock, 'personal project') || str_contains($lowerBlock, 'side project')) {
                $classification = 'personal_project';
            }

            // Extract technologies mentioned in block
            $techUsed = [];
            foreach ($this->skillLexicon as $skill) {
                if (preg_match('/\b' . preg_quote($skill['display'], '/') . '\b/i', $block)) {
                    $techUsed[] = $skill['display'];
                }
            }

            $experiences[] = [
                'company_name' => $company,
                'job_title' => $jobTitle,
                'classification' => $classification,
                'is_current' => $isCurrent,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'responsibilities' => $block,
                'technologies_used' => array_values(array_unique($techUsed)),
                'raw_source_text' => $block,
                'review_status' => 'pending_review',
            ];
        }

        return $experiences;
    }

    /**
     * Extract portfolio projects (kept strictly distinct from employment).
     */
    protected function extractProjects(string $fullText, array $sections): array
    {
        $projText = $sections['PROJECTS'] ?? '';
        $projects = [];

        // Known portfolio project names to specifically check for when present in text
        $knownProjects = [
            'Golden Resort Booking System',
            'CashiPay Management System',
            'Sumbong App',
        ];

        // Check for specific named projects if they appear in full text or projects section
        foreach ($knownProjects as $projectName) {
            $escaped = preg_quote($projectName, '/');
            if (preg_match('/(' . $escaped . ')[:\s\n-]*([^\n]+(?:\n[^\n]+){1,4})?/i', $fullText, $pMatches)) {
                $description = isset($pMatches[2]) ? trim($pMatches[2]) : $projectName;

                $tech = [];
                foreach ($this->skillLexicon as $skill) {
                    if (preg_match('/\b' . preg_quote($skill['display'], '/') . '\b/i', $pMatches[0])) {
                        $tech[] = $skill['display'];
                    }
                }

                $projects[] = [
                    'name' => $projectName,
                    'description' => $description,
                    'technologies_used' => array_values(array_unique($tech)),
                    'project_url' => null,
                    'repository_url' => null,
                    'category' => 'personal',
                    'raw_source_text' => trim($pMatches[0]),
                    'review_status' => 'pending_review',
                ];
            }
        }

        // Also parse general items from the PROJECTS section if available
        if (!empty($projText)) {
            $blocks = preg_split("/\n{2,}/", trim($projText));
            foreach ($blocks as $block) {
                $lines = array_filter(array_map('trim', explode("\n", $block)));
                if (empty($lines)) {
                    continue;
                }
                $firstLine = reset($lines);

                // Avoid duplicating already extracted known projects
                $alreadyExtracted = false;
                foreach ($projects as $existing) {
                    if (stripos($firstLine, $existing['name']) !== false) {
                        $alreadyExtracted = true;
                        break;
                    }
                }
                if ($alreadyExtracted) {
                    continue;
                }

                $tech = [];
                foreach ($this->skillLexicon as $skill) {
                    if (preg_match('/\b' . preg_quote($skill['display'], '/') . '\b/i', $block)) {
                        $tech[] = $skill['display'];
                    }
                }

                $projects[] = [
                    'name' => $firstLine,
                    'description' => $block,
                    'technologies_used' => array_values(array_unique($tech)),
                    'project_url' => null,
                    'repository_url' => null,
                    'category' => 'personal',
                    'raw_source_text' => $block,
                    'review_status' => 'pending_review',
                ];
            }
        }

        return $projects;
    }

    /**
     * Extract education records.
     */
    protected function extractEducation(string $fullText, array $sections): array
    {
        $eduText = $sections['EDUCATION'] ?? '';
        if (empty($eduText)) {
            return [];
        }

        $records = [];
        $blocks = preg_split("/\n{2,}/", trim($eduText));

        foreach ($blocks as $block) {
            $lines = array_filter(array_map('trim', explode("\n", $block)));
            if (empty($lines)) {
                continue;
            }

            $institution = reset($lines);
            $qualification = next($lines) ?: null;

            // Date pattern check
            $completionDate = null;
            if (preg_match('/(\d{4})/', $block, $dMatches)) {
                $completionDate = $dMatches[1];
            }

            $field = null;
            if ($qualification && preg_match('/(?:in|of)\s+([A-Za-z\s]+)/i', $qualification, $fMatches)) {
                $field = trim($fMatches[1]);
            }

            $records[] = [
                'institution_name' => $institution,
                'qualification' => $qualification,
                'field_of_study' => $field,
                'start_date' => null,
                'completion_date' => $completionDate,
                'status' => 'graduated',
                'raw_source_text' => $block,
                'review_status' => 'pending_review',
            ];
        }

        return $records;
    }

    /**
     * Extract certifications.
     */
    protected function extractCertifications(string $fullText, array $sections): array
    {
        $certText = $sections['CERTIFICATIONS'] ?? '';
        if (empty($certText)) {
            return [];
        }

        $certs = [];
        $lines = array_filter(array_map('trim', explode("\n", $certText)));

        foreach ($lines as $line) {
            if (mb_strlen($line) < 5) {
                continue;
            }

            $cleanLine = ltrim($line, '-•* ');
            $issuer = null;
            $name = $cleanLine;

            if (preg_match('/^(.*?)(?:\s+by|\s+from|\s+-)\s+(.*?)$/i', $cleanLine, $matches)) {
                $name = trim($matches[1]);
                $issuer = trim($matches[2]);
            }

            $certs[] = [
                'name' => $name,
                'issuing_organization' => $issuer,
                'issue_date' => null,
                'expiration_date' => null,
                'credential_id' => null,
                'credential_url' => null,
                'raw_source_text' => $line,
                'review_status' => 'pending_review',
            ];
        }

        return $certs;
    }
}
