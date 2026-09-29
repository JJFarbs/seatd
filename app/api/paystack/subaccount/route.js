import { dbFor } from '@/lib/db';
import { createSubaccount } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client) return Response.json({ ok: false, error: 'Database not configured' }, { status: 500 });
  const { data: auth } = await client.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return Response.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const body = await req.json();
  const { venueId, bankCode, bankName, accountNumber, businessName } = body;
  if (!venueId || !bankCode || !accountNumber || !businessName) {
    return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  // confirm the caller owns this venue (or is an admin) before touching payouts
  const { data: profile } = await client.from('profiles').select('role,venue_id').eq('id', uid).single();
  const allowed = profile && (profile.role === 'admin' || (profile.role === 'club_owner' && profile.venue_id === venueId));
  if (!allowed) return Response.json({ ok: false, error: 'Not authorised for this venue' }, { status: 403 });

  try {
    const sub = await createSubaccount({ businessName, bankCode, accountNumber });
    const last4 = String(accountNumber).slice(-4);
    const { error } = await client.from('venues').update({
      paystack_subaccount_code: sub.subaccount_code,
      payout_bank_name: bankName || null,
      payout_bank_code: bankCode,
      payout_account_last4: last4,
      payout_account_name: businessName,
      payout_status: 'active',
    }).eq('id', venueId);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, last4 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
