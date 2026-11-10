#!/usr/bin/env node

/**
 * MPG to MP4 Converter
 * Usage:
 *   node convert.js input.mpg                     → output: input.mp4
 *   node convert.js input.mpg output.mp4          → custom output path
 *   node convert.js ./folder                      → convert all .mpg files in folder
 *
 * Requirements:
 *   npm install fluent-ffmpeg
 *   ffmpeg must be installed on your system (https://ffmpeg.org/download.html)
 */

const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

// ─── helpers ────────────────────────────────────────────────────────────────

function toMp4Path(inputPath) {
  const { dir, name } = path.parse(inputPath);
  return path.join(dir, `${name}.mp4`);
}

function convertFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶  Converting: ${inputPath}`);
    console.log(`   Output:     ${outputPath}`);

    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")   // H.264 — universally compatible
      .audioCodec("aac")       // AAC audio
      .outputOptions([
        "-crf 23",             // quality (0 = lossless, 51 = worst; 23 is default)
        "-preset medium",      // encoding speed vs. compression trade-off
        "-movflags +faststart", // optimise for web streaming
      ])
      .on("start", (cmd) => console.log(`   ffmpeg: ${cmd}`))
      .on("progress", ({ percent }) => {
        if (percent != null) {
          process.stdout.write(`\r   Progress: ${Math.round(percent)}%   `);
        }
      })
      .on("end", () => {
        process.stdout.write("\r   Progress: 100%   \n");
        console.log(`✅  Done: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(`\n❌  Error converting ${inputPath}: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

function getMpgFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((f) => /\.(mpg|mpeg)$/i.test(f))
    .map((f) => path.join(dirPath, f));
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
MPG → MP4 Converter
───────────────────
Usage:
  node convert.js <input.mpg> [output.mp4]
  node convert.js <folder>       (batch: converts all .mpg/.mpeg files)

Examples:
  node convert.js video.mpg
  node convert.js video.mpg /output/video.mp4
  node convert.js ./my-videos
    `);
    process.exit(0);
  }

  const target = args[0];
  const stat = fs.statSync(target);

  if (stat.isDirectory()) {
    // ── batch mode ──────────────────────────────────────────────────────────
    const files = getMpgFiles(target);
    if (files.length === 0) {
      console.error(`No .mpg/.mpeg files found in: ${target}`);
      process.exit(1);
    }
    console.log(`Found ${files.length} file(s) to convert.`);
    for (const file of files) {
      await convertFile(file, toMp4Path(file));
    }
    console.log(`\n🎉  Batch complete. ${files.length} file(s) converted.`);
  } else {
    // ── single file mode ─────────────────────────────────────────────────────
    const inputPath = target;
    const outputPath = args[1] || toMp4Path(inputPath);
    await convertFile(inputPath, outputPath);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
