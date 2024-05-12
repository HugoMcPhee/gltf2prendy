import { Engine, Scene, ShaderStore } from "@babylonjs/core";
import { loadModelFile } from "./loadModelFile";
import { shaders } from "./shaders";
import { PlaceInfo } from "..";

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

  // const camNames = Object.keys(modelFile.cameras);
  for (const camName of placeInfo.camNames) {
    modelFile.transformNodes?.[camName]?.setEnabled(false);
  }

  ShaderStore.ShadersStore["viewDepthPixelShader"] = shaders.viewDepth.fragment;
  ShaderStore.ShadersStore["viewDepthVertexShader"] = shaders.viewDepth.vertex;
}
