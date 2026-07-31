import { db } from "../src/lib/db";
import crypto from "crypto";

async function main() {
  const userId = "1cb18ca3-d391-4859-ae8c-0d7f06e7aec8";
  const userEmail = "shaheryar.hamdard@hamdard.com.pk";
  const userDept = "IT";

  const message = "Hi";
  const model = "gemini-2.0-flash";
  const existingSessionId = "f0b9be4c-6b0a-4c47-ab33-bf2e722adfad";
  const messageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();

  try {
    const registryModel = model
      ? await db.aiModel.findFirst({ where: { modelId: model, enabled: true } })
      : await db.aiModel.findFirst({ where: { enabled: true, isDefault: true } }) || await db.aiModel.findFirst({ where: { enabled: true }, orderBy: { createdAt: "asc" } });
    
    if (!registryModel) {
      console.log("No enabled model configured");
      return;
    }
    const provider = registryModel.provider;
    const selectedModel = registryModel.modelId;

    let chatSessionId: string;
    if (existingSessionId) {
      const existing = await db.chatSession.findFirst({
        where: { id: existingSessionId, employeeId: userId },
      });
      if (!existing) {
        console.log("Session not found or unauthorized");
        return;
      }
      chatSessionId = existing.id;
    } else {
      const newSession = await db.chatSession.create({
        data: {
          employeeId: userId,
          title: "Hi",
          aiProvider: provider,
          aiModel: selectedModel,
        },
      });
      chatSessionId = newSession.id;
    }

    if (messageId) {
      const existingMsg = await db.message.findUnique({ where: { id: messageId } });
      if (existingMsg) {
        console.log("Duplicate request detected");
        return;
      }
    }

    console.log("Persisting user message...");
    const createdMsg = await db.message.create({
      data: {
        id: messageId,
        sessionId: chatSessionId,
        role: "user",
        content: message,
      },
    });
    console.log("User message created successfully:", createdMsg.id);

    console.log("Mocking assistant message creation...");
    const createdAssistantMsg = await db.message.create({
      data: {
        id: assistantMessageId,
        sessionId: chatSessionId,
        role: "assistant",
        content: "Hello from test mock",
      },
    });
    console.log("Assistant message created successfully:", createdAssistantMsg.id);

  } catch (error) {
    console.error("CRITICAL ERROR IN LOGIC:", error);
  }
}

main();
