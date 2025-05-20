import { Switch, Route } from "wouter";
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
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/site-history" component={SiteHistory} />
          <Route path="/history" component={SiteHistory} />
          <Route path="/analysis/:id" component={AnalysisDetails} />
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/settings" component={Settings} />
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
