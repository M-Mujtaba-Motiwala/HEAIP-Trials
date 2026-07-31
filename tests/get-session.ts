import { db } from "../src/lib/db";

async function test() {
  const session = await db.chatSession.findFirst();
  if (!session) {
    console.log("No chat session found");
    return;
  }
  console.log("Found session:", session.id, "created by employee:", session.employeeId);

  // Let's query employee
  const employee = await db.employee.findUnique({ where: { id: session.employeeId } });
  console.log("Employee:", employee?.email);
}

test();
