import { Mesh, Vector3 } from "@babylonjs/core";
import { EasyVertexData, Edge, EdgeId, PointId, TriId } from "../../utils/points";
import { Point3D } from "chootils/dist/points3d";

interface EdgePrev {
  start: number;
  end: number;
}

// Helper to retrieve edges from a triangle using the vertex data
function getEdgesFromTri(vertexData: EasyVertexData, triId: TriId): EdgeId[] {
  const { triIdToEdgeTriIdMap, edgeTriMap } = vertexData;
  return edgeTriMap[triIdToEdgeTriIdMap[triId]];
}

function findOuterEdgesAndPoints(mesh: Mesh): { outerEdges: Edge[]; outerPoints: Point3D[] } {
  const { getEasyVertexData, getEdgesFromTri } = window.pageRefs;

  const vertexData = getEasyVertexData(mesh);
  const { edgeMap, pointMap } = vertexData;

  const edgeCountMap: Record<EdgeId, number> = {};
  const triIds = Object.keys(vertexData.triMap);

  // Use helper to count edge occurrences
  for (const triId of triIds) {
    const edges = getEdgesFromTri(vertexData, triId);
    for (const edgeId of edges) {
      edgeCountMap[edgeId] = (edgeCountMap[edgeId] || 0) + 1;
    }
  }

  // Collect edges that occur only once and their points
  const outerEdges: Edge[] = [];
  const pointIds = new Set<PointId>();

  for (const [edgeId, count] of Object.entries(edgeCountMap)) {
    if (count === 1) {
      const edge = edgeMap[edgeId];
      outerEdges.push(edge);
      pointIds.add(edge[0]);
      pointIds.add(edge[1]);
    }
  }

  // Collect points from pointIds
  const outerPoints: Point3D[] = Array.from(pointIds).map((id) => pointMap[id]);

  return { outerEdges, outerPoints };
}

function findOuterEdges(mesh: Mesh): Vector3[] {
  const { BABYLON, getEasyVertexData } = window.pageRefs;

  const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
  const positions = vertexData.positions!;
  const indices = vertexData.indices!;

  const easyVertexData = getEasyVertexData(mesh);

  if (!positions || !indices) {
    console.error("Mesh data is missing positions or indices.");
    return [];
  }

  // Object to count edge occurrences
  const edgeDict: { [key: string]: number } = {};

  // Collect all edges and count their occurrences
  for (let i = 0; i < indices.length; i += 3) {
    let edgeKeys = [
      `${Math.min(indices[i], indices[i + 1])}-${Math.max(indices[i], indices[i + 1])}`,
      `${Math.min(indices[i + 1], indices[i + 2])}-${Math.max(indices[i + 1], indices[i + 2])}`,
      `${Math.min(indices[i + 2], indices[i])}-${Math.max(indices[i + 2], indices[i])}`,
    ];

    edgeKeys.forEach((key) => {
      edgeDict[key] = (edgeDict[key] || 0) + 1;
    });
  }

  // Find outer edges (those that occur only once)
  const outerEdges = Object.keys(edgeDict)
    .filter((key) => edgeDict[key] === 1)
    .map((key) => {
      const [start, end] = key.split("-").map(Number);
      return { start, end };
    });

  // Assuming we're just tracing the boundary, let's create an array of Vector3 for outer vertices
  let vertices: Vector3[] = [];
  if (outerEdges.length > 0) {
    let currentEdge = outerEdges[0];
    let usedEdges = new Set<string>();

    do {
      vertices.push(
        new Vector3(
          positions[currentEdge.start * 3],
          positions[currentEdge.start * 3 + 1],
          positions[currentEdge.start * 3 + 2]
        )
      );
      usedEdges.add(`${currentEdge.start}-${currentEdge.end}`);
      // Find the next edge that connects to the current one
      currentEdge =
        outerEdges.find((edge) => edge.start === currentEdge.end && !usedEdges.has(`${edge.start}-${edge.end}`)) ||
        currentEdge;
    } while (!usedEdges.has(`${currentEdge.start}-${currentEdge.end}`) && currentEdge !== outerEdges[0]);
  }

  return vertices;
}

function orderOuterEdges(edges: EdgePrev[]): EdgePrev[] {
  if (edges.length === 0) return [];

  let result: EdgePrev[] = [];
  let visited = new Set<string>();
  let currentEdge = edges[0];
  visited.add(`${currentEdge.start}-${currentEdge.end}`);

  while (true) {
    result.push(currentEdge);
    let nextEdge = edges.find((edge) => {
      const edgeKey = `${edge.start}-${edge.end}`;
      return (edge.start === currentEdge.end || edge.end === currentEdge.end) && !visited.has(edgeKey);
    });

    if (!nextEdge) break;
    visited.add(`${nextEdge.start}-${nextEdge.end}`);
    currentEdge = nextEdge;
  }

  return result;
}

function ensureCounterclockwise(vertices: number[][]): number[][] {
  let area = calculateSignedArea(vertices);
  return area < 0 ? vertices.reverse() : vertices;
}

function calculateSignedArea(vertices: number[][]): number {
  let area = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    area += vertices[i][0] * vertices[i + 1][1] - vertices[i + 1][0] * vertices[i][1];
  }
  return area / 2;
}

function convertToVector3(vertices: number[][], positions: number[]): Vector3[] {
  const { BABYLON } = window.pageRefs;

  return vertices.map((vertex) => {
    // Each vertex array contains [x, y], find the index of x in positions to calculate z
    const index = positions.indexOf(vertex[0]) / 3; // Divide by 3 because positions are [x, y, z]
    const z = positions[index * 3 + 2]; // Get z from the positions array
    return new BABYLON.Vector3(vertex[0], vertex[1], z);
  });
}

/**
 * Reverses the winding order of the triangles in a mesh to flip the normals.
 * @param mesh The mesh whose triangles' winding order is to be reversed.
 */
function reverseWindingOrder(mesh: Mesh): void {
  const { BABYLON } = window.pageRefs;

  // Get current indices from the mesh
  const indices = mesh.getIndices();
  const positions = mesh.getVerticesData("position");
  const normals = mesh.getVerticesData("normal");

  if (!indices || !positions) {
    console.error("Mesh does not have necessary vertex data.");
    return;
  }

  // Reverse the winding order by swapping the second and third vertex indices of each triangle
  for (let i = 0; i < indices.length; i += 3) {
    const temp = indices[i + 1];
    indices[i + 1] = indices[i + 2];
    indices[i + 2] = temp;
  }

  // Update the indices on the mesh
  mesh.updateIndices(indices);

  // Recalculate normals to correctly reflect the new orientation of the mesh
  if (normals) {
    // Recompute normals
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    // Update the normals on the mesh
    mesh.updateVerticesData("normal", normals);
  } else {
    console.error("Mesh does not have normal data.");
  }
}

// Usage example:
// Assume 'scene' is your Babylon.js scene and 'mesh' is the mesh you want to modify.
// const mesh = Mesh.CreateBox("box", 2, scene);
// reverseWindingOrder(mesh);

export const findOuterEdgesFunctions = {
  findOuterEdges,
  convertToVector3,
  orderOuterEdges,
  calculateSignedArea,
  ensureCounterclockwise,
  reverseWindingOrder,
  getEdgesFromTri,
  findOuterEdgesAndPoints,
};
