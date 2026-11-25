import { createBrowserRouter, Navigate } from 'react-router';

/** Route-level code splitting: each screen is fetched when first visited. */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return async () => ({ Component: (await load())[name] as React.ComponentType });
}
import { AppShell } from './app-shell';
import {
  RequireAuth,
  RequirePermission,
  RequirePlatform,
  RequirePlatformPermission,
} from './guards';
import { AcceptInvitationPage } from '../features/auth/accept-invitation-page';
import { LoginPage } from '../features/auth/login-page';
import { PlatformShell } from '../features/platform/platform-shell';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/accept-invitation', element: <AcceptInvitationPage /> },
  {
    path: '/platform',
    element: <RequirePlatform />,
    children: [
      {
        element: <PlatformShell />,
        children: [
          {
            element: <RequirePlatformPermission permission="platform.organizations.read" />,
            children: [
              {
                index: true,
                lazy: page(() => import('../features/platform/hospitals-page'), 'HospitalsPage'),
              },
              {
                path: 'hospitals/:organizationId',
                lazy: page(
                  () => import('../features/platform/hospital-detail-page'),
                  'HospitalDetailPage',
                ),
              },
              {
                path: 'invitations',
                lazy: page(
                  () => import('../features/platform/platform-invitations-page'),
                  'PlatformInvitationsPage',
                ),
              },
            ],
          },
          {
            path: 'account',
            lazy: page(
              () => import('../features/platform/platform-account-page'),
              'PlatformAccountPage',
            ),
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            element: <RequirePermission permission="dashboard.read" />,
            children: [
              {
                index: true,
                lazy: page(() => import('../features/dashboard/dashboard-page'), 'DashboardPage'),
              },
            ],
          },
          {
            element: <RequirePermission permission="appointments.read" />,
            children: [
              {
                path: 'schedule',
                lazy: page(() => import('../features/scheduling/schedule-page'), 'SchedulePage'),
              },
            ],
          },
          {
            element: <RequirePermission permission="patients.read" />,
            children: [
              {
                path: 'patients',
                lazy: page(
                  () => import('../features/patients/patient-list-page'),
                  'PatientListPage',
                ),
              },
              {
                path: 'patients/:patientId',
                lazy: page(
                  () => import('../features/patients/patient-detail-page'),
                  'PatientDetailPage',
                ),
              },
            ],
          },
          {
            element: <RequirePermission permission="patients.write" />,
            children: [
              {
                path: 'patients/:patientId/edit',
                lazy: page(
                  () => import('../features/patients/patient-edit-page'),
                  'PatientEditPage',
                ),
              },
              {
                path: 'patients/new',
                lazy: page(
                  () => import('../features/patients/patient-register-page'),
                  'PatientRegisterPage',
                ),
              },
            ],
          },
          {
            element: <RequirePermission permission="encounters.read" />,
            children: [
              {
                path: 'consultations',
                lazy: page(
                  () => import('../features/encounters/consultations-page'),
                  'ConsultationsPage',
                ),
              },
              {
                path: 'encounters/:encounterId',
                lazy: page(() => import('../features/encounters/encounter-page'), 'EncounterPage'),
              },
            ],
          },
          {
            element: <RequirePermission permission="users.read" />,
            children: [
              {
                path: 'admin/users',
                lazy: page(() => import('../features/admin/users-page'), 'UsersPage'),
              },
            ],
          },
          {
            element: <RequirePermission permission="users.read" />,
            children: [
              {
                path: 'admin/invitations',
                lazy: page(() => import('../features/admin/invitations-page'), 'InvitationsPage'),
              },
            ],
          },
          {
            element: <RequirePermission permission="audit.read" />,
            children: [
              {
                path: 'admin/audit',
                lazy: page(() => import('../features/admin/audit-page'), 'AuditPage'),
              },
            ],
          },
          {
            path: 'account',
            lazy: page(() => import('../features/account/account-page'), 'AccountPage'),
          },
          { path: 'account/password', element: <Navigate to="/account" replace /> },
          {
            path: 'design-system',
            lazy: page(
              () => import('../features/design-system/design-system-page'),
              'DesignSystemPage',
            ),
          },
          { path: 'admin', element: <Navigate to="/admin/users" replace /> },
          {
            path: '*',
            lazy: page(() => import('../features/auth/not-found-page'), 'NotFoundPage'),
          },
        ],
      },
    ],
  },
]);
