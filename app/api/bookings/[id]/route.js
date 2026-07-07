import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  if (!db) return Response.json({ db: false });
  const body = await req.json();
  const allowed = ['status', 'payments', 'cancel_reason', 'paid_now'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  const { error } = await db.from('bookings').update(update).eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
