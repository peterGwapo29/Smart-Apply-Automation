import { HealthResponse, JobCheckResponse, RevalidateResponse, ExecutionWorkspaceResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export async function checkApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API responded with HTTP status ${response.status}`);
  }

  return response.json();
}

export async function checkJobListing(url: string): Promise<JobCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs/check?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API responded with HTTP status ${response.status}`);
  }

  return response.json();
}

export async function bookmarkJob(jobId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/bookmark`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to bookmark job (${response.status})`);
  }
}

export async function unbookmarkJob(jobId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/bookmark`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to unbookmark job (${response.status})`);
  }
}

export async function updateJobReview(jobId: number, reviewStatus: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/review`, {
    method: 'PATCH',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ review_status: reviewStatus }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update review status (${response.status})`);
  }
}

export async function createApplication(jobId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_listing_id: jobId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to initialize application (${response.status})`);
  }
}

// Phase 10: Execution, Assistance & Active Validation
export async function revalidateJobListing(jobId: number, forceFresh: boolean = false): Promise<RevalidateResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/revalidate`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force_fresh: forceFresh }),
  });

  if (!response.ok) {
    throw new Error(`Failed to revalidate job availability (${response.status})`);
  }

  return response.json();
}

export async function getApplicationExecutionWorkspace(applicationId: number): Promise<ExecutionWorkspaceResponse> {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/execution-workspace`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch execution workspace (${response.status})`);
  }

  return response.json();
}

export async function authorizeApplicationExecution(applicationId: number): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/authorize-execution`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to authorize application execution (${response.status})`);
  }

  return response.json();
}

export async function verifyApplicationSubmission(
  applicationId: number,
  payload: {
    verification_level: 'platform_confirmed' | 'user_confirmed' | 'ambiguous' | 'failed';
    evidence_type?: string;
    evidence_note?: string;
  }
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/verify-submission`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to verify submission (${response.status})`);
  }

  return response.json();
}
