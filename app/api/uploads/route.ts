import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Foto ausente." }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "Arquivo inválido." }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const key = `quotes/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return Response.json({ key }, { status: 201 });
}
