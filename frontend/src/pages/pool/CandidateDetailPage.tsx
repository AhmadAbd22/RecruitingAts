import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, Permissions } from "../../api/client";
import { usePermission } from "../../auth/usePermission";
import { ResumePanel } from "../../components/candidates";
import { Button, PageHeader } from "../../components/shared";

import { getApiError, getResumeError } from "./candidatePageHelpers";

import type { CandidateDetail } from "./candidatePageHelpers";

export function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const canView = usePermission(Permissions.PoolView);
  const canManage = usePermission(Permissions.CandidatesManage);

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);

  const activeId = useRef<string | undefined>(id?.toLowerCase());

  useEffect(() => {
    activeId.current = canView ? id?.toLowerCase() : undefined;

    if (!canView || !id) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setCandidate(null);
    setLoadError("");
    setActionError("");
    setMessage("");
    setBusy(false);
    setUploadVersion(0);

    async function loadCandidate() {
      try {
        const response = await api.get<CandidateDetail>(`/candidates/${id}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setCandidate(response.data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(getApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCandidate();

    return () => {
      controller.abort();
      activeId.current = undefined;
    };
  }, [id, canView]);

  async function downloadResume() {
    if (!candidate || busy || !canView) {
      return;
    }

    const targetId = candidate.candidateId.toLowerCase();
    const downloadName = `${candidate.fullName}.pdf`;

    setBusy(true);
    setActionError("");
    setMessage("");

    try {
      const response = await api.get<Blob>(`/candidates/${targetId}/resume`, {
        responseType: "blob",
      });

      if (activeId.current !== targetId) {
        return;
      }

      const fileUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = downloadName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);

      setMessage("Resume download started.");
    } catch (error) {
      if (activeId.current === targetId) {
        setActionError(getApiError(error));
      }
    } finally {
      if (activeId.current === targetId) {
        setBusy(false);
      }
    }
  }

  async function replaceResume(file: File) {
    if (!candidate || busy || !canManage) {
      return;
    }

    setActionError("");
    setMessage("");

    const fileError = getResumeError(file);

    if (fileError) {
      setActionError(fileError);
      setUploadVersion((value) => value + 1);
      return;
    }

    const targetId = candidate.candidateId.toLowerCase();
    const body = new FormData();

    body.append("file", file);

    setBusy(true);

    try {
      const response = await api.postForm<CandidateDetail>(
        `/candidates/${targetId}/resume`,
        body,
      );

      if (activeId.current === targetId) {
        setCandidate(response.data);
        setMessage("Resume updated successfully.");
      }
    } catch (error) {
      if (activeId.current === targetId) {
        setActionError(getApiError(error));
      }
    } finally {
      if (activeId.current === targetId) {
        setBusy(false);
        setUploadVersion((value) => value + 1);
      }
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={candidate?.fullName ?? "Candidate"}
        subtitle="Candidate profile"
        actions={
          <Button disabled={busy} onClick={() => navigate("/pool")}>
            Back to talent pool
          </Button>
        }
      />

      {!canView ? (
        <p className="error" role="alert">
          You do not have permission to view candidate profiles.
        </p>
      ) : loading ? (
        <p role="status">Loading candidate...</p>
      ) : loadError ? (
        <p className="error" role="alert">
          {loadError}
        </p>
      ) : candidate ? (
        <>
          <section className="panel">
            <h2>Candidate information</h2>

            <dl>
              <dt>Full name</dt>
              <dd>{candidate.fullName}</dd>

              <dt>Email</dt>
              <dd>{candidate.email}</dd>

              <dt>Phone</dt>
              <dd>{candidate.phone}</dd>

              <dt>Skills</dt>
              <dd>{candidate.skills || "Not recorded"}</dd>

              <dt>Source</dt>
              <dd>{candidate.source || "Not recorded"}</dd>

              <dt>Consent date</dt>
              <dd>
                {candidate.consentDate
                  ? candidate.consentDate.slice(0, 10)
                  : "Not recorded"}
              </dd>

              <dt>Created at — UTC</dt>
              <dd>{candidate.createdAt.replace("T", " ").replace("Z", "")}</dd>
            </dl>
          </section>

          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}

          {message && <p role="status">{message}</p>}

          <fieldset
            disabled={busy}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <ResumePanel
              key={uploadVersion}
              hasResume={candidate.hasResume}
              fileName={`${candidate.fullName}.pdf`}
              canManage={canManage}
              onDownload={() => void downloadResume()}
              onUpload={(file) => void replaceResume(file)}
            />
          </fieldset>

          {busy && <p role="status">Please wait...</p>}
        </>
      ) : (
        <p>Candidate not found.</p>
      )}
    </div>
  );
}
