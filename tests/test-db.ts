import { db } from "../src/lib/db";

async function main() {
  try {
    console.log("Checking DB connection...");
    const count = await db.chatSession.count();
    console.log("ChatSession count:", count);

    const testId = "00000000-0000-0000-0000-000000000000";
    console.log("Querying unique message...");
    const msg = await db.message.findUnique({ where: { id: testId } });
    console.log("Message query success, found:", msg);
  } catch (error) {
    console.error("DB Operation failed:", error);
  }
}

main();
