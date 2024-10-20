import fs from "fs/promises";
import path from "path";
import { GltfFilesData, HDRFileProbeData } from ".";

const DATA_URL_PREFIX = {
  hdr: "data:image/vnd.radiance;base64,",
  gltf: "data:model/gltf-binary;base64,",
};

export async function readFiles({ folderPath, placeName }: { folderPath: string; placeName: string }) {
  console.log("saveFilesInfo");
  console.log(
    JSON.stringify(
      {
        folderPath,
        placeName,
      },
      null,
      2
    )
  );

  let placeDetailGlbPath = ""; // Found when checking files

  const hdrFilesData: HDRFileProbeData[] = [];
  const gltfFilesData: GltfFilesData = {};

  // Checks a file or folder and saves the HDR data if it's a HDR file
  async function checkDirectoryItem(fileName: string) {
    const filePath = path.join(folderPath, fileName);

    const isHDRFile = filePath.toLowerCase().includes(".hdr");
    const isGltfFile = filePath.toLowerCase().includes(".glb");

    if (isHDRFile) {
      const fileDataUrl = await fs.readFile(filePath, { encoding: "base64" });
      const dataUrlWithMimeType = DATA_URL_PREFIX.hdr + fileDataUrl;
      hdrFilesData.push({ name: fileName, data: dataUrlWithMimeType });
    }

    if (isGltfFile) {
      const isPlaceGameFile = fileName === placeName + ".glb";
      const isPlaceDetailFile = fileName === placeName + "_details.glb";

      if (isPlaceDetailFile) placeDetailGlbPath = filePath;

      if (isPlaceGameFile || isPlaceDetailFile) {
        const fileDataUrl = await fs.readFile(filePath, { encoding: "base64" });
        const dataUrlWithMimeType = DATA_URL_PREFIX.gltf + fileDataUrl;

        if (isPlaceGameFile) gltfFilesData.gameModel = dataUrlWithMimeType;
        if (isPlaceDetailFile) gltfFilesData.detailModel = dataUrlWithMimeType;
      }
    }
  }

  const files = await fs.readdir(folderPath);
  await Promise.all(files.map((fileName) => checkDirectoryItem(fileName)));
  return { placeDetailGlbPath, gltfFilesData, hdrFilesData };
}
