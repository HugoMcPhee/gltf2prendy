import { IdPoint3D } from "./getCharacterVisiblityData";

// Function to determine if two points should be connected based on specified spatial limits
function arePointsConnected(point1: IdPoint3D, point2: IdPoint3D, gridSpace: number, verticalLimit: number): boolean {
  const squaredDistanceXZ = (point1.x - point2.x) ** 2 + (point1.z - point2.z) ** 2;
  const maxDistanceXZSquared = (1.5 * gridSpace) ** 2; // Max squared distance on the horizontal plane
  const verticalDistance = Math.abs(point1.y - point2.y); // Vertical distance between points
  return squaredDistanceXZ <= maxDistanceXZSquared && verticalDistance <= verticalLimit;
}

// Function to identify and cluster "islands" of connected points
export function findIslandsFromPoints(points: IdPoint3D[], gridSpace: number, verticalLimit: number): IdPoint3D[][] {
  let currentClusterId = 0;
  const pointToClusterMap: Record<string, number> = {}; // Maps each point's ID to a cluster ID
  const visitedPoints: Record<string, boolean> = {}; // Tracks which points have been visited

  // Recursive Depth-First Search (DFS) to explore all connected points
  function dfsExploreCluster(currentPoint: IdPoint3D) {
    visitedPoints[currentPoint.id] = true; // Mark the current point as visited
    pointToClusterMap[currentPoint.id] = currentClusterId; // Assign the current cluster ID to the point

    // Check all points to see if they connect to the current point and haven't been visited
    for (const point of points) {
      if (!visitedPoints[point.id] && arePointsConnected(currentPoint, point, gridSpace, verticalLimit)) {
        dfsExploreCluster(point); // Recursively visit connected points
      }
    }
  }

  // Initialize DFS from each unvisited point
  for (const point of points) {
    if (!visitedPoints[point.id]) {
      // Start a new cluster if the point hasn't been visited
      dfsExploreCluster(point);
      currentClusterId++; // Increment the cluster ID after finishing a cluster
    }
  }

  // Group points by cluster ID
  const clusters: Record<number, IdPoint3D[]> = {};
  for (const point of points) {
    const clusterId = pointToClusterMap[point.id];
    if (!clusters[clusterId]) {
      clusters[clusterId] = [];
    }
    clusters[clusterId].push(point);
  }

  // Remove islands with fewer than 4 points
  for (const clusterId in clusters) {
    if (clusters[clusterId].length < 9) {
      delete clusters[clusterId];
    }
  }

  // Convert clusters to arrays for easier handling
  return Object.values(clusters);
}
