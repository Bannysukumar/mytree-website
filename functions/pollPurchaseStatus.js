const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { db, hitLimit, clientKey, FieldValue } = require("./lib/rateLimit");
const { recordConfirmedPurchase } = require("./distributeReferralRewards");

function provider() {
  const { JsonRpcProvider } = require("ethers");
  const url = process.env.RPC_URL;
  if (!url) throw new Error("RPC_URL is not set");
  return new JsonRpcProvider(url);
}

async function loadSale() {
  const snap = await db().collection("config").doc("sale").get();
  return snap.exists ? snap.data() : {};
}

/**
 * Writes the pending purchase the UI is waiting on. The client cannot write
 * `purchases` directly. We confirm the broadcast tx exists and the sender
 * matches the claimed buyer before recording it.
 */
exports.registerPendingPurchase = onCall({ timeoutSeconds: 120 }, async (request) => {
  const allowed = await hitLimit(`pending:${clientKey(request)}`, 15, 10 * 60 * 1000);
  if (!allowed) throw new HttpsError("resource-exhausted", "Too many purchase registrations.");

  const txHash = String(request.data?.txHash || "");
  const buyer = String(request.data?.buyer || "").toLowerCase();
  const referrer = String(request.data?.referrer || "").toLowerCase();
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash) || !/^0x[0-9a-fA-F]{40}$/.test(buyer)) {
    throw new HttpsError("invalid-argument", "A transaction hash and buyer address are required.");
  }
  if (referrer && referrer === buyer) {
    throw new HttpsError("invalid-argument", "A wallet cannot refer itself.");
  }

  const ref = db().collection("purchases").doc(txHash.toLowerCase());
  const existing = await ref.get();
  const patch = {
    txHash,
    buyer,
    referrer: referrer && referrer !== buyer ? referrer : existing.data()?.referrer || "",
    status: existing.data()?.status === "confirmed" ? "confirmed" : "pending",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!existing.exists) patch.createdAt = FieldValue.serverTimestamp();
  await ref.set(patch, { merge: true });

  const rpc = provider();
  let receipt = null;
  for (let attempt = 0; attempt < 20 && !receipt; attempt += 1) {
    try {
      receipt = await rpc.getTransactionReceipt(txHash);
    } catch {
      receipt = null;
    }
    if (!receipt) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (receipt?.status === 1) {
    await settle(await ref.get());
  }
  const saved = (await ref.get()).data() || {};
  return { ok: true, status: saved.status || "pending" };
});

async function settle(docSnap) {
  const data = docSnap.data();
  if (!data?.txHash || data.status === "confirmed" || data.status === "failed") return;
  const rpc = provider();
  const receipt = await rpc.getTransactionReceipt(data.txHash);
  if (!receipt) {
    if (data.status === "pending") {
      await docSnap.ref.set({ status: "confirming", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return;
  }
  if (receipt.status !== 1) {
    await docSnap.ref.set(
      { status: "failed", blockNumber: receipt.blockNumber, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return;
  }
  const tx = await rpc.getTransaction(data.txHash);
  if (tx && data.buyer && tx.from.toLowerCase() !== String(data.buyer).toLowerCase()) {
    await docSnap.ref.set({ status: "failed", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  if (!data.referrer && data.buyer) {
    try {
      const sale = await loadSale();
      const { Contract, ZeroAddress } = require("ethers");
      const onchain = await new Contract(sale.contractAddress, ["function referrerOf(address) view returns (address)"], rpc).referrerOf(data.buyer);
      if (onchain && onchain !== ZeroAddress) data.referrer = String(onchain).toLowerCase();
    } catch (err) {
      console.error("referrer lookup failed", err);
    }
  }
  await recordConfirmedPurchase(docSnap.ref, data, receipt);
}

async function syncChainPurchases() {
  const sale = await loadSale();
  if (!sale.contractAddress) return;
  const { Interface, id } = require("ethers");
  const rpc = provider();
  const latest = await rpc.getBlockNumber();
  const stateRef = db().collection("config").doc("purchaseSync");
  const state = (await stateRef.get()).data() || {};
  let cursor = Number(state.lastBlock || latest - 8000);
  if (cursor < latest - 20000) cursor = latest - 20000;
  if (cursor >= latest) return;

  const iface = new Interface([
    "event TokensPurchased(address indexed buyer, uint256 usdtPaid, uint256 tokensReceived)",
    "event ReferralAccrued(address indexed earner, uint256 amount)",
  ]);
  const topic = id("TokensPurchased(address,uint256,uint256)");
  const stop = Math.min(cursor + 900, latest);
  while (cursor < stop) {
    const to = Math.min(cursor + 8, stop);
    const logs = await rpc.getLogs({
      address: sale.contractAddress,
      fromBlock: cursor + 1,
      toBlock: to,
      topics: [topic],
    });
    for (const log of logs) {
      const parsed = iface.parseLog(log);
      const txHash = log.transactionHash;
      const ref = db().collection("purchases").doc(txHash.toLowerCase());
      const existing = await ref.get();
      if (existing.data()?.status === "confirmed") continue;
      const buyer = String(parsed.args.buyer).toLowerCase();
      await ref.set(
        {
          txHash,
          buyer,
          usdtPaid: parsed.args.usdtPaid.toString(),
          status: existing.data()?.status || "pending",
          createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      const receipt = await rpc.getTransactionReceipt(txHash);
      if (receipt?.status === 1) await recordConfirmedPurchase(ref, (await ref.get()).data(), receipt);
    }
    cursor = to;
  }
  await stateRef.set({ lastBlock: cursor, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

exports.pollPurchaseStatus = onSchedule({ schedule: "every 1 minutes" }, async () => {
  try {
    await syncChainPurchases();
  } catch (err) {
    console.error("chain purchase sync failed", err);
  }
  const snap = await db().collection("purchases").where("status", "in", ["pending", "confirming"]).limit(25).get();
  for (const docSnap of snap.docs) {
    try {
      await settle(docSnap);
    } catch (err) {
      console.error("poll failed", docSnap.id, err);
    }
  }
});

/**
 * Alchemy Notify / Moralis Streams can POST here. Set the same secret on the
 * provider and in PURCHASE_WEBHOOK_SECRET. Body: { txHash }.
 */
exports.watchPurchaseEvents = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }
  const secret = process.env.PURCHASE_WEBHOOK_SECRET;
  if (!secret || req.headers["x-mytree-secret"] !== secret) {
    res.status(401).send("unauthorized");
    return;
  }
  const txHash = String(req.body?.txHash || req.body?.hash || "").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(txHash)) {
    res.status(400).send("txHash required");
    return;
  }
  const ref = db().collection("purchases").doc(txHash);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(202).send("unknown purchase");
    return;
  }
  await settle(snap);
  res.status(200).send("ok");
});
