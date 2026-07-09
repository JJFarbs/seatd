import { db, dbFor } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!db) return Response.json({ db: false });
  const [venuesRes, reviewsRes] = await Promise.all([
    db.from('venues').select('*').order('id'),
    db.from('reviews').select('*').order('created_at', { ascending: false }),
  ]);
  if (venuesRes.error || reviewsRes.error) {
    return Response.json({ db: false, error: (venuesRes.error || reviewsRes.error).message }, { status: 500 });
  }
  return Response.json({ db: true, venues: venuesRes.data, reviews: reviewsRes.data });
}

export async function PATCH(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client) return Response.json({ db: false });
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const allowed = ['name', 'area', 'genre', 'tagline', 'dress', 'parking', 'open_hours', 'vip', 'status', 'when_label', 'min_from', 'capacity', 'menu', 'events', 'layout', 'lat', 'lng'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];
  const { error } = await client.from('venues').update(update).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function POST(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client) return Response.json({ db: false });
  const body = await req.json();
  const { error } = await client.from('venues').insert(body);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
