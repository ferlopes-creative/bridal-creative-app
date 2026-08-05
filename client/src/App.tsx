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
import SplashIntro from "./components/SplashIntro";
import { AppAccessProvider } from "./contexts/AppAccessContext";
import { CommunityAccessProvider } from "./contexts/CommunityAccessContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import RequireAdminAuth from "./components/RequireAdminAuth";
import { SiteSettingsProvider } from "./contexts/SiteSettingsContext";

// Carregadas sob demanda: reduzem o bundle inicial pra quem só acessa login/dashboard.
const loadDashboardProduct = () => import("./pages/DashboardProduct");
const loadCommunity = () => import("./pages/Community");
const loadAdminPage = () => import("./pages/Admin");
const loadAdminNew = () => import("./pages/AdminNew");
const loadNotifications = () => import("./pages/Notifications");
const loadProfile = () => import("./pages/Profile");
const loadPlanejamento = () => import("./pages/Planejamento");
const loadCategoryProducts = () => import("./pages/CategoryProducts");

const DashboardProduct = lazy(loadDashboardProduct);
const Community = lazy(loadCommunity);
const AdminPage = lazy(loadAdminPage);
const AdminNew = lazy(loadAdminNew);
const Notifications = lazy(loadNotifications);
const Profile = lazy(loadProfile);
const Planejamento = lazy(loadPlanejamento);
const CategoryProducts = lazy(loadCategoryProducts);

/** Busca os chunks das outras páginas em segundo plano, pra troca de aba dentro
 * do app não mostrar tela de carregamento de novo. Chamada só depois que a
 * splash de abertura termina. */
function prefetchRoutes() {
  const run = () => {
    void loadDashboardProduct();
    void loadCommunity();
    void loadNotifications();
    void loadProfile();
    void loadPlanejamento();
    void loadCategoryProducts();
    // Admin/AdminNew ficam de fora: só quem administra usa, não vale a banda de todo mundo.
  };

  const ric = (window as typeof window & { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (ric) {
    ric(run);
  } else {
    window.setTimeout(run, 300);
  }
}

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
        <Route path="/dashboard/categoria/:id">
          <RequireAppAccess>
            <CategoryProducts />
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
          <AppAccessProvider>
            <CommunityAccessProvider>
              <TooltipProvider>
                <div className="min-h-screen w-full bg-background">
                  <Router />
                  <Toaster />
                  <InstallPrompt />
                  <SplashIntro onFinished={prefetchRoutes} />
                </div>
              </TooltipProvider>
            </CommunityAccessProvider>
          </AppAccessProvider>
        </SiteSettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
