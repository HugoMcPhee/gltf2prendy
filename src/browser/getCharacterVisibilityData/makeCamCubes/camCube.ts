import { Scene } from "babylonjs";
import { BasicEasyVertexData, Edge, PointId } from "../../utils/points";
import { Mesh } from "@babylonjs/core";

async function getSimplifiedMesh(mesh: Mesh): Promise<Mesh> {
  return new Promise((resolve) => {
    const { BABYLON } = window.pageRefs;

    const decimator = new BABYLON.QuadraticErrorSimplification(mesh);
    // decimator.aggressiveness = 20;
    // decimator.decimationIterations = 500;
    // decimator.syncIterations = 10000;
    decimator.simplify({ distance: undefined as any, quality: 0.7, optimizeMesh: true }, (simplifishMesh) => {
      resolve(simplifishMesh);
    });
  });
}

async function makeCamCubeMesh(camName: string, islandId: string): Promise<Mesh | void> {
  const {
    BABYLON,
    scene,
    createTriMeshFromGridPolyIds,
    findGridPolysForIsland,
    getEasyVertexData,
    shiftBasicEasyVertexData,
    getBasicEasyVertexDataFromQuad,
    mergeBasicEasyVertexData,
    convertBasicEasyVertexDataToVertexData,
    reverseWindingOrder,
    findOuterEdgeAndPointIds,
    findOuterEdges,
    getOrderedOuterEdges,
    islandPolyIdsByCamera,
    pointIslandsByCamera,
    createVisualMarker,
    delay,
    CAMCUBE_HEIGHT,
  } = window.pageRefs;

  if (!scene) return;

  const pointsByIsland = pointIslandsByCamera[camName];

  const islandPointIds = pointsByIsland[islandId];

  const foundIslandPolyIds = await findGridPolysForIsland(islandPointIds);

  if (!islandPolyIdsByCamera[camName]) islandPolyIdsByCamera[camName] = {};
  islandPolyIdsByCamera[camName][islandId] = foundIslandPolyIds;

  const islandTriMesh = await getSimplifiedMesh(createTriMeshFromGridPolyIds(foundIslandPolyIds, scene));

  const duplicatedMesh = islandTriMesh.clone("duplicatedMesh" + camName);
  duplicatedMesh.makeGeometryUnique();

  reverseWindingOrder(duplicatedMesh);

  const easyVertexData = getEasyVertexData(islandTriMesh);
  const easyVertexDataTopOriginal = getEasyVertexData(duplicatedMesh);
  const easyVertexDataTop = shiftBasicEasyVertexData(easyVertexDataTopOriginal, {
    x: 0,
    y: CAMCUBE_HEIGHT,
    z: 0,
  });

  let orderedOuterEdges: Edge[] = [];

  const edgesWithCorrectDirections = findOuterEdges(islandTriMesh);

  try {
    const { outerPointIds, outerEdgeIds } = findOuterEdgeAndPointIds(islandTriMesh);
    // const orderedOuterEdges = getOrderedOuterEdges(outerEdgeIds, easyVertexData);
  } catch (e) {
    console.error("Error finding outer edges", e);
    const errorMaterial = new BABYLON.StandardMaterial("errorMat", scene);
    errorMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    islandTriMesh.material = errorMaterial;
    reverseWindingOrder(islandTriMesh);
    scene.render();
    await delay(1);
    scene.render();
    await delay(5000);
    return;
  }

  let newSidesBasicData: BasicEasyVertexData = {
    pointMap: {},
    triMap: {},
  };

  console.log("edgesWithCorrectDirections", edgesWithCorrectDirections);

  for (const edge of edgesWithCorrectDirections) {
    // console.log();

    const pointBottomA = easyVertexData.pointMap[edge[0]];
    const pointBottomB = easyVertexData.pointMap[edge[1]];

    // make a top point, which is the same as the bottom points but moved up by CAMCUBE_HEIGHT
    const pointTopA = { ...pointBottomA, y: pointBottomA.y + CAMCUBE_HEIGHT };
    const pointTopB = { ...pointBottomB, y: pointBottomB.y + CAMCUBE_HEIGHT };

    // show each point in the ordered outer edges
    createVisualMarker(
      new BABYLON.Vector3(pointBottomA.x, pointBottomA.y, pointBottomA.z),
      new BABYLON.Color3(1, 0, 0)
    );
    createVisualMarker(
      new BABYLON.Vector3(pointBottomB.x, pointBottomB.y, pointBottomB.z),
      new BABYLON.Color3(1, 0, 0)
    );

    scene.render();
    await delay(1);
    scene.render();
    await delay(10);

    const newQuadBasicData = getBasicEasyVertexDataFromQuad({
      bottomLeftPoint: pointBottomA,
      bottomRightPoint: pointBottomB,
      topLeftPoint: pointTopA,
      topRightPoint: pointTopB,
    });
    newSidesBasicData = mergeBasicEasyVertexData(newSidesBasicData, newQuadBasicData);
  }

  const newCombinedBasicData = mergeBasicEasyVertexData(easyVertexData, newSidesBasicData, easyVertexDataTop);
  const newVertexData = convertBasicEasyVertexDataToVertexData(newCombinedBasicData);

  // Make a new mesh out of the new positions and indices
  const newCamCubeMesh = new BABYLON.Mesh(camName + "_" + islandId + "_camCube", scene);
  newCamCubeMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, newVertexData.positions);
  newCamCubeMesh.setIndices(newVertexData.indices);
  const newMaterial = new BABYLON.StandardMaterial("newMat", scene);
  newMaterial.diffuseColor = new BABYLON.Color3(0, 0.3 + Math.random() * 0.7, 0.3 + Math.random() * 0.7);
  // newMaterial.wireframe = true;
  newCamCubeMesh.material = newMaterial;
  newCamCubeMesh.makeGeometryUnique();

  // newCamCubeMesh.enableEdgesRendering();
  // newCamCubeMesh.edgesWidth = 4.0;
  // newCamCubeMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
  // newMaterial.wireframe = true;

  BABYLON.MeshDebugPluginMaterial.PrepareMeshForTrianglesAndVerticesMode(newCamCubeMesh);

  new BABYLON.MeshDebugPluginMaterial(newMaterial, {
    mode: BABYLON.MeshDebugMode.TRIANGLES_VERTICES,
    wireframeVerticesColor: new BABYLON.Color3(0.8, 0.8, 0.8),
    wireframeThickness: 0.7,
    vertexColor: new BABYLON.Color3(0, 0, 0),
    vertexRadius: 1.2,
  });

  // const simplifiedMesh = await getSimplifiedMesh(newCamCubeMesh);

  // scene.addMesh(simplifiedMesh);

  // newCamCubeMesh.dispose();

  // newCamCubeMesh.simplify([{ optimizeMesh: true, quality: 0.2, distance: 0 }]);

  islandTriMesh.dispose();
  duplicatedMesh.dispose();

  return newCamCubeMesh;
}

export const camCubeFunctions = {
  makeCamCubeMesh,
};
