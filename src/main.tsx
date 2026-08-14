import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeFirebase } from "./services/initFirebase";
import { getErrorMessage, logError } from "./utils/errors";

const container = document.getElementById("root");

if (!container) {
  throw new Error('StudyOS could not start: no element with id "root" found.');
}

const root = createRoot(container);

// Initialize Firebase early so services are available for components that expect them
try {
  initializeFirebase();

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  logError("Firebase initialization failed", error);
  root.render(
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        StudyOS could not start
      </h1>
      <p style={{ marginTop: "0.75rem" }}>
        {getErrorMessage(
          error,
          "Firebase could not be initialized. Check your environment configuration.",
        )}
      </p>
    </div>,
  );
}
