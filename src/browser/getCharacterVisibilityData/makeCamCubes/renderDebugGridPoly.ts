import { Color3, Mesh } from "@babylonjs/core";

export async function renderDebugGridPoly(polyId: string, color: Color3) {
  const { gridPolyMap, gridPointMap, createVisualMarker, BABYLON } = window.pageRefs;

  const meshesToRender: Mesh[] = [];
  const gridPoly = gridPolyMap[polyId];
  if (!gridPoly) return meshesToRender;

  if (gridPoly.polyType === "quad" || gridPoly.polyType === "empty") return meshesToRender;

  const topLeftPointId = gridPoly.pointIds.topLeft;
  const topRightPointId = gridPoly.pointIds.topRight;
  const bottomRightPointId = gridPoly.pointIds.bottomRight;
  const bottomLeftPointId = gridPoly.pointIds.bottomLeft;

  const topLeftPoint = topLeftPointId && gridPointMap[topLeftPointId]?.point;
  const topRightPoint = topRightPointId && gridPointMap[topRightPointId]?.point;
  const bottomRightPoint = bottomRightPointId && gridPointMap[bottomRightPointId]?.point;
  const bottomLeftPoint = bottomLeftPointId && gridPointMap[bottomLeftPointId]?.point;

  const pointsToRender = [topLeftPoint, topRightPoint, bottomRightPoint, bottomLeftPoint].filter((p) => p) as Point3D[];

  for (const point of pointsToRender) {
    const newMarker = createVisualMarker(new BABYLON.Vector3(point.x, point.y, point.z), color);
    if (newMarker) meshesToRender.push(newMarker);
  }

  return meshesToRender;
}
