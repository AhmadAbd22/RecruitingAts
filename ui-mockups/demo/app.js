(() => {
  const seed = window.DemoSeed;
  const state = {
    user: null,
    route: "login",
    params: {},
    selectedAppId: null,
    filters: { req: "all", source: "all" },
    poolQuery: "",
    modal: null,
    drawer: null,
    toastTimer: null,
  };

  // Mutable working copy
  const db = {
    requisitions: structuredClone(seed.requisitions),
    candidates: structuredClone(seed.candidates),
    applications: structuredClone(seed.applications),
    interviews: structuredClone(seed.interviews),
    auditLog: structuredClone(seed.auditLog),
    employees: seed.employees,
    stages: seed.stages,
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function can(perm) {
    return !!state.user?.permissions?.includes(perm);
  }
  function canViewAll() {
    return can(seed.P.REQUISITIONS_VIEW_ALL);
  }
  function myEmployeeId() {
    return state.user?.employeeId;
  }
  function scopedRequisitionIds() {
    if (canViewAll()) return db.requisitions.map((r) => r.requisitionId);
    const eid = myEmployeeId();
    return db.requisitions
      .filter((r) => r.team.some((t) => t.employeeId === eid))
      .map((r) => r.requisitionId);
  }
  function candidateName(id) {
    return db.candidates.find((c) => c.candidateId === id)?.fullName ?? "Unknown";
  }
  function stageById(id) {
    return db.stages.find((s) => s.pipelineStageId === id);
  }
  function needsDisposition(stageId) {
    const n = stageById(stageId)?.name;
    return n === "Disqualified" || n === "NFA";
  }
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }
  function fmtMoney(n) {
    if (n == null) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }
  function statusChip(status) {
    const map = {
      Draft: "neutral",
      PendingApproval: "warn",
      Approved: "ok",
      Published: "ok",
      OnHold: "warn",
      Closed: "danger",
      Cancelled: "danger",
      Filled: "ok",
      Scheduled: "ok",
      Completed: "ok",
      NoShow: "danger",
    };
    return `<span class="chip ${map[status] || "neutral"}">${status}</span>`;
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  /** Flag UI that is designed ahead of a missing/unstable API contract. */
  function apiGap(contract, note) {
    return `<div class="api-gap" role="note"><strong>API gap</strong> · <code>${contract}</code> — ${note}</div>`;
  }

  function matchScoreHtml(app) {
    if (app.matchScore == null) return "";
    return `<span class="score" title="Advisory only — never auto hire/reject">${app.matchScore}%<em>${app.matchLabel || "Advisory"}</em></span>`;
  }

  function interviewerRoles(team) {
    return team.filter((t) =>
      ["TechnicalInterviewer", "FinalInterviewer", "Owner"].includes(t.teamRole)
    );
  }

  /* —— Routing —— */
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "") || (state.user ? "home" : "login");
    const [path, query = ""] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(query));
    if (parts[0] === "requisitions" && parts[1]) return { route: "requisition", params: { id: parts[1], ...params } };
    if (parts[0] === "pool" && parts[1]) return { route: "candidate", params: { id: parts[1], ...params } };
    return { route: parts[0] || "home", params };
  }

  function go(path) {
    location.hash = `#/${path.replace(/^\//, "")}`;
  }

  function navigate() {
    const parsed = parseHash();
    if (!state.user && parsed.route !== "login") {
      go("login");
      return;
    }
    if (state.user && parsed.route === "login") {
      go("home");
      return;
    }
    state.route = parsed.route;
    state.params = parsed.params;
    render();
  }

  /* —— Shell —— */
  function renderShell(bodyHtml) {
    const root = $("#app");
    if (!state.user) {
      root.className = "app login-mode";
      root.innerHTML = bodyHtml;
      return;
    }

    const links = [
      { href: "home", label: "Home", show: true },
      { href: "requisitions", label: "Requisitions", show: can(seed.P.REQUISITIONS_MANAGE) || canViewAll() },
      { href: "pool", label: "Talent pool", show: can(seed.P.POOL_VIEW) || can(seed.P.CANDIDATES_MANAGE) },
      { href: "pipeline", label: "Pipeline", show: can(seed.P.APPLICATIONS_MANAGE) },
      { href: "interviews", label: "My interviews", show: can(seed.P.INTERVIEWS_FEEDBACK) || can(seed.P.INTERVIEWS_SCHEDULE) },
      { href: "stages", label: "Stages", show: can(seed.P.STAGES_MANAGE) },
      { href: "audit", label: "Comp audit", show: can(seed.P.COMPENSATION_VIEW) },
    ];

    root.className = "app";
    root.innerHTML = `
      <aside class="nav" aria-label="Primary">
        <div class="brand">Recruiting ATS<small>Talent operations</small></div>
        <nav>
          ${links
            .filter((l) => l.show)
            .map(
              (l) =>
                `<a href="#/${l.href}" class="${state.route === l.href || (l.href === "requisitions" && state.route === "requisition") || (l.href === "pool" && state.route === "candidate") ? "active" : ""}">${l.label}</a>`
            )
            .join("")}
        </nav>
        <div class="nav-foot">
          <strong>${state.user.fullName}</strong>
          ${state.user.roles.join(", ")}
          <select class="persona" id="personaSwitch" aria-label="Switch demo persona">
            ${seed.personas
              .map(
                (p) =>
                  `<option value="${p.id}" ${p.id === state.user.id ? "selected" : ""}>${p.fullName} · ${p.roles[0]}</option>`
              )
              .join("")}
          </select>
          <button type="button" class="btn btn-sm" id="btnLogout" style="margin-top:0.5rem;width:100%;color:#dce5ef;background:transparent;border-color:#3a4d63">Sign out</button>
        </div>
      </aside>
      <div class="main">${bodyHtml}</div>
      <div class="overlay" id="overlay" hidden></div>
      <aside class="drawer" id="drawer" aria-hidden="true"></aside>
      <div class="modal" id="modal" hidden></div>
    `;

    $("#personaSwitch")?.addEventListener("change", (e) => {
      const next = seed.personas.find((p) => p.id === e.target.value);
      if (!next) return;
      state.user = { ...next };
      toast(`Signed in as ${next.fullName}`);
      // Interviewer lands on interviews; others keep route if allowed
      if (!can(seed.P.APPLICATIONS_MANAGE) && state.route === "pipeline") go("interviews");
      else if (!can(seed.P.REQUISITIONS_MANAGE) && !canViewAll() && (state.route === "requisitions" || state.route === "requisition"))
        go("interviews");
      else render();
    });
    $("#btnLogout")?.addEventListener("click", () => {
      state.user = null;
      go("login");
    });
  }

  function page(title, sub, actionsHtml, contentHtml, scriptHtml = "") {
    return `
      <header class="topbar">
        <div>
          <h1>${title}</h1>
          ${sub ? `<p class="sub">${sub}</p>` : ""}
        </div>
        <div class="top-actions">${actionsHtml || ""}</div>
      </header>
      <div class="content">
        ${scriptHtml}
        ${contentHtml}
      </div>
    `;
  }

  /* —— Screens —— */
  function signInPersona(user) {
    state.user = { ...user };
    toast(`Welcome, ${user.fullName}`);
    go(user.roles.includes("Interviewer") && user.roles.length === 1 ? "interviews" : "home");
  }

  function renderLogin() {
    renderShell(`
      <div class="login-shell">
        <div class="login-card">
          <div class="brand">Recruiting ATS<small>Full demo · local mock</small></div>
          ${apiGap("POST /api/auth/login · POST /api/auth/register", "UI forms mock local personas; wire to real auth when integrating.")}
          <form class="stack" id="loginForm" style="margin-bottom:1rem">
            <label class="field">Email<input id="loginEmail" type="email" value="recruiter@demo.local" required /></label>
            <label class="field">Password<input id="loginPass" type="password" value="Pass123!" required /></label>
            <button type="submit" class="btn btn-primary">Sign in</button>
            <p class="hint error" id="loginErr"></p>
          </form>
          <p class="hint" style="margin:0 0 0.5rem">Or jump in as a demo persona (step 1):</p>
          <div class="demo-accounts" id="demoAccounts">
            ${seed.personas
              .map(
                (p) => `
              <button type="button" data-id="${p.id}">
                <strong>${p.fullName}</strong>
                <span>${p.email} · ${p.roles.join(", ")}</span>
              </button>`
              )
              .join("")}
          </div>
          <p class="hint">Data resets on refresh.</p>
        </div>
      </div>
    `);
    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#loginEmail").value.trim().toLowerCase();
      const user = seed.personas.find((p) => p.email.toLowerCase() === email);
      if (!user) {
        $("#loginErr").textContent = "Unknown demo account. Use a persona email below.";
        return;
      }
      signInPersona(user);
    });
    $$("#demoAccounts button").forEach((btn) => {
      btn.addEventListener("click", () => {
        signInPersona(seed.personas.find((p) => p.id === btn.dataset.id));
      });
    });
  }

  function renderHome() {
    const scoped = scopedRequisitionIds();
    const apps = db.applications.filter((a) => scoped.includes(a.requisitionId));
    const pending = db.requisitions.filter((r) => r.status === "PendingApproval").length;
    const myInterviews = db.interviews.filter((i) =>
      i.panel.some((p) => p.employeeId === myEmployeeId())
    ).length;

    renderShell(
      page(
        "Demo home",
        "Walk the Day‑5 script. Switch personas from the left rail anytime.",
        `<span class="chip">${state.user.roles[0]}</span>`,
        `
        <div class="script">
          <strong>Suggested order:</strong>
          1) Switch Admin vs Recruiter vs Interviewer ·
          2) Requisition approve → publish ·
          3) Pool create + duplicate warn ·
          4) Pipeline stage + disposition ·
          5) Schedule / feedback independence ·
          6) Compensation only for Admin
        </div>
        <div class="grid-3" style="margin-bottom:1rem">
          <div class="stat"><div class="label">Scoped applications</div><div class="value">${apps.length}</div></div>
          <div class="stat"><div class="label">Pending approvals</div><div class="value">${pending}</div></div>
          <div class="stat"><div class="label">My interviews</div><div class="value">${myInterviews}</div></div>
        </div>
        <div class="panel">
          <h2>Quick links</h2>
          <div class="row">
            ${can(seed.P.REQUISITIONS_MANAGE) || canViewAll() ? `<a class="btn" href="#/requisitions">Requisitions</a>` : ""}
            ${can(seed.P.POOL_VIEW) || can(seed.P.CANDIDATES_MANAGE) ? `<a class="btn" href="#/pool">Talent pool</a>` : ""}
            ${can(seed.P.APPLICATIONS_MANAGE) ? `<a class="btn btn-primary" href="#/pipeline">Open pipeline</a>` : ""}
            ${can(seed.P.INTERVIEWS_FEEDBACK) || can(seed.P.INTERVIEWS_SCHEDULE) ? `<a class="btn" href="#/interviews">My interviews</a>` : ""}
            ${can(seed.P.COMPENSATION_VIEW) ? `<a class="btn" href="#/audit">Comp audit</a>` : ""}
          </div>
          ${
            !can(seed.P.APPLICATIONS_MANAGE) && can(seed.P.INTERVIEWS_FEEDBACK)
              ? `<p class="hint warn" style="margin-top:0.85rem">Interviewer persona: pipeline & requisitions are hidden. Submit your feedback to unlock peers’ notes.</p>`
              : ""
          }
        </div>
      `
      )
    );
  }

  function maskBudget(req) {
    if (can(seed.P.COMPENSATION_VIEW)) {
      return `${fmtMoney(req.budgetMin)} – ${fmtMoney(req.budgetMax)}`;
    }
    return `<span class="chip warn">Hidden · need ATS.COMPENSATION.VIEW</span>`;
  }

  function renderRequisitions() {
    const scoped = new Set(scopedRequisitionIds());
    const rows = db.requisitions.filter((r) => canViewAll() || scoped.has(r.requisitionId));

    renderShell(
      page(
        "Requisitions",
        "Scoped list. Budget fields omitted without compensation permission.",
        can(seed.P.REQUISITIONS_MANAGE)
          ? `<button type="button" class="btn btn-primary" id="btnNewReq">New requisition</button>`
          : "",
        `
        <div class="script">Demo step 2 — open Frontend Engineer (PendingApproval) as Admin to approve → publish.</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Dept</th><th>Status</th><th>Openings</th><th>Budget</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr class="clickable" data-id="${r.requisitionId}">
                  <td><strong>${r.title}</strong></td>
                  <td>${r.department}</td>
                  <td>${statusChip(r.status)}</td>
                  <td>${r.openings}</td>
                  <td>${maskBudget(r)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
      )
    );

    $$("tr.clickable").forEach((tr) =>
      tr.addEventListener("click", () => go(`requisitions/${tr.dataset.id}`))
    );
    $("#btnNewReq")?.addEventListener("click", openCreateRequisitionModal);

    if (can(seed.P.COMPENSATION_VIEW)) {
      // audit view of list budgets once per render session feel
    }
  }

  function openCreateRequisitionModal() {
    openModal(`
      <h2>Create requisition</h2>
      <p class="lead">POST /api/requisitions → Draft + creator as Owner.</p>
      <div class="stack">
        <label class="field">Title<input id="rqTitle" value="Platform Engineer" /></label>
        <label class="field">Department<input id="rqDept" value="Engineering" /></label>
        <div class="row">
          <label class="field" style="flex:1">Employment
            <select id="rqEmp"><option>FullTime</option><option>Contract</option></select>
          </label>
          <label class="field" style="flex:1">Seniority
            <select id="rqSen"><option>Junior</option><option selected>Mid</option><option>Senior</option></select>
          </label>
        </div>
        <label class="field">Skills<input id="rqSkills" value="Go, Kubernetes" /></label>
        <label class="field">Job description<textarea id="rqJd">Own platform reliability for ATS.</textarea></label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="rqSave">Create draft</button>
      </div>
    `);
    $("#rqSave").addEventListener("click", () => {
      const req = {
        requisitionId: uid("r"),
        title: $("#rqTitle").value.trim() || "Untitled",
        department: $("#rqDept").value.trim() || "Engineering",
        employmentType: $("#rqEmp").value,
        seniority: $("#rqSen").value,
        skills: $("#rqSkills").value,
        jobDescription: $("#rqJd").value,
        openings: 1,
        status: "Draft",
        statusReason: null,
        hiringManagerEmployeeId: myEmployeeId(),
        hiringManagerName: state.user.fullName,
        budgetMin: null,
        budgetMax: null,
        team: [
          {
            requisitionTeamMemberId: uid("tm"),
            employeeId: myEmployeeId(),
            employeeName: state.user.fullName,
            teamRole: "Owner",
          },
        ],
      };
      db.requisitions.unshift(req);
      closeModal();
      toast("Created Draft requisition");
      go(`requisitions/${req.requisitionId}`);
    });
  }

  function renderRequisitionDetail() {
    const req = db.requisitions.find((r) => r.requisitionId === state.params.id);
    if (!req) {
      renderShell(page("Not found", "", `<a class="btn" href="#/requisitions">Back</a>`, `<p>Unknown requisition.</p>`));
      return;
    }
    const onTeam = req.team.some((t) => t.employeeId === myEmployeeId());
    if (!canViewAll() && !onTeam) {
      renderShell(page("Forbidden", "", `<a class="btn" href="#/requisitions">Back</a>`, `<div class="locked">Outside your requisition scope.</div>`));
      return;
    }

    if (can(seed.P.COMPENSATION_VIEW) && (req.budgetMin != null || req.budgetMax != null)) {
      maybeAuditCompensation(req);
    }

    const actions = [];
    if (can(seed.P.REQUISITIONS_MANAGE) && req.status === "Draft") {
      actions.push(`<button type="button" class="btn" id="actSubmit">Submit for approval</button>`);
    }
    if (can(seed.P.REQUISITIONS_APPROVE) && req.status === "PendingApproval") {
      actions.push(`<button type="button" class="btn btn-primary" id="actApprove">Approve</button>`);
      actions.push(`<button type="button" class="btn btn-warn" id="actReject">Reject</button>`);
    }
    if (can(seed.P.REQUISITIONS_MANAGE) && req.status === "Approved") {
      actions.push(`<button type="button" class="btn btn-primary" id="actPublish">Publish</button>`);
    }
    if (can(seed.P.COMPENSATION_EDIT) && ["Draft", "PendingApproval", "Approved", "Published"].includes(req.status)) {
      actions.push(`<button type="button" class="btn" id="actBudget">Edit budget</button>`);
    }
    if (can(seed.P.REQUISITIONS_MANAGE) && req.status === "Published") {
      actions.push(`<button type="button" class="btn" id="actHold">Hold</button>`);
      actions.push(`<button type="button" class="btn" id="actClose">Close</button>`);
      actions.push(`<button type="button" class="btn" id="actCancel">Cancel</button>`);
      actions.push(`<button type="button" class="btn btn-primary" id="actFill">Mark filled</button>`);
    }
    if (can(seed.P.REQUISITIONS_MANAGE) && req.status === "OnHold") {
      actions.push(`<button type="button" class="btn btn-primary" id="actRepublish">Back to published</button>`);
      actions.push(`<button type="button" class="btn" id="actClose">Close</button>`);
      actions.push(`<button type="button" class="btn" id="actCancel">Cancel</button>`);
      actions.push(`<button type="button" class="btn" id="actFill">Mark filled</button>`);
    }
    if (can(seed.P.REQUISITIONS_MANAGE)) {
      actions.push(`<button type="button" class="btn" id="actTeam">Add teammate</button>`);
    }

    renderShell(
      page(
        req.title,
        `${req.department} · ${req.employmentType} · ${req.seniority}`,
        `${statusChip(req.status)} <a class="btn" href="#/requisitions">All</a>`,
        `
        <div class="grid-2">
          <div class="stack">
            <div class="panel">
              <h2>Job criteria</h2>
              <dl class="kv">
                <dt>Skills</dt><dd>${req.skills}</dd>
                <dt>Openings</dt><dd>${req.openings}</dd>
                <dt>Hiring manager</dt><dd>${req.hiringManagerName}</dd>
                <dt>Description</dt><dd>${req.jobDescription}</dd>
                ${req.statusReason ? `<dt>Reason</dt><dd>${req.statusReason}</dd>` : ""}
              </dl>
            </div>
            <div class="panel">
              <h2>Workflow</h2>
              <div class="row">${actions.join("") || "<span class='hint'>No actions for this persona/status.</span>"}</div>
              <p class="hint">Hold / close / cancel require a reason (FR-REQ-009). Filled may omit reason.</p>
            </div>
          </div>
          <div class="stack">
            <div class="panel">
              <h2>Compensation</h2>
              <p>${maskBudget(req)}</p>
              ${
                can(seed.P.COMPENSATION_VIEW)
                  ? `<p class="hint ok">Visible — viewing writes an audit row (demo step 6).</p>`
                  : `<p class="hint warn">Recruiter/interviewer cannot see budget numbers.</p>`
              }
            </div>
            <div class="panel">
              <h2>Team</h2>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Role</th><th></th></tr></thead>
                  <tbody>
                    ${req.team
                      .map(
                        (t) => `<tr>
                          <td>${t.employeeName}</td>
                          <td>${t.teamRole}</td>
                          <td>${
                            can(seed.P.REQUISITIONS_MANAGE) && t.teamRole !== "Owner"
                              ? `<button type="button" class="btn btn-sm" data-rm="${t.requisitionTeamMemberId}">Remove</button>`
                              : ""
                          }</td>
                        </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `
      )
    );

    const statusWithReason = (nextStatus, needReason) => {
      openModal(`
        <h2>Change status → ${nextStatus}</h2>
        <p class="lead">POST /api/requisitions/{id}/status</p>
        ${
          needReason
            ? `<label class="field">Reason<textarea id="stReason" placeholder="Required"></textarea></label>
               <p class="hint error" id="stErr"></p>`
            : `<p class="hint">Reason optional for Filled.</p>
               <label class="field">Reason (optional)<textarea id="stReason"></textarea></label>`
        }
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="stGo">Confirm</button>
        </div>
      `);
      $("#stGo").addEventListener("click", () => {
        const reason = $("#stReason").value.trim();
        if (needReason && !reason) {
          $("#stErr").textContent = "Reason is required.";
          return;
        }
        req.status = nextStatus;
        req.statusReason = reason || null;
        closeModal();
        toast(`Status → ${nextStatus}`);
        render();
      });
    };

    $("#actSubmit")?.addEventListener("click", () => {
      req.status = "PendingApproval";
      toast("Submitted for approval");
      render();
    });
    $("#actApprove")?.addEventListener("click", () => {
      req.status = "Approved";
      toast("Approved");
      render();
    });
    $("#actReject")?.addEventListener("click", () => {
      openModal(`
        <h2>Reject to Draft</h2>
        <p class="lead">Reason required.</p>
        <label class="field">Reason<textarea id="rejReason" placeholder="Missing leveling details"></textarea></label>
        <p class="hint error" id="rejErr"></p>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="button" class="btn btn-warn" id="rejGo">Reject</button>
        </div>
      `);
      $("#rejGo").addEventListener("click", () => {
        const reason = $("#rejReason").value.trim();
        if (!reason) {
          $("#rejErr").textContent = "Reason is required.";
          return;
        }
        req.status = "Draft";
        req.statusReason = reason;
        closeModal();
        toast("Rejected → Draft");
        render();
      });
    });
    $("#actPublish")?.addEventListener("click", () => {
      req.status = "Published";
      toast("Published — ready for applications");
      render();
    });
    $("#actHold")?.addEventListener("click", () => statusWithReason("OnHold", true));
    $("#actClose")?.addEventListener("click", () => statusWithReason("Closed", true));
    $("#actCancel")?.addEventListener("click", () => statusWithReason("Cancelled", true));
    $("#actFill")?.addEventListener("click", () => statusWithReason("Filled", false));
    $("#actRepublish")?.addEventListener("click", () => {
      req.status = "Published";
      req.statusReason = null;
      toast("Back to Published");
      render();
    });
    $$("[data-rm]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.rm;
        const member = req.team.find((t) => t.requisitionTeamMemberId === id);
        req.team = req.team.filter((t) => t.requisitionTeamMemberId !== id);
        toast(`Removed ${member?.employeeName || "member"}`);
        render();
      })
    );
    $("#actBudget")?.addEventListener("click", () => {
      openModal(`
        <h2>Edit budget</h2>
        <div class="row">
          <label class="field" style="flex:1">Min<input id="bMin" type="number" value="${req.budgetMin ?? ""}" /></label>
          <label class="field" style="flex:1">Max<input id="bMax" type="number" value="${req.budgetMax ?? ""}" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="bSave">Save</button>
        </div>
      `);
      $("#bSave").addEventListener("click", () => {
        req.budgetMin = Number($("#bMin").value) || null;
        req.budgetMax = Number($("#bMax").value) || null;
        closeModal();
        toast("Budget updated");
        render();
      });
    });
    $("#actTeam")?.addEventListener("click", () => {
      const options = db.employees
        .filter((e) => !req.team.some((t) => t.employeeId === e.employeeId))
        .map((e) => `<option value="${e.employeeId}">${e.fullName}</option>`)
        .join("");
      openModal(`
        <h2>Add team member</h2>
        <label class="field">Employee<select id="tmEmp">${options}</select></label>
        <label class="field">Role
          <select id="tmRole">
            <option>Recruiter</option>
            <option>TechnicalInterviewer</option>
            <option>FinalInterviewer</option>
          </select>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="tmSave">Add</button>
        </div>
      `);
      $("#tmSave").addEventListener("click", () => {
        const emp = db.employees.find((e) => e.employeeId === $("#tmEmp").value);
        if (!emp) return;
        req.team.push({
          requisitionTeamMemberId: uid("tm"),
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          teamRole: $("#tmRole").value,
        });
        closeModal();
        toast(`Added ${emp.fullName}`);
        render();
      });
    });
  }

  function maybeAuditCompensation(req) {
    const recent = db.auditLog[0];
    const key = `${req.requisitionId}:${state.user.id}`;
    if (recent?.detail?.includes(key)) return;
    db.auditLog.unshift({
      auditId: uid("aud"),
      at: new Date().toISOString(),
      actor: state.user.fullName,
      action: "COMPENSATION.VIEW",
      entity: `Requisition ${req.requisitionId}`,
      detail: `Viewed budget (${key})`,
    });
  }

  function renderPool() {
    const q = state.poolQuery.trim().toLowerCase();
    const filtered = db.candidates.filter((c) => {
      if (!q) return true;
      return [c.fullName, c.email, c.phone, c.skills, c.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    renderShell(
      page(
        "Talent pool",
        "GET /api/candidates?q= — search across the pool (FR-CAND-005).",
        can(seed.P.CANDIDATES_MANAGE)
          ? `<button type="button" class="btn btn-primary" id="btnNewCand">Add candidate</button>`
          : "",
        `
        <div class="script">Demo step 3 — add a candidate with email <code>ada@example.com</code> to see duplicate warning.</div>
        <div class="row" style="margin-bottom:0.85rem">
          <label class="field" style="flex:1;min-width:14rem">Search
            <input id="poolSearch" type="search" placeholder="Name, email, phone, skills…" value="${state.poolQuery.replace(/"/g, "&quot;")}" />
          </label>
        </div>
        ${
          filtered.length
            ? `<div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th><th>Resume</th></tr></thead>
            <tbody>
              ${filtered
                .map(
                  (c) => `
                <tr class="clickable" data-id="${c.candidateId}">
                  <td><strong>${c.fullName}</strong></td>
                  <td>${c.email}</td>
                  <td class="mono">${c.phone}</td>
                  <td>${c.source || "—"}</td>
                  <td>${c.hasResume ? statusChip("PDF") : "—"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
            : `<div class="locked">No candidates match “${state.poolQuery}”.</div>`
        }
      `
      )
    );
    const search = $("#poolSearch");
    search?.addEventListener("input", (e) => {
      state.poolQuery = e.target.value;
      renderPool();
      const again = $("#poolSearch");
      if (again) {
        again.focus();
        const len = again.value.length;
        again.setSelectionRange(len, len);
      }
    });
    $$("tr.clickable").forEach((tr) => tr.addEventListener("click", () => go(`pool/${tr.dataset.id}`)));
    $("#btnNewCand")?.addEventListener("click", openCreateCandidateModal);
  }

  function openCreateCandidateModal() {
    openModal(`
      <h2>Add candidate</h2>
      <p class="lead">POST /api/candidates · GET /api/candidates/duplicates</p>
      <div class="stack">
        <label class="field">Full name<input id="cName" value="Ada Clone" /></label>
        <label class="field">Email<input id="cEmail" value="ada@example.com" /></label>
        <label class="field">Phone<input id="cPhone" value="03009998888" /></label>
        <label class="field">Skills<input id="cSkills" value="C#" /></label>
        <label class="field">Source
          <select id="cSource"><option>Referral</option><option>LinkedIn</option><option>Career site</option><option>Agency</option></select>
        </label>
      </div>
      <p class="hint" id="cHint"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="button" class="btn" id="cCheck">Check duplicates</button>
        <button type="button" class="btn btn-primary" id="cSave">Create anyway</button>
      </div>
    `);
    const runDup = () => {
      const email = $("#cEmail").value.trim().toLowerCase();
      const phone = $("#cPhone").value.trim();
      const matches = db.candidates.filter(
        (c) => c.email.toLowerCase() === email || c.phone === phone
      );
      const hint = $("#cHint");
      if (matches.length) {
        hint.className = "hint warn";
        hint.textContent = `DuplicateCheckResult.isDuplicate=true — matches: ${matches
          .map((m) => m.fullName)
          .join(", ")}`;
        return true;
      }
      hint.className = "hint ok";
      hint.textContent = "No duplicates found.";
      return false;
    };
    $("#cCheck").addEventListener("click", runDup);
    $("#cSave").addEventListener("click", () => {
      runDup();
      const cand = {
        candidateId: uid("c"),
        fullName: $("#cName").value.trim() || "Unnamed",
        email: $("#cEmail").value.trim(),
        phone: $("#cPhone").value.trim(),
        skills: $("#cSkills").value.trim(),
        source: $("#cSource").value,
        consentDate: new Date().toISOString().slice(0, 10),
        hasResume: false,
        resumeFileName: null,
        createdAt: new Date().toISOString(),
      };
      db.candidates.unshift(cand);
      closeModal();
      toast("Candidate created");
      go(`pool/${cand.candidateId}`);
    });
  }

  function renderCandidate() {
    const c = db.candidates.find((x) => x.candidateId === state.params.id);
    if (!c) {
      renderShell(page("Not found", "", `<a class="btn" href="#/pool">Back</a>`, `<p>Unknown candidate.</p>`));
      return;
    }
    const scoped = new Set(scopedRequisitionIds());
    const apps = db.applications.filter(
      (a) => a.candidateId === c.candidateId && (canViewAll() || scoped.has(a.requisitionId))
    );

    renderShell(
      page(
        c.fullName,
        c.email,
        `<a class="btn" href="#/pool">Pool</a>
         ${
           can(seed.P.APPLICATIONS_MANAGE)
             ? `<button type="button" class="btn btn-primary" id="btnAddToReq">Add to requisition</button>`
             : ""
         }`,
        `
        <div class="grid-2">
          <div class="stack">
            <div class="panel">
              <h2>Profile</h2>
              <dl class="kv">
                <dt>Phone</dt><dd class="mono">${c.phone}</dd>
                <dt>Skills</dt><dd>${c.skills || "—"}</dd>
                <dt>Source</dt><dd>${c.source || "—"}</dd>
                <dt>Consent</dt><dd>${c.consentDate || "—"}</dd>
                <dt>Created</dt><dd class="mono">${c.createdAt}</dd>
              </dl>
            </div>
            <div class="panel">
              <h2>Résumé</h2>
              <p class="hint">POST /api/candidates/{id}/resume · GET /api/candidates/{id}/resume</p>
              ${
                c.hasResume
                  ? `<p><strong>${c.resumeFileName || "resume.pdf"}</strong></p>
                     <div class="row">
                       <button type="button" class="btn" id="btnDlResume">Download PDF</button>
                       ${can(seed.P.CANDIDATES_MANAGE) ? `<label class="btn" style="display:inline-flex;align-items:center">Replace<input id="resumeFile" type="file" accept="application/pdf" hidden /></label>` : ""}
                     </div>`
                  : can(seed.P.CANDIDATES_MANAGE)
                    ? `<p class="hint warn">No résumé on file.</p>
                       <label class="btn btn-primary" style="display:inline-flex;align-items:center">Upload PDF<input id="resumeFile" type="file" accept="application/pdf" hidden /></label>`
                    : `<p class="hint">No résumé on file.</p>`
              }
              <p class="hint" id="resumeHint"></p>
            </div>
          </div>
          <div class="panel">
            <h2>Applications in scope</h2>
            ${
              apps.length
                ? `<ul>${apps
                    .map(
                      (a) =>
                        `<li><a href="#/pipeline">${a.requisitionTitle}</a> · ${a.stageName} ${matchScoreHtml(a)}</li>`
                    )
                    .join("")}</ul>`
                : `<p class="hint">No applications in your scope.</p>`
            }
          </div>
        </div>
      `
      )
    );
    $("#btnAddToReq")?.addEventListener("click", () => openAddApplicationModal(c.candidateId));
    $("#btnDlResume")?.addEventListener("click", () => {
      toast(`Download mock: ${c.resumeFileName || "resume.pdf"}`);
    });
    $("#resumeFile")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        $("#resumeHint").className = "hint error";
        $("#resumeHint").textContent = "PDF only.";
        return;
      }
      c.hasResume = true;
      c.resumeFileName = file.name;
      toast(`Uploaded ${file.name}`);
      render();
    });
  }

  function openAddApplicationModal(preselectCandidateId) {
    const published = db.requisitions.filter(
      (r) => r.status === "Published" && scopedRequisitionIds().includes(r.requisitionId)
    );
    openModal(`
      <h2>Add to requisition</h2>
      <p class="lead">POST /api/applications — published only; starts at Applied.</p>
      <div class="stack">
        <label class="field">Candidate
          <select id="appCand">
            ${db.candidates
              .map(
                (c) =>
                  `<option value="${c.candidateId}" ${c.candidateId === preselectCandidateId ? "selected" : ""}>${c.fullName}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="field">Published requisition
          <select id="appReq">
            ${published.map((r) => `<option value="${r.requisitionId}">${r.title}</option>`).join("")}
          </select>
        </label>
        <label class="field">Source<input id="appSource" value="Referral" /></label>
      </div>
      <p class="hint" id="appHint"></p>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="appSave">Create application</button>
      </div>
    `);
    $("#appSave").addEventListener("click", () => {
      const candidateId = $("#appCand").value;
      const requisitionId = $("#appReq").value;
      const source = $("#appSource").value.trim() || null;
      const hint = $("#appHint");
      if (!requisitionId) {
        hint.className = "hint error";
        hint.textContent = "No published requisition in scope.";
        return;
      }
      if (db.applications.some((a) => a.candidateId === candidateId && a.requisitionId === requisitionId)) {
        hint.className = "hint error";
        hint.textContent = "DuplicateApplication — candidate already applied.";
        return;
      }
      const req = db.requisitions.find((r) => r.requisitionId === requisitionId);
      const applied = db.stages.find((s) => s.name === "Applied");
      const app = {
        applicationId: uid("a"),
        candidateId,
        requisitionId,
        requisitionTitle: req.title,
        pipelineStageId: applied.pipelineStageId,
        stageName: applied.name,
        source,
        dispositionReason: null,
        matchScore: Math.floor(40 + Math.random() * 50),
        matchLabel: "Advisory",
        createdAt: new Date().toISOString(),
      };
      db.applications.unshift(app);
      closeModal();
      toast("Application created @ Applied");
      go("pipeline");
    });
  }

  function renderPipeline() {
    if (!can(seed.P.APPLICATIONS_MANAGE)) {
      renderShell(page("Pipeline", "", "", `<div class="locked">Requires APPLICATIONS.MANAGE</div>`));
      return;
    }
    const scoped = new Set(scopedRequisitionIds());
    let items = db.applications.filter((a) => scoped.has(a.requisitionId));
    if (state.filters.req !== "all") items = items.filter((a) => a.requisitionId === state.filters.req);
    if (state.filters.source !== "all") items = items.filter((a) => (a.source || "") === state.filters.source);

    const reqOptions = db.requisitions
      .filter((r) => scoped.has(r.requisitionId))
      .map((r) => `<option value="${r.requisitionId}" ${state.filters.req === r.requisitionId ? "selected" : ""}>${r.title}</option>`)
      .join("");

    renderShell(
      page(
        "Pipeline board",
        "GET /api/applications/pipeline — scoped, grouped by stage.",
        `<span class="chip">Scoped · ${scoped.size} requisitions</span>
         <button type="button" class="btn btn-primary" id="btnAddApp">Add candidate</button>`,
        `
        <div class="script">Demo step 4 — move a card; try Disqualified without a reason (blocked), then with a reason.</div>
        ${apiGap("matchScore on ApplicationPipelineItemDto", "Advisory skill-overlap % is UI-only until FR-APP-004 ships (labelled advisory; never auto-hire).")}
        <div class="row" style="margin-bottom:0.85rem">
          <label class="field">Requisition
            <select id="fReq"><option value="all">All in scope</option>${reqOptions}</select>
          </label>
          <label class="field">Source
            <select id="fSrc">
              <option value="all">Any</option>
              ${["Referral", "LinkedIn", "Career site", "Agency"]
                .map(
                  (s) =>
                    `<option value="${s}" ${state.filters.source === s ? "selected" : ""}>${s}</option>`
                )
                .join("")}
            </select>
          </label>
        </div>
        <div class="board-wrap"><div class="board" id="board"></div></div>
      `
      )
    );

    const board = $("#board");
    db.stages.forEach((stage, colIndex) => {
      const inCol = items.filter((a) => a.pipelineStageId === stage.pipelineStageId);
      const col = document.createElement("section");
      col.className = "column";
      col.dataset.stageId = stage.pipelineStageId;
      col.style.setProperty("--stage", stage.color);
      col.innerHTML = `
        <div class="column-head">
          <h2><span class="rail"></span>${stage.name}</h2>
          <span class="count">${inCol.length}</span>
        </div>
        <div class="column-body"></div>`;
      const body = $(".column-body", col);
      if (!inCol.length) body.innerHTML = `<p class="empty">No applications</p>`;
      else {
        inCol.forEach((app, i) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "card" + (state.selectedAppId === app.applicationId ? " selected" : "");
          btn.style.setProperty("--stage", stage.color);
          btn.style.animationDelay = `${colIndex * 35 + i * 30}ms`;
          btn.innerHTML = `
            <p class="card-name">${candidateName(app.candidateId)}</p>
            <p class="card-meta">${app.requisitionTitle}</p>
            <div class="card-row">
              <span class="source">${app.source || "—"}</span>
              ${matchScoreHtml(app)}
            </div>
            <div class="card-row">
              <span class="when">${fmtDate(app.createdAt).split(",")[0]}</span>
            </div>`;
          btn.addEventListener("click", () => openAppDrawer(app.applicationId));
          body.appendChild(btn);
        });
      }
      board.appendChild(col);
    });

    $("#fReq").addEventListener("change", (e) => {
      state.filters.req = e.target.value;
      render();
    });
    $("#fSrc").addEventListener("change", (e) => {
      state.filters.source = e.target.value;
      render();
    });
    $("#btnAddApp").addEventListener("click", () => openAddApplicationModal());
  }

  function openAppDrawer(applicationId) {
    const app = db.applications.find((a) => a.applicationId === applicationId);
    if (!app) return;
    state.selectedAppId = applicationId;
    const drawer = $("#drawer");
    const overlay = $("#overlay");
    drawer.innerHTML = `
      <div class="drawer-head">
        <div>
          <h2>${candidateName(app.candidateId)}</h2>
          <p class="mono" style="margin:0.3rem 0 0">${app.applicationId}</p>
        </div>
        <button type="button" class="icon-btn" id="closeDrawer" aria-label="Close">✕</button>
      </div>
      <div class="drawer-body">
        <dl class="kv">
          <dt>Requisition</dt><dd>${app.requisitionTitle}</dd>
          <dt>Stage</dt><dd>${app.stageName}</dd>
          <dt>Source</dt><dd>${app.source || "—"}</dd>
          <dt>Match</dt><dd>${matchScoreHtml(app) || "—"} <span class="hint">(advisory)</span></dd>
          <dt>Created</dt><dd class="mono">${app.createdAt}</dd>
        </dl>
        <div class="panel" style="padding:0.85rem">
          <h3>Move stage</h3>
          <label class="field">Target stage
            <select id="stageSelect">
              ${db.stages
                .map(
                  (s) =>
                    `<option value="${s.pipelineStageId}" ${s.pipelineStageId === app.pipelineStageId ? "selected" : ""}>${s.name}</option>`
                )
                .join("")}
            </select>
          </label>
          <label class="field" id="reasonWrap" hidden>Disposition reason
            <textarea id="dispositionReason" placeholder="Required for Disqualified or NFA"></textarea>
          </label>
          <p class="hint" id="stageHint"></p>
        </div>
        ${
          can(seed.P.INTERVIEWS_SCHEDULE) && app.stageName === "Interview"
            ? `<button type="button" class="btn" id="btnSchedFromPipe">Schedule interview</button>`
            : ""
        }
      </div>
      <div class="drawer-foot">
        <button type="button" class="btn" id="cancelMove">Cancel</button>
        <button type="button" class="btn btn-primary" id="confirmMove">Update stage</button>
      </div>`;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("open"));

    const syncReason = () => {
      const show = needsDisposition($("#stageSelect").value);
      $("#reasonWrap").hidden = !show;
      $("#stageHint").textContent = show
        ? "Disposition reason required for Disqualified / NFA (FR-APP-006)."
        : "";
      $("#stageHint").className = "hint";
    };
    syncReason();
    $("#stageSelect").addEventListener("change", syncReason);
    const close = () => {
      state.selectedAppId = null;
      drawer.classList.remove("open");
      overlay.classList.remove("open");
      setTimeout(() => {
        overlay.hidden = true;
        drawer.innerHTML = "";
      }, 180);
      renderPipeline();
    };
    $("#closeDrawer").addEventListener("click", close);
    $("#cancelMove").addEventListener("click", close);
    overlay.onclick = close;
    $("#confirmMove").addEventListener("click", () => {
      const stageId = $("#stageSelect").value;
      const reason = $("#dispositionReason").value.trim();
      if (needsDisposition(stageId) && !reason) {
        $("#stageHint").textContent = "A disposition reason is required for Disqualified or NFA.";
        $("#stageHint").className = "hint error";
        return;
      }
      const stage = stageById(stageId);
      app.pipelineStageId = stageId;
      app.stageName = stage.name;
      app.dispositionReason = needsDisposition(stageId) ? reason : null;
      toast(`PATCH …/stage → ${stage.name}`);
      close();
      setTimeout(() => {
        const col = document.querySelector(`[data-stage-id="${stageId}"]`);
        col?.classList.add("flash");
        setTimeout(() => col?.classList.remove("flash"), 600);
      }, 50);
    });
    $("#btnSchedFromPipe")?.addEventListener("click", () => {
      close();
      openScheduleModal(app.applicationId);
    });
  }

  function renderInterviews() {
    const mine = db.interviews.filter(
      (i) =>
        can(seed.P.INTERVIEWS_SCHEDULE) ||
        i.panel.some((p) => p.employeeId === myEmployeeId())
    );

    renderShell(
      page(
        "My interviews",
        "Feedback independence: peers stay blurred until you submit your own.",
        can(seed.P.INTERVIEWS_SCHEDULE)
          ? `<button type="button" class="btn btn-primary" id="btnSched">Schedule interview</button>`
          : "",
        `
        <div class="script">Demo step 5 — open Alan’s panel as Interviewer, submit feedback, then peer notes unlock.</div>
        ${apiGap("Interview controller / DTOs", "No /api/interviews routes in backend yet — schedule, feedback, and status are UI-forward mocks.")}
        ${
          mine.length
            ? mine
                .map((i) => {
                  const mineFb = i.feedback.find((f) => f.employeeId === myEmployeeId());
                  const peers = i.feedback.filter((f) => f.employeeId !== myEmployeeId());
                  const unlocked = !!mineFb;
                  const onPanel = i.panel.some((p) => p.employeeId === myEmployeeId());
                  const canStatus = can(seed.P.INTERVIEWS_SCHEDULE) && i.status === "Scheduled";
                  return `
                  <div class="panel" style="margin-bottom:0.85rem">
                    <div class="row" style="justify-content:space-between;align-items:flex-start">
                      <div>
                        <h2 style="margin:0">${i.candidateName}</h2>
                        <p class="hint" style="margin:0.25rem 0 0">${i.requisitionTitle} · ${i.type} · ${i.mode} · ${fmtDate(i.scheduledAt)}</p>
                      </div>
                      ${statusChip(i.status)}
                    </div>
                    <p class="hint">Panel: ${i.panel.map((p) => `${p.name}${p.isLead ? " (lead)" : ""}`).join(", ")}</p>
                    ${
                      canStatus
                        ? `<div class="row" style="margin:0.5rem 0">
                            <button type="button" class="btn btn-sm" data-done="${i.interviewId}">Mark completed</button>
                            <button type="button" class="btn btn-sm btn-warn" data-noshow="${i.interviewId}">No-show</button>
                          </div>`
                        : ""
                    }
                    <div class="grid-2" style="margin-top:0.75rem">
                      <div>
                        <h3>Your feedback</h3>
                        ${
                          mineFb
                            ? `<p><strong>${mineFb.recommendation}</strong> · ${mineFb.rating}/5</p>
                               <p class="hint">${mineFb.strengths}</p>`
                            : can(seed.P.INTERVIEWS_FEEDBACK) && onPanel && i.status !== "NoShow"
                              ? `<button type="button" class="btn btn-primary btn-sm" data-fb="${i.interviewId}">Submit feedback</button>`
                              : `<p class="hint">Waiting on your submission.</p>`
                        }
                      </div>
                      <div>
                        <h3>Peer feedback</h3>
                        ${
                          peers.length
                            ? `<div class="${unlocked ? "" : "feedback-peer"}">
                                ${peers
                                  .map(
                                    (f) =>
                                      `<p><strong>${db.employees.find((e) => e.employeeId === f.employeeId)?.fullName || "Peer"}</strong>
                                       — ${f.recommendation} (${f.rating}/5)<br/><span class="hint">${f.strengths}</span></p>`
                                  )
                                  .join("")}
                               </div>
                               ${
                                 unlocked
                                   ? ""
                                   : `<p class="hint warn">Locked until you submit (feedback independence).</p>`
                               }`
                            : `<p class="hint">No peer submissions yet.</p>`
                        }
                      </div>
                    </div>
                  </div>`;
                })
                .join("")
            : `<div class="locked">No interviews assigned.</div>`
        }
      `
      )
    );

    $("#btnSched")?.addEventListener("click", () => openScheduleModal());
    $$("[data-fb]").forEach((btn) =>
      btn.addEventListener("click", () => openFeedbackModal(btn.dataset.fb))
    );
    $$("[data-done]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const iv = db.interviews.find((x) => x.interviewId === btn.dataset.done);
        if (iv) {
          iv.status = "Completed";
          toast("Interview marked Completed");
          render();
        }
      })
    );
    $$("[data-noshow]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const iv = db.interviews.find((x) => x.interviewId === btn.dataset.noshow);
        if (iv) {
          iv.status = "NoShow";
          toast("Interview marked No-show");
          render();
        }
      })
    );
  }

  function openScheduleModal(preAppId) {
    const apps = db.applications.filter((a) => scopedRequisitionIds().includes(a.requisitionId));
    const fillPanel = (applicationId) => {
      const app = db.applications.find((a) => a.applicationId === applicationId);
      const req = db.requisitions.find((r) => r.requisitionId === app?.requisitionId);
      const pool = interviewerRoles(req?.team || []);
      const box = $("#ivPanel");
      if (!box) return;
      if (!pool.length) {
        box.innerHTML = `<p class="hint warn">No interviewer-capable team members on this requisition.</p>`;
        return;
      }
      box.innerHTML = pool
        .map(
          (t, idx) => `
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.88rem;font-weight:500;text-transform:none;letter-spacing:normal;color:var(--ink)">
          <input type="checkbox" class="ivMember" value="${t.employeeId}" ${idx === 0 ? "checked" : ""} />
          ${t.employeeName} <span class="chip neutral">${t.teamRole}</span>
          <label style="display:flex;align-items:center;gap:0.25rem;margin-left:auto;font-size:0.78rem;color:var(--muted)">
            <input type="radio" name="ivLead" value="${t.employeeId}" ${idx === 0 ? "checked" : ""} /> Lead
          </label>
        </label>`
        )
        .join("");
    };

    openModal(`
      <h2>Schedule interview</h2>
      <p class="lead">Panel from requisition interviewer team · at most one lead (FR-INT-005).</p>
      ${apiGap("POST /api/interviews", "Schedule + calendar log — contract not implemented in API yet.")}
      <div class="stack">
        <label class="field">Application
          <select id="ivApp">
            ${apps
              .map(
                (a) =>
                  `<option value="${a.applicationId}" ${a.applicationId === preAppId ? "selected" : ""}>${candidateName(a.candidateId)} · ${a.requisitionTitle}</option>`
              )
              .join("")}
          </select>
        </label>
        <div class="row">
          <label class="field" style="flex:1">Type
            <select id="ivType"><option>Technical</option><option>Panel</option><option>Final</option></select>
          </label>
          <label class="field" style="flex:1">Mode
            <select id="ivMode"><option>Video</option><option>Onsite</option><option>Phone</option></select>
          </label>
        </div>
        <label class="field">When<input id="ivWhen" type="datetime-local" /></label>
        <div class="field">Panel members
          <div id="ivPanel" class="stack" style="margin-top:0.35rem"></div>
        </div>
        <p class="hint error" id="ivErr"></p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="ivSave">Schedule</button>
      </div>
    `);
    const dt = new Date(Date.now() + 86400000);
    dt.setMinutes(0, 0, 0);
    $("#ivWhen").value = dt.toISOString().slice(0, 16);
    fillPanel($("#ivApp").value);
    $("#ivApp").addEventListener("change", (e) => fillPanel(e.target.value));
    $("#ivSave").addEventListener("click", () => {
      const app = db.applications.find((a) => a.applicationId === $("#ivApp").value);
      if (!app) return;
      const selected = $$(".ivMember:checked").map((el) => el.value);
      const leadId = document.querySelector('input[name="ivLead"]:checked')?.value;
      if (!selected.length) {
        $("#ivErr").textContent = "Select at least one panel member.";
        return;
      }
      if (!leadId || !selected.includes(leadId)) {
        $("#ivErr").textContent = "Lead must be one of the selected panel members.";
        return;
      }
      const panel = selected.map((employeeId) => {
        const emp = db.employees.find((e) => e.employeeId === employeeId);
        return { employeeId, name: emp.fullName, isLead: employeeId === leadId };
      });
      const interview = {
        interviewId: uid("i"),
        applicationId: app.applicationId,
        candidateId: app.candidateId,
        candidateName: candidateName(app.candidateId),
        requisitionId: app.requisitionId,
        requisitionTitle: app.requisitionTitle,
        scheduledAt: new Date($("#ivWhen").value).toISOString(),
        type: $("#ivType").value,
        mode: $("#ivMode").value,
        status: "Scheduled",
        panel,
        feedback: [],
      };
      const interviewStage = db.stages.find((s) => s.name === "Interview");
      const current = stageById(app.pipelineStageId);
      if (current && current.sortOrder < interviewStage.sortOrder) {
        app.pipelineStageId = interviewStage.pipelineStageId;
        app.stageName = interviewStage.name;
      }
      db.interviews.unshift(interview);
      closeModal();
      toast("Interview scheduled (calendar log only)");
      go("interviews");
    });
  }

  function openFeedbackModal(interviewId) {
    const iv = db.interviews.find((i) => i.interviewId === interviewId);
    if (!iv) return;
    openModal(`
      <h2>Submit feedback</h2>
      <p class="lead">${iv.candidateName} · one active submission per interviewer.</p>
      <div class="stack">
        <label class="field">Rating (1–5)
          <select id="fbRating"><option>5</option><option selected>4</option><option>3</option><option>2</option><option>1</option></select>
        </label>
        <label class="field">Strengths<textarea id="fbStr">Clear communication and depth.</textarea></label>
        <label class="field">Concerns<textarea id="fbCon">Would like more recent production ownership stories.</textarea></label>
        <label class="field">Recommendation
          <select id="fbRec"><option>Advance</option><option>Hold</option><option>Reject</option></select>
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="fbSave">Submit</button>
      </div>
    `);
    $("#fbSave").addEventListener("click", () => {
      if (iv.feedback.some((f) => f.employeeId === myEmployeeId())) {
        toast("Already submitted");
        closeModal();
        return;
      }
      iv.feedback.push({
        employeeId: myEmployeeId(),
        rating: Number($("#fbRating").value),
        strengths: $("#fbStr").value.trim(),
        concerns: $("#fbCon").value.trim(),
        recommendation: $("#fbRec").value,
        submittedAt: new Date().toISOString(),
      });
      closeModal();
      toast("Feedback submitted — peers unlocked");
      render();
    });
  }

  function renderStages() {
    if (!can(seed.P.STAGES_MANAGE)) {
      renderShell(page("Pipeline stages", "", "", `<div class="locked">Requires STAGES.MANAGE</div>`));
      return;
    }
    const sorted = [...db.stages].sort((a, b) => a.sortOrder - b.sortOrder);
    renderShell(
      page(
        "Pipeline stages",
        "Reserved stages cannot be deleted. Working stages are admin-managed (FR-ATS-003).",
        `<button type="button" class="btn btn-primary" id="btnAddStage">Add working stage</button>`,
        `
        ${apiGap("Pipeline stages CRUD API", "No /api/pipeline-stages controller yet — catalog is UI mock only.")}
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Name</th><th>Type</th><th></th></tr></thead>
            <tbody>
              ${sorted
                .map(
                  (s) => `
                <tr>
                  <td class="mono">${s.sortOrder}</td>
                  <td><span class="rail" style="display:inline-block;background:${s.color};margin-right:0.35rem"></span><strong>${s.name}</strong></td>
                  <td>${s.isReserved ? statusChip("Reserved") : s.terminal ? statusChip("Terminal") : statusChip("Working")}</td>
                  <td>
                    ${
                      s.isReserved
                        ? `<span class="hint">Locked</span>`
                        : `<button type="button" class="btn btn-sm" data-ren="${s.pipelineStageId}">Rename</button>
                           <button type="button" class="btn btn-sm btn-warn" data-del="${s.pipelineStageId}">Delete</button>`
                    }
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
      )
    );
    $("#btnAddStage").addEventListener("click", () => {
      openModal(`
        <h2>Add working stage</h2>
        <label class="field">Name<input id="stName" value="Take-home" /></label>
        <label class="field">Sort order<input id="stOrder" type="number" value="6" /></label>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="stAdd">Add</button>
        </div>
      `);
      $("#stAdd").addEventListener("click", () => {
        const name = $("#stName").value.trim();
        if (!name) return;
        if (db.stages.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
          toast("Stage name already exists");
          return;
        }
        db.stages.push({
          pipelineStageId: uid("s"),
          name,
          sortOrder: Number($("#stOrder").value) || 50,
          color: "#0f8b7a",
          isReserved: false,
        });
        closeModal();
        toast(`Added stage ${name}`);
        render();
      });
    });
    $$("[data-ren]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const stage = db.stages.find((s) => s.pipelineStageId === btn.dataset.ren);
        openModal(`
          <h2>Rename stage</h2>
          <label class="field">Name<input id="stName" value="${stage.name}" /></label>
          <div class="modal-actions">
            <button type="button" class="btn" data-close>Cancel</button>
            <button type="button" class="btn btn-primary" id="stRen">Save</button>
          </div>
        `);
        $("#stRen").addEventListener("click", () => {
          const name = $("#stName").value.trim();
          if (!name) return;
          stage.name = name;
          db.applications.forEach((a) => {
            if (a.pipelineStageId === stage.pipelineStageId) a.stageName = name;
          });
          closeModal();
          toast("Stage renamed");
          render();
        });
      })
    );
    $$("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.del;
        const inUse = db.applications.some((a) => a.pipelineStageId === id);
        if (inUse) {
          toast("Cannot delete — applications still on this stage");
          return;
        }
        db.stages = db.stages.filter((s) => s.pipelineStageId !== id);
        toast("Stage deleted");
        render();
      })
    );
  }

  function renderAudit() {
    if (!can(seed.P.COMPENSATION_VIEW)) {
      renderShell(page("Compensation audit", "", "", `<div class="locked">Requires ATS.COMPENSATION.VIEW</div>`));
      return;
    }
    renderShell(
      page(
        "Compensation audit",
        "Viewing budget fields appends an audit row (demo step 6).",
        "",
        `
        <div class="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
            <tbody>
              ${db.auditLog
                .map(
                  (a) => `
                <tr>
                  <td class="mono">${fmtDate(a.at)}</td>
                  <td>${a.actor}</td>
                  <td><code>${a.action}</code></td>
                  <td>${a.entity}</td>
                  <td>${a.detail}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
      )
    );
  }

  /* —— Modal helpers —— */
  function openModal(html) {
    const modal = $("#modal");
    modal.hidden = false;
    modal.innerHTML = `<div class="modal-card">${html}</div>`;
    requestAnimationFrame(() => modal.classList.add("open"));
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
    $$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
  }
  function closeModal() {
    const modal = $("#modal");
    modal.classList.remove("open");
    setTimeout(() => {
      modal.hidden = true;
      modal.innerHTML = "";
    }, 160);
  }

  function render() {
    const routes = {
      login: renderLogin,
      home: renderHome,
      requisitions: renderRequisitions,
      requisition: renderRequisitionDetail,
      pool: renderPool,
      candidate: renderCandidate,
      pipeline: renderPipeline,
      interviews: renderInterviews,
      stages: renderStages,
      audit: renderAudit,
    };
    (routes[state.route] || renderHome)();
  }

  window.addEventListener("hashchange", navigate);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#modal")?.classList.contains("open")) closeModal();
    }
  });

  // boot
  if (!location.hash) location.hash = "#/login";
  navigate();
})();
