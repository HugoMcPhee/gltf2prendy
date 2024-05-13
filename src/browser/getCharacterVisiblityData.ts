import { DepthRenderer, FreeCamera } from "@babylonjs/core";
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
  engine.setSize(192 * 7, 108 * 7); // Assume fixed size for simplicity
  canvas.width = engine.getRenderWidth();
  canvas.height = engine.getRenderHeight();

  await setupFakeCharacter();
  await applyBlackMaterialToDetails();

  const totalPixelsAmount = engine.getRenderWidth() * engine.getRenderHeight();

  const pointsOnFloor = await generateFloorPoints(5);

  const TEST_POINT_INDEX = 8;

  const camNames = placeInfo.camNames;
  for (const camName of camNames) {
    window.pageRefs.depthPostProcess?.dispose();
    if (!delay || !modelFile || !engine || !scene) return;

    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;

    let vectorPointIndex = -1;
    for (const vectorPoint of pointsOnFloor) {
      const { x: realX, y: realY, z: realZ } = vectorPoint;
      const x = Math.round(realX * 1000) / 1000;
      const y = Math.round(realY * 1000) / 1000;
      const z = Math.round(realZ * 1000) / 1000;

      vectorPointIndex += 1;

      const pointInfoKey = `${x},${y},${z}`;

      //   console.log("pointInfoKey", pointInfoKey);

      if (!pointsInfo[pointInfoKey]) {
        pointsInfo[pointInfoKey] = { point: [x, y, z], camInfos: {}, bestCam1: "", bestCam2: "" };
      }

      if (!pointsInfo[pointInfoKey].camInfos[camName]) {
        pointsInfo[pointInfoKey].camInfos[camName] = { charcterDistance: 0, screenCoverage: 0, visibilityScore: 0 };
      }

      const fakeCharacter = window.pageRefs.fakeCharacter;
      if (!fakeCharacter) return;

      //   fakeCharacter?.position.set(x, y, z);
      // Actually, set the position so the bottom of the cylinder is at the point
      // (fakeCharacter is a babylonjs cylinder mesh)

      const cylinderHeight = 5;
      fakeCharacter.position.set(x, y + cylinderHeight / 2, z);

      const characterPosition = fakeCharacter.position;

      const originalCamFov = camera.fov;
      //   const secondRenderFov = originalCamFov * 1.5;

      const initialFov = camera.fov;
      const initialPosition = camera.position.clone();

      function updateCameraZoom(value: number) {
        camera.fov = initialFov / value;
      }

      // First render: normal view
      // First render: normal view
      //   camera.fov = originalCamFov; // Restore original FOV if changed elsewhere
      //   scene.render();
      //   const whitePixels = await countWhitePixels(scene);
      //   const screenCoverage = whitePixels / totalPixelsAmount;
      //   pointsInfo[pointInfoKey].camInfos[camName].screenCoverage = screenCoverage;

      //   await delay(1);
      //   if (pointInfoKey === TEST_POINT_INFO_KEY) {
      //     console.log("screenCoverage", screenCoverage);
      //     await delay(10000);
      //   }

      //   // Calculate new camera position for "zoom out"
      //   const zoomOutDistance = 10; // Distance to move the camera back

      //   // Ensure the backward vector correctly points away from the scene
      //   const backwardVector = camera.getDirection(BABYLON.Vector3.Forward()).scale(-zoomOutDistance);
      //   const newCameraPosition = camera.position.add(backwardVector);

      //   // Adjust the near clipping plane to account for the moved position
      //   const originalMinZ = camera.minZ;
      //   camera.minZ += zoomOutDistance;

      //   // Second render: "zoomed out" view with adjusted clipping plane
      //   camera.position = newCameraPosition; // Move camera backwards
      //   scene.render();
      //   const characterFullPotentialPixels = await countWhitePixels(scene);

      //   // Reset camera position and clipping plane
      //   camera.position = camera.position.subtract(backwardVector);
      //   camera.minZ = originalMinZ;

      //   const cameraPosition = camera.position;
      //   const distance = BABYLON.Vector3.Distance(cameraPosition, characterPosition); // characterPosition needs to be defined

      //   // Now use this distance in place of `camera.radius`
      //   const distanceRatio = (distance + zoomOutDistance) / distance;
      //   const scaledCharacterFullPotentialPixels = characterFullPotentialPixels * distanceRatio * distanceRatio;

      //   const visibilityScore = whitePixels === 0 ? 0 : scaledCharacterFullPotentialPixels / whitePixels;
      //   pointsInfo[pointInfoKey].camInfos[camName].visibilityScore = visibilityScore;

      //   await delay(1);

      //   if (pointInfoKey === TEST_POINT_INFO_KEY) {
      //     console.log("screenCoverage", screenCoverage, "visibilityScore", visibilityScore);
      //     await delay(10000);
      //   }

      //     console.log("visibilityScore", visibilityScore, "screenCoverage", screenCoverage);

      modelFile.transformNodes.details.setEnabled(true);

      // First render
      camera.fov = originalCamFov;
      scene.render();
      const whitePixels = await countWhitePixels(scene);
      const screenCoverage = whitePixels / totalPixelsAmount;
      pointsInfo[pointInfoKey].camInfos[camName].screenCoverage = screenCoverage;

      //   await delay(1);

      if (vectorPointIndex === TEST_POINT_INDEX) {
        console.log("WAITING");
        console.log("vectorPointIndex", vectorPointIndex);

        // await delay(2000);
      }

      if (vectorPointIndex === TEST_POINT_INDEX) {
        let updatedCamZoom = 1;

        // do a loop and await delay inside until originalCamZoom is 0.75
        while (updatedCamZoom > 0.75) {
          //   await delay(1);
          //   console.log("originalCamZoom", originalCamZoom);
          updatedCamZoom -= 0.0015;
          updateCameraZoom(updatedCamZoom);
          scene.render();

          await delay(3);
        }
      }
      modelFile.transformNodes.details.setEnabled(false);

      // Second render
      updateCameraZoom(0.75);
      //   camera.fov = secondRenderFov;
      modelFile.transformNodes.details.setEnabled(false);
      scene.render();
      const characterFullPotentialPixels = await countWhitePixels(scene);
      const fovScaleFactor = getFovScaleFactor(initialFov, camera.fov);

      //   await delay(1);

      // Reset state
      modelFile.transformNodes.details.setEnabled(true);
      updateCameraZoom(1);
      camera.fov = originalCamFov;
      camera.minZ = originalMinZ;
      camera.maxZ = originalMaxZ;

      const scaledWhitePixels = whitePixels * fovScaleFactor * fovScaleFactor;

      const visibilityScore = characterFullPotentialPixels === 0 ? 0 : scaledWhitePixels / characterFullPotentialPixels;
      pointsInfo[pointInfoKey].camInfos[camName].visibilityScore = visibilityScore; // Inverted as per the definition

      if (vectorPointIndex === TEST_POINT_INDEX) {
        console.log("zoom in", scaledWhitePixels, "zoom out", characterFullPotentialPixels, "factor", fovScaleFactor);

        // console.log("visibilityScore", visibilityScore, "charScreenAmount", screenCoverage);
        await delay(2000);
      }
    }
  }
  console.log("pointsInfo");
  //   await delay(30000);
}
