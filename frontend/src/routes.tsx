import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './layout/AppShell'
import { CompensationAuditPage } from './pages/audit/CompensationAuditPage'
import { HomePage } from './pages/HomePage'
import { MyInterviewsPage } from './pages/interviews/MyInterviewsPage'
import { ScheduleInterviewPage } from './pages/interviews/ScheduleInterviewPage'
import { LoginPage } from './pages/LoginPage'
import { CandidateDetailPage } from './pages/pool/CandidateDetailPage'
import { TalentPoolPage } from './pages/pool/TalentPoolPage'
import { PipelineBoardPage } from './pages/pipeline/PipelineBoardPage'
import { RequisitionDetailPage } from './pages/requisitions/RequisitionDetailPage'
import { RequisitionsListPage } from './pages/requisitions/RequisitionsListPage'
import { StagesAdminPage } from './pages/stages/StagesAdminPage'

/** Owner: Tayyab — keep route adds append-only to reduce merge conflicts. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="requisitions" element={<RequisitionsListPage />} />
        <Route path="requisitions/:id" element={<RequisitionDetailPage />} />
        <Route path="pool" element={<TalentPoolPage />} />
        <Route path="pool/:id" element={<CandidateDetailPage />} />
        <Route path="pipeline" element={<PipelineBoardPage />} />
        <Route path="interviews" element={<MyInterviewsPage />} />
        <Route path="interviews/schedule" element={<ScheduleInterviewPage />} />
        <Route path="stages" element={<StagesAdminPage />} />
        <Route path="audit" element={<CompensationAuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
