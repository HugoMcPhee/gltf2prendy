// - it traverses the grid, each grid item gets assessed from bottom left
// - for all the points on the grid at that grid point (read organised grid) , discard the main point if it’s not in that list

import { GridPointId, GridPoly, GridPolyId } from "./findPointsOnFloors";

// Saves the grid polys found for this grid point
export function findGridPolysForGridPoint(gridPointId: GridPointId, islandPointIds: GridPointId[]): GridPolyId[] {
  const { gridPointMap, gridPointsOrganized } = window.pageRefs;

  const addedGridPolyIds: GridPolyId[] = [];
  // return gridPolyMap[gridPointId];
  //
  const mainGridPoint = gridPointMap[gridPointId];
  const aboveGridPointIds = gridPointsOrganized[mainGridPoint.gridX][mainGridPoint.gridZ + 1];
  const aboveRightGridPointIds = gridPointsOrganized[mainGridPoint.gridX + 1][mainGridPoint.gridZ + 1];
  const rightGridPointIds = gridPointsOrganized[mainGridPoint.gridX + 1][mainGridPoint.gridZ];

  //

  return addedGridPolyIds;
}

export function findGridPolysForIsland(islandPoints: GridPointId[]): GridPolyId[] {
  const islandPolyIds: GridPolyId[] = [];

  const { gridPointsOrganized } = window.pageRefs;

  const xIndexes = Object.keys(gridPointsOrganized);
  for (const xIndex of xIndexes) {
    const zIndexes = Object.keys(gridPointsOrganized[xIndex]);
    for (const zIndex of zIndexes) {
      const gridPointIds = gridPointsOrganized[xIndex][zIndex];
      for (const gridPointId of gridPointIds) {
        if (islandPoints.includes(gridPointId)) {
          islandPolyIds.push(gridPointId);
        }
      }
    }
  }

  // loop the x and ys of the grid

  for (const islandPoint of islandPoints) {
    const pointPolys = gridPolyIdsByCamIslands["cam1"][islandPoint] || [];
    islandPolys.push(...pointPolys);
  }
  return islandPolys;
}
