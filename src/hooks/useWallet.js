import { useAccount, useBalance, useDisconnect } from "wagmi";
import { walletConnectEnabled } from "../lib/wagmi";

export function useWallet() {
  const account = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address: account.address });
  return {
    address: account.address,
    isConnected: account.isConnected,
    chain: account.chain,
    balance,
    disconnect,
    walletConnectEnabled,
  };
}
