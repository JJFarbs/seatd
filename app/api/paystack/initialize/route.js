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

  const { data: venue } = await db.from('venues').select('id,name,paystack_subaccount_code,payout_status,kind,deposit_pp,deposit_mode,fee_payer,slot_covers,max_party,menu,tickets').eq('id', venueId).single();
  if (!venue) return Response.json({ ok: false, error: 'Venue not found' }, { status: 404 });
  if (venue.payout_status !== 'active' || !venue.paystack_subaccount_code) {
    return Response.json({ ok: false, error: 'venue_not_ready', message: `${venue.name} hasn't finished payment setup yet` }, { status: 409 });
  }

  // ticket + join prices are clean (subtotal set by the venue), so we derive the fee.
  // split-pay shares (booking_host / booking_share) already have the fee baked into
  // a pre-computed share amount shown to the guest, so the client passes the exact
  // fee portion of that share to keep the charge byte-for-byte what was displayed.
  // bottle pre-orders: re-price every item from the venue's own menu, never from the browser
  const sentBottles = Array.isArray(meta?.bottles) ? meta.bottles : [];
  let bottlesTotal = 0;
  const bottles = [];
  for (const b of sentBottles) {
    const m = (venue.menu || [])[Number(b.i)];
    const qty = Math.floor(Number(b.qty) || 0);
    if (!m || qty < 1 || qty > 20) return Response.json({ ok: false, error: 'Invalid bottle order' }, { status: 400 });
    bottles.push({ i: Number(b.i), name: m[0], price: Number(m[1]) || 0, qty });
    bottlesTotal += (Number(m[1]) || 0) * qty;
  }
  if (meta) { meta.bottles = bottles; meta.bottlesTotal = bottlesTotal; }
  if (kind === 'ticket') {
    const tdef = (Array.isArray(venue.tickets) ? venue.tickets : []).find((x) => x.id === meta?.ticketId);
    const qty = Math.floor(Number(meta?.qty) || 0);
    if (!tdef || qty < 1 || subtotal !== (Number(tdef.price) || 0) * qty + bottlesTotal) {
      return Response.json({ ok: false, error: 'Ticket price mismatch — please refresh and try again' }, { status: 400 });
    }
  }

  // restaurant reservations: the deposit is priced on the server, never trusted from the browser
  if (kind === 'booking_host' && meta?.slotTime) {
    const party = Math.floor(Number(meta.party) || 0);
    if (venue.kind !== 'restaurant' || party < 1 || party > (venue.max_party || 10)) {
      return Response.json({ ok: false, error: 'Invalid reservation' }, { status: 400 });
    }
    const groupTotal = venue.deposit_mode === 'booking' ? venue.deposit_pp : venue.deposit_pp * party;
    const sharers = 1 + (meta.splitPay ? (meta.invited || []).length : 0);
    const minShare = Math.floor(groupTotal / sharers) - 1;
    const maxShare = Math.ceil(groupTotal / sharers) + 1;
    if (subtotal < minShare || subtotal > maxShare) {
      return Response.json({ ok: false, error: 'Deposit mismatch — please refresh and try again' }, { status: 400 });
    }
    const { data: taken } = await client.from('bookings').select('party,men,women')
      .eq('venue_id', venueId).eq('slot_date', meta.slotDate).eq('slot_time', meta.slotTime).in('status', ['pending', 'confirmed', 'checkedin']);
    const used = (taken || []).reduce((a, r) => a + (r.party || (r.men || 0) + (r.women || 0)), 0);
    if (used + party > (venue.slot_covers || 40)) {
      return Response.json({ ok: false, error: 'slot_full', message: 'That time just filled up — pick another slot' }, { status: 409 });
    }
  }

  // who pays Seat'd's 5%: the guest (added on top) or the venue (deducted from its payout)
  const venuePays = venue.fee_payer === 'venue';
  const platformFee = venuePays ? serviceFee(subtotal) : null;
  const fee = venuePays ? 0 : (typeof feeOverride === 'number' ? feeOverride : serviceFee(subtotal));
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
      platformFee: platformFee ?? fee,
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
