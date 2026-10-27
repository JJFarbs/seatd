import { dbFor } from '@/lib/db';
import { refundTransaction } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

// Refunds guests whose booking expired (not everyone paid in time), was declined by
// the venue, or whose join request was denied. The database functions decide who is
// allowed to trigger it and which payments are refundable; this route only talks to
// Paystack. Safe to call more than once — already-refunded payments are never re-claimed.
export async function POST(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client) return Response.json({ ok: false, error: 'Database not configured' }, { status: 500 });
  const { data: auth } = await client.auth.getUser();
  const user = auth?.user;
  if (!user) return Response.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { kind, id, reason } = await req.json();
  if (!id || (kind !== 'booking' && kind !== 'join')) {
    return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  const { data: claimed, error } = kind === 'booking'
    ? await client.rpc('refund_claim_booking', { p_booking_id: id, p_reason: reason })
    : await client.rpc('refund_claim_join', { p_join_id: id });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 403 });

  let context = 'your booking';
  if (kind === 'booking') {
    const { data: b } = await client.from('bookings').select('venue_name,table_id').eq('id', id).single();
    if (b) context = `${b.venue_name} — table ${b.table_id}`;
  }

  let refunded = 0;
  let failed = 0;
  for (const row of claimed || []) {
    try {
      await refundTransaction(row.ref);
      await client.rpc('refund_finish', { p_reference: row.ref, p_ok: true });
      refunded++;
      await client.from('notifications').insert({
        user_id: row.payer,
        icon: 'check',
        text: `R${Math.round(row.amt).toLocaleString('en-ZA')} for ${context} was refunded to your card. Your bank may take a few business days to show it.`,
      });
    } catch (e) {
      await client.rpc('refund_finish', { p_reference: row.ref, p_ok: false });
      failed++;
    }
  }
  return Response.json({ ok: failed === 0, refunded, failed });
}
