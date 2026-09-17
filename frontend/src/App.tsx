import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { HomePage } from './pages/HomePage';
import { WorkforcePage } from './pages/WorkforcePage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { PlatformsPage } from './pages/PlatformsPage';
import { AssetsPage } from './pages/AssetsPage';
import { CapabilitiesPage } from './pages/CapabilitiesPage';
import { ResourcePlannerPage } from './pages/ResourcePlannerPage';
import { AttestationsPage } from './pages/AttestationsPage';
import { AttestationDetailPage } from './pages/AttestationDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdministrationPage } from './pages/AdministrationPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/workforce" element={<WorkforcePage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/capabilities" element={<CapabilitiesPage />} />
        <Route path="/planner" element={<ResourcePlannerPage />} />
        <Route path="/attestations" element={<AttestationsPage />} />
        <Route path="/attestations/:assignmentId" element={<AttestationDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/administration" element={<AdministrationPage />} />
      </Route>
    </Routes>
  );
}
