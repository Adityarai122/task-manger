import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthService from '@/lib/features/auth/domain/services/AuthService';
import { useAuthStore } from '@/lib/features/auth/presentation/states/authState';
import { ROUTES } from './routes';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';
import { RequirePermission } from './RequirePermission';

import { LoginPage } from '@/lib/features/auth/presentation/pages/LoginPage';
import { AppShell } from '@/lib/features/app/presentation/pages/AppShell';
import { DashboardPage } from '@/lib/features/dashboard/presentation/pages/DashboardPage';
import { UsersAdminPage } from '@/lib/features/user/presentation/pages/UsersAdminPage';
import { ProfilePage } from '@/lib/features/user/presentation/pages/ProfilePage';
import { ProjectsPage } from '@/lib/features/project/presentation/pages/ProjectsPage';
import { ProjectDetailPage } from '@/lib/features/project/presentation/pages/ProjectDetailPage';
import { TasksPage } from '@/lib/features/task/presentation/pages/TasksPage';
import { ForbiddenPage } from '@/lib/components/ForbiddenPage';
import { NotFoundPage } from '@/lib/components/NotFoundPage';

export function AppRouter() {
  const setStatus = useAuthStore((s) => s.setStatus);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    AuthService.hydrate()
      .then((user) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={ROUTES.login}
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route
            path={ROUTES.projects}
            element={
              <RequirePermission perm="project.read">
                <ProjectsPage />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.projectDetail()}
            element={
              <RequirePermission perm="project.read">
                <ProjectDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.tasks}
            element={
              <RequirePermission perm="task.read">
                <TasksPage />
              </RequirePermission>
            }
          />
          <Route
            path={ROUTES.users}
            element={
              <RequirePermission perm="user.read">
                <UsersAdminPage />
              </RequirePermission>
            }
          />
        </Route>

        <Route path={ROUTES.forbidden} element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
