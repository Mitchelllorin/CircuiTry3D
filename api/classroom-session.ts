import {
  corsHeadersForRequest,
  createSessionCookie,
  parseTeacherId,
  readSessionTeacherId,
} from "./_classroomSession";

export const config = {
  runtime: "edge",
};

type SessionRequest = {
  preferredTeacherId?: string;
};

export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = corsHeadersForRequest(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const payload = (await request.json().catch(() => null)) as SessionRequest | null;
    const preferredTeacherId = parseTeacherId(
      payload && typeof payload.preferredTeacherId === "string"
        ? payload.preferredTeacherId
        : null
    );

    const existingTeacherId = await readSessionTeacherId(request);
    if (existingTeacherId && (!preferredTeacherId || preferredTeacherId === existingTeacherId)) {
      return new Response(JSON.stringify({ teacherId: existingTeacherId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await createSessionCookie(request, preferredTeacherId);
    return new Response(JSON.stringify({ teacherId: session.teacherId }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Set-Cookie": session.setCookie,
      },
    });
  } catch (error) {
    console.error("[ClassroomSession] handler error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500, headers: corsHeaders });
  }
}

