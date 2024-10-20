#!/usr/bin/env node
import { PageRefs } from "./browser/browser";
import { makeVideos } from "./ffmpegHelpers";
import { getFilesPathInfo, makeEmptyPlaceInfo } from "./fileInfoHelpers";
import { makePlacesTypescriptFiles } from "./makeTypescriptFiles";
import { readAndSavePlaceGltf } from "./readAndSavePlaceGltf";
import { readFiles } from "./readFiles";
import { renderPlaceInBabylon } from "./renderPlaceInBabylon";

declare global {
  interface Window {
    pageRefs: PageRefs;
  }
}

// Script options
export const CAN = {
  makeGltf: true,
  makeDetailsGltf: true,
  makeVideos: false,
  makeTypescriptFiles: false,
  makeCamCubes: true,
  // Options
  viewWidth: 1440,
  viewHeight: 1440,
};

// NOTE maybe if widescreen is wanted, it could get the new height from the existing width

(async () => {
  const { folderPath, placeName, placeNames } = await getFilesPathInfo();
  const placeInfo = makeEmptyPlaceInfo(placeName);

  const filesData = await readFiles({ folderPath, placeName });
  const { placeDetailGlbPath, gltfFilesData, hdrFilesData } = filesData;
  if (!placeDetailGlbPath) return;

  await readAndSavePlaceGltf({ placeInfo, placeDetailGlbPath }); // Read Gltf data
  await renderPlaceInBabylon({ placeInfo, gltfFilesData }); // Render pics in babylonjs

  if (CAN.makeVideos) await makeVideos({ placeInfo, folderPath, placeName });
  if (CAN.makeTypescriptFiles) await makePlacesTypescriptFiles({ placeNames, placeInfo });
})();
