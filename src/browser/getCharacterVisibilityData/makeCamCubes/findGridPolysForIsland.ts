// - it traverses the grid, each grid item gets assessed from bottom left
// - for all the points on the grid at that grid point (read organised grid) , discard the main point if it’s not in that list

import delay from "delay";
import { GridPointId, GridPoly, GridPolyId, PolyType } from "../findPointsOnFloors";

export function findPolyTypeFromPoints(gridPointIds: GridPointId[]): PolyType {
  // NOTE the layers are already known to be the same

  const { gridPointMap } = window.pageRefs;

  const topLeft = gridPointIds?.[0];
  const topRight = gridPointIds?.[1];
  const bottomLeft = gridPointIds?.[2];
  const bottomRight = gridPointIds?.[3];

  const topLeftPoint = gridPointMap[topLeft];
  const topRightPoint = gridPointMap[topRight];
  const bottomLeftPoint = gridPointMap[bottomLeft];
  const bottomRightPoint = gridPointMap[bottomRight];

  // Find all the possible tris,
  // topLeft, topRight, bottomLeft, bottomRight , theese are the corner points of each possible triangle

  // Check for quad
  const hasQuad = topLeftPoint && topRightPoint && bottomLeftPoint && bottomRightPoint;

  if (hasQuad) return "quad";

  const hasTopLeftTri = topLeftPoint && topRightPoint && bottomLeftPoint;
  const hasTopRightTri = topRightPoint && bottomRightPoint && topLeftPoint;
  const hasBottomLeftTri = bottomLeftPoint && bottomRightPoint && topLeftPoint;
  const hasBottomRightTri = bottomRightPoint && topRightPoint && bottomLeftPoint;

  if (hasTopLeftTri) return "triTopLeft";
  if (hasTopRightTri) return "triTopRight";
  if (hasBottomLeftTri) return "triBottomLeft";
  if (hasBottomRightTri) return "triBottomRight";

  return "empty";
}

// Saves the grid polys found for this grid point
export function findGridPolyForGridPoint(mainGridPointId: GridPointId, islandPointIds: GridPointId[]) {
  const { gridPointMap, gridPointsOrganized, findPolyTypeFromPoints } = window.pageRefs;

  // return gridPolyMap[gridPointId];
  //
  const mainGridPoint = gridPointMap[mainGridPointId];
  const aboveGridPointId = gridPointsOrganized?.[mainGridPoint.gridX]?.[mainGridPoint.gridZ + 1]?.filter((id) =>
    islandPointIds.includes(id)
  )?.[0];
  const aboveRightGridPointId = gridPointsOrganized?.[mainGridPoint.gridX + 1]?.[mainGridPoint.gridZ + 1]?.filter(
    (id) => islandPointIds.includes(id)
  )?.[0];
  const rightGridPointId = gridPointsOrganized?.[mainGridPoint.gridX + 1]?.[mainGridPoint.gridZ]?.filter((id) =>
    islandPointIds.includes(id)
  )?.[0];

  const aboveGridPoint = gridPointMap[aboveGridPointId];
  const aboveRightGridPoint = gridPointMap[aboveRightGridPointId];
  const rightGridPoint = gridPointMap[rightGridPointId];

  const newPolyType = findPolyTypeFromPoints([
    mainGridPointId,
    aboveGridPointId,
    aboveRightGridPointId,
    rightGridPointId,
  ]);
  const definedPointIds = [mainGridPointId, aboveGridPointId, aboveRightGridPointId, rightGridPointId].filter(
    (id) => id
  ) as GridPointId[];

  if (newPolyType === "empty") return undefined;

  const newGridPoly: GridPoly = {
    id: `${mainGridPointId}_${aboveGridPointId}_${aboveRightGridPointId}_${rightGridPointId}`,
    gridX: mainGridPoint.gridX,
    gridZ: mainGridPoint.gridZ,
    layer: mainGridPoint.layer,
    pointIds: {
      bottomLeft: mainGridPointId,
      topLeft: aboveGridPointId,
      topRight: aboveRightGridPointId,
      bottomRight: rightGridPointId,
    },
    polyType: newPolyType,
  };

  return newGridPoly;
}

// NOTE An island will have no overlapping grid points
export async function findGridPolysForIsland(islandPoints: GridPointId[]) {
  const islandPolyIds: GridPolyId[] = [];

  const { gridPointsOrganized, gridPolyMap, findGridPolyForGridPoint, delay } = window.pageRefs;

  const xIndexes = Object.keys(gridPointsOrganized);
  for (const xIndex of xIndexes) {
    const zIndexes = Object.keys(gridPointsOrganized?.[xIndex]);
    for (const zIndex of zIndexes) {
      const gridPointId = gridPointsOrganized?.[xIndex]?.[zIndex]?.filter((id) => islandPoints?.includes(id))?.[0];
      if (gridPointId) islandPolyIds.push(gridPointId);
    }
  }

  console.log("got to here");
  await delay(0);

  // loop the x and ys of the grid
  for (const islandPoint of islandPoints) {
    const gridPoly = findGridPolyForGridPoint(islandPoint, islandPoints);
    if (gridPoly) {
      gridPolyMap[gridPoly.id] = gridPoly;
      islandPolyIds.push(gridPoly.id);
    }
  }
  return islandPolyIds;
}
