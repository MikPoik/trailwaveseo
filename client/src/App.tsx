import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import SiteHistory from "@/pages/SiteHistory";
import HowItWorks from "@/pages/HowItWorks";
import Settings from "@/pages/Settings";
import AnalysisDetails from "@/pages/AnalysisDetails";
import Account from "@/pages/Account";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "./hooks/useAuth";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; path: string }) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <div className="p-8 flex justify-center items-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    // Could use a redirect, but for simplicity just show a message
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

  return <Component {...rest} />;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/site-history">
            <ProtectedRoute path="/site-history" component={SiteHistory} />
          </Route>
          <Route path="/history">
            <ProtectedRoute path="/history" component={SiteHistory} />
          </Route>
          <Route path="/analysis/:id">
            {(params) => (
              <ProtectedRoute 
                path={`/analysis/${params.id}`} 
                component={AnalysisDetails} 
              />
            )}
          </Route>
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/settings">
            <ProtectedRoute path="/settings" component={Settings} />
          </Route>
          <Route path="/account">
            <ProtectedRoute path="/account" component={Account} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
