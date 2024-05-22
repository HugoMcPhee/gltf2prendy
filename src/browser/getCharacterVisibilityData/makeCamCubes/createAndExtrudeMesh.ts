import { Mesh, Scene, Vector3, VertexData, MeshBuilder } from "@babylonjs/core";
import { Delaunay } from "d3-delaunay";

export function createAndExtrudeMesh(gridPointIds: string[], scene: Scene): Mesh | null {
  const { gridPointMap, BABYLON } = window.pageRefs;

  // Collect the points in 2D (XZ plane) and their heights (Y)
  const points: Vector3[] = [];
  for (const id of gridPointIds) {
    const gp = gridPointMap[id];
    if (gp && gp.point) {
      points.push(new BABYLON.Vector3(gp.point.x, gp.point.y, gp.point.z));
    }
  }

  if (points.length < 3) return null; // Need at least 3 points to create a mesh

  // Create vertices for triangulation using only X and Z coordinates
  const vertices: { x: number; y: number }[] = points.map((p) => ({ x: p.x, y: p.z }));

  // Perform 2D Delaunay triangulation on the vertices
  const delaunay = Delaunay.from(
    vertices,
    (d) => d.x,
    (d) => d.y
  );
  const indices = delaunay.triangles;

  // Create a custom mesh with the vertex data
  const customMesh = new BABYLON.Mesh("custom", scene);
  const positions: number[] = [];
  const vertexIndices: number[] = [];

  // Map delaunay indices to positions
  indices.forEach((index) => {
    const point = points[index];
    positions.push(point.x, point.y, point.z);
    vertexIndices.push(vertexIndices.length / 3); // Push the index of the vertex (integer)
  });

  const vertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.indices = vertexIndices;
  vertexData.applyToMesh(customMesh, true);

  // Extrude the mesh by 1 unit
  const extrudedMesh = BABYLON.MeshBuilder.ExtrudeShape(
    "extruded",
    {
      shape: vertexIndices.map((index) => new BABYLON.Vector3(positions[3 * index], 0, positions[3 * index + 2])),
      path: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0)],
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    },
    scene
  );

  extrudedMesh.rotate(new BABYLON.Vector3(0, 1, 0), Math.PI / 2); // Rotate the mesh to be horizontal

  return extrudedMesh;
}
