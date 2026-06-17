import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import type { Context } from "hono";

/** Parse JSON body against a Zod schema; throws a 400 with field errors on failure. */
export async function parseBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HTTPException(400, {
      res: c.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        400,
      ),
    });
  }
  return result.data;
}
