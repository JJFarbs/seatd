// Server-only Paystack helper. Never import this from a 'use client' file —
// it reads the secret key from process.env and must never reach the browser bundle.
const BASE = 'https://api.paystack.co';

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return key;
}

async function paystackFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + secretKey(),
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.status === false) {
    const msg = (json && json.message) || `Paystack request failed (${res.status})`;
    throw new Error(msg);
  }
  return json.data;
}

// South African banks Paystack supports for settlement subaccounts.
export function listBanks() {
  return paystackFetch('/bank?country=south africa&currency=ZAR&perPage=200');
}

// Creates a Paystack subaccount for a venue's own bank account. Transactions that
// pass this subaccount code settle the venue's share directly to their bank —
// Seat'd's main account only ever receives the platform fee, never the full amount.
export function createSubaccount({ businessName, bankCode, accountNumber }) {
  return paystackFetch('/subaccount', {
    method: 'POST',
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 5, // fallback split if a transaction doesn't override it below
    }),
  });
}

// amount/platformFee are in Rand; Paystack wants kobo/cents (smallest unit), so *100.
// subaccountCode + transactionCharge + bearer:'account' means the venue's subaccount
// gets (amount - platformFee) settled directly, Seat'd's main account gets platformFee,
// and Seat'd's main account (not the venue) absorbs Paystack's own processing fee.
export function initializeTransaction({ email, amount, platformFee, subaccountCode, reference, metadata, callbackUrl }) {
  const body = {
    email,
    amount: Math.round(amount * 100),
    currency: 'ZAR',
    reference,
    metadata,
    callback_url: callbackUrl,
  };
  if (subaccountCode) {
    body.subaccount = subaccountCode;
    body.transaction_charge = Math.round(platformFee * 100);
    body.bearer = 'account';
  }
  return paystackFetch('/transaction/initialize', { method: 'POST', body: JSON.stringify(body) });
}

// Full refund of one transaction (no amount = refund everything the guest paid).
export function refundTransaction(reference) {
  return paystackFetch('/refund', { method: 'POST', body: JSON.stringify({ transaction: reference }) });
}

export function verifyTransaction(reference) {
  return paystackFetch('/transaction/verify/' + encodeURIComponent(reference));
}
