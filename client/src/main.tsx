import { createRoot, hydrateRoot } from "react-dom/client";
import AppRoot from "./AppRoot";
import { queryClient } from "./lib/queryClient";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const app = <AppRoot queryClient={queryClient} />;
const hasSSRMarkup = rootElement.innerHTML.trim().length > 0;

if (hasSSRMarkup) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
