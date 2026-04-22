import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardProduct from "./pages/DashboardProduct";
import Community from "./pages/Community";
import AdminPage from "./pages/Admin";
import AdminNew from "./pages/AdminNew";
import Notifications from "./pages/Notifications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/product/:id" component={DashboardProduct} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/community" component={Community} />
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
        <TooltipProvider>
          <div className="min-h-screen w-full bg-background">
            <div className="w-full mx-auto px-4 md:px-8 lg:px-16 xl:px-24">
              <Router />
            </div>
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;