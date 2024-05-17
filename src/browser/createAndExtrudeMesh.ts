import { Color4, Mesh, Scene, Vector3, VertexData, StandardMaterial } from "@babylonjs/core";
import { IdPoint3D } from "./getCharacterVisiblityData";

function getRandomColor(): Color4 {
  return new Color4(Math.random(), Math.random(), Math.random(), 1);
}

export function createAndExtrudeMesh(scene: Scene, triangles: IdPoint3D[][]): void {
  triangles.forEach((triangle) => {
    const positions: number[] = [];
    const indices: number[] = [0, 1, 2];
    const colors: number[] = [];

    // Add positions for the triangle vertices
    positions.push(triangle[0].x, triangle[0].y, triangle[0].z);
    positions.push(triangle[1].x, triangle[1].y, triangle[1].z);
    positions.push(triangle[2].x, triangle[2].y, triangle[2].z);

    // Generate a random color for this triangle
    const color = getRandomColor();
    for (let i = 0; i < 3; i++) {
      colors.push(color.r, color.g, color.b, color.a);
    }

    // Calculate normals facing up
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);

    // Assign normals to face up (y-axis)
    normals[0] = 0;
    normals[1] = 1;
    normals[2] = 0;
    normals[3] = 0;
    normals[4] = 1;
    normals[5] = 0;
    normals[6] = 0;
    normals[7] = 1;
    normals[8] = 0;

    // Create a vertex data object
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;
    vertexData.normals = normals;

    // Create a mesh and apply the vertex data
    const mesh = new Mesh("triangleMesh", scene);
    vertexData.applyToMesh(mesh);

    // Ensure the mesh is double-sided
    const material = new StandardMaterial("material", scene);
    material.backFaceCulling = false;
    mesh.material = material;
  });
}

// // Function to create a mesh from triangle data and extrude it
// export function createAndExtrudeMesh(
//   triangles: Point3D[][],
//   scene: Scene,
//   extrudeHeight: number
// ): Nullable<Mesh> | undefined {
//   const { BABYLON, createVisualMarker } = window.pageRefs;
//   if (!BABYLON) return;

//   let allMeshes: Mesh[] = [];

//   triangles.forEach((triangle, index) => {
//     let vertices: number[] = [];
//     let indices: number[] = [];
//     let localVertices: Vector3[] = [];

//     triangle.forEach((point, i) => {
//       vertices.push(point.x, point.y, point.z);
//       localVertices.push(new BABYLON.Vector3(point.x, point.y, point.z));
//       createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), new BABYLON.Color3(0, 0, 1)); // Visual marker
//       indices.push(i);
//     });

//     const customMesh = new Mesh(`customMesh_${index}`, scene);
//     const vertexData = new BABYLON.VertexData();
//     vertexData.positions = vertices;
//     vertexData.indices = indices;
//     BABYLON.VertexData.ComputeNormals(vertices, indices, (vertexData.normals = [])); // Recalculate normals
//     vertexData.applyToMesh(customMesh, true);

//     // Convert positions to an array of Vector3
//     const positions = customMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
//     const vectors: Vector3[] = [];
//     if (positions) {
//       for (let i = 0; i < positions.length; i += 3) {
//         vectors.push(new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]));
//       }
//     }

//     // Define the path correctly relative to the points
//     const baseHeight = Math.min(...vectors.map((v) => v.y)); // Find the base height
//     const path = [new BABYLON.Vector3(0, baseHeight, 0), new BABYLON.Vector3(0, baseHeight + extrudeHeight, 0)];

//     // Extrude the individual triangle
//     const extrudedMesh = BABYLON.MeshBuilder.ExtrudeShape(
//       `extruded_${index}`,
//       {
//         shape: vectors,
//         path: path, // Use the correctly defined path
//         cap: BABYLON.Mesh.CAP_ALL,
//         sideOrientation: BABYLON.Mesh.DOUBLESIDE,
//       },
//       scene
//     );

//     allMeshes.push(extrudedMesh);
//   });

//   // Combine all extruded meshes into a single mesh
//   const combinedMesh = BABYLON.Mesh.MergeMeshes(allMeshes, true, true, undefined, false, true);

//   return combinedMesh;
// }
