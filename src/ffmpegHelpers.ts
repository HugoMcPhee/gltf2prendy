import { createFFmpeg, FFmpeg } from "@ffmpeg.wasm/main";
import { makeVideoFromPics } from "./makeVideoFromPics";
import fs from "fs/promises";
import { PlaceInfo } from ".";

export const VIDEO_OPTIONS = {
  videoQuality: 25,
  keyframes: 1,
};

export function getCombineVideoParams({ placeName }: { placeName: string }) {
  const { videoQuality, keyframes } = VIDEO_OPTIONS;
  return [
    "-i",
    `${placeName}_color.mp4`,
    "-i",
    `${placeName}_depth.mp4`,
    "-filter_complex",
    "vstack=inputs=2",
    "-vcodec",
    "libx264",
    "-crf",
    `${videoQuality}`,
    "-g",
    `${keyframes}`,
    "-y",
    "-movflags",
    "faststart",
    "backdrops.mp4",
    "-hide_banner",
    "-loglevel",
    "error",
  ];
}

export async function makeVideos({
  //   ffmpeg,
  placeInfo,
  folderPath,
  placeName,
}: {
  //   ffmpeg: FFmpeg;
  placeInfo: PlaceInfo;
  folderPath: string;
  placeName: string;
}) {
  const ffmpeg = createFFmpeg({ log: true });

  await ffmpeg.load();

  await makeVideoFromPics({ isDepthVid: false, placeInfo, ffmpeg, folderPath, placeName });
  await makeVideoFromPics({ isDepthVid: true, placeInfo, ffmpeg, folderPath, placeName });

  // Delete in.txt
  await fs.unlink("in.txt");

  // Combine Color And Depth Vertically
  await ffmpeg.run(...getCombineVideoParams({ placeName }));
  await fs.writeFile("./backdrops.mp4", ffmpeg.FS("readFile", "backdrops.mp4"));
  ffmpeg.exit();
}
