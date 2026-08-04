import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeFirebase } from "./services/initFirebase";

// Initialize Firebase early so services are available for components that expect them
initializeFirebase();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
