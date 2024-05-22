import { Point3D } from "chootils/dist/points3d";
import { GridPoint, GridPointId, IslandIndex } from "../findPointsOnFloors";

// Function to determine if two points should be connected based on specified spatial limits
function areGridPointsConnected(point1: GridPoint, point2: GridPoint, gridSpace: number): boolean {
  if (!point1.point || !point2.point) return false; // Skip points without coordinates

  let verticalLimit = gridSpace * 1.5; // Vertical distance limit between points

  // Check the y distance, the layer is the same, and the xz indexes are +/- 1 of eachother
  const layersMatch = point1.layer === point2.layer;
  const gridXClose = Math.abs(point1.gridX - point2.gridX) <= 1;
  const gridZClose = Math.abs(point1.gridZ - point2.gridZ) <= 1;
  const verticalDistance = Math.abs(point1.point.y - point2.point.y); // Vertical distance between points
  const verticalClose = verticalDistance <= verticalLimit;

  // const squaredDistanceXZ = (point1.point.x - point2.point.x) ** 2 + (point1.point.z - point2.point.z) ** 2;
  // const maxDistanceXZSquared = (1.5 * gridSpace) ** 2; // Max squared distance on the horizontal plane
  // const xzIsClose = squaredDistanceXZ <= maxDistanceXZSquared;

  return layersMatch && gridXClose && gridZClose && verticalClose;
  // return layersMatch && xzIsClose && verticalClose;
}

// Function to identify and cluster "islands" of connected points
export function findIslandsFromPoints(pointIds: string[], gridSpace: number): Record<IslandIndex, GridPointId[]> {
  const { gridPointMap } = window.pageRefs;

  let currentIslandId = 0;
  const pointToIslandMap: Record<string, number> = {}; // Maps each point's ID to a cluster ID
  const visitedPoints: Record<string, boolean> = {}; // Tracks which points have been visited

  // Recursive Depth-First Search (DFS) to explore all connected points
  function dfsExploreIsland(currentPointId: string) {
    visitedPoints[currentPointId] = true; // Mark the current point as visited
    pointToIslandMap[currentPointId] = currentIslandId; // Assign the current cluster ID to the point

    // Check all points to see if they connect to the current point and haven't been visited
    for (const pointId of pointIds) {
      const gridPoint = gridPointMap[pointId];
      const currentGridPoint = gridPointMap[currentPointId];

      if (!gridPoint || !currentGridPoint) continue; // Skip points without coordinates
      if (!visitedPoints[pointId] && areGridPointsConnected(currentGridPoint, gridPoint, gridSpace)) {
        dfsExploreIsland(pointId); // Recursively visit connected points
      }
    }
  }

  // Initialize DFS from each unvisited point
  for (const pointId of pointIds) {
    if (!visitedPoints[pointId]) {
      // Start a new cluster if the point hasn't been visited
      dfsExploreIsland(pointId);
      currentIslandId++; // Increment the cluster ID after finishing a cluster
    }
  }

  // Group points by cluster ID
  const pointsByIsland: Record<number, string[]> = {};
  for (const pointId of pointIds) {
    const islandId = pointToIslandMap[pointId];
    if (!pointsByIsland[islandId]) {
      pointsByIsland[islandId] = [];
    }
    pointsByIsland[islandId].push(pointId);
  }

  // Remove islands with fewer than 4 points
  for (const islandId in pointsByIsland) {
    if (pointsByIsland[islandId].length < 9) {
      delete pointsByIsland[islandId];
    }
  }

  return pointsByIsland;
}
