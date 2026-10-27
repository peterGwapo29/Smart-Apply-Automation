<?php

namespace App\Services\Matching;

use App\Services\Contracts\SemanticAnalysisProviderInterface;

class LocalDeterministicSemanticProvider implements SemanticAnalysisProviderInterface
{
    /**
     * Common technical domain synonym taxonomies.
     *
     * @var array<string, array<string>>
     */
    protected array $domainTaxonomy = [
        'api_development' => ['rest api', 'restful api', 'api development', 'web services', 'endpoints', 'graphql', 'json api'],
        'database_design' => ['database design', 'schema design', 'sql queries', 'query optimization', 'data modeling', 'migrations'],
        'frontend_ui' => ['frontend', 'user interface', 'ui components', 'responsive design', 'single page application', 'spa'],
        'state_management' => ['state management', 'redux', 'context api', 'pinia', 'vuex'],
        'testing_qa' => ['unit testing', 'feature testing', 'integration testing', 'pest', 'phpunit', 'automated testing', 'qa'],
        'devops_cicd' => ['ci/cd', 'docker', 'containerization', 'pipelines', 'deployment', 'github actions', 'cloud deployment'],
        'auth_security' => ['authentication', 'authorization', 'sanctum', 'jwt', 'oauth', 'security best practices', 'rbac'],
    ];

    /**
     * @param array<string, mixed> $jobRequirements
     * @param array<string, mixed> $candidateEvidence
     * @return array<string, mixed>
     */
    public function analyzeOverlap(array $jobRequirements, array $candidateEvidence): array
    {
        $duties = $jobRequirements['responsibilities'] ?? [];
        $qualifications = array_merge(
            $jobRequirements['required_qualifications'] ?? [],
            $jobRequirements['preferred_qualifications'] ?? []
        );

        $experiences = $candidateEvidence['experiences'] ?? [];
        $projects = $candidateEvidence['projects'] ?? [];

        $conceptMatches = [];
        $transferableInsights = [];

        // Check domain concept overlap
        foreach ($this->domainTaxonomy as $domainKey => $synonyms) {
            $jobMentioned = false;
            $candidateMentioned = false;
            $evidenceFound = [];

            // Check if job mentions this domain
            foreach (array_merge($duties, $qualifications) as $reqText) {
                $reqLower = mb_strtolower($reqText);
                foreach ($synonyms as $syn) {
                    if (str_contains($reqLower, $syn)) {
                        $jobMentioned = true;
                        break 2;
                    }
                }
            }

            if (!$jobMentioned) {
                continue;
            }

            // Check if candidate evidence mentions this domain
            foreach ($experiences as $exp) {
                $expText = mb_strtolower(($exp['responsibilities'] ?? '') . ' ' . implode(' ', $exp['technologies_used'] ?? []));
                foreach ($synonyms as $syn) {
                    if (str_contains($expText, $syn)) {
                        $candidateMentioned = true;
                        $evidenceFound[] = "Experience at {$exp['company_name']}: mentions '{$syn}'";
                        break;
                    }
                }
            }

            foreach ($projects as $proj) {
                $projText = mb_strtolower(($proj['description'] ?? '') . ' ' . implode(' ', $proj['technologies_used'] ?? []));
                foreach ($synonyms as $syn) {
                    if (str_contains($projText, $syn)) {
                        $candidateMentioned = true;
                        $evidenceFound[] = "Project '{$proj['name']}': demonstrates '{$syn}'";
                        break;
                    }
                }
            }

            if ($candidateMentioned) {
                $conceptMatches[] = [
                    'concept' => str_replace('_', ' ', ucfirst($domainKey)),
                    'confidence' => 0.85,
                    'evidence' => array_unique($evidenceFound),
                ];
            } else {
                $transferableInsights[] = [
                    'concept' => str_replace('_', ' ', ucfirst($domainKey)),
                    'status' => 'missing_direct_evidence',
                    'suggestion' => 'Consider highlighting practical experience in ' . str_replace('_', ' ', $domainKey),
                ];
            }
        }

        return [
            'provider' => 'local_deterministic',
            'is_external_ai' => false,
            'concept_matches' => $conceptMatches,
            'transferable_insights' => $transferableInsights,
            'summary' => count($conceptMatches) . ' technical domain competencies corroborated by candidate portfolio & experience.',
        ];
    }
}
