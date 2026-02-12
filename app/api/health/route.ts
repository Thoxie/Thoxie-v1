export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    service: "thoxie-backend",
    ts: new Date().toISOString(),
  });
}
