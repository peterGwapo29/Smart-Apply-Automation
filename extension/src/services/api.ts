import { HealthResponse, JobCheckResponse } from '../types';

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
