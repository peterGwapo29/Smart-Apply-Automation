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
