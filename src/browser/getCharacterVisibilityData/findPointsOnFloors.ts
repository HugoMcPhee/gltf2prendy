import { Vector3 } from "@babylonjs/core";
import { Color3 } from "babylonjs";
import { Point3D } from "chootils/dist/points3d";

export type GridPoint = {
  id: string; // there can be multiple points at the same xz, so there's a unique id too (maybe pointIndex)
  point: Point3D | undefined; // an { x, y, z } point in 3D space
  gridX: number;
  gridZ: number;
  layer: number; // 0 is the lowest ray found, 1 is the second, etc, so points on different layers are not connected
};

export type X_Index = string;
export type Z_Index = string;
export type GridPointId = string;
export type GridPolyId = string;
export type IslandIndex = string;
export type CamName = string;

export type GridPointMap = Record<GridPointId, GridPoint>;
export type GridPointsOrganized = Record<X_Index, Record<Z_Index, GridPointId[]>>;
export type PointIslandsByCamera = Record<CamName, Record<IslandIndex, GridPointId[]>>;
export type IslandPolyIdsByCamera = Record<CamName, Record<IslandIndex, GridPolyId[]>>;

export type PolyType = "quad" | "triBottomLeft" | "triTopLeft" | "triTopRight" | "triBottomRight" | "empty";

export type GridPoly = {
  id: string;
  polyType: PolyType;
  pointIds: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
  gridX: number;
  gridZ: number;
  layer: number;
};

export type GridTri = {
  id: string;
  polyType: PolyType;
  pointIds: string[];
};

export type GridPolyMap = Record<string, GridPoly>;
export type GridPolyIdsByCamIslands = Record<CamName, Record<IslandIndex, GridPolyId[]>>;

// Function to create the grid of points and cast rays
export async function generateFloorPoints(gridDistance: number = 1) {
  const { BABYLON, scene, modelFile, gridPointMap, gridPointsOrganized, getDidGridSettingsChange, getSimplifiedPoint } =
    window.pageRefs;

  // Check if gridPointMap and gridPointsOrganized already exist in localStorage, and load those instead
  const gridPointMapFromStorage = localStorage.getItem("gridPointMap");
  const gridPointsOrganizedFromStorage = localStorage.getItem("gridPointsOrganized");

  const didGridSettingsChange = getDidGridSettingsChange();
  if (gridPointMapFromStorage && gridPointsOrganizedFromStorage && !didGridSettingsChange) {
    // assign the gridPointMap and gridPointsOrganized to window.pageRefs
    Object.assign(window.pageRefs.gridPointMap, JSON.parse(gridPointMapFromStorage));
    Object.assign(window.pageRefs.gridPointsOrganized, JSON.parse(gridPointsOrganizedFromStorage));
    return { gridPointMap: window.pageRefs.gridPointMap, gridPointsOrganized: window.pageRefs.gridPointsOrganized };
  }

  const foundPoints: Vector3[] = [];
  const transformNode = modelFile?.transformNodes.floors;

  if (!transformNode || !scene || !BABYLON) return { gridPointMap, gridPointsOrganized };
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

  let xIndex = -1;

  // Create grid of points and cast rays
  for (let x = min.x; x <= max.x; x += gridDistance) {
    xIndex++;
    let zIndex = -1;
    for (let z = min.z; z <= max.z; z += gridDistance) {
      zIndex++;

      const rayOrigin = new BABYLON.Vector3(x, max.y + 1, z);
      const rayDirection = new BABYLON.Vector3(0, -1, 0);
      const ray = new BABYLON.Ray(rayOrigin, rayDirection, max.y - min.y + 2);

      // Using multiPickWithRay to find all intersections along the ray
      const pickInfos = scene.multiPickWithRay(ray, (mesh) => transformNode.getChildMeshes().includes(mesh));
      if (pickInfos && pickInfos.length > 0) {
        // find the total number of picks with a hit
        const hitAmount = pickInfos.filter((pickInfo) => pickInfo.hit).length;
        let layerCounter = hitAmount;

        pickInfos.forEach((pickInfo) => {
          if (pickInfo.hit && pickInfo.pickedPoint) {
            const point = getSimplifiedPoint(pickInfo.pickedPoint);
            const gridPointId = `${point.x}_${point.z}_${point.y}`;
            const gridPoint: GridPoint = {
              id: gridPointId,
              point,
              gridX: xIndex,
              gridZ: zIndex,
              layer: layerCounter--,
            };
            gridPointMap[gridPointId] = gridPoint;
            if (!gridPointsOrganized[xIndex]) gridPointsOrganized[xIndex] = {};
            if (!gridPointsOrganized[xIndex][zIndex]) gridPointsOrganized[xIndex][zIndex] = [];
            gridPointsOrganized[xIndex][zIndex].push(gridPointId);

            foundPoints.push(pickInfo.pickedPoint);
            // Optionally create visual markers for each point
            // createVisualMarker(pickInfo.pickedPoint);
          }
        });
      }
    }
  }

  transformNode.setEnabled(false);

  // Save gridPointMap and gridPointsOrganized to localStorage
  localStorage.setItem("gridPointMap", JSON.stringify(gridPointMap));
  localStorage.setItem("gridPointsOrganized", JSON.stringify(gridPointsOrganized));

  return { gridPointMap, gridPointsOrganized };
}

// Function to create a visual marker at a point
export function createVisualMarker(point: Vector3, color?: Color3) {
  // console.log("Point", point.toString());

  const { BABYLON, scene } = window.pageRefs;
  if (!scene || !BABYLON) return;
  const circle = BABYLON.MeshBuilder.CreateSphere("circle", { diameter: 0.4 }, scene);
  circle.position = point.clone();
  circle.position.y += 0.2; // Offset slightly above the floor to avoid z-fighting
  const newMaterial = new BABYLON.StandardMaterial("circleMat", scene);
  newMaterial.emissiveColor = color ?? new BABYLON.Color3(1, 0, 0); // Red color, unlit
  newMaterial.disableLighting = true;

  circle.material = newMaterial;
  scene.addMesh(circle);
  return circle;
}
