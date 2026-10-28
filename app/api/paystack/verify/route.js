import { dbFor } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';
import { refCode, todayStr, isoToday } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client) return Response.json({ ok: false, error: 'Database not configured' }, { status: 500 });
  const { data: auth } = await client.auth.getUser();
  const user = auth?.user;
  if (!user) return Response.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { reference } = await req.json();
  if (!reference) return Response.json({ ok: false, error: 'reference required' }, { status: 400 });

  const { data: pending } = await client.from('pending_payments').select('*').eq('reference', reference).eq('user_id', user.id).single();
  if (!pending) return Response.json({ ok: false, error: 'Payment not found' }, { status: 404 });

  // already processed (e.g. the guest refreshed the page after redirect) — return the same result again
  if (pending.status === 'completed') {
    return Response.json({ ok: true, kind: pending.kind, result: pending.meta?._result || null });
  }

  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
  if (tx.status !== 'success' || Math.round(tx.amount) !== Math.round(pending.amount * 100)) {
    await client.from('pending_payments').update({ status: 'failed' }).eq('reference', reference);
    return Response.json({ ok: false, error: 'Payment was not successful' }, { status: 402 });
  }

  const m = pending.meta || {};
  let result = null;

  try {
    if (pending.kind === 'booking_host') {
      const id = 'r' + Date.now();
      const code = refCode(m.tier);
      const row = {
        id, venue_id: pending.venue_id, venue_name: m.venueName, table_id: m.tableId, tier: m.tier,
        men: m.men, women: m.women, total: pending.amount, subtotal: pending.subtotal, service_fee: pending.fee,
        paid_now: m.myShare, min_spend: m.min, status: 'pending', deadline_ms: Date.now() + 20 * 60 * 1000,
        code, who: m.who, t_label: 'just now', split_pay: !!m.splitPay, invited: m.invited || [],
        promo: m.promo, date_label: todayStr(), payments: m.payments || [], user_id: user.id, paystack_ref: reference,
        bottles: m.bottles || [],
        ...(m.slotTime ? { slot_date: m.slotDate, slot_time: m.slotTime, party: m.party } : {}),
      };
      if (!m.slotTime) { // club table: stamp the venue's current event date so it can move to Previous bookings after the night
        const { data: vn } = await client.from('venues').select('event_date').eq('id', pending.venue_id).single();
        if (vn?.event_date && vn.event_date >= isoToday()) row.slot_date = vn.event_date;
      }
      const { error } = await client.from('bookings').insert(row);
      if (error) throw error;
      result = { bookingId: id, code };
    } else if (pending.kind === 'booking_share') {
      const { data: booking } = await client.from('bookings').select('*').eq('id', m.bookingId).single();
      if (!booking) throw new Error('Booking not found');
      const payments = (booking.payments || []).map((p) => (p.id === m.paymentId ? { ...p, status: 'paid' } : p));
      const { error } = await client.from('bookings').update({ payments }).eq('id', m.bookingId);
      if (error) throw error;
      result = { bookingId: m.bookingId };
    } else if (pending.kind === 'ticket') {
      const id = 'tp' + Date.now();
      const code = 'TKT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: vn } = await client.from('venues').select('tickets').eq('id', pending.venue_id).single();
      const tdef = (Array.isArray(vn?.tickets) ? vn.tickets : []).find((x) => x.id === m.ticketId);
      const row = {
        id, venue_id: pending.venue_id, venue_name: m.venueName, ticket_id: m.ticketId, ticket_name: m.ticketName,
        price: m.price, qty: m.qty, subtotal: pending.subtotal, service_fee: pending.fee, total: pending.amount,
        status: 'confirmed', code, user_id: user.id, name: m.name, date_label: todayStr(), paystack_ref: reference,
        event_date: tdef?.date || null, bottles: m.bottles || [],
      };
      const { error } = await client.from('ticket_purchases').insert(row);
      if (error) throw error;
      result = { purchaseId: id, code };
    } else if (pending.kind === 'join') {
      const id = 'jr' + Date.now();
      const { error } = await client.from('join_requests').insert({
        id, public_table_id: m.ptId, user_id: user.id, name: m.name, amount: pending.subtotal, paystack_ref: reference,
      });
      if (error) throw error;
      result = { joinId: id, ptId: m.ptId };
    } else {
      throw new Error('Unknown payment kind');
    }
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }

  await client.from('pending_payments').update({ status: 'completed', meta: { ...m, _result: result } }).eq('reference', reference);
  return Response.json({ ok: true, kind: pending.kind, result });
}
