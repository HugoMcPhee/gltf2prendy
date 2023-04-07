import {
  AnimationGroup,
  AssetContainer,
  Camera,
  Mesh,
  PBRMaterial,
  Scene,
  SceneLoader,
  Skeleton,
  Texture,
  TransformNode,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { keyBy } from "chootils/dist/arrays";
import { forEach } from "chootils/dist/loops";

export async function loadModelFile({
  modelPath,
  scene,
}: {
  modelPath: string;
  scene: Scene | null;
}) {
  const container: AssetContainer = await SceneLoader.LoadAssetContainerAsync(
    modelPath,
    undefined,
    scene
  );
  container.addAllToScene();

  const meshes: Record<string, Mesh> = keyBy(container.meshes) as Record<
    string,
    Mesh
  >;
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
      // since nomad calls it the same as the camera name,
      // but there's already a group called that
      camera.parent.name = camName + "_nomad";
      camera.parent.id = camName + "_nomad";
    }
  });

  const transformNodes: Record<string, TransformNode> = keyBy(
    container.transformNodes
  );

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
