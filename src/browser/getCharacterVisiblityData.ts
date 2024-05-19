import { FreeCamera, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { PlaceInfo, PointsInfo } from "..";

export type IdPoint3D = { x: number; y: number; z: number; id: string };

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
    findIslandsFromPoints,
    generateTrianglesFromPoints,
    createAndExtrudeMesh,
    getSimplifiedPoint,
    gridPointMap,
    gridPointsOrganized,
    pointIslandsByCamera,
    filterMap,
  } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  const GRID_SPACE = 2; // space between grid points, in meters, more space means less points to check
  const RESOLUTION_LEVEL = 3; // higher resolution means more pixels to check, so more accurate but slower

  //   const TEST_POINT_INDEX = 8;
  const TEST_POINT_INDEX = -1;
  const ZOOM_OUT_REVEAL_AMOUNT = 0.55;
  const CHECK_WAIT_TIME = 750;

  function getGridIdFromPoint(vectorPoint: Vector3) {
    const { x, y, z } = getSimplifiedPoint(vectorPoint);
    return `${x}_${y}_${z}`;
  }

  const makeEmptyCamInfo = () => ({
    characterDistance: 0,
    screenCoverage: 0,
    visibilityScore: 0,
    cameraScore: -1,
    relativeDistanceScore: 0,
  });

  await waitForSceneReady(scene);

  const engine = scene.getEngine();
  engine.setSize(192 * RESOLUTION_LEVEL, 108 * RESOLUTION_LEVEL); // Assume fixed size for simplicity
  canvas.width = engine.getRenderWidth();
  canvas.height = engine.getRenderHeight();

  await setupFakeCharacter();
  await applyBlackMaterialToDetails();

  const totalPixelsAmount = engine.getRenderWidth() * engine.getRenderHeight();

  await generateFloorPoints(GRID_SPACE);

  const gridPointIds = Object.keys(gridPointMap);

  const camNames = placeInfo.camNames;
  for (const camName of camNames) {
    window.pageRefs.depthPostProcess?.dispose();

    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;

    let vectorPointIndex = -1;

    // NOTE Update to loop through keys of
    for (const pointId of gridPointIds) {
      const gridPoint = gridPointMap[pointId];
      if (!gridPoint?.point) continue;
      const { x, y, z } = gridPoint.point;

      vectorPointIndex += 1;

      // Make sure the point exists in the pointsInfo object
      if (!pointsInfo[pointId]) pointsInfo[pointId] = { point: [x, y, z], camInfos: {}, bestCam: "" };
      if (!pointsInfo[pointId].camInfos[camName]) pointsInfo[pointId].camInfos[camName] = makeEmptyCamInfo();

      const fakeCharacter = window.pageRefs.fakeCharacter;
      if (!fakeCharacter) return;

      // Set the position so the bottom of the cylinder is at the point
      const cylinderHeight = 5;
      fakeCharacter.position.set(x, y + cylinderHeight / 2, z);

      const characterPosition = fakeCharacter.position;

      const initialFov = camera.fov;
      const initialPosition = camera.position.clone();

      function updateCameraZoom(value: number) {
        camera.fov = initialFov / value;
      }

      modelFile.transformNodes.details.setEnabled(true);

      // First render
      camera.fov = initialFov;
      scene.render();
      const whitePixels = await countWhitePixels(scene);
      const screenCoverage = whitePixels / totalPixelsAmount;
      pointsInfo[pointId].camInfos[camName].screenCoverage = screenCoverage;

      if (vectorPointIndex === TEST_POINT_INDEX) {
        // await delay(2000);
        // modelFile.transformNodes.details.setEnabled(false);

        // let updatedCamZoom = ZOOM_OUT_REVEAL_AMOUNT;
        // while (updatedCamZoom < 1) {
        //   updatedCamZoom += 0.0045;
        //   updateCameraZoom(updatedCamZoom);
        //   scene.render();

        //   await delay(1);
        // }

        // modelFile.transformNodes.details.setEnabled(true);
        let updatedCamZoom = 1;

        // do a loop and await delay inside until originalCamZoom is ZOOM_OUT_REVEAL_AMOUNT
        while (updatedCamZoom > ZOOM_OUT_REVEAL_AMOUNT) {
          updatedCamZoom -= 0.0025;
          updateCameraZoom(updatedCamZoom);
          scene.render();

          await delay(1);
        }
      }
      modelFile.transformNodes.details.setEnabled(false);

      // Second render
      updateCameraZoom(ZOOM_OUT_REVEAL_AMOUNT);
      modelFile.transformNodes.details.setEnabled(false);
      scene.render();
      const characterFullPotentialPixels = await countWhitePixels(scene);
      const fovScaleFactor = getFovScaleFactor(initialFov, camera.fov);

      if (TEST_POINT_INDEX > 0) await delay(1);

      // Reset state
      modelFile.transformNodes.details.setEnabled(true);
      updateCameraZoom(1);
      camera.fov = initialFov;
      camera.minZ = originalMinZ;
      camera.maxZ = originalMaxZ;

      const scaledWhitePixels = whitePixels * fovScaleFactor * fovScaleFactor;

      const visibilityScore = characterFullPotentialPixels === 0 ? 0 : scaledWhitePixels / characterFullPotentialPixels;
      pointsInfo[pointId].camInfos[camName].visibilityScore = visibilityScore; // Inverted as per the definition

      const cameraPosition = camera.globalPosition;
      const characterDistance = BABYLON.Vector3.Distance(cameraPosition, characterPosition); // characterPosition needs to be defined
      pointsInfo[pointId].camInfos[camName].characterDistance = characterDistance;

      if (vectorPointIndex === TEST_POINT_INDEX) {
        console.log("zoom in", scaledWhitePixels, "zoom out", characterFullPotentialPixels, "factor", fovScaleFactor);
        // await delay(CHECK_WAIT_TIME);
      }
    }
  }

  await delay(1);

  calculateRelativeDistanceScores(pointsInfo);

  //   await delay(CHECK_WAIT_TIME);

  // calucalte the cameraScore for each point influenced by the new relativeDistanceScore
  for (const pointId of gridPointIds) {
    const camInfos = pointsInfo[pointId].camInfos;

    for (const camName of camNames) {
      camInfos[camName].cameraScore = calculateCameraScore(camInfos[camName]);
    }
  }

  // Find the best camera for each point
  for (const pointId of gridPointIds) {
    const camInfos = pointsInfo[pointId].camInfos;

    let bestCam = "";
    let bestScore = 0;

    for (const camName of camNames) {
      const cameraScore = camInfos[camName].cameraScore;
      if (cameraScore > bestScore) {
        bestScore = cameraScore;
        bestCam = camName;
      }
      if (bestScore < 0.1) bestCam = "";
    }

    pointsInfo[pointId].bestCam = bestCam;
  }

  // Find the highest camera score
  let highestCamScoreFound = 0;
  for (const camName of camNames) {
    for (const pointId of gridPointIds) {
      const cameraScore = pointsInfo[pointId].camInfos[camName].cameraScore;
      if (cameraScore > highestCamScoreFound) highestCamScoreFound = cameraScore;
    }
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

    for (const pointId of gridPointIds) {
      const gridPoint = gridPointMap[pointId];
      if (!gridPoint?.point) continue;
      const pointInfoKey = pointId;
      const cameraScore = pointsInfo[pointInfoKey].camInfos[camName].cameraScore;
      const bestCam = pointsInfo[pointInfoKey].bestCam;
      const normalCamScore = cameraScore / highestCamScoreFound;

      // Show the point with a color based on the camera score
      // let color = new BABYLON.Color3(1, 0, 0);
      // if (camName === bestCam) {
      //   color = new BABYLON.Color3(0, 1, 0);
      // } else if (!bestCam) {
      //   color = new BABYLON.Color3(0, 0, 1);
      // }
      //   color = new BABYLON.Color3(1 - cameraScore, cameraScore, 0);
      //   createVisualMarker(vectorPoint, color);
    }
    await delay(1);
    scene.render();
    modelFile.transformNodes.details.setEnabled(false);
    scene.render();
    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;
    modelFile.transformNodes.details.setEnabled(true);
  }

  // organise the points info into a record of <CameraName, { x, y, z, pointId }[] >
  const pointIdsByBestCam: Record<string, string[]> = {};
  for (const pointId of gridPointIds) {
    const bestCam = pointsInfo[pointId].bestCam;
    if (!bestCam) continue;

    if (!pointIdsByBestCam[bestCam]) pointIdsByBestCam[bestCam] = [];
    pointIdsByBestCam[bestCam].push(pointId);
  }

  await delay(2000);

  //   for each Camera,  get the isalnds and store it in a pointIslandsByCamera map (using findIslandsFromPoints)
  for (const camName of camNames) {
    const pointIds = pointIdsByBestCam[camName];
    const islands = findIslandsFromPoints(pointIds, GRID_SPACE);
    // await delay(5000);
    pointIslandsByCamera[camName] = islands;
  }

  //   for each camera, render the islands with a different color
  for (const camName of camNames) {
    const pointsByIsland = pointIslandsByCamera[camName];
    if (!pointsByIsland) continue;

    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;
    scene.activeCamera = camera;
    scene.render();
    await delay(1);
    scene.render();
    await delay(CHECK_WAIT_TIME);

    let visualMarkers = [];
    for (const island of Object.values(pointsByIsland)) {
      for (const pointId of island) {
        const point = gridPointMap[pointId].point;
        if (!point) continue;
        const color = new BABYLON.Color3(1, 1, 0);
        visualMarkers.push(createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), color));
      }
      scene.render();
      await delay(1);
      scene.render();
      await delay(CHECK_WAIT_TIME);
    }

    for (const visualMarker of visualMarkers) {
      await delay(1);

      if (visualMarker) {
        scene.removeMesh(visualMarker);
        visualMarker.dispose();
      }
    }
  }
  await delay(10000);
}
