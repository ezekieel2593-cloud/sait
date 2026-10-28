import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json({
    ok: true,
    apiVersion: "1",
    user: { id: user.id, email: user.email, name: user.name },
  });
}
