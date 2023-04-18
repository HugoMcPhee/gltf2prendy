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
import { GLTFFileLoader } from "@babylonjs/loaders/glTF";
import { keyBy } from "chootils/dist/arrays";
import { forEach } from "chootils/dist/loops";

function getFileFromBase64(base64String: string, fileName: string): File {
  console.log("base64String");
  console.log(base64String);
  const byteString = window.atob(base64String);
  const byteStringLength = byteString.length;
  const byteArray = new Uint8Array(byteStringLength);
  for (let i = 0; i < byteStringLength; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: "application/octet-stream" });
  return new File([blob], fileName, { type: "application/octet-stream" });
}

export async function loadGltfFileAsBase64(
  modelPath: string
): Promise<string | null> {
  try {
    const response = await fetch(modelPath);
    const blob = await response.blob();
    const reader = new FileReader();
    if (!reader) return null;
    reader.readAsDataURL(blob);
    // reader.readAsArrayBuffer(blob);
    await new Promise((resolve) => {
      reader.onloadend = () => {
        // const mainString = reader.result as string;
        // const base64String = mainString
        //   .replace("data:", "")
        //   .replace(/^.+,/, "");

        // For some weird reason, this replaced string doesn't get returned in resolve, but the string before replacing does...
        // const base64String = mainString.replace(
        //   "data:model/gltf-binary;base64,",
        //   ""

        // );
        // NOTE this doesn't return this, it just resolves this async part
        resolve(reader.result);

        // console.log("repalced string here");
        // console.log(base64String);
      };
    });
    const arrayBufferResult = reader?.result as string;
    const base64String = arrayBufferResult
      .replace("data:", "")
      .replace(/^.+,/, "");
    return base64String as string;
  } catch (error) {
    console.error("Failed to load model:", error);
    return null;
  }
}

export async function loadGltfFileAsArrayBufferBefore(modelPath: string) {
  fetch(modelPath)
    .then((response) => response.blob())
    .then((blob) => {
      const reader = new FileReader();
      if (!reader) return;
      // reader.readAsDataURL(blob);
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const arrayBufferResult = reader?.result;
        return arrayBufferResult;
        // ...
      };
    });
}

export async function loadGtlfFileDirectly({
  modelPath,
  scene,
}: {
  modelPath: string;
  scene: Scene | null;
}) {
  const gltfLoader = new GLTFFileLoader();
  if (!scene) return;

  gltfLoader.loadFile(
    scene,
    modelPath,
    (result) => {
      console.log("success");
    },
    () => {
      console.log("progress");
    },
    true,
    () => {
      console.log("error");
    }
  );
}

export async function loadGtlfFileFromBase64String() {
  // gltfLoader.loadFile(scene,)
}

export async function loadModelFile({
  modelPath,
  scene,
}: {
  modelPath: string;
  scene: Scene | null;
}) {
  const modelAsBase64 = await loadGltfFileAsBase64(modelPath);
  const modelAsBase64Edited = modelAsBase64;
  if (!modelAsBase64Edited) return;
  const modelAsFile = getFileFromBase64(
    modelAsBase64Edited,
    "exampleFilename.glb"
  );

  const container: AssetContainer = await SceneLoader.LoadAssetContainerAsync(
    "model",
    modelAsFile,
    scene
  );

  // const container: AssetContainer = await SceneLoader.LoadAssetContainerAsync(
  //   modelPath,
  //   undefined,
  //   scene
  // );
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
