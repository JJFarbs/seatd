import { listBanks } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banks = await listBanks();
    return Response.json({ ok: true, banks: banks.map((b) => ({ name: b.name, code: b.code })) });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
