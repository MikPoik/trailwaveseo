import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import SiteHistory from "@/pages/SiteHistory";
import HowItWorks from "@/pages/HowItWorks";
import Pricing from "@/pages/Pricing";
import Settings from "@/pages/Settings";
import AnalysisDetails from "@/pages/AnalysisDetails";
import Account from "@/pages/Account";
import ContentEditor from "@/pages/ContentEditor";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { useAuth } from "./hooks/useAuth";

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return <div className="p-8 flex justify-center items-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
        <p className="mb-4">You need to log in to access this page.</p>
        <button
          onClick={() => login()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Log in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto w-full md:w-auto">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  return (
    <div className="min-h-screen">
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/dashboard">
          <AuthenticatedApp>
            <Dashboard />
          </AuthenticatedApp>
        </Route>
        <Route path="/site-history">
          <AuthenticatedApp>
            <SiteHistory />
          </AuthenticatedApp>
        </Route>
        <Route path="/history">
          <AuthenticatedApp>
            <SiteHistory />
          </AuthenticatedApp>
        </Route>
        <Route path="/analysis/:id">
          {(params) => (
            <AuthenticatedApp>
              <AnalysisDetails />
            </AuthenticatedApp>
          )}
        </Route>
        <Route path="/settings">
          <AuthenticatedApp>
            <Settings />
          </AuthenticatedApp>
        </Route>
        <Route path="/account">
          <AuthenticatedApp>
            <Account />
          </AuthenticatedApp>
        </Route>
        <Route path="/content-editor/:analysisId/:pageUrl">
          {(params) => (
            <AuthenticatedApp>
              <ContentEditor />
            </AuthenticatedApp>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}

export default App;
