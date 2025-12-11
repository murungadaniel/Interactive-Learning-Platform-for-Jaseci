// src/App.tsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";

import AppShell from "./layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import SubjectsPage from "./pages/SubjectsPage";
import AIPage from "./pages/AIPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ProfilePage from "./pages/ProfilePage";
import VirtualClassroomPage from "./pages/VirtualClassroomPage";
import { Role } from "./types";
import { theme } from "./theme";
import type { AuthUser } from "./api";

const App: React.FC = () => {
  const [role, setRole] = useState<Role>("Student");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppShell role={role} setRole={setRole} authUser={authUser} setAuthUser={setAuthUser}>
          <Routes>
            <Route path="/" element={<SubjectsPage authUser={authUser} />} />
            <Route path="/dashboard" element={<DashboardPage role={role} />} />
            <Route
              path="/classroom"
              element={<VirtualClassroomPage role={role} />}
            />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/subjects" element={<Navigate to="/" replace />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage role={role} />} />
          </Routes>
        </AppShell>
      </Router>
    </ThemeProvider>
  );
};

export default App;
