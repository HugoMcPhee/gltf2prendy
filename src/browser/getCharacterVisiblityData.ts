import { DepthRenderer } from "@babylonjs/core";
import { PlaceInfo, PointsInfo } from "..";

export async function getCharacterVisibilityData(placeInfo: PlaceInfo, pointsInfo: PointsInfo) {
  const {
    modelFile,
    delay,
    scene,
    canvas,
    BABYLON,
    countWhitePixels,
    setupFakeCharacter,
    generateFloorPoints,
    applyBlackMaterialToDetails,
    getFovScaleFactor,
    waitForSceneReady,
  } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  await waitForSceneReady(scene);

  const engine = scene.getEngine();
  engine.setSize(192 * 4, 108 * 4); // Assume fixed size for simplicity
  canvas.width = engine.getRenderWidth();
  canvas.height = engine.getRenderHeight();

  await setupFakeCharacter();
  await applyBlackMaterialToDetails();

  const totalPixelsAmount = engine.getRenderWidth() * engine.getRenderHeight();

  const pointsOnFloor = await generateFloorPoints(5);

  const camNames = placeInfo.camNames;
  for (const camName of camNames) {
    window.pageRefs.depthPostProcess?.dispose();
    if (!delay || !modelFile || !engine || !scene) return;

    const camera = modelFile.cameras[camName];
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;

    for (const vectorPoint of pointsOnFloor) {
      const { x: realX, y: realY, z: realZ } = vectorPoint;
      const x = Math.round(realX * 1000) / 1000;
      const y = Math.round(realY * 1000) / 1000;
      const z = Math.round(realZ * 1000) / 1000;

      const pointInfoKey = `${x},${y},${z}`;
      if (!pointsInfo[pointInfoKey]) {
        pointsInfo[pointInfoKey] = { point: [x, y, z], camInfos: {}, bestCam1: "", bestCam2: "" };
      }

      if (!pointsInfo[pointInfoKey].camInfos[camName]) {
        pointsInfo[pointInfoKey].camInfos[camName] = { charcterDistance: 0, charScreenAmount: 0, charVisibleAmount: 0 };
      }

      window.pageRefs.fakeCharacter?.position.set(x, y, z);

      const originalCamFov = camera.fov;
      const secondRenderFov = originalCamFov * 1.5;

      // First render
      camera.fov = originalCamFov;
      scene.render();
      const whitePixels = await countWhitePixels(scene);
      const charScreenAmount = whitePixels / totalPixelsAmount;
      pointsInfo[pointInfoKey].camInfos[camName].charScreenAmount = charScreenAmount;

      await delay(1);

      // Second render
      camera.fov = secondRenderFov;
      modelFile.transformNodes.details.setEnabled(false);
      scene.render();
      const characterFullPotentialPixels = await countWhitePixels(scene);

      await delay(1);

      // Reset state
      modelFile.transformNodes.details.setEnabled(true);
      camera.fov = originalCamFov;
      camera.minZ = originalMinZ;
      camera.maxZ = originalMaxZ;

      const charVisibleAmount = characterFullPotentialPixels === 0 ? 0 : whitePixels / characterFullPotentialPixels;
      pointsInfo[pointInfoKey].camInfos[camName].charVisibleAmount = charVisibleAmount; // Inverted as per the definition

      console.log("charVisibleAmount", charVisibleAmount, "charScreenAmount", charScreenAmount);
    }
  }
  console.log("pointsInfo");
}
