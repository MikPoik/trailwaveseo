import { Router, type RouterProps } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";

export type RouterOverrides = Pick<RouterProps, "base" | "hook" | "ssrPath" | "ssrSearch">;

export interface AppRootProps {
  queryClient: QueryClient;
  routerProps?: RouterOverrides;
}

export function AppRoot({ queryClient, routerProps }: AppRootProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router {...routerProps}>
          <App />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default AppRoot;
