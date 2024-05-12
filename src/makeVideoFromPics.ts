import { FFmpeg } from "@ffmpeg.wasm/main";
import { PlaceInfo } from ".";
import { fetchFile } from "@ffmpeg.wasm/main";
import fs from "fs/promises";
import path, { resolve } from "path";

const chosenFramerate = 1;
const frame_image_path = "";
const videoQuality = 25;
const keyframes = 1;
const video_output_path = "";

export async function makeVideoFromPics(
  isDepthVid: boolean,
  placeInfo: PlaceInfo,
  ffmpeg: FFmpeg,
  folderPath: string,
  placeName: string
) {
  const frameDuration = 1 + 1; // seconds + 1 frame padding (blender duplicates the last frame after rendering to add padding)

  // const makeVideoCommand = `C:\\ffmpeg -framerate ${chosen_framerate} -f image2 -i "${frame_image_path}%04d.png" -vcodec libx264 -crf ${video_quality} -g ${keyframes} -vf "fps=${chosen_framerate},format=yuv420p,scale=1280:720" -y -movflags faststart "${video_output_path}.mp4" -hide_banner -loglevel error`;
  const makeVideoCommand = `C:\\ffmpeg -framerate ${chosenFramerate} -f image2 -i "${frame_image_path}%04d.png" -vcodec libx264 -crf ${videoQuality} -g ${keyframes} -vf "fps=${chosenFramerate},format=yuv420p,scale=1280:720" -y -movflags faststart "${video_output_path}.mp4" -hide_banner -loglevel error`;

  let inFileText = ``;

  for (const camName of placeInfo.camNames) {
    const fileName = `${camName}${isDepthVid ? "_depth" : ""}.png`;
    inFileText += `file ${fileName}` + "\n";
    inFileText += `outpoint ${frameDuration}` + "\n";

    const isLastCam = camName === placeInfo.camNames[placeInfo.camNames.length - 1];
    // for some reason, ffmpeg cuts off the last frame? so we add an extra frame to the end
    if (isLastCam) {
      inFileText += `file ${fileName}` + "\n";
      inFileText += `outpoint ${frameDuration}` + "\n";
    }

    ffmpeg.FS("writeFile", fileName, await fetchFile(`./renders/${fileName}`));
    // ffmpeg.FS("writeFile", fileName, await fetchFile(`./${fileName}`));
  }

  /*
file 1.png
outpoint 5
file 2.png
outpoint 2
*/

  const textFilePath = path.join(folderPath, "in.txt"); // NOTE not needed, it will save to the current path

  await fs.writeFile("in.txt", inFileText);
  console.log("finished writing file");
  // ffmpeg.FS("")
  // ffmpeg.run()
  ffmpeg.FS("writeFile", "in.txt", await fetchFile("./in.txt"));

  const vidFileName = `${placeName}${isDepthVid ? "_depth" : "_color"}.mp4`;

  await ffmpeg.run(
    "-f",
    "concat",
    "-i",
    "in.txt",
    // "file:" + textFilePath,
    // "-framerate",
    // "1",
    "-framerate",
    `${chosenFramerate}`,
    // "-c:v",
    // "libx264",
    "-vcodec",
    "libx264",
    // "-shortest",
    "-r",
    `${chosenFramerate}`,
    // "30",
    // "-pix_fmt",
    // "yuv420p",
    "-vf",
    `fps=${chosenFramerate},format=yuv420p,scale=1280:720`,
    "-y",
    "-movflags",
    "faststart",
    "-crf",
    `${videoQuality}`,
    "-g",
    `${keyframes}`,
    vidFileName
  );
  // await ffmpeg.run(
  //   "-framerate",
  //   `${chosen_framerate}`,
  //   "-f",
  //   "image2",
  //   "-i",
  //   `${frame_image_path}%04d.png`,
  //   "-vcodec",
  //   "libx264",
  //   "-crf",
  //   `${video_quality}`,
  //   "-g",
  //   `${keyframes}`,
  //   "-vf",
  //   `fps=${chosen_framerate}`,
  //   "format=yuv420p",
  //   "scale=1280:720",
  //   "-y",
  //   "-movflags",
  //   "faststart",
  //   `${video_output_path}.mp4`,
  //   "-hide_banner",
  //   "-loglevel",
  //   "error"
  // );

  ffmpeg.FS("readdir", "./");
  // await fs.writeFile(`./${vidFileName}`, ffmpeg.FS("readFile", vidFileName));
  console.log("finished writing video file");
}
