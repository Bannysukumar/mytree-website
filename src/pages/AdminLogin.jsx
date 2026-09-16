import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { Link } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import { auth, firebaseReady, googleProvider } from "../lib/firebase";

export default function AdminLogin({ onDenied }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  async function google() {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div id="main" className="mesh mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="rounded-card border border-white/10 bg-moss p-6">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl text-foam">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Only emails on the admin allow-list can change content, price, or referral rates.</p>
        {!firebaseReady && <p className="mt-4 text-sm text-sand">Firebase is not configured. Add the VITE_FIREBASE_* keys to .env and restart.</p>}
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-4 py-3" />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-4 py-3" />
          </label>
          <button className="min-h-11 w-full rounded-md bg-leaf py-3 text-sm font-semibold text-ink" type="submit">Sign in</button>
        </form>
        <button type="button" onClick={google} className="mt-3 min-h-11 w-full rounded-md border border-white/15 py-3 text-sm">Continue with Google</button>
        {(error || onDenied) && <p className="mt-3 text-sm text-clay" role="alert">{error || "This account is not on the admin allow-list."}</p>}
        <Link to="/" className="mt-6 inline-block text-sm text-mint">Back to the site</Link>
      </div>
    </div>
  );
}
