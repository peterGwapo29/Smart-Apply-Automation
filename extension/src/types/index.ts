export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  database?: string;
  message?: string;
}

export type ConnectionState = 'idle' | 'loading' | 'success' | 'error';

export interface JobCheckResponse {
  status: string;
  exists: boolean;
  canonical_url: string;
  source_platform: string;
  source_job_id: string | null;
  job: {
    id: number;
    title: string;
    company_name: string | null;
    quick_apply_status: 'available' | 'unavailable' | 'unknown' | 'requires_review';
    last_observed_at: string;
    effective_review_status?: string;
    is_bookmarked?: boolean;
    is_match_stale?: boolean;
    listing_changed_since_review?: boolean;
    workflow?: {
      id: number;
      review_status: string;
      is_bookmarked: boolean;
      notes: string | null;
    } | null;
    application?: {
      id: number;
      status: string;
      attempt_count: number;
      max_retries: number;
    } | null;
    latest_match?: {
      overall_score: number | string;
      eligibility_status: 'eligible' | 'disqualified' | 'requires_review';
      technical_score: number | string;
    } | null;
  } | null;
}

export interface ActiveTabDetection {
  isJobStreet: boolean;
  isListingPage: boolean;
  url: string;
  jobId: string | null;
}
