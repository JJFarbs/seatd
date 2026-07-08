import { db, dbFor } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!db) return Response.json({ db: false });
  const { data, error } = await db.from('bookings').select('*').order('created_at', { ascending: false });
  if (error) return Response.json({ db: false, error: error.message }, { status: 500 });
  return Response.json({ db: true, bookings: data });
}

export async function POST(req) {
  const client = dbFor(req.headers.get('authorization'));
  if (!client) return Response.json({ db: false });
  const body = await req.json();
  const { error } = await client.from('bookings').insert(body);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
