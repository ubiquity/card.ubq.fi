import { Context } from "./helpers/types";

export async function onRequest(ctx: Context): Promise<Response> {
  const result = ctx.env.USE_RELOADLY_SANDBOX === "false" ? "production" : "sandbox";
  return Response.json({ result: result }, { status: 200 });
}
