import { dbFor } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const db = dbFor(req.headers.get('authorization'));
  if (!db) return Response.json({ db: false });
  const body = await req.json();
  const row = {
    venue_id: body.venue_id,
    name: String(body.name || 'Guest').slice(0, 80),
    stars: Math.min(5, Math.max(1, Number(body.stars) || 5)),
    text: String(body.text || '').slice(0, 1000),
    date_label: String(body.date_label || ''),
  };
  if (!row.venue_id || !row.text) return Response.json({ error: 'venue_id and text required' }, { status: 400 });
  const { error } = await db.from('reviews').insert(row);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
