import { db, dbFor } from '@/lib/db';
import { initializeTransaction } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

const SERVICE_RATE = 0.05;
const serviceFee = (n) => Math.ceil((Number(n) || 0) * SERVICE_RATE);

// Every real-money checkout in the app (booking host payment, a friend paying their
// split-pay share, a ticket purchase, or paying to join someone's public table)
// goes through here. The server — not the client — decides the fee and the venue's
// payout subaccount, so nothing about the split can be tampered with from the browser.
export async function POST(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client || !db) return Response.json({ ok: false, error: 'Database not configured' }, { status: 500 });
  const { data: auth } = await client.auth.getUser();
  const user = auth?.user;
  if (!user) return Response.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const body = await req.json();
  const { kind, venueId, subtotal, fee: feeOverride, meta } = body;
  if (!kind || !venueId || !(subtotal > 0)) {
    return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  const { data: venue } = await db.from('venues').select('id,name,paystack_subaccount_code,payout_status').eq('id', venueId).single();
  if (!venue) return Response.json({ ok: false, error: 'Venue not found' }, { status: 404 });
  if (venue.payout_status !== 'active' || !venue.paystack_subaccount_code) {
    return Response.json({ ok: false, error: 'venue_not_ready', message: `${venue.name} hasn't finished payment setup yet` }, { status: 409 });
  }

  // ticket + join prices are clean (subtotal set by the venue), so we derive the fee.
  // split-pay shares (booking_host / booking_share) already have the fee baked into
  // a pre-computed share amount shown to the guest, so the client passes the exact
  // fee portion of that share to keep the charge byte-for-byte what was displayed.
  const fee = typeof feeOverride === 'number' ? feeOverride : serviceFee(subtotal);
  const amount = subtotal + fee;
  const reference = 'SEATD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const { error: insErr } = await client.from('pending_payments').insert({
    reference, kind, venue_id: venueId, user_id: user.id, amount, subtotal, fee, meta: meta || {},
  });
  if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });

  try {
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const tx = await initializeTransaction({
      email: user.email,
      amount,
      platformFee: fee,
      subaccountCode: venue.paystack_subaccount_code,
      reference,
      metadata: { kind, venueId, userId: user.id },
      callbackUrl: origin + '/?paystack_ref=' + encodeURIComponent(reference),
    });
    return Response.json({ ok: true, authorization_url: tx.authorization_url, reference });
  } catch (e) {
    await client.from('pending_payments').update({ status: 'failed' }).eq('reference', reference);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
