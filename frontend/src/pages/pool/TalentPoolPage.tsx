import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { api, Permissions } from "../../api/client";
import { usePermission } from "../../auth/usePermission";

import { CandidateForm, CandidateList } from "../../components/candidates";

import type { CandidateFormValues } from "../../components/candidates";
import type { CandidateListItem } from "../../types/domain";

import {
  Button,
  Modal,
  PageHeader,
  SearchField,
} from "../../components/shared";

import {
  getApiError,
  getResumeError,
  phoneCountries,
} from "./candidatePageHelpers";

import type {
  ApiFailure,
  CandidateDetail,
  DuplicateResult,
} from "./candidatePageHelpers";

const emptyForm: CandidateFormValues = {
  fullName: "",
  email: "",
  phone: "",
  skills: "",
  source: "Referral",
};

export function TalentPoolPage() {
  const navigate = useNavigate();

  const canView = usePermission(Permissions.PoolView);
  const canManage = usePermission(Permissions.CandidatesManage);

  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CandidateFormValues>(emptyForm);
  const [phoneCountry, setPhoneCountry] = useState("");
  const [consentDate, setConsentDate] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [matches, setMatches] = useState<CandidateListItem[]>([]);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canView) {
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setListError("");
    setCandidates([]);

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get<CandidateListItem[]>("/candidates", {
          params: { q: query.trim() },
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setCandidates(response.data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(getApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, canView, refreshKey]);

  function openCreateForm() {
    setForm(emptyForm);
    setPhoneCountry("");
    setConsentDate("");
    setResumeFile(null);
    setMatches([]);
    setFormError("");
    setFormMessage("");
    setPageMessage("");
    setOpen(true);
  }

  function closeCreateForm() {
    if (!busy) {
      setOpen(false);
    }
  }

  function updateForm(values: CandidateFormValues) {
    setForm(values);
    setMatches([]);
    setFormError("");
    setFormMessage("");
  }

  async function checkDuplicates() {
    if (busy || !canManage) {
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setFormError("Enter an email address or phone number first.");
      return;
    }

    setBusy(true);
    setFormError("");
    setFormMessage("");
    setMatches([]);

    try {
      const response = await api.get<DuplicateResult>(
        "/candidates/duplicates",
        {
          params: {
            Email: form.email.trim() || undefined,
            Phone: form.phone.trim() || undefined,
            PhoneCountry: phoneCountry || undefined,
          },
        },
      );

      setMatches(response.data.matches);

      setFormMessage(
        response.data.isDuplicate
          ? "Existing candidates were found. Check the matches below."
          : "No matching candidates were found. Creation will check again.",
      );
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setBusy(false);
    }
  }

  async function createCandidate() {
    if (busy || !canManage) {
      return;
    }

    setFormError("");
    setFormMessage("");

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.source.trim()
    ) {
      setFormError("Full name, email, phone and source are required.");
      return;
    }

    if (!resumeFile) {
      setFormError("Please select the required PDF resume.");
      return;
    }

    const fileError = getResumeError(resumeFile);

    if (fileError) {
      setFormError(fileError);
      return;
    }

    const body = new FormData();

    body.append("FullName", form.fullName.trim());
    body.append("Email", form.email.trim());
    body.append("Phone", form.phone.trim());
    body.append("Skills", form.skills.trim());
    body.append("Source", form.source.trim());
    body.append("file", resumeFile);

    if (phoneCountry) {
      body.append("PhoneCountry", phoneCountry);
    }

    if (consentDate) {
      body.append("ConsentDate", consentDate);
    }

    setBusy(true);
    setMatches([]);

    try {
      const response = await api.postForm<CandidateDetail>("/candidates", body);

      setOpen(false);

      if (canView) {
        navigate(`/pool/${response.data.candidateId}`);
      } else {
        setPageMessage("Candidate created successfully.");
      }
    } catch (error) {
      if (axios.isAxiosError<ApiFailure>(error)) {
        setMatches(error.response?.data?.duplicate?.matches ?? []);
      }

      setFormError(getApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Talent pool"
        subtitle="Search and manage candidate profiles."
        actions={
          <>
            {canView && (
              <Button
                disabled={loading}
                onClick={() => setRefreshKey((value) => value + 1)}
              >
                Refresh
              </Button>
            )}

            {canManage && (
              <Button variant="primary" onClick={openCreateForm}>
                Add candidate
              </Button>
            )}
          </>
        }
      />

      {pageMessage && <p role="status">{pageMessage}</p>}

      {canView ? (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search by name, email or phone"
          />

          <p className="muted">
            Showing up to 100 matches. Refine your search to narrow the results.
          </p>

          {loading && <p role="status">Loading candidates...</p>}

          {listError && (
            <p className="error" role="alert">
              {listError}
            </p>
          )}

          {!loading && !listError && (
            <CandidateList
              items={candidates}
              onSelect={(candidateId) => navigate(`/pool/${candidateId}`)}
            />
          )}
        </>
      ) : (
        <p className="muted">
          Your account does not have permission to browse the talent pool.
        </p>
      )}

      <Modal open={open} title="Add candidate" onClose={closeCreateForm}>
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}

        {formMessage && <p role="status">{formMessage}</p>}

        {matches.length > 0 && (
          <section className="panel">
            <h3>Existing candidates</h3>

            <p>
              Review these records before adding another candidate.
              {canView && " Select a row to open the existing profile."}
            </p>

            <CandidateList
              items={matches}
              onSelect={
                canView
                  ? (candidateId) => navigate(`/pool/${candidateId}`)
                  : undefined
              }
            />
          </section>
        )}

        <fieldset
          disabled={busy}
          className="stack"
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <label className="field">
            Country for a local phone number
            <select
              value={phoneCountry}
              onChange={(event) => {
                setPhoneCountry(event.target.value);
                setMatches([]);
                setFormError("");
                setFormMessage("");
              }}
            >
              <option value="">Choose a country</option>

              {phoneCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Consent date — optional
            <input
              type="date"
              value={consentDate}
              onChange={(event) => setConsentDate(event.target.value)}
            />
          </label>

          <label className="field">
            Resume — PDF required, maximum 5 MB
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) =>
                setResumeFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          <CandidateForm
            values={form}
            onChange={updateForm}
            onCheckDuplicates={() => void checkDuplicates()}
            onSubmit={() => void createCandidate()}
          />
        </fieldset>

        {busy && <p role="status">Please wait...</p>}
      </Modal>
    </div>
  );
}
