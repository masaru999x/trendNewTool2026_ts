import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./trend.scss";
import App from "./trend_notice";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
