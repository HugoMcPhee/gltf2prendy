#!/usr/bin/env node
import {
  AbstractMesh,
  AnimationGroup,
  AssetContainer,
  Camera,
  Engine,
  Mesh,
  PBRMaterial,
  PostProcess,
  Scene,
  Skeleton,
  Texture,
  TransformNode,
} from "@babylonjs/core";
import { createFFmpeg } from "@ffmpeg.wasm/main";
import { keyBy } from "chootils/dist/arrays";
import { forEach } from "chootils/dist/loops";
import fs from "fs/promises";
import { BABYLON } from "./browser/browser";
import { getFileFromBase64 } from "./browser/getFileFromBase64";
import { handleGltfModel } from "./browser/handleGltfModel";
import { loadModelFile } from "./browser/loadModelFile";
import { setUpBabylonScene } from "./browser/setUpBabylonScene";
import { shaders } from "./browser/shaders";
import { waitForSceneReady } from "./browser/waitForSceneReady";
import { checkFiles } from "./checkFiles";
import { makePlaceTypescriptFile, makePlacesTypescriptFile } from "./makeTypescriptFiles";
import { makeVideoFromPics } from "./makeVideoFromPics";
import { splitFolderPath } from "./paths";
import { readAndSavePlaceGltf } from "./readAndSavePlaceGltf";
import { renderPlaceInBabylon } from "./renderPlaceInBabylon";
import { countWhitePixels } from "./browser/countWhitePixels";
import { generateFloorPoints } from "./browser/findPointsOnFloors";
import { setupFakeCharacter } from "./browser/setupFakeCharacter";
import { applyBlackMaterialToDetails } from "./browser/applyBlackMaterialToDetails";
import { getFovScaleFactor } from "./browser/getFovScaleFactor";
import { calculateCameraScore } from "./browser/calculateCameraScore";

type ModelFile = {
  meshes: Record<string, AbstractMesh>;
  materials: Record<string, PBRMaterial>;
  textures: Record<string, Texture>;
  transformNodes: Record<string, TransformNode>;
  animationGroups: Record<string, AnimationGroup>;
  skeletons: Record<string, Skeleton>;
  cameras: Record<string, Camera>;
  container: AssetContainer;
};

type PageRefs = {
  // data
  canvas?: HTMLCanvasElement;
  engine?: Engine;
  scene?: Scene;
  modelFile?: ModelFile;
  depthPostProcess?: PostProcess;
  placeDetailGlbPath?: string;
  fakeCharacter?: Mesh;
  // imports for browser
  delay: (time: number) => Promise<void>;
  forEach: typeof forEach;
  keyBy: typeof keyBy;
  getFileFromBase64: typeof getFileFromBase64;
  loadModelFile: typeof loadModelFile;
  BABYLON: typeof BABYLON;
  shaders: typeof shaders;
  handleGltfModel: typeof handleGltfModel;
  waitForSceneReady: typeof waitForSceneReady;
  setUpBabylonScene: typeof setUpBabylonScene;
  countWhitePixels: typeof countWhitePixels;
  setupFakeCharacter: typeof setupFakeCharacter;
  generateFloorPoints: typeof generateFloorPoints;
  applyBlackMaterialToDetails: typeof applyBlackMaterialToDetails;
  getFovScaleFactor: typeof getFovScaleFactor;
  calculateCameraScore: typeof calculateCameraScore;
};

export const nodeRefs = {
  placeDetailGlbPath: "",
};

declare global {
  interface Window {
    pageRefs: PageRefs;
  }
}

export type PlaceInfo = {
  placeName: string;
  camNames: string[];
  triggerNames: string[];
  spotNames: string[];
  soundspotNames: string[];
  wallNames: string[];
  floorNames: string[];
  // might need extra info about cams etc
};

export type PointsInfo = Record<
  string,
  {
    point: [number, number, number];
    camInfos: Record<string, { screenCoverage: number; visibilityScore: number; charcterDistance: number }>;
    bestCam1: string;
    bestCam2: string;
  }
>;

export type HDRFileProbeData = { name: string; data: string };
export type EnvFileData = { name: string; data: string | ArrayBuffer | null };
export type GltfFilesData = { detailModel?: string; gameModel?: string };

const ffmpeg = createFFmpeg({ log: true });

(async () => {
  // const nodeScriptPath = __dirname;
  const folderPath = process.cwd();

  // type HDRFileProbeData = { name: "probe.hdr" , data: base64String}
  const hdrFilesData = [] as HDRFileProbeData[];
  const gltfFilesData = {} as GltfFilesData;
  // let camNames = [] as string[]; // use evaluate to get camNames

  const HDRMimeType = "image/vnd.radiance";
  const prefixForHDRDataUrl = `data:${HDRMimeType};base64,`;

  const gltfMimeType = "model/gltf-binary";
  const prefixForGltfDataUrl = `data:${gltfMimeType};base64,`;

  const folderPathInfo = splitFolderPath(folderPath);
  const placeName = folderPathInfo.foldername;

  // const parentFolder = __dirname + "/../"; // Assuming the parent folder is one level up from the current directory
  const parentFolder = process.cwd() + "/../"; // Assuming the parent folder is one level up from the current directory

  const parentFolderFiles = await fs.readdir(parentFolder, {
    withFileTypes: true,
  });

  const placeNames = parentFolderFiles.filter((file) => file.isDirectory()).map((file) => file.name);

  console.log("Place names:", placeNames);

  const placeInfo: PlaceInfo = {
    camNames: [],
    floorNames: [],
    spotNames: [],
    triggerNames: [],
    wallNames: [],
    placeName,
    soundspotNames: [],
  };

  const pointsInfo = {} as PointsInfo;

  await checkFiles({
    folderPath,
    gltfFilesData,
    hdrFilesData,
    placeName,
    prefixForGltfDataUrl,
    prefixForHDRDataUrl,
  });

  const { placeDetailGlbPath } = nodeRefs;
  if (!placeDetailGlbPath) return;

  // ------------------------------------------------
  // Read Gltf data
  // ------------------------------------------------

  // Get place info, like triggerNames, spotNames, camNames etc
  // read glft file

  await readAndSavePlaceGltf({ placeDetailGlbPath, placeInfo });

  // ------------------------------------------------
  // Render pics in babylonjs
  // ------------------------------------------------

  await renderPlaceInBabylon({ placeInfo, gltfFilesData, pointsInfo });

  if (false) {
    // find the images and load into ffmpeg stuff
    await ffmpeg.load();

    const videoQuality = 25;
    const keyframes = 1;

    await makeVideoFromPics(false, placeInfo, ffmpeg, folderPath, placeName);
    await makeVideoFromPics(true, placeInfo, ffmpeg, folderPath, placeName);

    // Delete in.txt
    await fs.unlink("in.txt");

    // const combineColorAndDepthVertically =
    // Join the color and depth vids
    // NOTE if it uses too much memory, could save each one to a file and combine later :think

    // Combine Color And Depth Vertically

    await ffmpeg.run(
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
      "error"
    );

    await fs.writeFile("./backdrops.mp4", ffmpeg.FS("readFile", "backdrops.mp4"));

    ffmpeg.exit();

    const placeTsFile = makePlaceTypescriptFile(placeInfo);
    // await fs.writeFile(placeInfo.placeName + ".ts", placeTsFile);
    await fs.writeFile("index.ts", placeTsFile);
    console.log("finsihed writing place txt file");

    const placesTsFile = makePlacesTypescriptFile(placeNames);
    await fs.writeFile("../places.ts", placesTsFile);
    console.log("finsihed writing places txt file");
  }
  // go to parent folder and write the places file
})();
