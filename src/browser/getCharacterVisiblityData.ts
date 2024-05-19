import { FreeCamera, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { PlaceInfo, PointsInfo } from "..";
import { GridPoint, GridPolyId } from "./findPointsOnFloors";
import { Point3D } from "chootils/dist/points3d";

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
    islandPolyIdsByCamera,
    findGridPolysForIsland,
    gridPolyMap,
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

  //   for each Camera,  get the isalnds and store it in a pointIslandsByCamera map (using findIslandsFromPoints)
  for (const camName of camNames) {
    const pointIds = pointIdsByBestCam[camName];
    const islands = findIslandsFromPoints(pointIds, GRID_SPACE);
    // await delay(5000);
    pointIslandsByCamera[camName] = islands;
  }

  await delay(2000);
  console.log("=====================");
  console.log("=====================");
  console.log("=====================");
  console.log("pointIslandsByCamera");
  console.log(pointIslandsByCamera);

  await delay(2000);

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
    await delay(CHECK_WAIT_TIME / 7);

    let visualMarkers = [];
    for (const islandPointIds of Object.values(pointsByIsland)) {
      for (const pointId of islandPointIds) {
        const point = gridPointMap[pointId].point;
        if (!point) continue;
        const color = new BABYLON.Color3(1, 1, 0);
        visualMarkers.push(createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), color));
      }
      scene.render();
      await delay(1);
      scene.render();
      await delay(CHECK_WAIT_TIME / 7);
    }

    for (const visualMarker of visualMarkers) {
      await delay(1);

      if (visualMarker) {
        scene.removeMesh(visualMarker);
        visualMarker.dispose();
      }
    }
  }

  async function renderDebugGridPoly(polyId: string, color: BABYLON.Color3) {
    const meshesToRender: Mesh[] = [];
    const gridPoly = gridPolyMap[polyId];
    if (!gridPoly) return meshesToRender;

    if (gridPoly.polyType === "quad" || gridPoly.polyType === "empty") return meshesToRender;

    const topLeftPointId = gridPoly.pointIds.topLeft;
    const topRightPointId = gridPoly.pointIds.topRight;
    const bottomRightPointId = gridPoly.pointIds.bottomRight;
    const bottomLeftPointId = gridPoly.pointIds.bottomLeft;

    const topLeftPoint = topLeftPointId && gridPointMap[topLeftPointId]?.point;
    const topRightPoint = topRightPointId && gridPointMap[topRightPointId]?.point;
    const bottomRightPoint = bottomRightPointId && gridPointMap[bottomRightPointId]?.point;
    const bottomLeftPoint = bottomLeftPointId && gridPointMap[bottomLeftPointId]?.point;

    const pointsToRender = [topLeftPoint, topRightPoint, bottomRightPoint, bottomLeftPoint].filter(
      (p) => p
    ) as Point3D[];

    for (const point of pointsToRender) {
      const newMarker = createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), color);
      if (newMarker) meshesToRender.push(newMarker);
    }

    return meshesToRender;
  }

  // Update to use pointIds?
  // ALSO need to make it so quad polys make two triangles

  function getTriPointsFromGridPolyIds(gridPolyIds: string[]) {
    const triPoints: Point3D[][] = [];
    for (const polyId of gridPolyIds) {
      const gridPoly = gridPolyMap[polyId];
      if (!gridPoly) continue;

      const topLeftPointId = gridPoly.pointIds.topLeft;
      const topRightPointId = gridPoly.pointIds.topRight;
      const bottomRightPointId = gridPoly.pointIds.bottomRight;
      const bottomLeftPointId = gridPoly.pointIds.bottomLeft;

      const topLeftPoint = topLeftPointId && gridPointMap[topLeftPointId]?.point;
      const topRightPoint = topRightPointId && gridPointMap[topRightPointId]?.point;
      const bottomRightPoint = bottomRightPointId && gridPointMap[bottomRightPointId]?.point;
      const bottomLeftPoint = bottomLeftPointId && gridPointMap[bottomLeftPointId]?.point;

      if (gridPoly.polyType === "empty") continue;

      // NOTE reverse the points to make the triangles face the right way

      if (gridPoly.polyType === "quad") {
        const triPointsA = [topLeftPoint, topRightPoint, bottomRightPoint].filter((p) => p).reverse() as Point3D[];
        const triPointsB = [bottomRightPoint, bottomLeftPoint, topLeftPoint].filter((p) => p).reverse() as Point3D[];

        triPoints.push(triPointsA);
        triPoints.push(triPointsB);
      } else {
        const pointsToRender = [topLeftPoint, topRightPoint, bottomRightPoint, bottomLeftPoint]
          .filter((p) => p)
          .reverse() as Point3D[];

        triPoints.push(pointsToRender);
      }
    }
    return triPoints;
  }

  const createTriMeshFromGridPolyIds = (gridPolyIds: GridPolyId[], scene: Scene): Mesh => {
    const points: Point3D[][] = getTriPointsFromGridPolyIds(gridPolyIds);

    console.log("--------------------------");
    console.log("points");
    console.log(points);

    const uniqueVertices: Point3D[] = [];
    const indices: number[] = [];

    // Using an object to track vertex indices
    const vertexLookup: { [key: string]: number } = {};

    let index = 0;
    points.forEach((triangle) => {
      triangle.forEach((vertex) => {
        const key = `${vertex.x}_${vertex.y}_${vertex.z}`; // Using underscore as the separator
        if (vertexLookup[key] === undefined) {
          uniqueVertices.push(vertex);
          vertexLookup[key] = index++;
        }
        indices.push(vertexLookup[key]);
      });
    });

    const positions: number[] = [];
    const normals: number[] = [];

    uniqueVertices.forEach((vertex) => {
      positions.push(vertex.x, vertex.y, vertex.z);
    });

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    const customMesh = new BABYLON.Mesh("custom", scene);
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.applyToMesh(customMesh, true);

    customMesh.movePOV(0, 1, 0);

    return customMesh;
  };

  //   for each camera, for each isalnd, get the island poly data
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

    let madeMeshes: Mesh[] = [];
    const islandIds = Object.keys(pointsByIsland);
    console.log("--------------------");
    console.log("camName", camName);
    console.log("pointsByIsland", pointsByIsland);
    console.log("islandIds", islandIds);

    for (const islandId of islandIds) {
      const islandPointIds = pointsByIsland[islandId];
      console.log("islandPointIds", islandPointIds);

      const foundIslandPolyIds = await findGridPolysForIsland(islandPointIds);
      console.log("foundIslandPolyIds", foundIslandPolyIds);

      if (!islandPolyIdsByCamera[camName]) islandPolyIdsByCamera[camName] = {};
      islandPolyIdsByCamera[camName][islandId] = foundIslandPolyIds;

      const islandTriMesh = createTriMeshFromGridPolyIds(foundIslandPolyIds, scene);
      madeMeshes.push(islandTriMesh);
      scene.render();
      await delay(1);
      scene.render();
      await delay(CHECK_WAIT_TIME);
      madeMeshes.forEach((m) => m.dispose());
      scene.render();
      // for (const polyId of foundIslandPolyIds) {
      //   // make a random color
      //   const color = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
      //   madeMeshes = madeMeshes.concat(await renderDebugGridPoly(polyId, color));

      //   if (madeMeshes.length) {
      //     scene.render();
      //     await delay(1);
      //     scene.render();
      //     await delay(100);
      //     madeMeshes.forEach((m) => m.dispose());
      //     scene.render();
      //   }
      // }
    }
  }

  // createAndExtrudeMesh
  await delay(2000);
}
