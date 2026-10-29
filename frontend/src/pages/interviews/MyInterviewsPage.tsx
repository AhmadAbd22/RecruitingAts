import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Permissions } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import type { FeedbackFormValues } from "../../components/interviews";
import { Button, EmptyState, PageHeader, StatusChip } from "../../components/shared";
import { InterviewFeedbackDialog } from "./InterviewFeedbackDialog";
import type { MyInterview } from "./InterviewFeedbackDialog";
import { formatInterviewTime, getInterviewError } from "./interviewHelpers";
import "./interviews.css";

const emptyFeedback: FeedbackFormValues = {
  rating: 3,
  strengths: "",
  concerns: "",
  recommendation: "Advance",
};

export function MyInterviewsPage() {
  const { user } = useAuth();
  const canSchedule = usePermission(Permissions.InterviewsSchedule);
  const canAddFeedback = usePermission(Permissions.InterviewsFeedbackAdd);
  const [interviews, setInterviews] = useState<MyInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<"all" | "pending" | "submitted">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, FeedbackFormValues>>({});

  const selectedInterview = interviews.find((item) => item.interviewId === selectedId);
  const pendingCount = interviews.filter((item) => !item.hasSubmittedFeedback).length;
  const visibleInterviews = interviews.filter((item) =>
    filter === "all" || (filter === "submitted" ? item.hasSubmittedFeedback : !item.hasSubmittedFeedback),
  );

  useEffect(() => {
    setDrafts({});
  }, [user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setInterviews([]);
    setSelectedId(null);
    setError("");
    setLoading(true);

    async function loadInterviews() {
      try {
        const { data } = await api.get<MyInterview[]>("/interviews/my", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setInterviews(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(getInterviewError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInterviews();
    return () => controller.abort();
  }, [user?.id, refresh]);

  return (
    <div className="page interviews-page">
      <PageHeader
        title="My interviews"
        subtitle="Review your assigned interviews and manage your feedback."
        actions={
          <div className="row wrap">
            <Button disabled={loading} onClick={() => setRefresh((current) => current + 1)}>
              Refresh
            </Button>
            {canSchedule && (
              <Link className="btn btn-primary" to="/interviews/schedule">
                <span aria-hidden="true">+</span> Schedule interview
              </Link>
            )}
          </div>
        }
      />

      {error && (
        <div className="interview-notice interview-notice--error" role="alert">
          <strong>Could not load your interviews</strong>
          <p>{error} Select Refresh to try again.</p>
        </div>
      )}

      {loading ? (
        <div className="interview-loading interview-loading-panel" role="status">
          <span className="interview-spinner" aria-hidden="true" />Loading your interviews...
        </div>
      ) : error ? null : interviews.length === 0 ? (
        <EmptyState title="No interviews assigned"
          message="An interview appears here when you are selected as a panel member." />
      ) : (
        <section className="interview-workspace" aria-labelledby="assigned-interviews-title">
          <div className="interview-workspace-head">
            <div>
              <h2 id="assigned-interviews-title" tabIndex={-1} data-interview-list-heading>
                Assigned interviews <span className="interview-count">{interviews.length}</span>
              </h2>
              <p>Open feedback in a separate window. Your interview list stays in place.</p>
            </div>
          </div>

          <div className="interview-filters" role="group" aria-label="Filter interviews by feedback">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All interviews <span>{interviews.length}</span>
            </button>
            <button type="button" aria-pressed={filter === "pending"} onClick={() => setFilter("pending")}>
              Feedback pending <span>{pendingCount}</span>
            </button>
            <button type="button" aria-pressed={filter === "submitted"} onClick={() => setFilter("submitted")}>
              Submitted <span>{interviews.length - pendingCount}</span>
            </button>
          </div>

          {visibleInterviews.length === 0 ? (
            <div className="interview-filter-empty">
              <EmptyState title="No interviews in this view"
                message="Choose All interviews to see your other assigned interviews." />
            </div>
          ) : (
            <>
              <div className="interview-row-head" aria-hidden="true">
                <span>Candidate and job</span><span>Date and format</span><span>Interview status</span><span>Feedback</span>
              </div>
              <ul className="interview-rows">
                {visibleInterviews.map((interview) => (
                  <li className="interview-row" key={interview.interviewId}>
                    <div className="interview-person">
                      <span className="interview-avatar" aria-hidden="true">
                        {interview.candidateName.trim().charAt(0).toUpperCase()}
                      </span>
                      <div><h3>{interview.candidateName}</h3><p>{interview.requisitionTitle}</p></div>
                    </div>
                    <div className="interview-row-schedule">
                      <span className="interview-mobile-label">Date and format</span>
                      <strong>{formatInterviewTime(interview.scheduledAt)}</strong>
                      <span>{interview.interviewType} / {interview.mode}</span>
                    </div>
                    <div className="interview-row-status">
                      <span className="interview-mobile-label">Interview status</span>
                      <StatusChip status={interview.status === "NoShow" ? "No show" : interview.status}
                        tone={interview.status === "NoShow" ? "danger" : undefined} />
                    </div>
                    <div className="interview-row-action">
                      {interview.hasSubmittedFeedback || canAddFeedback ? (
                        <Button variant={interview.hasSubmittedFeedback ? "ghost" : "primary"}
                          aria-label={`${interview.hasSubmittedFeedback ? "View" : "Write"} feedback for ${interview.candidateName}`}
                          onClick={() => setSelectedId(interview.interviewId)}>
                          {interview.hasSubmittedFeedback ? "View feedback" : "Write feedback"}
                        </Button>
                      ) : <span className="interview-hint">You do not have permission to submit feedback.</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {selectedInterview && (
        <InterviewFeedbackDialog key={user?.id + ":" + selectedInterview.interviewId}
          interview={selectedInterview} canAddFeedback={canAddFeedback}
          values={drafts[selectedInterview.interviewId] ?? emptyFeedback}
          onChange={(values) => setDrafts((current) => ({ ...current, [selectedInterview.interviewId]: values }))}
          onClose={() => setSelectedId(null)}
          onSubmitted={() => {
            setInterviews((current) => current.map((item) =>
              item.interviewId === selectedInterview.interviewId ? { ...item, hasSubmittedFeedback: true } : item,
            ));
            setDrafts((current) => {
              const updated = { ...current };
              delete updated[selectedInterview.interviewId];
              return updated;
            });
          }}
        />
      )}
    </div>
  );
}
