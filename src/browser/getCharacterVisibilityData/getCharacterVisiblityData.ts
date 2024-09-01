import { FloatArray, FreeCamera, Mesh, Nullable, Scene, Vector3 } from "@babylonjs/core";
import { Point3D } from "chootils/dist/points3d";
import { PlaceInfo } from "../..";
import { GridPolyId } from "./findPointsOnFloors";
import { findOuterEdgesFunctions } from "./makeCamCubes/findOuterEdges";
import { IndicesArray, VertexData } from "babylonjs";
import { BasicEasyVertexData, Tri } from "../utils/points";

export type IdPoint3D = { x: number; y: number; z: number; id: string };

export type Edge = {
  start: number; // Index of the start vertex
  end: number; // Index of the end vertex
};

// Maybe rename this to generate camcube meshes

export async function getCharacterVisibilityData(placeInfo: PlaceInfo) {
  const {
    modelFile,
    delay,
    scene,
    freeCamera,
    canvas,
    BABYLON,
    countWhitePixels,
    setupFakeCharacter,
    generateFloorPoints,
    applyBlackMaterialToDetails,
    getFovScaleFactor,
    waitForSceneReady,
    createVisualMarker,
    calculateRelativeDistanceScores,
    pointsInfo,
    gridPointMap,
    pointIslandsByCamera,
    islandPolyIdsByCamera,
    findGridPolysForIsland,
    getTriPointsFromGridPolyIds,
    createTriMeshFromGridPolyIds,
    getShouldRecalculateCamScores,
    reverseWindingOrder,
    findOuterEdgeAndPointIds,
    convertToVector3,
    getEasyVertexData,
    getOrderedOuterEdges,
    getBasicEasyVertexDataFromQuad,
    getPointId: getPointIdFromPoint,
    getBasicEasyVertexDataFromTris,
    convertBasicEasyVertexDataToVertexData,
    mergeBasicEasyVertexData,
    shiftBasicEasyVertexData,
    makeCamCubeMesh,
    GRID_SPACE,
    RESOLUTION_LEVEL,
    CAMCUBE_HEIGHT,
    GLTF2Export,
  } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  const shouldRecalculateCamScores = getShouldRecalculateCamScores();
  // const shouldRecalculateCamScores = true;

  // const TEST_POINT_INDEX = 8;
  const TEST_POINT_INDEX = -1; // set this to check what's happening at one of the points
  const ZOOM_OUT_REVEAL_AMOUNT = 0.55;
  const CHECK_WAIT_TIME = 250;

  const makeEmptyCamInfo = () => ({
    characterDistance: 0,
    screenCoverage: 0,
    visibilityScore: 0,
    cameraScore: -1,
    relativeDistanceScore: 0,
  });

  await waitForSceneReady(scene);

  const engine = scene.getEngine();
  engine.setSize(144 * RESOLUTION_LEVEL, 144 * RESOLUTION_LEVEL); // Assume fixed size for simplicity
  canvas.width = engine.getRenderWidth();
  canvas.height = engine.getRenderHeight();
  const totalPixelsAmount = engine.getRenderWidth() * engine.getRenderHeight();

  await setupFakeCharacter();
  await applyBlackMaterialToDetails();
  await generateFloorPoints(GRID_SPACE);
  const gridPointIds = Object.keys(gridPointMap);
  const camNames = placeInfo.camNames;

  // function adjustInitialFov(
  //   camera: FreeCamera,
  //   desiredHorizontalVisibility: number,
  //   canvasWidth: number,
  //   canvasHeight: number
  // ): void {
  //   const aspectRatio = canvasWidth / canvasHeight;
  //   camera.fov = 2 * Math.atan((desiredHorizontalVisibility / 2 / camera.position.z) * aspectRatio);
  // }
  if (camNames.length != 0) {
    for (const camName of camNames) {
      const camera = modelFile.cameras[camName] as FreeCamera;
      if (camera) {
        const originalWidth = 1920;
        const originalHeight = 1080;
        const newWidth = 1440;
        const newHeight = 1440;
        // Calculate the original and new aspect ratios
        const originalAspectRatio = originalWidth / originalHeight;
        const newAspectRatio = newWidth / newHeight;

        // Calculate the ratio of the new aspect ratio to the original aspect ratio
        const aspectRatioChange = newAspectRatio / originalAspectRatio;

        // Calculate the FOV multiplier to maintain horizontal visibility
        const fovMultiplier = 1 / aspectRatioChange;

        // Apply the multiplier to the camera's FOV
        camera.fov *= fovMultiplier;

        // This works because
        // 1. The FOV is the vertical field of view
        // 2. when the resolution was 1920x1080, the horizontal visibility was what was wanted
        // 3. When the resolution is 1440x1440, the horizontal visibility is still what is wanted
        // 4. So it changes the vertical FOV to maintain the horizontal visibility, for the new resolution
        // ( I think )
      }
    }
  }

  if (shouldRecalculateCamScores) {
    for (const camName of camNames) {
      window.pageRefs.depthPostProcess?.dispose();

      const camera = modelFile.cameras[camName] as FreeCamera;
      if (!camera) return;

      const originalMinZ = camera.minZ;
      const originalMaxZ = camera.maxZ;

      camera.fovMode = BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED;

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
        const cylinderHeight = 3;
        fakeCharacter.position.set(x, y + cylinderHeight / 2, z);

        const characterPosition = fakeCharacter.position;

        const initialFov = camera.fov;

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
          let updatedCamZoom = 1;

          // Preview the zoom out
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

        const visibilityScore =
          characterFullPotentialPixels === 0 ? 0 : scaledWhitePixels / characterFullPotentialPixels;
        pointsInfo[pointId].camInfos[camName].visibilityScore = visibilityScore; // Inverted as per the definition

        const cameraPosition = camera.globalPosition;
        const characterDistance = BABYLON.Vector3.Distance(cameraPosition, characterPosition); // characterPosition needs to be defined
        pointsInfo[pointId].camInfos[camName].characterDistance = characterDistance;

        if (vectorPointIndex === TEST_POINT_INDEX) {
          console.log("zoom in", scaledWhitePixels, "zoom out", characterFullPotentialPixels, "factor", fovScaleFactor);
          await delay(CHECK_WAIT_TIME);
        }
      }
    }

    await calculateRelativeDistanceScores(pointsInfo, placeInfo);

    // Update grid stuff in localStorage
    localStorage.setItem("GRID_SPACE", GRID_SPACE.toString());
    localStorage.setItem("RESOLUTION_LEVEL", RESOLUTION_LEVEL.toString());
  }

  //   For each camera, render the islands with a different color
  for (const camName of camNames) {
    const pointsByIsland = pointIslandsByCamera[camName];
    if (!pointsByIsland) continue;

    let randomColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());

    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;
    scene.activeCamera = camera;

    scene.render();
    await delay(CHECK_WAIT_TIME / 7);

    let visualMarkers = [];

    for (const islandPointIds of Object.values(pointsByIsland)) {
      let highestCamScore = 0;
      for (const pointId of islandPointIds) {
        const point = gridPointMap[pointId].point;
        if (!point) continue;

        const loopedCamScore = pointsInfo[pointId].camInfos[camName].cameraScore;
        if (loopedCamScore > highestCamScore) highestCamScore = loopedCamScore;
      }
      for (const pointId of islandPointIds) {
        const point = gridPointMap[pointId].point;
        if (!point) continue;
        const color = randomColor;

        const weightValiue = pointsInfo[pointId].camInfos[camName].cameraScore;
        const weightValiueNormalized = weightValiue / highestCamScore;
        // make a visual marker with the color, using the weight value
        const heatmapColor = new BABYLON.Color3(1, 1 - weightValiueNormalized, 1 - weightValiueNormalized);
        // visualMarkers.push(createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), color));
        visualMarkers.push(createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), heatmapColor));
      }

      scene.render();
      // await delay(CHECK_WAIT_TIME / 7);
      await delay(CHECK_WAIT_TIME);
    }

    for (const visualMarker of visualMarkers) visualMarker?.dispose();
  }

  // Update to use pointIds?
  // ALSO need to make it so quad polys make two triangles

  const camCubeMeshMap: Record<string, Mesh> = {};

  //   for each camera, for each isalnd, get the island poly data
  for (const camName of camNames) {
    const pointsByIsland = pointIslandsByCamera[camName];
    if (!pointsByIsland) continue;

    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;
    scene.activeCamera = camera;

    scene.render();
    // await delay(CHECK_WAIT_TIME);

    let madeMeshes: Mesh[] = [];
    const islandIds = Object.keys(pointsByIsland);

    for (const islandId of islandIds) {
      try {
        const camCubeMesh = await makeCamCubeMesh(camName, islandId);
        // if (camCubeMesh) madeMeshes.push(camCubeMesh);
        if (camCubeMesh) camCubeMeshMap[`${camName}_${islandId}`] = camCubeMesh;
      } catch (e) {
        console.error(e);
      }

      scene.render();
      await delay(1);
      scene.render();

      await delay(CHECK_WAIT_TIME * 2);
    }
  }

  // console.log("set free camera");
  // if (freeCamera) {
  //   scene.activeCamera = freeCamera;
  // }

  // hide the scene meshes
  modelFile.transformNodes.details.setEnabled(false);

  console.log("camNames", camNames);

  // Focus on the 3rd camera
  const roomCamera = modelFile.cameras[camNames[1]] as FreeCamera;
  const topCamera = modelFile.cameras[camNames[3]] as FreeCamera;
  scene.activeCamera = roomCamera;

  const oriignalCamY = roomCamera.position.y;
  scene.render();
  let updatedCamYOffset = 0;
  while (updatedCamYOffset > -7) {
    updatedCamYOffset -= 0.05;
    roomCamera.position.y = oriignalCamY + updatedCamYOffset;
    scene.render();
    await delay(1);
  }
  while (updatedCamYOffset < 0) {
    updatedCamYOffset += 0.05;
    roomCamera.position.y = oriignalCamY + updatedCamYOffset;
    scene.render();
    await delay(1);
  }
  // await delay(2000);
  scene.activeCamera = topCamera;

  scene.render();
  await delay(2000);
  scene.activeCamera = roomCamera;

  scene.render();
  await delay(2000);
  scene.activeCamera = topCamera;

  scene.render();
  await delay(2000);

  // loop 3 times
  // for (let i = 0; i < 3; i++) {
  //   for (const camName of camNames) {
  //     const camera = modelFile.cameras[camName] as FreeCamera;
  //     if (!camera) return;
  //     scene.activeCamera = camera;
  //     scene.render();
  //     await delay(CHECK_WAIT_TIME * 2);
  //   }
  // }

  // Maybe ideally focus on all cameras reguardless of place

  // Get the camcube meshes, and export them in a gltf file

  // GLTF2Export

  // const gltfFiles = await BABYLON.GLTF2Export.GLTFAsync(scene, "fileName").then((gltf) => gltf.glTFFiles);

  // console.log("gltfFiles", gltfFiles);

  type MeshData = {
    positions: FloatArray;
    indices: IndicesArray;
    normals: FloatArray;
  };

  const meshDataMap: Record<string, Record<string, MeshData>> = {};

  function getMeshData(mesh: Mesh): MeshData {
    let vertexData = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind) ?? [];
    let indices = mesh.getIndices() ?? [];
    let normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind) ?? [];

    // Optional: Correct the indices for winding order
    let correctedIndices = [];
    for (let i = 0; i < indices.length; i += 3) {
      correctedIndices.push(indices[i], indices[i + 1], indices[i + 2]);
      // correctedIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    }

    // Optional: Invert z-axis for positions
    let correctedPositions = [];
    for (let i = 0; i < vertexData.length; i += 3) {
      correctedPositions.push(vertexData[i], vertexData[i + 1], -vertexData[i + 2]);
    }

    // Return this data to Puppeteer context
    return {
      positions: correctedPositions,
      indices: correctedIndices,
      normals: normals, // Only if they are correct; otherwise, generate in GLTF-transform if needed
    };
  }

  // loop through cam names and island names
  // for each, get the cam cube mesh
  for (const camName of camNames) {
    const pointsByIsland = pointIslandsByCamera[camName];
    if (!pointsByIsland) continue;
    const islandIds = Object.keys(pointsByIsland);

    for (const islandId of islandIds) {
      const foundMesh = camCubeMeshMap[`${camName}_${islandId}`];
      if (!foundMesh) continue;
      const meshData = getMeshData(foundMesh);
      meshDataMap[camName] = meshDataMap[camName] || {};
      meshDataMap[camName][islandId] = meshData;
    }
  }

  return meshDataMap;
}
