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

function findOuterEdgeAndPointIds(mesh: Mesh): { outerEdgeIds: EdgeId[]; outerPointIds: PointId[] } {
  const { getEasyVertexData, getEdgesFromTri } = window.pageRefs;

  const vertexData = getEasyVertexData(mesh);
  const edgeCountMap: Record<EdgeId, number> = {};
  const triIds = Object.keys(vertexData.triMap);

  // Use helper to count edge occurrences
  for (const triId of triIds) {
    const edges = getEdgesFromTri(vertexData, triId);
    for (const edgeId of edges) {
      edgeCountMap[edgeId] = (edgeCountMap[edgeId] || 0) + 1;
    }
  }

  // Collect edges that occur only once and their point IDs
  const outerEdgeIds: EdgeId[] = [];
  const pointIds = new Set<PointId>();

  for (const [edgeId, count] of Object.entries(edgeCountMap)) {
    if (count === 1) {
      outerEdgeIds.push(edgeId);
      const [pointId1, pointId2] = vertexData.edgeMap[edgeId];
      pointIds.add(pointId1);
      pointIds.add(pointId2);
    }
  }

  const outerPointIds: PointId[] = Array.from(pointIds);

  return { outerEdgeIds, outerPointIds };
}

function findOuterEdges(mesh: Mesh): Edge[] {
  const { getEasyVertexData, getEdgesFromTri } = window.pageRefs;

  const vertexData = getEasyVertexData(mesh);
  const edgeCountMap: Record<EdgeId, number> = {};
  const edgeInfoMap: Record<EdgeId, { count: number; relatedTriId: string }> = {};
  const triIds = Object.keys(vertexData.triMap);

  // Use helper to count edge occurrences
  for (const triId of triIds) {
    const edges = getEdgesFromTri(vertexData, triId);
    for (const edgeId of edges) {
      edgeCountMap[edgeId] = (edgeCountMap[edgeId] || 0) + 1;
      if (!edgeInfoMap[edgeId]) edgeInfoMap[edgeId] = { count: 0, relatedTriId: triId }; // NOTE The tri will get replaced if the edge is used in another tri, but we only need to find edges with one tri
      edgeInfoMap[edgeId].count += 1;
    }
  }

  // Collect edge ids that occur only once
  const consideredEdgeIds = Object.keys(edgeInfoMap).filter((edgeId) => edgeInfoMap[edgeId].count === 1);

  // Collect outer edges and sort them correctly
  const outerEdges: Edge[] = [];

  for (const edgeId of consideredEdgeIds) {
    const [pointId1, pointId2] = vertexData.edgeMap[edgeId];
    const triId = edgeInfoMap[edgeId].relatedTriId;

    // Outer edge
    const tri = vertexData.triMap[triId];
    const thirdPointId = tri.find((id) => id !== pointId1 && id !== pointId2)!;
    const p1 = vertexData.pointMap[pointId1];
    const p2 = vertexData.pointMap[pointId2];
    const p3 = vertexData.pointMap[thirdPointId];

    // Calculate cross product to determine orientation
    const dx1 = p2.x - p1.x;
    const dz1 = p2.z - p1.z;
    const dx2 = p3.x - p1.x;
    const dz2 = p3.z - p1.z;
    const cross = dx1 * dz2 - dz1 * dx2;

    // Ensure triangle interior is to the left of the edge
    if (cross > 0) {
      outerEdges.push([pointId1, pointId2]);
    } else {
      outerEdges.push([pointId2, pointId1]);
    }
  }

  return outerEdges;
}

function getOrderedOuterEdges(outerEdgeIds: EdgeId[], vertexData: EasyVertexData): Edge[] {
  const { calculateSignedArea } = window.pageRefs;

  const { edgeMap, pointMap } = vertexData;
  const orderedEdges: Edge[] = [];
  const visited = new Set<string>();

  if (outerEdgeIds.length === 0) {
    return orderedEdges;
  }

  let currentEdgeId = outerEdgeIds[0];
  let currentEdge = edgeMap[currentEdgeId];
  orderedEdges.push(currentEdge);
  visited.add(currentEdgeId);

  let endPoint = currentEdge[1];

  while (orderedEdges.length < outerEdgeIds.length) {
    let foundNext = false;

    for (const edgeId of outerEdgeIds) {
      if (!visited.has(edgeId)) {
        const [nextStart, nextEnd] = edgeMap[edgeId];
        if (nextStart === endPoint) {
          orderedEdges.push([nextStart, nextEnd]);
          visited.add(edgeId);
          endPoint = nextEnd;
          foundNext = true;
          break;
        } else if (nextEnd === endPoint) {
          orderedEdges.push([nextEnd, nextStart]);
          visited.add(edgeId);
          endPoint = nextStart;
          foundNext = true;
          break;
        }
      }
    }

    if (!foundNext) {
      throw new Error(
        "Failed to find a contiguous path among the edges. Ensure that all provided edges are connected."
      );
    }
  }

  // Check if edges are counter-clockwise, if not, reverse them
  const points = orderedEdges.map((edge) => pointMap[edge[0]]);
  if (calculateSignedArea(points) < 0) {
    // This indicates clockwise orientation
    orderedEdges.reverse(); // Reverse the entire array
    // Reverse each edge to maintain the correct point order in the edges
    for (let i = 0; i < orderedEdges.length; i++) {
      orderedEdges[i].reverse();
    }
  }

  return orderedEdges;
}

function calculateSignedArea(points: Point3D[]): number {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const { x: x1, y: y1 } = points[j];
    const { x: x2, y: y2 } = points[i];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

// function orderOuterEdges(edges: EdgePrev[]): EdgePrev[] {
//   if (edges.length === 0) return [];

//   let result: EdgePrev[] = [];
//   let visited = new Set<string>();
//   let currentEdge = edges[0];
//   visited.add(`${currentEdge.start}-${currentEdge.end}`);

//   while (true) {
//     result.push(currentEdge);
//     let nextEdge = edges.find((edge) => {
//       const edgeKey = `${edge.start}-${edge.end}`;
//       return (edge.start === currentEdge.end || edge.end === currentEdge.end) && !visited.has(edgeKey);
//     });

//     if (!nextEdge) break;
//     visited.add(`${nextEdge.start}-${nextEdge.end}`);
//     currentEdge = nextEdge;
//   }

//   return result;
// }

// function ensureCounterclockwise(vertices: number[][]): number[][] {
//   let area = calculateSignedArea(vertices);
//   return area < 0 ? vertices.reverse() : vertices;
// }

// function calculateSignedArea(vertices: number[][]): number {
//   let area = 0;
//   for (let i = 0; i < vertices.length - 1; i++) {
//     area += vertices[i][0] * vertices[i + 1][1] - vertices[i + 1][0] * vertices[i][1];
//   }
//   return area / 2;
// }

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
  convertToVector3,
  //   orderOuterEdges,
  calculateSignedArea,
  //   ensureCounterclockwise,
  reverseWindingOrder,
  getEdgesFromTri,
  findOuterEdgeAndPointIds,
  getOrderedOuterEdges,
  findOuterEdges,
};
