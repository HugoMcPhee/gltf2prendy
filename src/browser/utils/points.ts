import { Mesh, Vector3 } from "@babylonjs/core";
import { Point3D } from "chootils/dist/points3d";

export type PointId = string;
export type Point = { x: number; y: number; z: number };
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

export type BasicEasyVertexData = {
  pointMap: PointMap;
  triMap: TriMap;
};
export type EasyVertexData = BasicEasyVertexData & {
  edgeMap: EdgeMap;
  edgeTriMap: EdgeTriMap;
  triIdToEdgeTriIdMap: TriIdToEdgeTriIdMap;
  edgeTriIdToTriIdMap: EdgeTriIdToTriIdMap;
  pointIdToTriIdsMap: PointIdToTriIdsMap;
};

export function getSimplifiedNumber(num: number) {
  return Math.round(num * 1000) / 1000;
}

export function getSimplifiedPoint(vectorPoint: Point3D | Vector3) {
  const { getSimplifiedNumber } = window.pageRefs;
  const { x: realX, y: realY, z: realZ } = vectorPoint;
  return { x: getSimplifiedNumber(realX), y: getSimplifiedNumber(realY), z: getSimplifiedNumber(realZ) };
}

function getPointId(point: Point): PointId {
  return `${point.x}_${point.y}_${point.z}`;
}

function getEasyVertexData(mesh: Mesh): EasyVertexData {
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

function getBasicEasyVertexDataFromTris(tris: Tri[]): BasicEasyVertexData {
  const pointMap: PointMap = {};
  const newTriMap: TriMap = {};

  for (const tri of tris) {
    const triId = tri.join("_");
    tri.forEach((pointId) => {
      if (!pointMap[pointId]) {
        const [x, y, z] = pointId.split("_").map((num) => parseFloat(num));
        pointMap[pointId] = { x, y, z };
      }
    });
    newTriMap[triId] = tri;
  }

  return { pointMap, triMap: newTriMap };
}

function convertBasicEasyVertexDataToVertexData(basicEasyVertexData: BasicEasyVertexData): {
  positions: number[];
  indices: number[];
} {
  const { pointMap, triMap } = basicEasyVertexData;
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

function getBasicEasyVertexDataFromQuad({
  bottomLeftPoint,
  bottomRightPoint,
  topLeftPoint,
  topRightPoint,
}: {
  bottomLeftPoint: Point;
  bottomRightPoint: Point;
  topLeftPoint: Point;
  topRightPoint: Point;
}): BasicEasyVertexData {
  const pointMap: PointMap = {
    [getPointId(bottomLeftPoint)]: bottomLeftPoint,
    [getPointId(bottomRightPoint)]: bottomRightPoint,
    [getPointId(topLeftPoint)]: topLeftPoint,
    [getPointId(topRightPoint)]: topRightPoint,
  };

  const tri1: Tri = [getPointId(bottomLeftPoint), getPointId(bottomRightPoint), getPointId(topLeftPoint)];
  const tri2: Tri = [getPointId(bottomRightPoint), getPointId(topRightPoint), getPointId(topLeftPoint)];

  const triMap: TriMap = {
    [tri1.join("_")]: tri1,
    [tri2.join("_")]: tri2,
  };

  return { pointMap, triMap };
}

function mergeBasicEasyVertexData(...basicEasyVertexDataList: BasicEasyVertexData[]): BasicEasyVertexData {
  const pointMap: PointMap = {};
  const triMap: TriMap = {};

  for (const basicEasyVertexData of basicEasyVertexDataList) {
    for (const pointId in basicEasyVertexData.pointMap) {
      pointMap[pointId] = basicEasyVertexData.pointMap[pointId];
    }

    for (const triId in basicEasyVertexData.triMap) {
      triMap[triId] = basicEasyVertexData.triMap[triId];
    }
  }

  return { pointMap, triMap };
}

function shiftBasicEasyVertexData(basicEasyVertexData: BasicEasyVertexData, shift: Point): BasicEasyVertexData {
  const { getPointId } = window.pageRefs;
  const { pointMap, triMap } = basicEasyVertexData;

  const newPointMap: PointMap = {};
  const newTriMap: TriMap = {};

  const oldPoindIdToNewPointIdMap: Record<PointId, PointId> = {};

  for (const pointId in pointMap) {
    const point = pointMap[pointId];
    const newPoint = { x: point.x + shift.x, y: point.y + shift.y, z: point.z + shift.z };
    const newPointId = getPointId(newPoint);
    newPointMap[newPointId] = newPoint;
    oldPoindIdToNewPointIdMap[pointId] = newPointId;
  }

  for (const triId in triMap) {
    function findOuterEdgeAndPointIds(mesh: Mesh): { outerEdgeIds: EdgeId[]; outerPointIds: PointId[] } {
      const { getEasyVertexData, getEdgesFromTri } = window.pageRefs;
      const vertexData = getEasyVertexData(mesh);
      const edgeCountMap: Record<EdgeId, number> = {};
      const vertexDegreeMap: Record<PointId, number> = {};
      const triIds = Object.keys(vertexData.triMap);

      // Use helper to count edge occurrences and vertex degrees
      for (const triId of triIds) {
        const edges = getEdgesFromTri(vertexData, triId);
        for (const edgeId of edges) {
          edgeCountMap[edgeId] = (edgeCountMap[edgeId] || 0) + 1;
          const [pointId1, pointId2] = vertexData.edgeMap[edgeId];
          vertexDegreeMap[pointId1] = (vertexDegreeMap[pointId1] || 0) + 1;
          vertexDegreeMap[pointId2] = (vertexDegreeMap[pointId2] || 0) + 1;
        }
      }

      // Collect edges that occur only once and their point IDs, with vertex degree considerations
      const outerEdgeIds: EdgeId[] = [];
      const pointIds = new Set<PointId>();

      for (const [edgeId, count] of Object.entries(edgeCountMap)) {
        if (count === 1) {
          const [pointId1, pointId2] = vertexData.edgeMap[edgeId];
          if (vertexDegreeMap[pointId1] < 3 && vertexDegreeMap[pointId2] < 3) {
            outerEdgeIds.push(edgeId);
            pointIds.add(pointId1);
            pointIds.add(pointId2);
          }
        }
      }

      const outerPointIds: PointId[] = Array.from(pointIds);
      return { outerEdgeIds, outerPointIds };
    }
    const tri = triMap[triId];
    const newTri: Tri = tri.map((pointId) => oldPoindIdToNewPointIdMap[pointId]) as Tri;
    newTriMap[newTri.join("_")] = newTri;
  }

  return { pointMap: newPointMap, triMap: newTriMap };
}

export const pointsFunctions = {
  getSimplifiedNumber,
  getSimplifiedPoint,
  getEasyVertexData,
  convertBasicEasyVertexDataToVertexData,
  getBasicEasyVertexDataFromQuad,
  getPointId,
  getBasicEasyVertexDataFromTris,
  mergeBasicEasyVertexData,
  shiftBasicEasyVertexData,
};
