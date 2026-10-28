import { NextResponse } from "next/server";
import { destroyCurrentSession, assertSameOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  if (!(await assertSameOrigin())) {
    return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  }
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
