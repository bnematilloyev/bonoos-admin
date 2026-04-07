// App.jsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login/LoginPage';
import { CategoriesPage } from './pages/Categories/CategoriesPage';
import { TopicsPage } from './pages/Topics/TopicsPage';
import { PlansPage } from './pages/Plans/PlansPage';
import { QuotesPage } from './pages/Quotes/QuotesPage';
import { ChallengesPage } from './pages/Challenges/ChallengesPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { UsersPage } from './pages/Users/UsersPage';
import { ChallengeMonitoringPage } from './pages/ChallengeMonitoring/ChallengeMonitoringPage';
import { SubscriptionsPage } from './pages/Subscriptions/SubscriptionsPage';
import { PaymentsPage } from './pages/Payments/PaymentsPage';
import { NotificationsPage } from './pages/Notifications/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/analytics" replace />,
      },
      {
        path: 'dashboard',
        element: <Navigate to="/analytics" replace />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'challenge-monitoring',
        element: <ChallengeMonitoringPage />,
      },
      {
        path: 'categories',
        element: <CategoriesPage />,
      },
      {
        path: 'topics',
        element: <TopicsPage />,
      },
      {
        path: 'plans',
        element: <PlansPage />,
      },
      {
        path: 'subscriptions',
        element: <SubscriptionsPage />,
      },
      {
        path: 'payments',
        element: <PaymentsPage />,
      },
      {
        path: 'quotes',
        element: <QuotesPage />,
      },
      {
        path: 'challenges',
        element: <ChallengesPage />,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;