import { FreeCamera, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { Point3D } from "chootils/dist/points3d";
import { PlaceInfo } from "../..";
import { GridPolyId } from "./findPointsOnFloors";

export type IdPoint3D = { x: number; y: number; z: number; id: string };

export type Edge = {
  start: number; // Index of the start vertex
  end: number; // Index of the end vertex
};

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
    calculateCameraScore,
    createVisualMarker,
    calculateRelativeDistanceScores,
    findIslandsFromPoints,
    generateTrianglesFromPoints,
    createAndExtrudeMesh,
    getSimplifiedPoint,
    pointsInfo,
    gridPointMap,
    gridPointsOrganized,
    pointIslandsByCamera,
    islandPolyIdsByCamera,
    findGridPolysForIsland,
    gridPolyMap,
    filterMap,
    debugCamScores,
    getTriPointsFromGridPolyIds,
    createTriMeshFromGridPolyIds,
    getDidGridSettingsChange,
    GRID_SPACE,
    RESOLUTION_LEVEL,
  } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  // To clear cached points data
  // localStorage.clear();

  // pointsInfo, pointIslandsByCamera, gridPointMap, gridPointsOrganized

  // Check if localStorage has pointsInfo stored
  const pointsInfoFromStorage = localStorage.getItem("pointsInfo");
  if (pointsInfoFromStorage) {
    const parsedPointsInfo = JSON.parse(pointsInfoFromStorage);
    Object.assign(pointsInfo, parsedPointsInfo);
  }
  const pointIslandsByCameraFromStorage = localStorage.getItem("pointIslandsByCamera");
  if (pointIslandsByCameraFromStorage) {
    const parsedPointIslandsByCamera = JSON.parse(pointIslandsByCameraFromStorage);
    Object.assign(pointIslandsByCamera, parsedPointIslandsByCamera);
  }

  const didLoadPointsInfo = Object.keys(pointsInfo).length > 0;
  const didLoadPointIslandsByCamera = Object.keys(pointIslandsByCamera).length > 0;

  const didLoadData = didLoadPointsInfo && didLoadPointIslandsByCamera;

  const didGridSettingsChange = getDidGridSettingsChange();

  const shouldRecalculateCamScores = !didLoadData || didGridSettingsChange;

  // let alreadyHasPointsInfo

  //   const TEST_POINT_INDEX = 8;
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
  engine.setSize(192 * RESOLUTION_LEVEL, 108 * RESOLUTION_LEVEL); // Assume fixed size for simplicity
  canvas.width = engine.getRenderWidth();
  canvas.height = engine.getRenderHeight();
  const totalPixelsAmount = engine.getRenderWidth() * engine.getRenderHeight();

  await setupFakeCharacter();
  await applyBlackMaterialToDetails();
  await generateFloorPoints(GRID_SPACE);
  const gridPointIds = Object.keys(gridPointMap);
  const camNames = placeInfo.camNames;

  if (shouldRecalculateCamScores) {
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
        const cylinderHeight = 3;
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

        const visibilityScore =
          characterFullPotentialPixels === 0 ? 0 : scaledWhitePixels / characterFullPotentialPixels;
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
      for (const pointId of islandPointIds) {
        const point = gridPointMap[pointId].point;
        if (!point) continue;
        const color = randomColor;
        visualMarkers.push(createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), color));
      }

      scene.render();
      await delay(CHECK_WAIT_TIME / 7);
    }

    // for (const visualMarker of visualMarkers) visualMarker?.dispose();
  }

  // Update to use pointIds?
  // ALSO need to make it so quad polys make two triangles

  /**
   * Function to identify outer edges from a list of triangles.
   */
  function findOuterEdges(indices: number[]): { edge: Edge; triangleIndex: number }[] {
    const edgeMap: { [key: string]: { count: number; triangleIndices: number[] } } = {};
    const edges: { edge: Edge; triangleIndex: number }[] = [];

    for (let i = 0; i < indices.length; i += 3) {
      const triEdges = [
        { start: indices[i], end: indices[i + 1] },
        { start: indices[i + 1], end: indices[i + 2] },
        { start: indices[i + 2], end: indices[i] },
      ];

      triEdges.forEach((edge) => {
        const key = edge.start < edge.end ? `${edge.start}_${edge.end}` : `${edge.end}_${edge.start}`;
        if (!edgeMap[key]) {
          edgeMap[key] = { count: 0, triangleIndices: [] };
        }
        edgeMap[key].count++;
        edgeMap[key].triangleIndices.push(i / 3); // Store the triangle index
      });
    }

    Object.keys(edgeMap).forEach((key) => {
      if (edgeMap[key].count === 1) {
        // Only add edges that appear in one triangle
        const edge = key.split("_").map(Number);
        edges.push({ edge: { start: edge[0], end: edge[1] }, triangleIndex: edgeMap[key].triangleIndices[0] });
      }
    });

    return edges;
  }

  function calculateNormals(vertices: Point3D[], indices: number[]): Point3D[] {
    const normals: Point3D[] = [];

    for (let i = 0; i < indices.length; i += 3) {
      const p1 = vertices[indices[i]];
      const p2 = vertices[indices[i + 1]];
      const p3 = vertices[indices[i + 2]];
      const normal = calculateNormal(p1, p2, p3);
      normals.push(normal);
    }

    return normals;
  }

  function calculateNormal(v1: Point3D, v2: Point3D, v3: Point3D): Point3D {
    const U = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const V = { x: v3.x - v2.x, y: v3.y - v2.y, z: v3.z - v2.z };

    return {
      x: U.y * V.z - U.z * V.y,
      y: U.z * V.x - U.x * V.z,
      z: U.x * V.y - U.y * V.x,
    };
  }

  /**
   * Main function to create extruded terrain mesh.
   */
  const createExtrudedTriMeshFromGridPolyIds = (
    gridPolyIds: GridPolyId[],
    scene: Scene,
    extrusionHeight: number = 1
  ): Mesh => {
    const points: Point3D[][] = getTriPointsFromGridPolyIds(gridPolyIds);
    const { uniqueVertices, indices } = buildUniqueVerticesAndIndices(points);

    // Duplicate vertices upwards
    const totalVertices = uniqueVertices.length;
    const upperVertices = uniqueVertices.map((vertex) => ({ x: vertex.x, y: vertex.y + extrusionHeight, z: vertex.z }));
    const newVertices = uniqueVertices.concat(upperVertices);

    // After computing unique vertices and indices
    const customNormals = calculateNormals(uniqueVertices, indices);

    // Create side faces for extrusion
    const outerEdges = findOuterEdges(indices);
    outerEdges.forEach(({ edge, triangleIndex }) => {
      const normal = customNormals[triangleIndex];
      const direction = Math.sign(normal.x + normal.y + normal.z); // Adjust this based on your coordinate system

      const upperStart = edge.start + totalVertices;
      const upperEnd = edge.end + totalVertices;

      if (direction > 0) {
        indices.push(edge.start, upperStart, edge.end);
        indices.push(edge.end, upperStart, upperEnd);
      } else {
        indices.push(edge.start, edge.end, upperStart);
        indices.push(edge.end, upperEnd, upperStart);
      }
    });

    // Create and correct the top face
    const upperIndices = indices.slice(0, indices.length / 2).map((index) => index + totalVertices);
    for (let i = 0; i < upperIndices.length; i += 3) {
      // Reverse winding order for each triangle of the top face
      const temp = upperIndices[i + 1];
      upperIndices[i + 1] = upperIndices[i + 2];
      upperIndices[i + 2] = temp;
    }

    // Concatenate the corrected top face indices
    indices.push(...upperIndices);

    // Recompute normals with new geometry
    const positions = newVertices.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]);
    const normals: number[] = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    // Apply vertex data to the custom mesh
    const customMesh = new BABYLON.Mesh("customExtruded", scene);
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.applyToMesh(customMesh, true);

    return customMesh;
  };

  /**
   * Helper function to build unique vertices and their indices.
   */
  function buildUniqueVerticesAndIndices(points: Point3D[][]): { uniqueVertices: Point3D[]; indices: number[] } {
    const uniqueVertices: Point3D[] = [];
    const indices: number[] = [];
    const vertexLookup: { [key: string]: number } = {};

    let index = 0;
    points.forEach((triangle) => {
      triangle.forEach((vertex) => {
        const key = `${vertex.x}_${vertex.y}_${vertex.z}`;
        if (vertexLookup[key] === undefined) {
          uniqueVertices.push(vertex);
          vertexLookup[key] = index++;
        }
        indices.push(vertexLookup[key]);
      });
    });

    return { uniqueVertices, indices };
  }

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

      const shouldKeepCamera = camNames.indexOf(camName) === camNames.length - 3;

      // const islandTriMesh = createExtrudedTriMeshFromGridPolyIds(foundIslandPolyIds, scene, 0.2);
      const islandTriMesh = createTriMeshFromGridPolyIds(foundIslandPolyIds, scene);
      madeMeshes.push(islandTriMesh);
      scene.render();
      await delay(1);
      scene.render();
      await delay(CHECK_WAIT_TIME);
      if (!shouldKeepCamera) {
        madeMeshes.forEach((m) => m.dispose());
      }
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

  console.log("set free camera");

  if (freeCamera) {
    scene.activeCamera = freeCamera;
  }

  // hide the scene meshes
  modelFile.transformNodes.details.setEnabled(false);

  // loop 3 times
  for (let i = 0; i < 3; i++) {
    for (const camName of camNames) {
      const pointsByIsland = pointIslandsByCamera[camName];
      if (!pointsByIsland) continue;

      const camera = modelFile.cameras[camName] as FreeCamera;
      if (!camera) return;
      scene.activeCamera = camera;
      scene.render();
      await delay(1);
      scene.render();
      await delay(CHECK_WAIT_TIME * 2);
    }
  }

  // createAndExtrudeMesh
  // await delay(2000);
}
