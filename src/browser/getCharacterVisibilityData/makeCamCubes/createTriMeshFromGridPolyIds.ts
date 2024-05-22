import { Point3D } from "chootils/dist/points3d";
import { GridPolyId } from "../findPointsOnFloors";
import { Mesh, Scene } from "@babylonjs/core";

export const createTriMeshFromGridPolyIds = (gridPolyIds: GridPolyId[], scene: Scene): Mesh => {
  const { getTriPointsFromGridPolyIds, BABYLON } = window.pageRefs;

  const points: Point3D[][] = getTriPointsFromGridPolyIds(gridPolyIds);

  console.log("--------------------------");
  console.log("points");
  console.log(points);

  const uniqueVertices: Point3D[] = [];
  const indices: number[] = [];

  // Using an object to track vertex indices
  const vertexLookup: { [key: string]: number } = {};

  let index = 0;
  points.forEach((triangle) => {
    triangle.forEach((vertex) => {
      const key = `${vertex.x}_${vertex.y}_${vertex.z}`; // Using underscore as the separator
      if (vertexLookup[key] === undefined) {
        uniqueVertices.push(vertex);
        vertexLookup[key] = index++;
      }
      indices.push(vertexLookup[key]);
    });
  });

  const positions: number[] = [];
  const normals: number[] = [];

  uniqueVertices.forEach((vertex) => {
    positions.push(vertex.x, vertex.y, vertex.z);
  });

  BABYLON.VertexData.ComputeNormals(positions, indices, normals);

  const customMesh = new BABYLON.Mesh("custom", scene);
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.applyToMesh(customMesh, true);

  customMesh.movePOV(0, 0.2, 0);

  return customMesh;
};
