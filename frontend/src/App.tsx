// src/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import SubjectsPage from "./pages/SubjectsPage";
import AIPage from "./pages/AIPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ProfilePage from "./pages/ProfilePage";
import VirtualClassroomPage from "./pages/VirtualClassroomPage";
import { Role } from "./types";
import { loadSavedAuthUser } from "./api";
import type { AuthUser } from "./api";

// Protected route wrapper - redirects guests to home
const ProtectedRoute: React.FC<{ children: React.ReactNode; authUser: AuthUser | null }> = ({ 
  children, 
  authUser 
}) => {
  if (!authUser) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [role, setRole] = useState<Role>("Student");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Load saved authentication on app startup
  useEffect(() => {
    const saved = loadSavedAuthUser();
    if (saved) {
      setAuthUser(saved);
    }
  }, []);

  return (
    <Router>
      <AppShell role={role} setRole={setRole} authUser={authUser} setAuthUser={setAuthUser}>
        <Routes>
          <Route path="/" element={<SubjectsPage authUser={authUser} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute authUser={authUser}>
                <DashboardPage role={role} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classroom"
            element={
              <ProtectedRoute authUser={authUser}>
                <VirtualClassroomPage role={role} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute authUser={authUser}>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route path="/subjects" element={<Navigate to="/" replace />} />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute authUser={authUser}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute authUser={authUser}>
                <ProfilePage role={role} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default App;
