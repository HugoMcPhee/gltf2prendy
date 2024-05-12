import { keyBy } from "chootils/dist/arrays";
import { forEach } from "chootils/dist/loops";
import { getFileFromBase64 } from "./getFileFromBase64";
import {
  AbstractMesh,
  AnimationGroup,
  AssetContainer,
  Camera,
  PBRMaterial,
  Scene,
  SceneLoader,
  Skeleton,
  Texture,
  TransformNode,
} from "@babylonjs/core";

export async function loadModelFile({
  modelBase64,
  scene,
}: {
  modelBase64: string;
  scene: Scene | null;
}) {
  if (!scene || !modelBase64) return;

  const modelAsFile = getFileFromBase64(modelBase64, "exampleFilename.glb");

  const container: AssetContainer = await SceneLoader.LoadAssetContainerAsync(
    "model",
    modelAsFile,
    scene
  );

  container.addAllToScene();

  const meshes: Record<string, AbstractMesh> = keyBy(
    container.meshes
  ) as Record<string, AbstractMesh>;
  const materials: Record<string, PBRMaterial> = keyBy(
    container.materials as PBRMaterial[]
  );
  const textures: Record<string, Texture> = keyBy(container.textures) as Record<
    string,
    Texture
  >;

  let cameras: Record<string, Camera> = {};
  forEach(container.cameras, (camera) => {
    const camName = camera?.parent?.name ?? camera.name;

    camera.name = camName;
    camera.id = camName;
    cameras[camName] = camera;

    if (camera.parent) {
      // change the transform node name holding the camera,
      // since nomad-sculpt calls it the same as the camera name,
      // but there's already a group called that
      camera.parent.name = camName + "_node";
      camera.parent.id = camName + "_node";
    }
  });

  const transformNodes: Record<string, TransformNode> = keyBy(
    container.transformNodes
  );
  console.log("container.transformNodes");
  console.log(container.transformNodes);

  const animationGroups: Record<string, AnimationGroup> = keyBy(
    container.animationGroups
  );
  const skeletons: Record<string, Skeleton> = keyBy(container.skeletons);

  return {
    meshes,
    materials,
    textures,
    transformNodes,
    animationGroups,
    skeletons,
    cameras,
    container, // container.removeAllFromScene();
  };
}
