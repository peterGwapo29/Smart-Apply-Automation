export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  database?: string;
  message?: string;
}

export interface ResumeRecord {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
  content_hash: string;
  is_active: boolean;
  processing_status: 'uploaded' | 'parsing' | 'parsed' | 'confirmed' | 'failed';
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedSkill {
  name: string;
  display_name: string;
  category: 'backend' | 'frontend' | 'database' | 'tools' | 'other';
  raw_extracted_text?: string;
  review_status: 'pending_review' | 'confirmed' | 'corrected' | 'rejected';
}

export interface ExtractedExperience {
  company_name: string;
  job_title: string;
  classification: 'employment' | 'freelance' | 'commission' | 'contract' | 'personal_project' | 'academic_project' | 'other';
  is_current: boolean;
  start_date?: string | null;
  end_date?: string | null;
  responsibilities?: string | null;
  technologies_used: string[];
  raw_source_text?: string | null;
  review_status: 'pending_review' | 'confirmed' | 'corrected' | 'rejected';
}

export interface ExtractedProject {
  name: string;
  description?: string | null;
  technologies_used: string[];
  project_url?: string | null;
  repository_url?: string | null;
  category: 'personal' | 'academic' | 'freelance_client' | 'other';
  raw_source_text?: string | null;
  review_status: 'pending_review' | 'confirmed' | 'corrected' | 'rejected';
}

export interface ExtractedEducation {
  institution_name: string;
  qualification?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  status: 'graduated' | 'in_progress' | 'incomplete' | 'other';
  raw_source_text?: string | null;
  review_status: 'pending_review' | 'confirmed' | 'corrected' | 'rejected';
}

export interface ExtractedCertification {
  name: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
  raw_source_text?: string | null;
  review_status: 'pending_review' | 'confirmed' | 'corrected' | 'rejected';
}

export interface ProposedProfile {
  basic_info: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    headline?: string | null;
    summary?: string | null;
    review_status?: string;
  };
  skills: ExtractedSkill[];
  work_experiences: ExtractedExperience[];
  portfolio_projects: ExtractedProject[];
  education: ExtractedEducation[];
  certifications: ExtractedCertification[];
}

export interface SkillItemRecord {
  id: number;
  skill_id: number;
  name: string;
  display_name: string;
  category: string;
  raw_extracted_text?: string;
  review_status: string;
}

export interface WorkExperienceRecord {
  id: number;
  candidate_profile_id: number;
  resume_id?: number | null;
  company_name: string;
  job_title: string;
  classification: string;
  is_current: boolean;
  start_date?: string | null;
  end_date?: string | null;
  responsibilities?: string | null;
  technologies_used?: string[];
  review_status: string;
}

export interface PortfolioProjectRecord {
  id: number;
  candidate_profile_id: number;
  resume_id?: number | null;
  name: string;
  description?: string | null;
  technologies_used?: string[];
  project_url?: string | null;
  repository_url?: string | null;
  category: string;
  review_status: string;
}

export interface EducationRecordItem {
  id: number;
  candidate_profile_id: number;
  resume_id?: number | null;
  institution_name: string;
  qualification?: string | null;
  field_of_study?: string | null;
  completion_date?: string | null;
  status: string;
  review_status: string;
}

export interface CertificationRecordItem {
  id: number;
  candidate_profile_id: number;
  resume_id?: number | null;
  name: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
  review_status: string;
}

export interface CandidateProfileData {
  profile: {
    id: number;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    headline?: string | null;
    summary?: string | null;
    created_at: string;
    updated_at: string;
  };
  active_resume?: ResumeRecord | null;
  skills: {
    backend: SkillItemRecord[];
    frontend: SkillItemRecord[];
    database: SkillItemRecord[];
    tools: SkillItemRecord[];
    other: SkillItemRecord[];
  };
  all_skills: SkillItemRecord[];
  work_experiences: WorkExperienceRecord[];
  portfolio_projects: PortfolioProjectRecord[];
  education: EducationRecordItem[];
  certifications: CertificationRecordItem[];
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
  }
  return process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...customHeaders,
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('api_token') || process.env.NEXT_PUBLIC_API_TOKEN;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

export async function fetchHealthStatus(includeDb: boolean = false): Promise<HealthCheckResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/health${includeDb ? '?include_db=1' : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API responded with HTTP status ${response.status}`);
  }

  return response.json();
}

export async function uploadResume(file: File): Promise<{ status: string; resume: ResumeRecord; proposed_profile: ProposedProfile }> {
  const baseUrl = getApiBaseUrl();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${baseUrl}/resumes`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to upload resume.');
  }

  return data;
}

export async function getResumes(): Promise<ResumeRecord[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/resumes`, {
    method: 'GET',
    headers: getHeaders(),
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch resumes.');
  }

  return data.resumes || [];
}

export async function getResume(id: number | string): Promise<{ resume: ResumeRecord; proposed_profile: ProposedProfile }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/resumes/${id}`, {
    method: 'GET',
    headers: getHeaders(),
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch resume.');
  }

  return data;
}

export async function confirmResume(id: number | string, payload: ProposedProfile): Promise<{ status: string; message: string; resume_id: number }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/resumes/${id}/confirm`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to confirm resume profile.');
  }

  return data;
}

export async function getCandidateProfile(): Promise<CandidateProfileData> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile`, {
    method: 'GET',
    headers: getHeaders(),
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch candidate profile.');
  }

  return data;
}

export async function updateCandidateProfile(basicInfo: Partial<CandidateProfileData['profile']>): Promise<CandidateProfileData['profile']> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(basicInfo),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update candidate profile.');
  }

  return data.profile;
}

export async function addCandidateSkill(displayName: string, category: string): Promise<SkillItemRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile/skills`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ display_name: displayName, category }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to add skill.');
  }

  return data.skill;
}

export async function deleteCandidateSkill(id: number): Promise<{ status: string; message: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile/skills/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete skill.');
  }

  return data;
}

export async function deleteCandidateExperience(id: number): Promise<{ status: string; message: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile/experiences/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete experience.');
  }

  return data;
}

export async function deleteCandidateProject(id: number): Promise<{ status: string; message: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete project.');
  }

  return data;
}


export interface JobListingHistoryRecord {
  id: number;
  job_listing_id: number;
  event_type: 'created' | 'observed' | 'manual_edit' | 'status_change';
  changed_fields: Record<string, unknown> | null;
  created_at: string;
}

export type ReviewWorkflowStatus = 'new' | 'review_required' | 'saved' | 'interested' | 'not_interested' | 'archived';

export interface JobUserWorkflowRecord {
  id: number;
  user_id: number;
  job_listing_id: number;
  review_status: ReviewWorkflowStatus;
  is_bookmarked: boolean;
  notes: string | null;
  reviewed_at: string | null;
  last_reviewed_content_hash: string | null;
  last_reviewed_match_score: string | number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total: number;
  new: number;
  strong_matches: number;
  review_required: number;
  bookmarked: number;
  reviewed: number;
  not_interested: number;
  disqualified: number;
  min_match_threshold: number;
}

export interface DashboardSummaryResponse {
  status: string;
  summary: DashboardSummary;
}

export interface JobListingRecord {
  id: number;
  user_id: number;
  source_platform: string;
  source_job_id: string | null;
  canonical_url: string;
  title: string;
  company_name: string | null;
  location: string | null;
  description: string | null;
  responsibilities: string[] | null;
  required_qualifications: string[] | null;
  preferred_qualifications: string[] | null;
  salary_min: string | number | null;
  salary_max: string | number | null;
  salary_currency: string | null;
  salary_raw: string | null;
  employment_type: string | null;
  application_method: string;
  quick_apply_status: 'available' | 'unavailable' | 'unknown' | 'requires_review';
  retrieval_method: string;
  first_detected_at: string;
  last_observed_at: string;
  last_extracted_at: string | null;
  extraction_status: string;
  content_hash: string;
  review_status: string;
  effective_review_status?: ReviewWorkflowStatus;
  is_bookmarked?: boolean;
  is_match_stale?: boolean;
  listing_changed_since_review?: boolean;
  workflow?: JobUserWorkflowRecord | null;
  created_at: string;
  updated_at: string;
  histories?: JobListingHistoryRecord[];
  latest_match?: JobMatchRecord | null;
}

export interface ImportJobPayload {
  canonical_url?: string;
  url?: string;
  title: string;
  company_name?: string;
  location?: string;
  description?: string;
  responsibilities?: string[];
  required_qualifications?: string[];
  preferred_qualifications?: string[];
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_raw?: string;
  employment_type?: string;
  application_method?: string;
  quick_apply_status?: 'available' | 'unavailable' | 'unknown' | 'requires_review';
  retrieval_method?: string;
  review_status?: 'pending_review' | 'confirmed' | 'rejected';
}

export interface JobListingsResponse {
  status: string;
  data: JobListingRecord[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  counts: {
    total: number;
    quick_apply_available: number;
    quick_apply_unavailable: number;
    quick_apply_unknown: number;
    requires_review: number;
  };
}

export interface CheckJobUrlResponse {
  status: string;
  exists: boolean;
  canonical_url: string;
  source_platform: string;
  source_job_id: string | null;
  job: JobListingRecord | null;
}

export interface JobListingsQueryParams {
  tab?: 'all' | 'strong_matches' | 'review_queue' | 'bookmarked' | 'interested' | 'archived';
  search?: string;
  technology?: string;
  company?: string;
  location?: string;
  work_arrangement?: string;
  quick_apply_status?: string;
  review_status?: string;
  is_bookmarked?: boolean;
  is_reviewed?: boolean;
  min_salary?: number;
  max_salary?: number;
  min_score?: number;
  max_score?: number;
  eligibility?: string;
  is_changed?: boolean;
  is_stale?: boolean;
  sort_by?: 'newest' | 'highest_match' | 'lowest_match' | 'salary_high' | 'updated' | 'recently_reviewed' | 'unreviewed_first';
  page?: number;
  per_page?: number;
}

export async function getJobListings(params?: JobListingsQueryParams): Promise<JobListingsResponse> {
  const baseUrl = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params?.tab) query.append('tab', params.tab);
  if (params?.search) query.append('search', params.search);
  if (params?.technology) query.append('technology', params.technology);
  if (params?.company) query.append('company', params.company);
  if (params?.location) query.append('location', params.location);
  if (params?.work_arrangement) query.append('work_arrangement', params.work_arrangement);
  if (params?.quick_apply_status) query.append('quick_apply_status', params.quick_apply_status);
  if (params?.review_status) query.append('review_status', params.review_status);
  if (params?.is_bookmarked !== undefined) query.append('is_bookmarked', String(params.is_bookmarked));
  if (params?.is_reviewed !== undefined) query.append('is_reviewed', String(params.is_reviewed));
  if (params?.min_salary !== undefined) query.append('min_salary', String(params.min_salary));
  if (params?.max_salary !== undefined) query.append('max_salary', String(params.max_salary));
  if (params?.min_score !== undefined) query.append('min_score', String(params.min_score));
  if (params?.max_score !== undefined) query.append('max_score', String(params.max_score));
  if (params?.eligibility) query.append('eligibility', params.eligibility);
  if (params?.is_changed !== undefined) query.append('is_changed', String(params.is_changed));
  if (params?.is_stale !== undefined) query.append('is_stale', String(params.is_stale));
  if (params?.sort_by) query.append('sort_by', params.sort_by);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.per_page) query.append('per_page', params.per_page.toString());

  const url = `${baseUrl}/jobs${query.toString() ? '?' + query.toString() : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch job listings.');
  }

  return data;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/dashboard-summary`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch dashboard summary.');
  }

  return data.summary;
}

export async function updateJobReview(
  jobId: number,
  payload: { review_status: ReviewWorkflowStatus; notes?: string }
): Promise<{ status: string; message: string; workflow: JobUserWorkflowRecord }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${jobId}/review`, {
    method: 'PATCH',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update job review status.');
  }

  return data;
}

export async function bookmarkJob(jobId: number): Promise<{ status: string; workflow: JobUserWorkflowRecord }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${jobId}/bookmark`, {
    method: 'POST',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to bookmark job.');
  }

  return data;
}

export async function unbookmarkJob(jobId: number): Promise<{ status: string; workflow: JobUserWorkflowRecord }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${jobId}/bookmark`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to unbookmark job.');
  }

  return data;
}

export async function getJobListing(id: number): Promise<JobListingRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch job listing details.');
  }

  return data.job;
}

export async function importJob(payload: ImportJobPayload): Promise<{
  status: string;
  is_duplicate: boolean;
  message: string;
  job: JobListingRecord;
}> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/import`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to import job listing.');
  }

  return data;
}

export async function updateJobListing(
  id: number,
  payload: Partial<JobListingRecord>
): Promise<JobListingRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${id}`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update job listing.');
  }

  return data.job;
}

export async function deleteJobListing(id: number): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete job listing.');
  }
}

export async function checkJobUrl(url: string): Promise<CheckJobUrlResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/check?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to check URL.');
  }

  return data;
}


export interface CandidatePreferences {
  id: number;
  candidate_profile_id: number;
  work_arrangements: string[];
  employment_types: string[];
  preferred_locations: string[];
  min_salary: string | number | null;
  preferred_salary: string | number | null;
  salary_currency: string;
  salary_period: string;
  notice_period_weeks: number;
  min_match_threshold?: number | string | null;
  hard_disqualifiers: Record<string, boolean> | null;
}

export interface JobMatchRecord {
  id: number;
  user_id: number;
  candidate_profile_id: number;
  job_listing_id: number;
  overall_score: number | string;
  technical_score: number | string;
  experience_score: number | string;
  responsibilities_score: number | string;
  work_arrangement_score: number | string;
  salary_score: number | string;
  eligibility_status: 'eligible' | 'disqualified' | 'requires_review';
  eligibility_evaluations: Record<string, { status: string; reason: string; details?: Record<string, unknown> }> | null;
  score_breakdown: Record<string, unknown> | null;
  matched_skills: {
    exact: string[];
    related: string[];
    missing_required: string[];
    missing_preferred: string[];
  } | null;
  matched_responsibilities: Array<{
    duty: string;
    evidence: string;
    credit: number;
  }> | null;
  disqualification_reasons: string[] | null;
  semantic_analysis: {
    provider: string;
    is_external_ai: boolean;
    concept_matches?: Array<{ concept: string; confidence: number; evidence: string[] }>;
    transferable_insights?: Array<{ concept: string; status: string; suggestion: string }>;
    summary?: string;
  } | null;
  scoring_version: string;
  calculated_at: string;
  job_listing?: JobListingRecord;
}

export async function getCandidatePreferences(): Promise<CandidatePreferences> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile/preferences`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch candidate preferences.');
  }

  return data.preferences;
}

export async function updateCandidatePreferences(
  payload: Partial<CandidatePreferences>
): Promise<CandidatePreferences> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/candidate-profile/preferences`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update candidate preferences.');
  }

  return data.preferences;
}

export async function calculateJobMatch(jobId: number): Promise<JobMatchRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${jobId}/match`, {
    method: 'POST',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to calculate job match score.');
  }

  return data.match;
}

export async function getJobMatch(jobId: number): Promise<JobMatchRecord> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/${jobId}/match`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch job match score.');
  }

  return data.match;
}

export async function calculateAllJobMatches(): Promise<{
  total_matched: number;
  average_score: number;
}> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/jobs/match-all`, {
    method: 'POST',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to run batch matching.');
  }

  return data.data;
}
