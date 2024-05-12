import { ShaderStore } from "@babylonjs/core";
import { PlaceInfo } from "..";
import { loadModelFile } from "./loadModelFile";
import { setupFakeCharacter } from "./setupFakeCharacter";
import { shaders } from "./shaders";

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
}
