import puppeteer from "puppeteer";
import { vec3 } from "@gltf-transform/core";
import fs from "fs/promises";
import path from "path";
import {
  AbstractMesh,
  AnimationGroup,
  AssetContainer,
  Camera,
  Engine,
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
import { BABYLON } from "./browser/browser";
import { getFileFromBase64 } from "./browser/getFileFromBase64";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getScreenshots";
import { handleGltfModel } from "./browser/handleGltfModel";
import { loadModelFile } from "./browser/loadModelFile";
import { setUpBabylonScene } from "./browser/setUpBabylonScene";
import { shaders } from "./browser/shaders";
import { waitForSceneReady } from "./browser/waitForSceneReady";
import { makePlaceTypescriptFile, makePlacesTypescriptFile } from "./makeTypescriptFiles";
import { makeVideoFromPics } from "./makeVideoFromPics";
import { splitFolderPath } from "./paths";
import { readAndSavePlaceGltf } from "./readAndSavePlaceGltf";
import { renderPlaceInBabylon } from "./renderPlaceInBabylon";
import { HDRFileProbeData, GltfFilesData, nodeRefs } from ".";

export async function checkFiles({
  folderPath,
  gltfFilesData,
  hdrFilesData,
  placeName,
  prefixForGltfDataUrl,
  prefixForHDRDataUrl,
}: {
  folderPath: string;
  placeName: string;
  prefixForHDRDataUrl: string;
  prefixForGltfDataUrl: string;
  hdrFilesData: HDRFileProbeData[];
  gltfFilesData: GltfFilesData;
}) {
  console.log("checkFiles");
  console.log(
    JSON.stringify(
      {
        folderPath,
        gltfFilesData,
        hdrFilesData,
        placeName,
        prefixForGltfDataUrl,
        prefixForHDRDataUrl,
      },
      null,
      2
    )
  );

  // checks a file or folder and saves the HDR data if it's a HDR file
  async function checkDirectoryItem(fileName: string) {
    const filePath = path.join(folderPath, fileName);

    const isHDRFile = filePath.toLowerCase().includes(".hdr");
    if (isHDRFile) {
      const fileDataUrl = await fs.readFile(filePath, { encoding: "base64" });
      const dataUrlWithMimeType = prefixForHDRDataUrl + fileDataUrl;
      hdrFilesData.push({ name: fileName, data: dataUrlWithMimeType });
    }

    const isGltfFile = filePath.toLowerCase().includes(".glb");
    if (isGltfFile) {
      // get the placeName from the folderPath
      // if the filename matches placeName.glb or placeName_detail.glb

      const isPlaceGameFile = fileName === placeName + ".glb";
      const isPlaceDetailFile = fileName === placeName + "_detail.glb";

      if (isPlaceDetailFile) nodeRefs.placeDetailGlbPath = filePath;

      if (isPlaceGameFile || isPlaceDetailFile) {
        const fileDataUrl = await fs.readFile(filePath, { encoding: "base64" });
        const dataUrlWithMimeType = prefixForGltfDataUrl + fileDataUrl;

        if (isPlaceGameFile) gltfFilesData.gameModel = dataUrlWithMimeType;
        if (isPlaceDetailFile) gltfFilesData.detailModel = dataUrlWithMimeType;
      }

      // if (fileName.includes("_detail"))
    }
  }

  const files = await fs.readdir(folderPath);
  await Promise.all(files.map((fileName) => checkDirectoryItem(fileName)));
}
