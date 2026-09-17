import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { getAddress, zeroAddress } from "viem";
import { usePublicClient, useSignMessage, useWriteContract } from "wagmi";
import { db, firebaseReady, functions } from "../lib/firebase";
import { captureReferralFromUrl, normalizeRef, profileMessage, readReferralCode, referralLink } from "../lib/referralUtils";
import { presaleAbi } from "../lib/contractConfig";
import { runExclusive } from "../lib/runPurchase";
import { useSiteContent } from "./useSiteContent";
import { useWallet } from "./useWallet";

export function useReferralCode() {
  const { address, isConnected } = useWallet();
  const { sale } = useSiteContent();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [code, setCode] = useState("");
  const [referrerWallet, setReferrerWallet] = useState("");
  const [landingCode, setLandingCode] = useState("");
  const [landingWallet, setLandingWallet] = useState("");
  const [chainReferrer, setChainReferrer] = useState("");
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = captureReferralFromUrl();
    setLandingCode(saved);
    if (/^0x[a-fA-F0-9]{40}$/.test(saved)) setLandingWallet(saved.toLowerCase());
  }, []);

  useEffect(() => {
    const code = normalizeRef(landingCode);
    if (!code || /^0x/.test(code) || !functions) return undefined;
    let cancelled = false;
    httpsCallable(functions, "lookupReferral")({ code })
      .then((res) => {
        if (!cancelled && res.data?.wallet) setLandingWallet(String(res.data.wallet).toLowerCase());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [landingCode]);

  useEffect(() => {
    if (!address || !sale?.contractAddress || !publicClient) return undefined;
    let cancelled = false;
    publicClient.readContract({
      address: sale.contractAddress,
      abi: presaleAbi,
      functionName: "referrerOf",
      args: [getAddress(address)],
    }).then((bound) => {
      if (!cancelled && bound && bound !== zeroAddress) setChainReferrer(String(bound).toLowerCase());
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, sale?.contractAddress, publicClient]);

  useEffect(() => {
    if (!address || !firebaseReady || !db) return undefined;
    return onSnapshot(doc(db, "users", address.toLowerCase()), (snap) => {
      const data = snap.data();
      setProfile(data || null);
      if (data?.referralCode) setCode(data.referralCode);
      if (data?.referredBy) setReferrerWallet(data.referredBy);
    });
  }, [address]);

  function activate(referrerAddress = "") {
    if (!address || !functions) {
      setError("Connect Firebase Functions before a referral profile can be stored.");
      return Promise.resolve(false);
    }
    return runExclusive(async () => {
      setBusy(true);
      setError("");
      try {
        const signature = await signMessageAsync({ message: profileMessage(address) });
        const call = httpsCallable(functions, "ensureReferralProfile");
        const result = await call({
          address,
          signature,
          referredByCode: /^0x/i.test(readReferralCode()) ? "" : readReferralCode(),
          referredByWallet: String(referrerAddress || (/^0x/i.test(readReferralCode()) ? readReferralCode() : "")).trim(),
        });
        setCode(result.data.referralCode);
        setReferrerWallet(result.data.referredBy || "");
        if (result.data.referredBy && sale?.contractAddress && publicClient) {
          const bound = await publicClient.readContract({
            address: sale.contractAddress,
            abi: presaleAbi,
            functionName: "referrerOf",
            args: [getAddress(address)],
          });
          if (!bound || bound === zeroAddress) {
            await writeContractAsync({
              address: sale.contractAddress,
              abi: presaleAbi,
              functionName: "attachReferrer",
              args: [getAddress(result.data.referredBy)],
              chainId: Number(sale.chainId),
            });
          }
        }
        return true;
      } catch (err) {
        setError(err.shortMessage || err.message || "Could not activate referral profile.");
        return false;
      } finally {
        setBusy(false);
      }
    });
  }

  const own = address?.toLowerCase() || "";
  const incoming = chainReferrer || referrerWallet || profile?.referredBy || landingWallet;
  const referrer = incoming && incoming !== own ? incoming : "";

  return {
    code: code || profile?.referralCode || "",
    landingCode,
    shareLink: address ? referralLink(getAddress(address)) : "",
    referrerWallet: referrer,
    profile,
    isConnected,
    busy,
    error,
    activate,
    needsActivation: isConnected && !code,
  };
}
