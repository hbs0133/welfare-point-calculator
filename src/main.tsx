import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const CANONICAL_ORIGIN = "https://asoopoint.vercel.app";
const LEGACY_HOSTS = new Set(["welfare-point-calculator.vercel.app"]);

if (LEGACY_HOSTS.has(window.location.hostname)) {
  window.location.replace(
    `${CANONICAL_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
