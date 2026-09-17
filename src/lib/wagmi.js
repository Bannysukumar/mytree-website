import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
export const walletConnectEnabled = projectId.length > 8;
export const siteUrl = import.meta.env.VITE_SITE_URL || "https://uwgea32.web.app";

export const chains = [bsc];

export const walletMetadata = {
  name: "Mytree Ecosystem",
  description: "Buy $MYTREE and fund grassroots climate work",
  url: siteUrl,
  icons: [`${siteUrl.replace(/\/$/, "")}/logo.svg`],
  redirect: {
    native: siteUrl,
    universal: siteUrl,
  },
};

function applyWalletReturn(metadata, target) {
  if (!metadata) return;
  metadata.url = target;
  metadata.redirect = {
    ...(metadata.redirect || {}),
    native: target,
    universal: target,
  };
}

export async function prepareWalletReturn({ persist = false } = {}) {
  const path = `${window.location.pathname}${window.location.search}`;
  const here = `${window.location.origin}${path}`;
  const target = path && path !== "/" ? here : siteUrl;
  applyWalletReturn(walletMetadata, target);
  const { markJoinReturn, markPageReturn } = await import("./dashRedirect");
  if (path.startsWith("/join")) markJoinReturn(path);
  if (persist) markPageReturn(path);
  try {
    const { OptionsController } = await import("@web3modal/core");
    OptionsController.setMetadata({ ...walletMetadata, redirect: { ...walletMetadata.redirect } });
  } catch {
    // Modal metadata is optional. The connector metadata is what the wallet reads.
  }
}

function fallbackConfig() {
  return createConfig({
    chains,
    connectors: [injected({ shimDisconnect: true })],
    transports: {
      [bsc.id]: http("https://bsc-dataseed.binance.org"),
    },
    ssr: false,
  });
}

export const wagmiConfig = walletConnectEnabled
  ? defaultWagmiConfig({
      chains,
      projectId,
      metadata: walletMetadata,
      enableWalletConnect: true,
      auth: { email: false, socials: [], showWallets: true },
    })
  : fallbackConfig();

if (walletConnectEnabled) {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    defaultChain: bsc,
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#3dbe7a",
      "--w3m-color-mix": "#07140f",
      "--w3m-border-radius-master": "2px",
    },
  });
}
