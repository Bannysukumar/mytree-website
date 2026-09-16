import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import App from "./App";
import { SiteContentProvider } from "./hooks/useSiteContent";
import { readJoinReturn, readPageReturn } from "./lib/dashRedirect";
import { prepareWalletReturn, wagmiConfig } from "./lib/wagmi";
import "./index.css";

const here = `${window.location.pathname}${window.location.search}`;
const back = window.location.pathname === "/" ? (readPageReturn() || readJoinReturn()) : "";
if (back && here !== back) window.history.replaceState(null, "", back);
prepareWalletReturn();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SiteContentProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SiteContentProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
