import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Spinner } from '../components/common/ui';
import { PERMISSIONS } from '../constants';
import { ProtectedRoute, PublicOnlyRoute } from './guards';

// Route-level code splitting: each page is downloaded on first visit.
const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage'));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('../features/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('../features/projects/ProjectDetailPage'));
const MyTasksPage = lazy(() => import('../features/tasks/MyTasksPage'));
const UsersPage = lazy(() => import('../features/users/UsersPage'));
const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const page = (Component) => (
  <Suspense fallback={<Spinner />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: page(LoginPage) },
      { path: '/register', element: page(RegisterPage) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: page(DashboardPage) },
          { path: 'projects', element: page(ProjectsPage) },
          { path: 'projects/:projectId', element: page(ProjectDetailPage) },
          { path: 'tasks', element: page(MyTasksPage) },
          { path: 'profile', element: page(ProfilePage) },
          {
            element: <ProtectedRoute anyOf={[PERMISSIONS.USERS_READ]} />,
            children: [{ path: 'users', element: page(UsersPage) }],
          },
          { path: '*', element: page(NotFoundPage) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
