import { db } from "../db/index";
import { notifications } from "../db/schema";
import type { NotificationType } from "@church/shared";

/**
 * Postgres caps a statement at 65535 bound parameters. Each notification row
 * binds 4 columns, so ~16k rows is the hard ceiling — well below that keeps the
 * statement small enough to stay responsive on a congregation-sized fan-out.
 */
const BATCH_SIZE = 500;

export interface FanOutMessage {
  title: string;
  message: string;
  type: NotificationType;
}

/**
 * Insert one notification per recipient, in chunks.
 *
 * A single insert for every approved member is one very large statement on the
 * request path; chunking keeps each round trip bounded. Chunks are sequential on
 * purpose — the neon-http driver opens a connection per statement, so firing
 * them in parallel would spike connection use for no latency gain that matters
 * here.
 *
 * Returns the number of rows written. Errors propagate: a caller that must not
 * fail because of notifications should wrap this in its own try/catch.
 */
export async function fanOutNotifications(
  recipientIds: string[],
  msg: FanOutMessage,
): Promise<number> {
  if (recipientIds.length === 0) return 0;

  for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
    const chunk = recipientIds.slice(i, i + BATCH_SIZE);
    await db.insert(notifications).values(
      chunk.map((userId) => ({
        userId,
        title: msg.title,
        message: msg.message,
        type: msg.type,
      })),
    );
  }
  return recipientIds.length;
}
