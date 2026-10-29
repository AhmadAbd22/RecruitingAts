import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { api, Permissions } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { FeedbackForm } from "../../components/interviews";
import type { FeedbackFormValues } from "../../components/interviews";
import { Button, EmptyState, PageHeader } from "../../components/shared";
import { formatInterviewTime, getInterviewError } from "./interviewHelpers";

type MyInterview = {
  interviewId: string;
  applicationId: string;
  candidateName: string;
  requisitionTitle: string;
  interviewType: string;
  mode: string;
  scheduledAt: string;
  status: string;
  hasSubmittedFeedback: boolean;
};

type FeedbackItem = {
  interviewFeedbackId: string;
  interviewerEmployeeId: string;
  interviewerName: string;
  rating: number;
  strengths: string;
  concerns: string;
  recommendation: string;
  submittedAt: string;
};

function InterviewItem({
  interview,
  canAddFeedback,
}: {
  interview: MyInterview;
  canAddFeedback: boolean;
}) {
  const [submitted, setSubmitted] = useState(interview.hasSubmittedFeedback);
  const [values, setValues] = useState<FeedbackFormValues>({
    rating: 3,
    strengths: "",
    concerns: "",
    recommendation: "Advance",
  });
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submitFeedback() {
    if (busy || submitted || !canAddFeedback) return;

    setError("");
    setMessage("");

    if (
      !Number.isInteger(values.rating) ||
      values.rating < 1 ||
      values.rating > 5 ||
      !values.strengths.trim() ||
      !values.concerns.trim() ||
      !values.recommendation.trim() ||
      values.recommendation.length > 500
    ) {
      setError(
        "Provide a rating from 1 to 5, strengths, concerns and a recommendation.",
      );
      return;
    }

    setBusy(true);
    try {
      await api.post("/interviews/" + interview.interviewId + "/feedback", {
        rating: values.rating,
        strengths: values.strengths.trim(),
        concerns: values.concerns.trim(),
        recommendation: values.recommendation.trim(),
      });
      setSubmitted(true);
      setMessage(
        "Feedback submitted. You can now view submitted feedback for this interview.",
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setSubmitted(true);
        setMessage("Your feedback was already submitted. You can now view it.");
      } else {
        setError(getInterviewError(error));
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadFeedback() {
    if (busy || !submitted) return;

    setBusy(true);
    setError("");
    setFeedback(null);

    try {
      const { data } = await api.get<FeedbackItem[]>(
        "/interviews/" + interview.interviewId + "/feedback",
      );
      setFeedback(data);
    } catch (error) {
      setError(getInterviewError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel stack">
      <h2>{interview.candidateName}</h2>
      <p>{interview.requisitionTitle}</p>
      <p>
        {interview.interviewType} - {interview.mode} - {interview.status}
      </p>
      <p>When: {formatInterviewTime(interview.scheduledAt)}</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Please wait...</p>}

      {!submitted && (
        <p className="muted">
          Submit your own feedback before viewing other interviewers' feedback.
        </p>
      )}

      {!submitted && canAddFeedback && (
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Your feedback</legend>
          <FeedbackForm
            values={values}
            onChange={setValues}
            onSubmit={submitFeedback}
          />
        </fieldset>
      )}

      {!submitted && !canAddFeedback && (
        <p className="muted">
          Your account does not have permission to submit feedback.
        </p>
      )}

      {submitted && (
        <Button disabled={busy} onClick={loadFeedback}>
          {busy ? "Please wait..." : "View / refresh feedback"}
        </Button>
      )}

      {feedback !== null && (
        <div className="stack">
          <h3>Submitted feedback</h3>
          {feedback.length === 0 ? (
            <p>No feedback is available.</p>
          ) : (
            feedback.map((item) => (
              <section className="panel stack" key={item.interviewFeedbackId}>
                <h4>{item.interviewerName}</h4>
                <p>
                  <strong>Rating:</strong> {item.rating} / 5
                </p>
                <p>
                  <strong>Strengths:</strong> {item.strengths}
                </p>
                <p>
                  <strong>Concerns:</strong> {item.concerns}
                </p>
                <p>
                  <strong>Recommendation:</strong> {item.recommendation}
                </p>
                <p className="muted">{formatInterviewTime(item.submittedAt)}</p>
              </section>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export function MyInterviewsPage() {
  const { user } = useAuth();
  const canSchedule = usePermission(Permissions.InterviewsSchedule);
  const canAddFeedback = usePermission(Permissions.InterviewsFeedbackAdd);
  const [interviews, setInterviews] = useState<MyInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setInterviews([]);
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
    <div className="page">
      <PageHeader
        title="My interviews"
        subtitle="Interviews where you are an assigned panel member."
        actions={
          <div className="row wrap">
            <Button
              disabled={loading}
              onClick={() => setRefresh((current) => current + 1)}
            >
              Refresh
            </Button>
            {canSchedule && (
              <Link
                className="btn btn-primary"
                to="/interviews/schedule"
                style={{ textDecoration: "none" }}
              >
                Schedule interview
              </Link>
            )}
          </div>
        }
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status">Loading your interviews...</p>
      ) : error ? null : interviews.length === 0 ? (
        <EmptyState
          title="No interviews assigned"
          message="An interview appears here when you are selected as a panel member."
        />
      ) : (
        <div className="stack">
          {interviews.map((interview) => (
            <InterviewItem
              key={user?.id + ":" + interview.interviewId}
              interview={interview}
              canAddFeedback={canAddFeedback}
            />
          ))}
        </div>
      )}
    </div>
  );
}
