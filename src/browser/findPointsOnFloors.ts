import { Vector3 } from "@babylonjs/core";
import { Color3 } from "babylonjs";
import { Point3D } from "chootils/dist/points3d";

export type GridPoint = {
  id: string; // there can be multiple points at the same xz, so there's a unique id too (maybe pointIndex)
  point: Point3D | undefined;
  gridX: number;
  gridZ: number;
};

type X_Index = string;
type Z_Index = string;

export type GridPointMap = Record<string, GridPoint>;
export type GridPointsOrganized = Record<X_Index, Record<Z_Index, GridPoint[]>>;

export function getSimplifiedPoint(vectorPoint: Vector3) {
  const { x: realX, y: realY, z: realZ } = vectorPoint;
  const x = Math.round(realX * 1000) / 1000;
  const y = Math.round(realY * 1000) / 1000;
  const z = Math.round(realZ * 1000) / 1000;
  return { x, y, z };
}

// Function to create the grid of points and cast rays
export async function generateFloorPoints(gridDistance: number = 1): Promise<Vector3[]> {
  const gridPointMap: GridPointMap = {};
  const gridPointsOrganized: GridPointsOrganized = {};

  const foundPoints: Vector3[] = [];

  const { BABYLON, scene, modelFile } = window.pageRefs;

  const transformNode = modelFile?.transformNodes.floors;

  if (!transformNode || !scene || !BABYLON) return foundPoints;
  transformNode.setEnabled(true);

  // Calculate the bounding box for all meshes in the TransformNode
  let min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  let max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  transformNode.getChildMeshes().forEach((mesh) => {
    mesh.refreshBoundingInfo();
    const boundingBox = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, boundingBox.minimumWorld);
    max = Vector3.Maximize(max, boundingBox.maximumWorld);
  });

  // const gridPointId = `${x}_${z}`;

  // Create grid of points and cast rays
  for (let x = min.x; x <= max.x; x += gridDistance) {
    for (let z = min.z; z <= max.z; z += gridDistance) {
      const rayOrigin = new BABYLON.Vector3(x, max.y + 1, z);
      const rayDirection = new BABYLON.Vector3(0, -1, 0);
      const ray = new BABYLON.Ray(rayOrigin, rayDirection, max.y - min.y + 2);

      // Using multiPickWithRay to find all intersections along the ray
      const pickInfos = scene.multiPickWithRay(ray, (mesh) => transformNode.getChildMeshes().includes(mesh));
      if (pickInfos && pickInfos.length > 0) {
        pickInfos.forEach((pickInfo) => {
          if (pickInfo.hit && pickInfo.pickedPoint) {
            const gridPointId = `${x}_${z}_${pickInfo.pickedPoint.y}`;
            gridPointMap[gridPointId] = {
              id: gridPointId,
              point: getSimplifiedPoint(pickInfo.pickedPoint),
              gridX: x,
              gridZ: z,
            };

            foundPoints.push(pickInfo.pickedPoint);
            // Optionally create visual markers for each point
            // createVisualMarker(pickInfo.pickedPoint);
          }
        });
      }
    }
  }

  transformNode.setEnabled(false);

  return foundPoints;
}

// Function to create a visual marker at a point
export function createVisualMarker(point: Vector3, color?: Color3) {
  // console.log("Point", point.toString());

  const { BABYLON, scene } = window.pageRefs;
  if (!scene || !BABYLON) return;
  const circle = BABYLON.MeshBuilder.CreateSphere("circle", { diameter: 0.4 }, scene);
  circle.position = point.clone();
  circle.position.y += 0.01; // Offset slightly above the floor to avoid z-fighting
  const newMaterial = new BABYLON.StandardMaterial("circleMat", scene);
  newMaterial.emissiveColor = color ?? new BABYLON.Color3(1, 0, 0); // Red color, unlit
  newMaterial.disableLighting = true;

  circle.material = newMaterial;
  scene.addMesh(circle);
  return circle;
}
