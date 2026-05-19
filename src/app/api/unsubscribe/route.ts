import { NextResponse } from "next/server";
import { removeSubscriber } from "@/services/pipeline/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return new Response("Missing email parameter.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  removeSubscriber(decodeURIComponent(email));
  return new Response("You have been unsubscribed.", { status: 200, headers: { "Content-Type": "text/plain" } });
}
