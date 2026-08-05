import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  console.log("Testing Groq: llama-3.3-70b-versatile\n");
  try {
    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: "Say hello in one sentence.",
      maxOutputTokens: 50,
    });
    console.log("Response:", result.text);
    console.log("Usage:", result.usage);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
