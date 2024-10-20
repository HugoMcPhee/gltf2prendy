import { splitFolderPath } from "./paths";
import fs from "fs/promises";

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

export type HDRFileProbeData = { name: string; data: string };
export type GltfFilesData = { detailModel?: string; gameModel?: string };
export type EnvFileData = { name: string; data: string | ArrayBuffer | null };

export type ReadFilesData = {
  hdrFilesData: HDRFileProbeData[];
  gltfFilesData: GltfFilesData;
  placeDetailGlbPath: string;
};

export function makeEmptyPlaceInfo(placeName: string): PlaceInfo {
  return {
    placeName,
    camNames: [],
    triggerNames: [],
    spotNames: [],
    soundspotNames: [],
    wallNames: [],
    floorNames: [],
  };
}

export async function getFilesPathInfo() {
  const folderPath = process.cwd(); // this is the command pace,  __dirname is the path of the node script
  const folderPathInfo = splitFolderPath(folderPath);
  const placeName = folderPathInfo.foldername;
  const parentFolder = process.cwd() + "/../"; // Assuming the parent folder is one level up from the current directory
  const parentFolderFiles = await fs.readdir(parentFolder, { withFileTypes: true });
  const placeNames = parentFolderFiles.filter((file) => file.isDirectory()).map((file) => file.name);

  return { placeName, folderPath, placeNames };
}
