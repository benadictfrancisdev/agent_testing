import "@/App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { setAuthTokenGetter } from "@/lib/api";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ProjectsList from "@/pages/ProjectsList";
import ProjectDetail from "@/pages/ProjectDetail";
import ProvidersPage from "@/pages/ProvidersPage";
import ModelsPage from "@/pages/ModelsPage";
import AuditPage from "@/pages/AuditPage";
import SettingsPage from "@/pages/SettingsPage";
import RunView from "@/pages/RunView";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/projects" element={<ProjectsList />} />
      <Route path="/projects/:id" element={<ProjectDetail />} />
      <Route path="/providers" element={<ProvidersPage />} />
      <Route path="/models" element={<ModelsPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/runs/new" element={<RunView />} />
      <Route path="/runs/:runId" element={<RunView />} />
    </Routes>
  );
}

function ClerkApp() {
  const { Show, SignIn, SignUp, useAuth } = require("@clerk/react");
  const ClerkAuthProvider = require("@/components/auth/ClerkAuthProvider").default;

  function AuthSync() {
    const { getToken } = useAuth();
    useEffect(() => { setAuthTokenGetter(getToken); }, [getToken]);
    return null;
  }

  return (
    <ClerkAuthProvider>
      <AuthSync />
      <Show when="signed-in">
        <Layout><AppRoutes /></Layout>
      </Show>
      <Show when="signed-out">
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
          <Routes>
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />} />
            <Route path="*" element={<Navigate to="/sign-in" replace />} />
          </Routes>
        </div>
      </Show>
    </ClerkAuthProvider>
  );
}

function App() {
  const [authMode, setAuthMode] = useState("loading");

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/clerk/config`)
      .then((r) => r.json())
      .then((cfg) => setAuthMode(cfg.enabled ? "clerk" : "none"))
      .catch(() => setAuthMode("none"));
  }, []);

  if (authMode === "loading") return null;

  return (
    <BrowserRouter>
      {authMode === "clerk" ? <ClerkApp /> : <Layout><AppRoutes /></Layout>}
      <Toaster
        position="bottom-right"
        toastOptions={{ style: { background: "#121215", border: "1px solid #27272a", color: "#f4f4f5" } }}
      />
    </BrowserRouter>
  );
}

export default App;
