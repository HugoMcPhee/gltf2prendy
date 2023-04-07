import {
  CreateScreenshotUsingRenderTarget,
  DepthRenderer,
  Engine,
  PostProcess,
  Scene,
  ShaderStore,
  Vector3,
} from "@babylonjs/core";
import delay from "delay";
import { loadModelFile } from "./loadModelFile";
import { shaders } from "./shaders";

function downloadBase64Image(
  contentType: string,
  base64Data: string,
  fileName: string
) {
  const linkSource = `${base64Data}`;
  const downloadLink = document.createElement("a");
  downloadLink.href = linkSource;
  downloadLink.download = fileName;
  downloadLink.click();
}

export default async function renderPics({
  modelFile,
  engine,
  scene,
}: {
  modelFile: ReturnType<typeof loadModelFile>;
  scene: Scene | null;
  engine: Engine | null;
}) {
  let depthRenderer: null | DepthRenderer = null;
  let depthPostProcess: null | PostProcess = null;

  modelFile.transformNodes.walls?.setEnabled(false);
  modelFile.transformNodes.triggers?.setEnabled(false);
  modelFile.transformNodes.floors?.setEnabled(false);

  const camNames = Object.keys(modelFile.cameras);
  for (const camName of camNames) {
    modelFile.transformNodes?.[camName]?.setEnabled(false);
  }
  ShaderStore.ShadersStore["viewDepthPixelShader"] = shaders.viewDepth.fragment;
  ShaderStore.ShadersStore["viewDepthVertexShader"] = shaders.viewDepth.vertex;
  for (const camName of camNames) {
    const camera = modelFile.cameras[camName];

    camera.computeWorldMatrix();
    const cameraDepthFarPoint =
      modelFile.transformNodes[camName + "_depth_far"] ??
      modelFile.transformNodes[camName + "_depth"];
    const cameraDepthNearPoint =
      modelFile.transformNodes[camName + "_depth_near"];

    if (cameraDepthFarPoint) cameraDepthFarPoint.computeWorldMatrix();
    if (cameraDepthNearPoint) cameraDepthNearPoint.computeWorldMatrix();

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    const depthMinZ = cameraDepthNearPoint
      ? Vector3.Distance(
          camera.globalPosition,
          cameraDepthNearPoint.absolutePosition
        )
      : 1;

    const depthMaxZ = cameraDepthFarPoint
      ? Vector3.Distance(
          camera.globalPosition,
          cameraDepthFarPoint.absolutePosition
        )
      : 100;

    if (camera && engine && scene) {
      engine.setSize(1920, 1080);

      camera.minZ = 0.1;
      camera.maxZ = 10000;
      scene.activeCamera = camera;

      scene.render();

      await delay(250);

      CreateScreenshotUsingRenderTarget(
        engine,
        scene?.activeCamera,
        { width: 1920, height: 1080 },
        (screenshotData) => {
          downloadBase64Image("png", screenshotData, camera.name + ".png");
        }
      );

      await delay(250);

      camera.minZ = depthMinZ;
      camera.maxZ = depthMaxZ;

      scene.enableDepthRenderer;
      depthRenderer = scene.enableDepthRenderer(camera, false);

      // refs.scene?.setActiveCameraByName(camera.name);
      scene.activeCamera = camera;
      depthPostProcess = new PostProcess(
        "viewDepthShader",
        "viewDepth",
        [],
        ["textureSampler", "SceneDepthTexture"], // textures
        { width: 1920, height: 1080 },
        camera,
        // globalRefs.activeCamera
        // Texture.NEAREST_SAMPLINGMODE // sampling
        // globalRefs.scene.engine // engine,
        // Texture.BILINEAR_SAMPLINGMODE,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "viewDepth"
      );
      const depthRenderTarget = depthRenderer?.getDepthMap();

      if (depthRenderTarget) {
        depthRenderTarget.activeCamera = camera;
      }
      depthPostProcess.onApply = (effect) => {
        if (depthRenderTarget) {
          effect?.setTexture("SceneDepthTexture", depthRenderTarget);
        }
      };

      scene.render();
      await delay(250);
      CreateScreenshotUsingRenderTarget(
        engine,
        scene?.activeCamera,
        { width: 1920, height: 1080 },
        (screenshotData) => {
          downloadBase64Image(
            "png",
            screenshotData,
            camera.name + "_depth" + ".png"
          );
        }
      );
      await delay(250);

      depthPostProcess.dispose();

      camera.minZ = originalMinZ;
      camera.maxZ = originalMaxZ;
    }
  }
}
