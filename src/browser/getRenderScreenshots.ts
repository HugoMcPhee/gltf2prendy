import { Camera, DepthRenderer, Vector3 } from "@babylonjs/core";

export async function getCameraColorScreenshot(camName: string) {
  // use this whole function inside evaluate

  // remove the old depth postProcess
  window.pageRefs.depthPostProcess?.dispose();

  const { modelFile, delay, engine, scene, countWhitePixels } = window.pageRefs;
  if (!delay || !modelFile || !engine || !scene) return;
  const detailsNode = modelFile.transformNodes.details;
  detailsNode.setEnabled(true);

  const camera = modelFile.cameras[camName];
  if (!camera) return;

  const originalMinZ = camera.minZ;
  const originalMaxZ = camera.maxZ;

  engine.setSize(1440, 1440);

  camera.minZ = 0.1;
  camera.maxZ = 10000;
  scene.activeCamera = camera;
  scene.activeCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;

  scene.render();

  // allow some time for rendering
  await delay(10);

  // set cameras view distance back to their original
  camera.minZ = originalMinZ;
  camera.maxZ = originalMaxZ;
}

export async function getCameraDepthScreenshot(camName: string) {
  // use this whole function inside evaluate

  const { modelFile, delay, engine, scene, BABYLON } = window.pageRefs;
  if (!delay || !modelFile || !engine || !scene || !BABYLON) return;
  const camera = modelFile.cameras[camName];
  const cameraNode = modelFile.transformNodes[camName + "_node"];
  if (!camera) return;
  if (!cameraNode) return;

  let depthRenderer: null | DepthRenderer = null;

  camera.computeWorldMatrix();
  const cameraDepthFarPoint =
    modelFile.transformNodes[camName + "_depth_far"] ?? modelFile.transformNodes[camName + "_depth"];
  const cameraDepthNearPoint = modelFile.transformNodes[camName + "_depth_near"];

  if (cameraDepthFarPoint) cameraDepthFarPoint.computeWorldMatrix();
  if (cameraDepthNearPoint) cameraDepthNearPoint.computeWorldMatrix();
  if (cameraNode) cameraNode.computeWorldMatrix();

  const originalMinZ = camera.minZ;
  const originalMaxZ = camera.maxZ;

  const depthMinZ = cameraDepthNearPoint
    ? BABYLON.Vector3.Distance(camera.globalPosition, cameraDepthNearPoint.absolutePosition)
    : 1;

  const depthMaxZ = cameraDepthFarPoint
    ? BABYLON.Vector3.Distance(camera.globalPosition, cameraDepthFarPoint.absolutePosition)
    : 100;

  function vector3ToPoint3(value: Vector3) {
    return { x: value?._x, y: value?._y, z: value?._z };
  }

  engine.setSize(1440, 1440);

  camera.minZ = 0.1;
  camera.maxZ = 10000;
  scene.activeCamera = camera;
  scene.activeCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;

  camera.minZ = depthMinZ;
  camera.maxZ = depthMaxZ;

  scene.enableDepthRenderer;
  depthRenderer = scene.enableDepthRenderer(camera, false);

  scene.activeCamera = camera;
  scene.activeCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;

  window.pageRefs.depthPostProcess = new BABYLON.PostProcess(
    "viewDepthShader",
    "viewDepth",
    [],
    ["textureSampler", "SceneDepthTexture"], // textures
    { width: 1440, height: 1440 },
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
    depthRenderTarget.activeCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
  }
  window.pageRefs.depthPostProcess.onApply = (effect) => {
    if (depthRenderTarget) {
      effect?.setTexture("SceneDepthTexture", depthRenderTarget);
    }
  };

  scene.render();

  // allow some time for rendering
  await delay(500);

  // set cameras view distance back to their original
  camera.minZ = originalMinZ;
  camera.maxZ = originalMaxZ;
}
