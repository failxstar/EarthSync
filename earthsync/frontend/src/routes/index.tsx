import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { Dashboard } from '../pages/citizen/Dashboard';
import { Resources } from '../pages/resources/Resources';
import { Reports } from '../pages/reports/Reports';
import { Impact } from '../pages/impact/Impact';
import { Admin } from '../pages/admin/Admin';
import { Profile } from '../pages/profile/Profile';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      
      // Protected Routes with Dashboard & Sidebar Layout
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: 'dashboard', element: <Dashboard /> },
              { path: 'resources', element: <Resources /> },
              { path: 'reports', element: <Reports /> },
              { path: 'impact', element: <Impact /> },
              { path: 'profile', element: <Profile /> },
              { path: 'admin', element: <Admin /> },
            ]
          }
        ]
      }
    ],
  },
]);
