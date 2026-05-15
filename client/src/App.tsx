import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import GuestOnly from "./components/GuestOnly";
import RequireAuth from "./components/RequireAuth";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardProduct from "./pages/DashboardProduct";
import Community from "./pages/Community";
import AdminPage from "./pages/Admin";
import AdminNew from "./pages/AdminNew";
import Notifications from "./pages/Notifications";
import { SiteSettingsProvider } from "./contexts/SiteSettingsContext";

function Router() {
  return (
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
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      </Route>
      <Route path="/dashboard/product/:id">
        <RequireAuth>
          <DashboardProduct />
        </RequireAuth>
      </Route>
      <Route path="/notifications">
        <RequireAuth>
          <Notifications />
        </RequireAuth>
      </Route>
      <Route path="/community">
        <RequireAuth>
          <Community />
        </RequireAuth>
      </Route>
      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/new" component={AdminNew} />
      <Route component={NotFound} />
    </Switch>
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
            </div>
          </TooltipProvider>
        </SiteSettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;