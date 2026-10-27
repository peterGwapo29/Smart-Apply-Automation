export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  database?: string;
  message?: string;
}

export function getApiBaseUrl(): string {
  // If running in browser, use public env var; if on server, use internal or public
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
  }
  return process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
}

export async function fetchHealthStatus(includeDb: boolean = false): Promise<HealthCheckResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/health${includeDb ? '?include_db=1' : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API responded with HTTP status ${response.status}`);
  }

  return response.json();
}
