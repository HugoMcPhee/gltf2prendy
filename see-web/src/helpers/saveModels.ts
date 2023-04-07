import { Engine, Scene } from "@babylonjs/core";
import { loadModelFile } from "./loadModelFile";
import { GLTF2Export } from "babylonjs-serializers";

export default async function renderPics({
  modelFile,
  engine,
  scene,
  placeName,
}: {
  modelFile: ReturnType<typeof loadModelFile>;
  scene: Scene | null;
  engine: Engine | null;
  placeName: string;
}) {
  // Save prendy game model
  GLTF2Export.GLBAsync(scene, placeName).then((glb) => {
    glb.downloadFiles();
  });

  // Save detail model with edited camera distances? maybe nothing is edited yet
}
