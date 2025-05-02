import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import "react-loading-skeleton/dist/skeleton.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme accentColor="green" grayColor="sand" radius="large" scaling="95%">
      <App />
    </Theme>
  </StrictMode>
);
