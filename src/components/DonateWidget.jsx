import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, firebaseReady, functions } from "../lib/firebase";
import { formatInr } from "../lib/format";
import { useSiteContent } from "../hooks/useSiteContent";
import { Disclaimer } from "./ui";

const presets = [500, 1000, 2500, 5000];

function loadCheckout() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function DonateWidget() {
  const { legal } = useSiteContent();
  const [amount, setAmount] = useState(1000);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("General climate fund");
  const [orderId, setOrderId] = useState("");
  const [donation, setDonation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orderId || !firebaseReady || !db) return undefined;
    return onSnapshot(doc(db, "donations", orderId), (snap) => setDonation(snap.data() || null));
  }, [orderId]);

  async function donate() {
    setError("");
    if (!functions) {
      setError("Donations need Firebase Functions and Razorpay keys on the server.");
      return;
    }
    setBusy(true);
    try {
      const create = httpsCallable(functions, "createRazorpayOrder");
      const { data } = await create({ amountInr: Number(amount), name, email, purpose });
      setOrderId(data.orderId);
      const ready = await loadCheckout();
      if (!ready) throw new Error("Razorpay Checkout could not load.");
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "Mytree Ecosystem",
        description: purpose,
        order_id: data.orderId,
        prefill: { name, email },
        handler: async (response) => {
          const verify = httpsCallable(functions, "verifyRazorpayPayment");
          await verify(response);
        },
        theme: { color: "#143028" },
      });
      checkout.open();
    } catch (err) {
      setError(err.message || "Could not start the donation.");
    } finally {
      setBusy(false);
    }
  }

  const paid = donation?.status === "paid";

  return (
    <section id="donate" className="page scroll-mt-24 py-8">
      <div className="rounded-3xl border border-sand/30 bg-gradient-to-br from-sand/10 to-transparent p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-sand">Donate in INR</p>
        <h2 className="mt-3 font-display text-4xl text-foam">A gift is not a token purchase.</h2>
        <p className="mt-3 max-w-2xl text-white/70">
          Razorpay Checkout, rupees only. This form does not connect a wallet, does not issue $MYTREE, and does not pay a referral bonus. The webhook, not this page, marks a donation paid.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex flex-wrap gap-2">
              {presets.map((n) => (
                <button key={n} type="button" onClick={() => setAmount(n)} className={`min-h-11 rounded-control px-4 text-sm ${Number(amount) === n ? "bg-sand text-ink" : "bg-white/5 text-foam"}`}>
                  {formatInr(n)}
                </button>
              ))}
            </div>
            <input type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-4 w-full rounded-2xl border border-white/10 bg-ink/50 px-4 py-3" />
            <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/50 px-4 py-3" />
            <input placeholder="Email for receipt (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/50 px-4 py-3" />
            <input placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/50 px-4 py-3" />
            <button type="button" disabled={busy} onClick={donate} className="mt-4 min-h-11 rounded-control bg-sand px-5 py-3 font-semibold text-ink disabled:opacity-60">
              {busy ? "Opening checkout…" : "Donate with Razorpay"}
            </button>
            {error && <p className="mt-3 text-sm text-clay">{error}</p>}
            <Disclaimer>{legal?.donate}</Disclaimer>
          </div>
          <div className="rounded-2xl bg-ink/40 p-5">
            <p className="text-sm text-white/50">Confirmation</p>
            {!donation && <p className="mt-3 text-white/70">No donation started in this session.</p>}
            {donation && (
              <div className="mt-3 space-y-2 text-sm">
                <p>Status: <span className={paid ? "text-mint" : "text-sand"}>{donation.status}</span></p>
                <p>Amount: {formatInr(donation.amountInr)}</p>
                {donation.checkoutVerified && !paid && <p>Checkout signed. Waiting for the Razorpay webhook to confirm.</p>}
                {paid && <p className="text-foam">Recorded as a paid INR donation. No tokens were issued and no referral was paid.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
