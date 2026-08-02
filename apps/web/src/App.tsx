import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterOrgPage from './pages/RegisterOrgPage';
import RegisterFacilityPage from './pages/RegisterFacilityPage';
import StaffInvitationsPage from './pages/StaffInvitationsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding/org" replace />} />
        <Route path="/onboarding/org" element={<RegisterOrgPage />} />
        <Route path="/onboarding/facility" element={<RegisterFacilityPage />} />
        <Route path="/onboarding/staff" element={<StaffInvitationsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
