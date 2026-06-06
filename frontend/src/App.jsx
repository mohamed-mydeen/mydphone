import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PageTransition from "./components/PageTransition";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Contacts from "./pages/Contacts";
import Emergency from "./pages/Emergency";
import Profile from "./pages/Profile";
import Import from "./pages/Import";
import Photos from "./pages/Photos";

/* AnimatedRoutes — re-mounts PageTransition on every location change */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        {/* Public */}
        <Route path="/login"           element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected */}
        <Route path="/contacts"  element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/photos"    element={<ProtectedRoute><Photos /></ProtectedRoute>} />
        <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/import"    element={<ProtectedRoute><Import /></ProtectedRoute>} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/contacts" replace />} />
      </Routes>
    </PageTransition>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>

        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              borderRadius: "10px",
              padding: "10px 14px",
              boxShadow: "0 4px 12px rgba(0,0,0,.12), 0 1px 3px rgba(0,0,0,.08)",
            },
            success: {
              iconTheme: { primary: "#16a34a", secondary: "#fff" },
              style: {
                background: "#fff",
                color: "#111827",
                border: "1px solid #e5e7eb",
              },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#fff" },
              style: {
                background: "#fff",
                color: "#111827",
                border: "1px solid #e5e7eb",
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
