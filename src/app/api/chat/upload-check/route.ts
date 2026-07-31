import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SENSITIVE = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\b(?:\d[ -]*?){8,16}\b|\b(?:iban|account number|passport|cnic|ssn|salary|credit card)\b/i;
const NAME_LABEL = /\b(?:name|employee|customer|client)\s*[:#]/i;

export async function POST(request: Request) {
  if (!(await auth())?.user?.id) return NextResponse.json({ upload_id: randomUUID(), status: "Reject", reason: "Unauthorized upload request" }, { status: 401 });
  const uploadId = randomUUID();
  const formData = await request.formData();
  const file = formData.get("file");
  const text = String(formData.get("text") || "");
  if (!(file instanceof File)) return NextResponse.json({ upload_id: uploadId, status: "Reject", reason: "Missing upload file" }, { status: 400 });
  if (!file.type.startsWith("text/")) return NextResponse.json({ upload_id: uploadId, status: "Reject", reason: "Content cannot be safely classified" });
  const content = `${text}\n${await file.text()}`;
  if (SENSITIVE.test(content) || NAME_LABEL.test(content)) return NextResponse.json({ upload_id: uploadId, status: "Reject", reason: "Sensitive identifiers detected" });
  return NextResponse.json({ upload_id: uploadId, status: "OK", reason: "Anonymized generic content" });
}
