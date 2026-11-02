import { Navigate, Route, Routes } from 'react-router-dom'
import { Permissions } from './api/client'
import { RequireAuth } from './auth/RequireAuth'
import { RequirePermission } from './auth/RequirePermission'
import { AppShell } from './layout/AppShell'
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
        <Route
          path="requisitions"
          element={
            <RequirePermission
              anyOf={[Permissions.RequisitionsManage, Permissions.RequisitionsViewAll]}
            >
              <RequisitionsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="requisitions/:id"
          element={
            <RequirePermission
              anyOf={[Permissions.RequisitionsManage, Permissions.RequisitionsViewAll]}
            >
              <RequisitionDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="pool"
          element={
            <RequirePermission
              anyOf={[
                Permissions.PoolView,
                Permissions.CandidatesManage,
                Permissions.ApplicationsManage,
              ]}
            >
              <TalentPoolPage />
            </RequirePermission>
          }
        />
        <Route
          path="pool/:id"
          element={
            <RequirePermission anyOf={[Permissions.PoolView]}>
              <CandidateDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="pipeline"
          element={
            <RequirePermission anyOf={[Permissions.ApplicationsManage]}>
              <PipelineBoardPage />
            </RequirePermission>
          }
        />
        <Route
          path="interviews"
          element={
            <RequirePermission
              anyOf={[Permissions.InterviewsFeedbackAdd, Permissions.InterviewsSchedule]}
            >
              <MyInterviewsPage />
            </RequirePermission>
          }
        />
        <Route
          path="interviews/schedule"
          element={
            <RequirePermission anyOf={[Permissions.InterviewsSchedule]}>
              <ScheduleInterviewPage />
            </RequirePermission>
          }
        />
        <Route
          path="stages"
          element={
            <RequirePermission anyOf={[Permissions.StagesManage]}>
              <StagesAdminPage />
            </RequirePermission>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
