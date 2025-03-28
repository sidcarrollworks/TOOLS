import { render } from "preact";
import App from "./app";
import "./styles/index.css";

// Add global unhandled promise rejection handler for diagnostics
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Promise Rejection Diagnostic]", {
    reason: event.reason,
    message: event?.reason?.message || "No message",
    stack: event?.reason?.stack || "No stack trace",
    timestamp: new Date().toISOString(),
    url: window.location.href,
    // Include info about current app state if possible
    appState: {
      documentReadyState: document.readyState,
      isVisible: document.visibilityState,
    },
  });
});

render(<App />, document.getElementById("app")!);
