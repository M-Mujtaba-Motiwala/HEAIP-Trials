import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { VideoEditPlan } from "./video-parser";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function processVideo(
  inputPath: string,
  outputPath: string,
  plan: VideoEditPlan
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);
    const filtergraph: string[] = [];
    
    let currentV = "0:v";
    let currentA = "0:a";
    let filterIndex = 0;
    let inputCount = 1;

    for (const op of plan.operations) {
      const idx = filterIndex++;
      const nextV = `v${idx}`;
      const nextA = `a${idx}`;

      if (op.type === "trim") {
        if (op.start_time !== undefined && op.end_time !== undefined) {
          filtergraph.push(`[${currentV}]trim=start=${op.start_time}:end=${op.end_time},setpts=PTS-STARTPTS[${nextV}]`);
          filtergraph.push(`[${currentA}]atrim=start=${op.start_time}:end=${op.end_time},asetpts=PTS-STARTPTS[${nextA}]`);
          currentV = nextV;
          currentA = nextA;
        }
      } else if (op.type === "cut_out") {
        if (op.start_time !== undefined && op.end_time !== undefined) {
          const vSplit1 = `v${idx}_s1`, vSplit2 = `v${idx}_s2`;
          const aSplit1 = `a${idx}_s1`, aSplit2 = `a${idx}_s2`;
          const vPart1 = `v${idx}_p1`, vPart2 = `v${idx}_p2`;
          const aPart1 = `a${idx}_p1`, aPart2 = `a${idx}_p2`;

          filtergraph.push(`[${currentV}]split=2[${vSplit1}][${vSplit2}]`);
          filtergraph.push(`[${currentA}]asplit=2[${aSplit1}][${aSplit2}]`);

          filtergraph.push(`[${vSplit1}]trim=end=${op.start_time},setpts=PTS-STARTPTS[${vPart1}]`);
          filtergraph.push(`[${aSplit1}]atrim=end=${op.start_time},asetpts=PTS-STARTPTS[${aPart1}]`);

          filtergraph.push(`[${vSplit2}]trim=start=${op.end_time},setpts=PTS-STARTPTS[${vPart2}]`);
          filtergraph.push(`[${aSplit2}]atrim=start=${op.end_time},asetpts=PTS-STARTPTS[${aPart2}]`);

          filtergraph.push(`[${vPart1}][${aPart1}][${vPart2}][${aPart2}]concat=n=2:v=1:a=1[${nextV}][${nextA}]`);
          
          currentV = nextV;
          currentA = nextA;
        }
      } else if (op.type === "add_caption") {
        if (op.text) {
          // Note: drawtext requires a font file usually, we rely on system fonts or generic sans if not specified.
          // In complex scenarios, a specific fontfile='/path/to/font.ttf' is safer.
          // Position calculation: 'center' -> x=(w-text_w)/2:y=(h-text_h)/2
          let posFilter = "x=(w-text_w)/2:y=(h-text_h)/2";
          if (op.position === "bottom") posFilter = "x=(w-text_w)/2:y=h-text_h-20";
          if (op.position === "top") posFilter = "x=(w-text_w)/2:y=20";

          let timeFilter = "";
          if (op.start_time !== undefined) {
            const end = op.start_time + (op.duration || 5);
            timeFilter = `:enable='between(t,${op.start_time},${end})'`;
          }

          const color = op.color || "white";
          const fontSize = op.font_size || 48;
          
          // Escape text for drawtext
          const safeText = op.text.replace(/'/g, "\\'").replace(/:/g, "\\:");

          filtergraph.push(`[${currentV}]drawtext=text='${safeText}':fontsize=${fontSize}:fontcolor=${color}:${posFilter}${timeFilter}[${nextV}]`);
          currentV = nextV;
          // Audio is untouched
        }
      } else if (op.type === "merge") {
        if (op.second_video_path && op.merge_position) {
          command.input(op.second_video_path);
          const currentInputIdx = inputCount++;
          const mergeV = `${currentInputIdx}:v`;
          const mergeA = `${currentInputIdx}:a`;
          
          // To safely concat, it's highly recommended to scale them to the same resolution and set SAR.
          // Assuming main video defines the format, we might need a scale filter. For simplicity:
          const scaledMergeV = `v${idx}_scaled`;
          filtergraph.push(`[${mergeV}]scale=1920:1080,setsar=1[${scaledMergeV}]`);
          // Note: In a robust production environment, you'd probe the main video for actual dimensions.

          if (op.merge_position === "intro") {
            filtergraph.push(`[${scaledMergeV}][${mergeA}][${currentV}][${currentA}]concat=n=2:v=1:a=1[${nextV}][${nextA}]`);
          } else {
            filtergraph.push(`[${currentV}][${currentA}][${scaledMergeV}][${mergeA}]concat=n=2:v=1:a=1[${nextV}][${nextA}]`);
          }
          currentV = nextV;
          currentA = nextA;
        }
      }
    }

    if (filtergraph.length > 0) {
      command.complexFilter(filtergraph, [currentV, currentA]);
    }

    command
      .outputOptions("-c:v", "libx264")
      .outputOptions("-c:a", "aac")
      .outputOptions("-movflags", "faststart")
      .save(outputPath)
      .on("start", (cmd) => {
        console.log("[FFMPEG START] " + cmd);
      })
      .on("error", (err) => {
        console.error("[FFMPEG ERROR]", err);
        reject(err);
      })
      .on("end", () => {
        console.log("[FFMPEG END]");
        resolve();
      });
  });
}
