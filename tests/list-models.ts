import { db } from "../src/lib/db";

async function main() {
  console.log("DB Keys:", Object.keys(db));
  // Let's inspect what properties are defined on db
  const dbPrototype = Object.getPrototypeOf(db);
  console.log("DB Prototype Keys:", Object.getOwnPropertyNames(dbPrototype));
}

main();
