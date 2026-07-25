import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApplicationsListPage } from '@/pages/ApplicationsListPage';
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage';
import { ReviewQueuePage } from '@/pages/ReviewQueuePage';
import { IngestPage } from '@/pages/IngestPage';

const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/connect" element={<AuthPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/app" element={<DashboardPage />} />
        <Route path="/app/applications" element={<ApplicationsListPage />} />
        <Route path="/app/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/app/review" element={<ReviewQueuePage />} />
        <Route path="/app/ingest" element={<IngestPage />} />
      </Route>
    </Route>

    <Route path="*" element={<LandingPage />} />
  </Routes>
);

export default App;
