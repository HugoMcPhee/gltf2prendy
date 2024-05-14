import { DepthRenderer, FreeCamera, Vector3 } from "@babylonjs/core";
import { PlaceInfo, PointsInfo } from "..";
import { Vector } from "babylonjs/Maths/index";

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
    calculateCameraScore,
    createVisualMarker,
    calculateRelativeDistanceScores,
  } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  function getKeyFromPoint(vectorPoint: Vector3) {
    const { x: realX, y: realY, z: realZ } = vectorPoint;
    const x = Math.round(realX * 1000) / 1000;
    const y = Math.round(realY * 1000) / 1000;
    const z = Math.round(realZ * 1000) / 1000;
    const pointInfoKey = `${x},${y},${z}`;
    return pointInfoKey;
  }

  await waitForSceneReady(scene);

  const engine = scene.getEngine();
  engine.setSize(192 * 7, 108 * 7); // Assume fixed size for simplicity
  canvas.width = engine.getRenderWidth();
  canvas.height = engine.getRenderHeight();

  await setupFakeCharacter();
  await applyBlackMaterialToDetails();

  const totalPixelsAmount = engine.getRenderWidth() * engine.getRenderHeight();

  const pointsOnFloor = await generateFloorPoints(3);

  //   const TEST_POINT_INDEX = 8;
  const TEST_POINT_INDEX = -1;
  const ZOOM_OUT_REVEAL_AMOUNT = 0.55;

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

      const pointInfoKey = getKeyFromPoint(vectorPoint);

      //   console.log("pointInfoKey", pointInfoKey);

      if (!pointsInfo[pointInfoKey]) {
        pointsInfo[pointInfoKey] = { point: [x, y, z], camInfos: {}, bestCam1: "", bestCam2: "" };
      }

      if (!pointsInfo[pointInfoKey].camInfos[camName]) {
        pointsInfo[pointInfoKey].camInfos[camName] = {
          characterDistance: 0,
          screenCoverage: 0,
          visibilityScore: 0,
          cameraScore: -1,
          relativeDistanceScore: 0,
        };
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
        // modelFile.transformNodes.details.setEnabled(false);

        // let updatedCamZoom = ZOOM_OUT_REVEAL_AMOUNT;
        // while (updatedCamZoom < 1) {
        //   //   await delay(1);
        //   //   console.log("originalCamZoom", originalCamZoom);
        //   updatedCamZoom += 0.0045;
        //   updateCameraZoom(updatedCamZoom);
        //   scene.render();

        //   await delay(1);
        // }

        // modelFile.transformNodes.details.setEnabled(true);
        let updatedCamZoom = 1;

        // do a loop and await delay inside until originalCamZoom is ZOOM_OUT_REVEAL_AMOUNT
        while (updatedCamZoom > ZOOM_OUT_REVEAL_AMOUNT) {
          //   await delay(1);
          //   console.log("originalCamZoom", originalCamZoom);
          updatedCamZoom -= 0.0025;
          updateCameraZoom(updatedCamZoom);
          scene.render();

          await delay(1);
        }
      }
      modelFile.transformNodes.details.setEnabled(false);

      // Second render
      updateCameraZoom(ZOOM_OUT_REVEAL_AMOUNT);
      //   camera.fov = secondRenderFov;
      modelFile.transformNodes.details.setEnabled(false);
      scene.render();
      const characterFullPotentialPixels = await countWhitePixels(scene);
      const fovScaleFactor = getFovScaleFactor(initialFov, camera.fov);

      if (TEST_POINT_INDEX > 0) {
        await delay(1);
      }

      // Reset state
      modelFile.transformNodes.details.setEnabled(true);
      updateCameraZoom(1);
      camera.fov = originalCamFov;
      camera.minZ = originalMinZ;
      camera.maxZ = originalMaxZ;

      const scaledWhitePixels = whitePixels * fovScaleFactor * fovScaleFactor;

      const visibilityScore = characterFullPotentialPixels === 0 ? 0 : scaledWhitePixels / characterFullPotentialPixels;
      pointsInfo[pointInfoKey].camInfos[camName].visibilityScore = visibilityScore; // Inverted as per the definition

      const cameraPosition = camera.globalPosition;
      const characterDistance = BABYLON.Vector3.Distance(cameraPosition, characterPosition); // characterPosition needs to be defined
      pointsInfo[pointInfoKey].camInfos[camName].characterDistance = characterDistance;

      //   const cameraScore = calculateCameraScore({
      //     distance: characterDistance,
      //     visibility: visibilityScore,
      //     screenOccupancy: screenCoverage,
      //   });
      //   pointsInfo[pointInfoKey].camInfos[camName].cameraScore = cameraScore; // Inverted as per the definition

      //   console.log("cameraScore", cameraScore);

      if (vectorPointIndex === TEST_POINT_INDEX) {
        console.log("zoom in", scaledWhitePixels, "zoom out", characterFullPotentialPixels, "factor", fovScaleFactor);

        // console.log("visibilityScore", visibilityScore, "charScreenAmount", screenCoverage);
        await delay(2000);
      }
    }
  }

  await delay(1);

  calculateRelativeDistanceScores(pointsInfo);

  console.log("======================================");
  console.log("pointsInfo");
  console.log(pointsInfo);

  await delay(5000);

  // calucalte the cameraScore for each point influenced by the new relativeDistanceScore
  for (const vectorPoint of pointsOnFloor) {
    const pointInfoKey = getKeyFromPoint(vectorPoint);
    const camInfos = pointsInfo[pointInfoKey].camInfos;
    const camNames = Object.keys(camInfos);

    for (const camName of camNames) {
      const info = camInfos[camName];
      const cameraScore = calculateCameraScore({
        distance: info.characterDistance,
        relativeDistanceScore: info.relativeDistanceScore,
        visibility: info.visibilityScore,
        screenOccupancy: info.screenCoverage,
      });
      pointsInfo[pointInfoKey].camInfos[camName].cameraScore = cameraScore;
    }
  }

  // Find the best camera for each point
  for (const vectorPoint of pointsOnFloor) {
    const pointInfoKey = getKeyFromPoint(vectorPoint);

    const camInfos = pointsInfo[pointInfoKey].camInfos;
    const camNames = Object.keys(camInfos);

    let bestCam1 = "";
    let bestCam2 = "";
    let bestScore1 = 0;
    let bestScore2 = 0;

    for (const camName of camNames) {
      const cameraScore = camInfos[camName].cameraScore;
      if (cameraScore > bestScore1) {
        bestScore2 = bestScore1;
        bestCam2 = bestCam1;
        bestScore1 = cameraScore;
        bestCam1 = camName;
      } else if (cameraScore > bestScore2) {
        bestScore2 = cameraScore;
        bestCam2 = camName;
      }

      if (bestScore1 < 0.1) {
        bestCam1 = "";
      }
      if (bestScore2 < 0.1) {
        bestCam2 = "";
      }
    }

    pointsInfo[pointInfoKey].bestCam1 = bestCam1;
    pointsInfo[pointInfoKey].bestCam2 = bestCam2;
  }

  // Loop through each camera, and for each camera, loop through each point, and make a visual marker based on the points camera score (with createVisualMarker),
  // 0 is red, 1 is green and inbetween is a gradient between red and green
  // Also, log the camera score for each point

  let highestCamScoreFound = 0;

  for (const camName of camNames) {
    for (const vectorPoint of pointsOnFloor) {
      const pointInfoKey = getKeyFromPoint(vectorPoint);
      const cameraScore = pointsInfo[pointInfoKey].camInfos[camName].cameraScore;

      if (cameraScore > highestCamScoreFound) {
        highestCamScoreFound = cameraScore;
      }
    }
  }

  function normalizeCamScore(cameraScore: number) {
    // uses the highestCamScoreFound to normalize the camera score
    return cameraScore / highestCamScoreFound;
  }

  for (const camName of camNames) {
    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;
    modelFile.transformNodes.details.setEnabled(true);

    for (const vectorPoint of pointsOnFloor) {
      const pointInfoKey = getKeyFromPoint(vectorPoint);
      const cameraScore = pointsInfo[pointInfoKey].camInfos[camName].cameraScore;
      const bestCam1 = pointsInfo[pointInfoKey].bestCam1;
      const bestCam2 = pointsInfo[pointInfoKey].bestCam2;
      const normalCamScore = normalizeCamScore(cameraScore);

      //   This was the original way to get a heat map, but it's not easy to distinguish the higher values
      let color = new BABYLON.Color3(1, 0, 0);
      if (camName === bestCam1) {
        color = new BABYLON.Color3(0, 1, 0);
      } else if (camName === bestCam2) {
        color = new BABYLON.Color3(0.9, 0.1, 0);
      } else if (!bestCam1) {
        color = new BABYLON.Color3(0, 0, 1);
      }

      //   color = new BABYLON.Color3(1 - cameraScore, cameraScore, 0);

      createVisualMarker(vectorPoint, color);
      //   console.log("normalCamScore", normalCamScore);
    }
    await delay(1);
    scene.render();
    await delay(2000);
    modelFile.transformNodes.details.setEnabled(false);
    scene.render();
    await delay(2000);

    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;
    modelFile.transformNodes.details.setEnabled(true);
  }

  console.log("pointsInfo");
  await delay(5000);
}
