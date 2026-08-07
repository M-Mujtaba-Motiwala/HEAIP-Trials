import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI();

export const VideoEditOperationSchema = z.object({
  type: z.enum(["trim", "cut_out", "add_caption", "merge"]),
  start_time: z.number().optional().describe("Start time in seconds"),
  end_time: z.number().optional().describe("End time in seconds"),
  text: z.string().optional().describe("Text for caption"),
  duration: z.number().optional().describe("Duration in seconds for caption"),
  font_size: z.number().optional().describe("Font size for caption"),
  color: z.string().optional().describe("Color for caption, e.g., 'white' or '#FFFFFF'"),
  position: z.string().optional().describe("Position for caption, e.g., 'center', 'bottom', 'top'"),
  second_video_path: z.string().optional().describe("Path to the second video for merging"),
  merge_position: z.enum(["intro", "outro"]).optional().describe("Position to merge the second video"),
});

export const VideoEditPlanSchema = z.object({
  operations: z.array(VideoEditOperationSchema),
});

export type VideoEditOperation = z.infer<typeof VideoEditOperationSchema>;
export type VideoEditPlan = z.infer<typeof VideoEditPlanSchema>;

export async function parseVideoEditInstruction(instruction: string): Promise<VideoEditPlan> {
  const response = await openai.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `You are an expert video editing assistant. Your job is to convert natural language video edit instructions into a structured JSON array of operations.
Valid operations are:
- trim: needs start_time and end_time.
- cut_out: needs start_time and end_time.
- add_caption: needs text, start_time, duration, font_size, color, position.
- merge: needs second_video_path (e.g., 'intro.mp4') and merge_position ('intro' or 'outro').
Always return valid numbers for times and durations (in seconds).`,
      },
      {
        role: "user",
        content: instruction,
      },
    ],
    response_format: zodResponseFormat(VideoEditPlanSchema, "video_edit_plan"),
  });

  if (!response.choices[0]?.message?.parsed) {
    throw new Error("Failed to parse edit instruction");
  }

  return response.choices[0].message.parsed;
}
