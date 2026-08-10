import test from "node:test";
import assert from "node:assert";
import { processVideo } from "../src/lib/video-editor";
import { VideoEditPlan } from "../src/lib/video-parser";

test("video-editor should reject path traversal in second_video_path", async () => {
  const dummyInput = "dummy-input.mp4";
  const dummyOutput = "dummy-output.mp4";
  
  const plan: VideoEditPlan = {
    operations: [
      {
        type: "merge",
        second_video_path: "../../../../etc/passwd",
        merge_position: "intro"
      }
    ]
  };

  try {
    await processVideo(dummyInput, dummyOutput, plan);
    assert.fail("Should have thrown an error for invalid path");
  } catch (err: any) {
    // We expect a validation error, not an ffmpeg error
    if (err.message && (err.message.includes("Invalid path") || err.message.includes("Path traversal"))) {
      assert.ok(true);
    } else {
      assert.fail(`Expected validation error, got: ${err.message}`);
    }
  }
});
