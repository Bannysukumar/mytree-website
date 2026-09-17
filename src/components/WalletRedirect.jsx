import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { readBuyReturn, readJoinReturn, takeDashboardRedirect } from "../lib/dashRedirect";

export default function WalletRedirect() {
  const { isConnected } = useWallet();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const buyBack = readBuyReturn();
    const here = `${pathname}${search}${window.location.hash}`;
    if (buyBack && here !== buyBack) {
      navigate(buyBack, { replace: true });
      return;
    }
    const back = readJoinReturn();
    if (back && pathname === "/" && here !== back) {
      takeDashboardRedirect();
      navigate(back, { replace: true });
      return;
    }
    if (!isConnected) return;
    if (pathname.startsWith("/join") || pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      if (pathname.startsWith("/join")) takeDashboardRedirect();
      return;
    }
    if (takeDashboardRedirect()) navigate("/dashboard");
  }, [isConnected, pathname, search, navigate]);

  return null;
}
