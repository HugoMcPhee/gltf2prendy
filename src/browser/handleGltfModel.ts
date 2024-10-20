import { Scene } from "@babylonjs/core";
import { GltfFilesData, PlaceInfo } from "../fileInfoHelpers";
import { loadModelFile } from "./loadModelFile/loadModelFile";
import { setUpPlaceForRendering } from "./setUpPlaceForRendering";

export async function handleGltfModel({
  gltfFilesData,
  scene,
  placeInfo,
}: {
  gltfFilesData: GltfFilesData;
  scene: Scene;
  placeInfo: PlaceInfo;
}) {
  if (gltfFilesData.detailModel) {
    const modelFile = await loadModelFile({
      modelBase64: gltfFilesData.detailModel,
      scene: scene,
    });

    window.pageRefs.modelFile = modelFile;

    await setUpPlaceForRendering({ modelFile, placeInfo });
    console.log("handleGltfModel done");
  }
}
