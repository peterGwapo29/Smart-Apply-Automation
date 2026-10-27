<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Scoring Weights
    |--------------------------------------------------------------------------
    |
    | Default weight distribution across the 5 evaluation factors (Total = 100).
    |
    */
    'weights' => [
        'technical_skills' => 40.0,
        'experience_seniority' => 25.0,
        'job_responsibilities' => 15.0,
        'work_arrangement' => 10.0,
        'salary_preferences' => 10.0,
    ],

    /*
    |--------------------------------------------------------------------------
    | Technical Skills Subweights
    |--------------------------------------------------------------------------
    |
    | Subweights applied within the technical skills component.
    |
    */
    'skills_subweights' => [
        'required' => 0.75, // 75% of technical_skills weight
        'preferred' => 0.25, // 25% of technical_skills weight
    ],

    /*
    |--------------------------------------------------------------------------
    | Skill Credit Scores
    |--------------------------------------------------------------------------
    |
    | Credit granted based on evidence match quality.
    |
    */
    'skill_credits' => [
        'exact' => 1.0,
        'alias' => 1.0,
        'related' => 0.5,
        'unmatched' => 0.0,
    ],

    /*
    |--------------------------------------------------------------------------
    | Related Technologies Mapping
    |--------------------------------------------------------------------------
    |
    | Explicit relationships where partial credit (0.5) is documented.
    |
    */
    'related_technologies' => [
        'react' => ['nextjs', 'reactjs', 'javascript', 'typescript', 'redux'],
        'nextjs' => ['react', 'typescript', 'javascript', 'nodejs'],
        'vue' => ['nuxt', 'javascript', 'typescript'],
        'angular' => ['typescript', 'javascript'],
        'php' => ['laravel', 'codeigniter', 'symfony'],
        'laravel' => ['php', 'restapi', 'mysql', 'blade'],
        'nodejs' => ['express', 'javascript', 'typescript', 'restapi'],
        'express' => ['nodejs', 'javascript', 'restapi'],
        'python' => ['django', 'fastapi', 'flask'],
        'django' => ['python', 'restapi'],
        'mysql' => ['mariadb', 'sql', 'postgresql', 'sqlite'],
        'mariadb' => ['mysql', 'sql'],
        'postgresql' => ['sql', 'mysql'],
        'sqlite' => ['sql', 'mysql'],
        'mongodb' => ['nosql', 'firebase'],
        'firebase' => ['supabase', 'nosql', 'mongodb'],
        'supabase' => ['firebase', 'postgresql', 'sql'],
        'css' => ['tailwind', 'bootstrap', 'sass'],
        'tailwind' => ['css', 'html'],
        'html' => ['css', 'web'],
        'typescript' => ['javascript'],
        'javascript' => ['typescript'],
        'docker' => ['kubernetes', 'linux', 'ci/cd', 'devops'],
        'aws' => ['cloud', 'devops', 'linux', 'docker'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Seniority Thresholds (in years of professional experience)
    |--------------------------------------------------------------------------
    */
    'seniority_years' => [
        'intern' => 0.0,
        'junior' => 1.0,
        'mid' => 3.0,
        'senior' => 5.0,
        'lead' => 7.0,
        'principal' => 9.0,
        'architect' => 10.0,
    ],

    /*
    |--------------------------------------------------------------------------
    | Scoring Version
    |--------------------------------------------------------------------------
    */
    'version' => '1.0.0',
];
