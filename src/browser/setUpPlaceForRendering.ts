import { ShaderStore } from "@babylonjs/core";
import { loadModelFile } from "./loadModelFile/loadModelFile";
import { setupFakeCharacter } from "./getCharacterVisibilityData/setupFakeCharacter";
import { shaders } from "./shaders";
import delay from "delay";
import { PlaceInfo } from "../fileInfoHelpers";

export async function setUpPlaceForRendering({
  modelFile,
  //   engine,
  //   scene,
  placeInfo,
}: {
  modelFile: Awaited<ReturnType<typeof loadModelFile>>;
  //   scene: Scene | null;
  //   engine: Engine | null;
  placeInfo: PlaceInfo;
}) {
  if (!modelFile) return;

  const delay = async (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  console.log("========================");
  console.log("setUpPlaceForRendering");
  console.log("========================");
  console.log("========================");
  console.log("========================");
  // console.log(JSON.stringify(modelFile.transformNodes, null, 2));
  console.log(Object.keys(modelFile.transformNodes));

  modelFile.transformNodes.walls?.setEnabled(false);
  modelFile.transformNodes.triggers?.setEnabled(false);
  modelFile.transformNodes.floors?.setEnabled(false);

  window.pageRefs.modelFile = modelFile;

  // const camNames = Object.keys(modelFile.cameras);
  for (const camName of placeInfo.camNames) {
    modelFile.transformNodes?.[camName]?.setEnabled(false);
  }

  ShaderStore.ShadersStore["viewDepthPixelShader"] = shaders.viewDepth.fragment;
  ShaderStore.ShadersStore["viewDepthVertexShader"] = shaders.viewDepth.vertex;

  console.log("setUpPlaceForRendering done");
}
