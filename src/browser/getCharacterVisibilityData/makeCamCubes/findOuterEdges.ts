import { Mesh, Vector3 } from "@babylonjs/core";

interface Edge {
  start: number;
  end: number;
}

function findOuterEdges(mesh: Mesh): number[][] {
  const { BABYLON } = window.pageRefs;

  const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
  const positions = vertexData.positions as number[];
  const indices = vertexData.indices;

  if (!positions || !indices) {
    console.error("Mesh data is missing positions or indices.");
    return [];
  }

  let edgeMap = new Map<string, Edge>();

  // Store and count edges
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [indices[i], indices[i + 1], indices[i + 2]];
    const edges: Edge[] = [
      { start: Math.min(triangle[0], triangle[1]), end: Math.max(triangle[0], triangle[1]) },
      { start: Math.min(triangle[1], triangle[2]), end: Math.max(triangle[1], triangle[2]) },
      { start: Math.min(triangle[2], triangle[0]), end: Math.max(triangle[2], triangle[0]) },
    ];

    edges.forEach((edge) => {
      const key = `${edge.start}-${edge.end}`;
      if (edgeMap.has(key)) {
        console.log(`Removing internal edge: ${key}`);
        edgeMap.delete(key); // Remove internal edge
      } else {
        console.log(`Adding outer edge: ${key}`);
        edgeMap.set(key, edge); // Store outer edge
      }
    });
  }

  console.log(`Outer edges found: ${Array.from(edgeMap.values()).length}`);
  const outerEdges = Array.from(edgeMap.values());
  const orderedVertices = orderOuterEdges(outerEdges, positions);

  // Ensure the vertices are ordered counterclockwise
  return ensureCounterclockwise(orderedVertices);
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

function orderOuterEdges(edges: Edge[], positions: number[]): number[][] {
  if (edges.length === 0) return [];

  let result: number[][] = [];
  let edgeMap = new Map<string, Edge>(edges.map((edge) => [`${edge.start}-${edge.end}`, edge]));
  let usedEdges = new Set<string>();

  let currentEdge = edges[0];
  let startVertex = currentEdge.start;
  let currentVertex = currentEdge.end;

  // Add the first vertex position
  result.push([positions[startVertex * 3], positions[startVertex * 3 + 1]]);
  result.push([positions[currentVertex * 3], positions[currentVertex * 3 + 1]]);
  usedEdges.add(`${startVertex}-${currentVertex}`);

  while (true) {
    let foundNext = false;
    for (let edge of edgeMap.values()) {
      let edgeKey = `${edge.start}-${edge.end}`;
      if (usedEdges.has(edgeKey)) continue; // Skip used edges

      // Check if this edge is a connecting edge
      if (edge.start === currentVertex && !usedEdges.has(`${edge.start}-${edge.end}`)) {
        currentVertex = edge.end;
        result.push([positions[currentVertex * 3], positions[currentVertex * 3 + 1]]);
        usedEdges.add(edgeKey);
        foundNext = true;
        break;
      } else if (edge.end === currentVertex && !usedEdges.has(`${edge.end}-${edge.start}`)) {
        currentVertex = edge.start;
        result.push([positions[currentVertex * 3], positions[currentVertex * 3 + 1]]);
        usedEdges.add(edgeKey);
        foundNext = true;
        break;
      }
    }

    // Break the loop if no connecting edge is found
    if (!foundNext) break;
  }

  return result;
}

function calculateSignedArea(vertices: number[][]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    let [x1, y1] = vertices[i];
    let [x2, y2] = vertices[(i + 1) % vertices.length];
    area += x1 * y2 - y1 * x2;
  }
  console.log(`Signed area: ${area}`);
  return area / 2;
}

function ensureCounterclockwise(vertices: number[][]): number[][] {
  if (calculateSignedArea(vertices) < 0) {
    console.log("Reversing vertices for counterclockwise order");
    return vertices.reverse();
  }
  return vertices;
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
};
