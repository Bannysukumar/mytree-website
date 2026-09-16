# Mytree Ecosystem

Grassroots climate-action site for the **Mytree Ecosystem** brand. It sells **$MYTREE** through a connected wallet, keeps **INR donations** on a separate Razorpay path, and runs a dual-incentive referral program (referrer and buyer both paid in $MYTREE on a confirmed purchase). Public copy, prices, tracks, and bonus percentages come from Firestore, not from hardcoded frontend values.

## Stack

- React (Vite) + Tailwind
- wagmi + Web3Modal (WalletConnect v2)
- Firebase Auth, Firestore, Cloud Functions, Hosting
- Solidity + Hardhat (`MytreeToken`, `MytreePresale`)
- Razorpay Orders + webhook (INR only)

## Local preview

```bash
npm install
cp .env.example .env
npm run dev
```

Without Firebase keys the site still renders from `public/seed/content.json`. The admin panel can sign in only after Firebase is configured.

## Firebase

1. Create a Firebase project and enable Auth (email/password and Google), Firestore, Functions, and Hosting.
2. Put the web config in `.env` as `VITE_FIREBASE_*`.
3. Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes`
4. Seed content:

```bash
# serviceAccount.json from Firebase console, or GOOGLE_APPLICATION_CREDENTIALS
npm run seed
```

5. Create the first admin user in Authentication, then:

```bash
node scripts/bootstrap-admin.mjs you@example.org
```

Rules only allow writes when `adminEmails/{email}` exists or the `admin` custom claim is set. Purchase, donation, and referral-ledger documents are writable only by Cloud Functions.

## Contracts

Never put a private key in source. Copy `.env.example` and set `RPC_URL` and `PRIVATE_KEY` locally.

```bash
npm run contracts:test
npm run contracts:deploy
```

`MytreeToken` mints a fixed 10,000,000,000 supply of `mytree` to the treasury once. `MytreePresale.buyTokens(referrer)` sells tokens and, in the same transaction, pays:

- buyer bonus (default 5%, basis points `500`) only when a valid referrer is set
- referrer bonus (default 10%, basis points `1000`)
- optional upstream levels, capped by `maxDepth` (max 5)

Self-referral is ignored and earns no buyer bonus either. After deploy, paste the presale address into Admin → Sale, then use **setPrice**, **setLimits**, and Referral → **Sync to contract** from the owner wallet so the chain matches the admin panel.

`setReferralBonuses` takes basis points, not whole percents. The admin sync button converts `10` → `1000`.

## Wallets

Set `VITE_WALLETCONNECT_PROJECT_ID` from [WalletConnect Cloud](https://cloud.walletconnect.com). Web3Modal then shows browser extensions on desktop, a QR code when no extension is installed, and mobile deep links. In-app wallet browsers use the injected provider. Without a project id, only injected wallets connect.

Return handling:

- session metadata includes the site URL so supported wallets can redirect back
- a banner inside wallet browsers links back to the site with the referral code preserved
- the page re-checks the transaction with `useWaitForTransactionReceipt` and a Firestore `onSnapshot` on `purchases/{txHash}`

Pending purchases are written by `registerPendingPurchase` (the client cannot write that collection). `pollPurchaseStatus` (every minute) or `watchPurchaseEvents` (Alchemy/Moralis POST with `x-mytree-secret`) marks the row confirmed or failed. Referral ledger rows are written only after confirmation, from the on-chain `ReferralBonusPaid` events. The function does not send a second token transfer.

## Donations

INR only, completely separate from wallets and referrals.

1. Set function secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
2. Deploy functions: `firebase deploy --only functions`
3. Point the Razorpay webhook at `razorpayWebhook`. That handler is the source of truth for `paid`. The browser callback only sets `checkoutVerified`.
4. Optional receipt email: `SENDGRID_API_KEY` and `FROM_EMAIL`.

A paid donation never calls referral distribution and never transfers $MYTREE.

## Deploy hosting

```bash
npm run build
firebase deploy --only hosting
```

Set `VITE_SITE_URL` to the public origin before building so referral links and wallet redirects use it.

## Program rules

- No referral captured → no buyer bonus and no referrer bonus.
- A wallet cannot refer itself.
- Upstream levels stop at `maxDepth`.
- Admin can blacklist a wallet from the dashboard and push that list on-chain.
- Crypto purchases are final and can lose value. Referral percentages can be changed. Donations are non-refundable except as a written policy says.
