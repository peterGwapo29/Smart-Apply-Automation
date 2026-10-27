import React, { useState, useEffect } from 'react';
import { checkApiHealth, checkJobListing, bookmarkJob, unbookmarkJob, updateJobReview } from '../services/api';
import { detectActiveTabListing } from '../services/tabDetector';
import { ConnectionState, HealthResponse, ActiveTabDetection, JobCheckResponse } from '../types';

export const App: React.FC = () => {
  const [activeTabNav, setActiveTabNav] = useState<'detector' | 'health'>('detector');

  // Health state
  const [state, setState] = useState<ConnectionState>('idle');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab detection state
  const [tabInfo, setTabInfo] = useState<ActiveTabDetection | null>(null);
  const [checkingListing, setCheckingListing] = useState(false);
  const [listingMatch, setListingMatch] = useState<JobCheckResponse | null>(null);

  // Workflow states in popup
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [reviewStatus, setReviewStatus] = useState<string>('new');
  const [workflowBusy, setWorkflowBusy] = useState<boolean>(false);
  const [workflowFeedback, setWorkflowFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function inspectActiveTab() {
      try {
        const info = await detectActiveTabListing();
        setTabInfo(info);

        if (info.isListingPage && info.url) {
          setCheckingListing(true);
          try {
            const match = await checkJobListing(info.url);
            setListingMatch(match);
            if (match.exists && match.job) {
              setIsBookmarked(Boolean(match.job.is_bookmarked ?? match.job.workflow?.is_bookmarked));
              setReviewStatus(match.job.effective_review_status ?? match.job.workflow?.review_status ?? 'new');
            }
          } catch {
            // Non-blocking check failure
          } finally {
            setCheckingListing(false);
          }
        }
      } catch {
        // Tab inspection fallback
      }
    }

    inspectActiveTab();
  }, []);

  const handleTestConnection = async () => {
    setState('loading');
    setErrorMsg(null);
    try {
      const result = await checkApiHealth();
      setHealthData(result);
      setState('success');
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reach API server');
    }
  };

  const handleToggleBookmark = async () => {
    if (!listingMatch?.job?.id) return;
    try {
      setWorkflowBusy(true);
      if (isBookmarked) {
        await unbookmarkJob(listingMatch.job.id);
        setIsBookmarked(false);
        setWorkflowFeedback('Bookmark removed');
      } else {
        await bookmarkJob(listingMatch.job.id);
        setIsBookmarked(true);
        setWorkflowFeedback('Job bookmarked ⭐');
      }
      setTimeout(() => setWorkflowFeedback(null), 2500);
    } catch (err: unknown) {
      setWorkflowFeedback(err instanceof Error ? err.message : 'Bookmark failed');
    } finally {
      setWorkflowBusy(false);
    }
  };

  const handleUpdateReviewStatus = async (status: string) => {
    if (!listingMatch?.job?.id) return;
    try {
      setWorkflowBusy(true);
      await updateJobReview(listingMatch.job.id, status);
      setReviewStatus(status);
      setWorkflowFeedback(`Review: ${status.replace('_', ' ')}`);
      setTimeout(() => setWorkflowFeedback(null), 2500);
    } catch (err: unknown) {
      setWorkflowFeedback(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setWorkflowBusy(false);
    }
  };

  const handleOpenDashboardImport = () => {
    const targetUrl = tabInfo?.url
      ? `http://localhost:3000/jobs/import?url=${encodeURIComponent(tabInfo.url)}`
      : 'http://localhost:3000/jobs/import';

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const handleOpenDashboardDetail = (jobId: number) => {
    const targetUrl = `http://localhost:3000/jobs/${jobId}`;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const handleOpenReviewQueue = () => {
    const targetUrl = 'http://localhost:3000/jobs?tab=review_queue';
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const handleOpenDashboardJobs = () => {
    const targetUrl = 'http://localhost:3000/jobs';
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const renderQuickApplyBadge = (status?: string) => {
    switch (status) {
      case 'available':
        return <span className="badge-tag badge-emerald">Quick Apply Ready</span>;
      case 'unavailable':
        return <span className="badge-tag badge-rose">External Portal</span>;
      case 'requires_review':
        return <span className="badge-tag badge-amber">Requires Review</span>;
      default:
        return <span className="badge-tag badge-slate">Status: {status || 'Unknown'}</span>;
    }
  };

  const renderMatchBadge = (matchObj?: NonNullable<JobCheckResponse['job']>['latest_match']) => {
    if (!matchObj) return null;
    const score = Number(matchObj.overall_score);
    const badgeClass = score >= 75 ? 'badge-emerald' : score >= 50 ? 'badge-amber' : 'badge-slate';
    return (
      <span className={`badge-tag ${badgeClass}`}>
        ★ {score}% Match • {matchObj.eligibility_status.replace('_', ' ')}
      </span>
    );
  };

  const renderPriorityBadge = (matchObj?: NonNullable<JobCheckResponse['job']>['latest_match']) => {
    if (!matchObj || !matchObj.priority_tier) return null;
    const tier = matchObj.priority_tier;
    const score = matchObj.priority_score !== undefined && matchObj.priority_score !== null ? Math.round(Number(matchObj.priority_score)) : null;
    let badgeClass = 'badge-slate';
    let label = `Priority: ${tier.replace('_', ' ')}`;
    if (tier === 'top_priority') {
      badgeClass = 'badge-emerald';
      label = `⭐ Top Priority ${score !== null ? `(${score})` : ''}`;
    } else if (tier === 'high_priority') {
      badgeClass = 'badge-emerald';
      label = `🔥 High Priority ${score !== null ? `(${score})` : ''}`;
    } else if (tier === 'medium_priority') {
      badgeClass = 'badge-slate';
      label = `Medium Priority ${score !== null ? `(${score})` : ''}`;
    } else if (tier === 'requires_review') {
      badgeClass = 'badge-amber';
      label = `⚠️ Needs Review ${score !== null ? `(${score})` : ''}`;
    } else if (tier === 'not_recommended') {
      badgeClass = 'badge-rose';
      label = '⛔ Not Recommended';
    }
    return <span className={`badge-tag ${badgeClass}`}>{label}</span>;
  };

  const renderApplicationBadge = (status?: string) => {
    if (!status) return null;
    let badgeClass = 'badge-slate';
    let label = `App: ${status.replace('_', ' ')}`;
    if (status === 'ready') {
      badgeClass = 'badge-emerald';
      label = '✓ Materials Ready';
    }
    if (status === 'queued' || status === 'preparing') badgeClass = 'badge-slate';
    if (status === 'needs_review') badgeClass = 'badge-amber';
    if (status === 'failed') badgeClass = 'badge-rose';
    if (status === 'submitted') badgeClass = 'badge-emerald';
    return (
      <span className={`badge-tag ${badgeClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div>
          <h1 className="popup-title">JobStreet Quick Apply</h1>
          <span className="popup-badge">Manifest V3 • Phase 9</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTabNav === 'detector' ? 'active' : ''}`}
          onClick={() => setActiveTabNav('detector')}
        >
          Listing & Triage
        </button>
        <button
          className={`tab-btn ${activeTabNav === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTabNav('health')}
        >
          System Health
        </button>
      </div>

      {activeTabNav === 'detector' && (
        <div>
          <div className="status-card">
            <div className="status-label">Active Browser Tab</div>

            {checkingListing ? (
              <div className="status-details">Inspecting active tab & computing match...</div>
            ) : tabInfo?.isListingPage ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    JobStreet Listing #{tabInfo.jobId}
                  </span>
                  {listingMatch?.exists && renderQuickApplyBadge(listingMatch.job?.quick_apply_status)}
                </div>

                {listingMatch?.exists && listingMatch.job ? (
                  <div className="status-details">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', flex: 1 }}>{listingMatch.job.title}</div>
                      <button
                        onClick={handleToggleBookmark}
                        disabled={workflowBusy}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 16,
                          padding: '0 2px',
                        }}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                      >
                        {isBookmarked ? '⭐' : '☆'}
                      </button>
                    </div>

                    {listingMatch.job.company_name && <div>{listingMatch.job.company_name}</div>}

                    {listingMatch.job.latest_match ? (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                        {renderMatchBadge(listingMatch.job.latest_match)}
                        {renderPriorityBadge(listingMatch.job.latest_match)}
                        {renderApplicationBadge(listingMatch.job.application?.status)}
                      </div>
                    ) : (
                      <div style={{ color: '#2563eb', marginTop: 4, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✓ Saved (Match score ready to calculate)</span>
                        {renderApplicationBadge(listingMatch.job.application?.status)}
                      </div>
                    )}

                    {/* Stale or Changed flags */}
                    {listingMatch.job.listing_changed_since_review && (
                      <div style={{ marginTop: 6 }}>
                        <span className="badge-tag badge-amber">⚠ Listing changed since review</span>
                      </div>
                    )}
                    {listingMatch.job.is_match_stale && (
                      <div style={{ marginTop: 4 }}>
                        <span className="badge-tag badge-slate">🔄 Match score outdated</span>
                      </div>
                    )}

                    {/* Quick Review Status Selector */}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Triage Decision:</span>
                      <select
                        value={reviewStatus}
                        disabled={workflowBusy}
                        onChange={(e) => handleUpdateReviewStatus(e.target.value)}
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      >
                        <option value="new">New</option>
                        <option value="interested">Interested</option>
                        <option value="saved">Saved</option>
                        <option value="review_required">Needs Review</option>
                        <option value="not_interested">Not Interested</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    {workflowFeedback && (
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
                        {workflowFeedback}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="status-details">
                    Listing detected! Ready for user-assisted ingestion.
                  </div>
                )}
              </div>
            ) : tabInfo?.isJobStreet ? (
              <div className="status-details">
                On JobStreet. Navigate to any job post to inspect candidate match and Quick Apply status.
              </div>
            ) : (
              <div className="status-details">
                Active tab is not a JobStreet listing. Open a job on JobStreet to inspect.
              </div>
            )}
          </div>

          {tabInfo?.isListingPage && listingMatch?.exists && listingMatch.job ? (
            <div>
              <button
                className="action-button"
                onClick={() => handleOpenDashboardDetail(listingMatch.job!.id)}
              >
                {listingMatch.job.application ? 'Open Application Workspace' : 'View Match Breakdown'}
              </button>
              <button
                className="secondary-button"
                onClick={handleOpenReviewQueue}
              >
                📋 Open Review Queue in Dashboard
              </button>
            </div>
          ) : tabInfo?.isListingPage ? (
            <button
              className="action-button"
              onClick={handleOpenDashboardImport}
            >
              Import Listing to Dashboard
            </button>
          ) : (
            <div>
              <button
                className="action-button"
                onClick={handleOpenDashboardJobs}
              >
                Open Job Listings Dashboard
              </button>
              <button
                className="secondary-button"
                onClick={handleOpenReviewQueue}
              >
                📋 Open Review Queue
              </button>
            </div>
          )}
        </div>
      )}

      {activeTabNav === 'health' && (
        <div>
          <div className="status-card">
            <div className="status-label">Backend API Status</div>
            <div className="status-value">
              <span className={`status-indicator ${state}`} />
              <span>
                {state === 'idle' && 'Not checked'}
                {state === 'loading' && 'Checking connection...'}
                {state === 'success' && 'Connected'}
                {state === 'error' && 'Connection Failed'}
              </span>
            </div>

            {state === 'success' && healthData && (
              <div className="status-details">
                <div><strong>Service:</strong> {healthData.service}</div>
                <div><strong>Status:</strong> {healthData.status}</div>
              </div>
            )}

            {state === 'error' && errorMsg && (
              <div className="status-details" style={{ color: '#b91c1c' }}>
                <strong>Error:</strong> {errorMsg}
              </div>
            )}
          </div>

          <button
            className="action-button"
            onClick={handleTestConnection}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? 'Testing Connection...' : 'Test API Connection'}
          </button>
        </div>
      )}

      <div className="popup-footer">
        JobStreet Quick Apply Automation • Phase 8
      </div>
    </div>
  );
};
