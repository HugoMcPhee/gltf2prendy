import { Mesh, Vector3 } from "@babylonjs/core";
import { Point3D } from "chootils/dist/points3d";

export type PointId = string;
export type Point = Point3D;
export type PointMap = Record<PointId, Point>;

export type TriId = string;
export type Tri = [PointId, PointId, PointId];
export type TriMap = Record<TriId, Tri>;

export type EdgeId = string;
export type Edge = [PointId, PointId];
export type EdgeMap = Record<EdgeId, Edge>;

export type EdgeTri = [EdgeId, EdgeId, EdgeId];
export type EdgeTriId = string;
export type EdgeTriMap = Record<EdgeTriId, EdgeTri>;

export type TriIdToEdgeTriIdMap = Record<TriId, EdgeTriId>;
export type EdgeTriIdToTriIdMap = Record<EdgeTriId, TriId>;
export type PointIdToTriIdsMap = Record<PointId, TriId[]>;

export type EasyVertexData = ReturnType<typeof getEasyVertexData>;

export function getSimplifiedNumber(num: number) {
  return Math.round(num * 1000) / 1000;
}

export function getSimplifiedPoint(vectorPoint: Point3D | Vector3) {
  const { getSimplifiedNumber } = window.pageRefs;
  const { x: realX, y: realY, z: realZ } = vectorPoint;
  return { x: getSimplifiedNumber(realX), y: getSimplifiedNumber(realY), z: getSimplifiedNumber(realZ) };
}

function getEasyVertexData(mesh: Mesh): {
  pointMap: PointMap;
  triMap: TriMap;
  edgeMap: EdgeMap;
  edgeTriMap: EdgeTriMap;
  triIdToEdgeTriIdMap: TriIdToEdgeTriIdMap;
  edgeTriIdToTriIdMap: EdgeTriIdToTriIdMap;
  pointIdToTriIdsMap: PointIdToTriIdsMap;
} {
  const { BABYLON } = window.pageRefs;

  const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
  const positions = vertexData.positions!;
  const indices = vertexData.indices!;

  const pointMap: PointMap = {};
  const triMap: TriMap = {};
  const edgeMap: EdgeMap = {};
  const edgeTriMap: EdgeTriMap = {};
  const triIdToEdgeTriIdMap: TriIdToEdgeTriIdMap = {};
  const edgeTriIdToTriIdMap: EdgeTriIdToTriIdMap = {};
  const pointIdToTriIdsMap: PointIdToTriIdsMap = {};

  // Populate pointMap
  for (let i = 0; i < positions.length; i += 3) {
    const fullX = positions[i];
    const fullY = positions[i + 1];
    const fullZ = positions[i + 2];
    const simplifiedPoint = getSimplifiedPoint({ x: fullX, y: fullY, z: fullZ });
    const pointId = `${simplifiedPoint.x}_${simplifiedPoint.y}_${simplifiedPoint.z}`;
    pointMap[pointId] = simplifiedPoint;
  }

  // Populate triMap, edgeMap, edgeTriMap, and build the auxiliary maps
  for (let i = 0; i < indices.length; i += 3) {
    const p1Index = indices[i];
    const p2Index = indices[i + 1];
    const p3Index = indices[i + 2];
    const p1 = getSimplifiedPoint({
      x: positions[p1Index * 3],
      y: positions[p1Index * 3 + 1],
      z: positions[p1Index * 3 + 2],
    });
    const p2 = getSimplifiedPoint({
      x: positions[p2Index * 3],
      y: positions[p2Index * 3 + 1],
      z: positions[p2Index * 3 + 2],
    });
    const p3 = getSimplifiedPoint({
      x: positions[p3Index * 3],
      y: positions[p3Index * 3 + 1],
      z: positions[p3Index * 3 + 2],
    });
    const p1Id = `${p1.x}_${p1.y}_${p1.z}`;
    const p2Id = `${p2.x}_${p2.y}_${p2.z}`;
    const p3Id = `${p3.x}_${p3.y}_${p3.z}`;

    const triId = `${p1Id}_${p2Id}_${p3Id}`;
    triMap[triId] = [p1Id, p2Id, p3Id];

    const edge1 = [p1Id, p2Id].sort().join("_");
    const edge2 = [p2Id, p3Id].sort().join("_");
    const edge3 = [p3Id, p1Id].sort().join("_");
    edgeMap[edge1] = [p1Id, p2Id];
    edgeMap[edge2] = [p2Id, p3Id];
    edgeMap[edge3] = [p3Id, p1Id];

    const edgeTriId = `${edge1}_${edge2}_${edge3}`;
    edgeTriMap[edgeTriId] = [edge1, edge2, edge3];
    triIdToEdgeTriIdMap[triId] = edgeTriId;
    edgeTriIdToTriIdMap[edgeTriId] = triId;

    // Update pointId to triIds map
    [p1Id, p2Id, p3Id].forEach((pid) => {
      pointIdToTriIdsMap[pid] = pointIdToTriIdsMap[pid] || [];
      pointIdToTriIdsMap[pid].push(triId);
    });
  }

  return {
    pointMap,
    triMap,
    edgeMap,
    edgeTriMap,
    triIdToEdgeTriIdMap,
    edgeTriIdToTriIdMap,
    pointIdToTriIdsMap,
  };
}

function convertMapsToVertexData(pointMap: PointMap, triMap: TriMap): { positions: number[]; indices: number[] } {
  let positions: number[] = [];
  let indices: number[] = [];

  // To keep track of the indices corresponding to each pointId
  let pointIndexMap: Record<PointId, number> = {};

  // Populate positions array and create a map of pointId to index in the positions array
  let currentIndex = 0;
  for (const pointId in pointMap) {
    const point = pointMap[pointId];
    positions.push(point.x, point.y, point.z);
    pointIndexMap[pointId] = currentIndex;
    currentIndex++;
  }

  // Populate indices array using the pointIndexMap to translate pointIds to indices
  for (const triId in triMap) {
    const tri = triMap[triId];
    indices.push(pointIndexMap[tri[0]], pointIndexMap[tri[1]], pointIndexMap[tri[2]]);
  }

  return { positions, indices };
}

export const pointsFunctions = {
  getSimplifiedNumber,
  getSimplifiedPoint,
  getEasyVertexData,
  convertMapsToVertexData,
};
