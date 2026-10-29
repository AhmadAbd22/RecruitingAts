import { useEffect, useId, useRef, useState } from "react";
import axios from "axios";
import { api } from "../../api/client";
import { FeedbackForm } from "../../components/interviews";
import type { FeedbackFormValues } from "../../components/interviews";
import { Button, EmptyState } from "../../components/shared";
import { formatInterviewTime, getInterviewError } from "./interviewHelpers";

export type MyInterview = {
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

type Props = {
  interview: MyInterview;
  canAddFeedback: boolean;
  values: FeedbackFormValues;
  onChange: (values: FeedbackFormValues) => void;
  onClose: () => void;
  onSubmitted: () => void;
};

export function InterviewFeedbackDialog({ interview, canAddFeedback, values, onChange, onClose, onSubmitted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [loading, setLoading] = useState(interview.hasSubmittedFeedback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const submitted = interview.hasSubmittedFeedback;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      else document.querySelector<HTMLElement>("[data-interview-list-heading]")?.focus();
    };
  }, []);

  useEffect(() => {
    if (error || message) noticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [error, message]);

  useEffect(() => {
    if (!submitted) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setFeedback(null);

    async function loadFeedback() {
      try {
        const { data } = await api.get<FeedbackItem[]>(
          "/interviews/" + interview.interviewId + "/feedback",
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setFeedback(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(getInterviewError(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadFeedback();
    return () => controller.abort();
  }, [interview.interviewId, submitted, refresh]);

  async function submitFeedback() {
    if (saving || submitted || !canAddFeedback) return;
    setError("");
    setMessage("");

    if (
      !Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5 ||
      !values.strengths.trim() || !values.concerns.trim() ||
      !values.recommendation.trim() || values.recommendation.length > 500
    ) {
      setError("Provide a rating from 1 to 5, strengths, concerns and a recommendation.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/interviews/" + interview.interviewId + "/feedback", {
        rating: values.rating,
        strengths: values.strengths.trim(),
        concerns: values.concerns.trim(),
        recommendation: values.recommendation.trim(),
      });
      setMessage("Your feedback has been submitted. You can now read the panel's submitted feedback.");
      onSubmitted();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setMessage("Your feedback was already submitted. You can now view it.");
        onSubmitted();
      } else {
        setError(getInterviewError(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="interview-dialog" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
      onClick={(event) => {
        if (saving || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="interview-dialog-head">
        <div><span className="interview-eyebrow">Interview feedback</span><h2 id={titleId}>{submitted ? "Submitted feedback" : "Write feedback"}</h2></div>
        <Button className="interview-dialog-close" aria-label="Close feedback" disabled={saving} onClick={onClose}>
          <span aria-hidden="true">×</span>
        </Button>
      </header>

      <div className="interview-dialog-body">
        <div className="interview-dialog-context">
          <strong>{interview.candidateName}</strong>
          <p>{interview.requisitionTitle}</p>
          <span>{formatInterviewTime(interview.scheduledAt)} · {interview.interviewType} / {interview.mode}</span>
        </div>

        {(error || message) && <div ref={noticeRef}>
          {error && <div className="interview-notice interview-notice--error" role="alert">{error}</div>}
          {message && <div className="interview-notice interview-notice--success" role="status">{message}</div>}
        </div>}

        {!submitted && canAddFeedback && <div className="interview-feedback-body">
          <div className="interview-notice">
            <strong>Your feedback comes first</strong>
            <p>Other panel members' feedback stays hidden until you submit yours.</p>
          </div>
          <p className="interview-hint">Complete all four fields. Rating: 1 is lowest, 5 is highest.</p>
          <fieldset disabled={saving} className="interview-fieldset interview-feedback-form">
            <legend className="interview-sr-only">Your feedback for {interview.candidateName}</legend>
            <FeedbackForm values={values} onChange={onChange} onSubmit={submitFeedback} />
          </fieldset>
          {saving && <p className="interview-loading" role="status"><span className="interview-spinner" aria-hidden="true" />Submitting your feedback...</p>}
        </div>}

        {!submitted && !canAddFeedback && <p className="interview-notice">Your account does not have permission to submit feedback.</p>}

        {submitted && (loading ? (
          <div className="interview-loading interview-loading-panel" role="status"><span className="interview-spinner" aria-hidden="true" />Loading submitted feedback...</div>
        ) : feedback !== null && (
          <section className="interview-feedback-results" aria-label="Submitted panel feedback">
            {feedback.length === 0 ? (
              <EmptyState title="No feedback available" message="Submitted panel feedback will appear here." />
            ) : feedback.map((item) => (
              <section className="interview-review" key={item.interviewFeedbackId}>
                <header className="interview-review-head">
                  <div><h3>{item.interviewerName}</h3><p className="interview-hint">{formatInterviewTime(item.submittedAt)}</p></div>
                  <span className="interview-rating">Rating <strong>{item.rating} / 5</strong></span>
                </header>
                <dl className="interview-review-details">
                  <div><dt>Strengths</dt><dd>{item.strengths}</dd></div>
                  <div><dt>Concerns</dt><dd>{item.concerns}</dd></div>
                  <div className="interview-full-width"><dt>Recommendation</dt><dd>{item.recommendation}</dd></div>
                </dl>
              </section>
            ))}
          </section>
        ))}
      </div>

      <footer className="interview-dialog-foot">
        <p className="interview-hint">{submitted ? "Only submitted panel feedback is shown." : "Your draft stays here if you close this window."}</p>
        <div className="row wrap">
          {submitted && <Button disabled={loading || saving} onClick={() => setRefresh((current) => current + 1)}>{error ? "Try again" : "Refresh feedback"}</Button>}
          <Button disabled={saving} onClick={onClose}>Close</Button>
        </div>
      </footer>
    </dialog>
  );
}
