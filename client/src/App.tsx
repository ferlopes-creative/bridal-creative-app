import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import GuestOnly from "./components/GuestOnly";
import InstallPrompt from "./components/InstallPrompt";
import { PageLoading } from "./components/PageLoading";
import RequireAuth from "./components/RequireAuth";
import RequireAppAccess from "./components/RequireAppAccess";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import RequireAdminAuth from "./components/RequireAdminAuth";
import { SiteSettingsProvider } from "./contexts/SiteSettingsContext";

// Carregadas sob demanda: reduzem o bundle inicial pra quem só acessa login/dashboard.
const DashboardProduct = lazy(() => import("./pages/DashboardProduct"));
const Community = lazy(() => import("./pages/Community"));
const AdminPage = lazy(() => import("./pages/Admin"));
const AdminNew = lazy(() => import("./pages/AdminNew"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const Planejamento = lazy(() => import("./pages/Planejamento"));

function Router() {
  return (
    <Suspense fallback={<PageLoading label="Carregando..." className="min-h-screen" />}>
      <Switch>
        <Route path="/">
          <Redirect to="/login" />
        </Route>
        <Route path="/login">
          <GuestOnly>
            <Login />
          </GuestOnly>
        </Route>
        <Route path="/dashboard">
          <RequireAppAccess>
            <Dashboard />
          </RequireAppAccess>
        </Route>
        <Route path="/dashboard/product/:id">
          <RequireAppAccess>
            <DashboardProduct />
          </RequireAppAccess>
        </Route>
        <Route path="/profile">
          <RequireAppAccess>
            <Profile />
          </RequireAppAccess>
        </Route>
        <Route path="/planejamento">
          <RequireAppAccess>
            <Planejamento />
          </RequireAppAccess>
        </Route>
        <Route path="/notifications">
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        </Route>
        <Route path="/community">
          <RequireAppAccess>
            <Community />
          </RequireAppAccess>
        </Route>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin">
          <RequireAdminAuth>
            <AdminPage />
          </RequireAdminAuth>
        </Route>
        <Route path="/admin/new">
          <RequireAdminAuth>
            <AdminNew />
          </RequireAdminAuth>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SiteSettingsProvider>
          <TooltipProvider>
            <div className="min-h-screen w-full bg-background">
              <Router />
              <Toaster />
              <InstallPrompt />
            </div>
          </TooltipProvider>
        </SiteSettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
