// mport { Scene, TransformNode, Vector3, Ray, MeshBuilder, Color4 } from "@babylonjs/core";

import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import delay from "delay";

// Function to create the grid of points and cast rays
export async function generateFloorPoints(gridDistance: number = 1): Promise<Vector3[]> {
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

  // Create grid of points and cast rays
  for (let x = min.x; x <= max.x; x += gridDistance) {
    for (let z = min.z; z <= max.z; z += gridDistance) {
      const rayOrigin = new Vector3(x, max.y + 1, z);
      const rayDirection = new Vector3(0, -1, 0);
      const ray = new BABYLON.Ray(rayOrigin, rayDirection, max.y - min.y + 2);

      const pickInfo = scene.pickWithRay(ray, (mesh) => transformNode.getChildMeshes().includes(mesh));
      if (pickInfo?.hit && pickInfo.pickedPoint) {
        foundPoints.push(pickInfo.pickedPoint);
        createVisualMarker(pickInfo.pickedPoint);
      }
    }
  }

  transformNode.setEnabled(false);

  return foundPoints;
}

// Function to create a visual marker at a point
function createVisualMarker(point: Vector3) {
  console.log("Point t", point.toString());

  const { BABYLON, scene } = window.pageRefs;
  if (!scene || !BABYLON) return;
  const circle = BABYLON.MeshBuilder.CreateSphere("circle", { diameter: 0.4 }, scene);
  circle.position = point.clone();
  circle.position.y += 0.01; // Offset slightly above the floor to avoid z-fighting
  const newMaterial = new BABYLON.StandardMaterial("circleMat", scene);
  newMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0); // Red color, unlit
  newMaterial.disableLighting = true;

  circle.material = newMaterial;
  scene.addMesh(circle);
}
