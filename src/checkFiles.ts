import fs from "fs/promises";
import path from "path";
import { GltfFilesData, HDRFileProbeData, nodeRefs } from ".";

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
