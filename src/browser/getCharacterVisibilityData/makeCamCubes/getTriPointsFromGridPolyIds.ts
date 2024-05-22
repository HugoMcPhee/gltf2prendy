import { Point3D } from "chootils/dist/points3d";

export function getTriPointsFromGridPolyIds(gridPolyIds: string[]) {
  const { gridPolyMap, gridPointMap } = window.pageRefs;

  const triPoints: Point3D[][] = [];
  for (const polyId of gridPolyIds) {
    const gridPoly = gridPolyMap[polyId];
    if (!gridPoly) continue;

    const topLeftPointId = gridPoly.pointIds.topLeft;
    const topRightPointId = gridPoly.pointIds.topRight;
    const bottomRightPointId = gridPoly.pointIds.bottomRight;
    const bottomLeftPointId = gridPoly.pointIds.bottomLeft;

    const topLeftPoint = topLeftPointId && gridPointMap[topLeftPointId]?.point;
    const topRightPoint = topRightPointId && gridPointMap[topRightPointId]?.point;
    const bottomRightPoint = bottomRightPointId && gridPointMap[bottomRightPointId]?.point;
    const bottomLeftPoint = bottomLeftPointId && gridPointMap[bottomLeftPointId]?.point;

    if (gridPoly.polyType === "empty") continue;

    // NOTE reverse the points to make the triangles face the right way

    if (gridPoly.polyType === "quad") {
      const triPointsA = [topLeftPoint, topRightPoint, bottomRightPoint].filter((p) => p).reverse() as Point3D[];
      const triPointsB = [bottomRightPoint, bottomLeftPoint, topLeftPoint].filter((p) => p).reverse() as Point3D[];

      triPoints.push(triPointsA);
      triPoints.push(triPointsB);
    } else {
      const pointsToRender = [topLeftPoint, topRightPoint, bottomRightPoint, bottomLeftPoint]
        .filter((p) => p)
        .reverse() as Point3D[];

      triPoints.push(pointsToRender);
    }
  }
  return triPoints;
}
