import { env } from "cloudflare:workers";

async function ensureSchema() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at)").run();
}

export async function GET() {
  await ensureSchema();
  const result = await env.DB.prepare("SELECT id, customer_name, service_type, total, created_at FROM quotes ORDER BY created_at DESC LIMIT 100").all();
  return Response.json({ quotes: result.results });
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const customer = String(body.customer ?? "").trim();
  if (!customer) return Response.json({ error: "Cliente é obrigatório." }, { status: 400 });
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare("INSERT INTO quotes (id, customer_name, service_type, total, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, customer, String(body.type ?? "installation"), Number(body.total ?? 0), JSON.stringify(body), createdAt).run();
  return Response.json({ id, createdAt }, { status: 201 });
}
