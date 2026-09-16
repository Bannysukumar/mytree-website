import { parseAbi, parseUnits } from "viem";
import abi from "./abi/MytreePresale.json";

export const presaleAbi = parseAbi(abi);

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export const bsc = {
  id: 56,
  name: "BNB Smart Chain",
  explorer: "https://bscscan.com",
  usdt: "0x55d398326f99059fF775485246999027B3197955",
};

export function targetChain(sale) {
  return Number(sale?.chainId || bsc.id);
}

export function usdtTokenAddress(sale) {
  return sale?.usdtAddress || bsc.usdt;
}

export function isUsdtCurrency(currency) {
  return String(currency?.symbol || "").toUpperCase() === "USDT" && currency?.type !== "fiat";
}

export const inrNotForTokens =
  "Tokens can only be bought with USDT (BEP20). INR is for donations only and does not issue tokens or referral income.";

export function toTokenUnits(amount, decimals = 18) {
  const raw = String(amount ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(raw) || Number(raw) <= 0) {
    throw new Error("Enter a USDT amount.");
  }
  const fraction = raw.split(".")[1] || "";
  if (fraction.length > decimals) {
    throw new Error("Too many decimal places for USDT.");
  }
  return parseUnits(raw, decimals);
}
