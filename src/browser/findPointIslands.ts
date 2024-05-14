type Point = {
  x: number;
  z: number;
  y: number;
  id: string; // Unique identifier for each point
};

// Function to determine if two points should be connected based on specified spatial limits
function arePointsConnected(point1: Point, point2: Point, gridSpace: number, verticalLimit: number): boolean {
  const squaredDistanceXZ = (point1.x - point2.x) ** 2 + (point1.z - point2.z) ** 2;
  const maxDistanceXZSquared = (1.5 * gridSpace) ** 2; // Max squared distance on the horizontal plane
  const verticalDistance = Math.abs(point1.y - point2.y); // Vertical distance between points
  return squaredDistanceXZ <= maxDistanceXZSquared && verticalDistance <= verticalLimit;
}

// Function to identify and cluster "islands" of connected points
export function clusterPointsIntoIslands(
  points: Point[],
  gridSpace: number,
  verticalLimit: number
): Record<string, number> {
  let currentClusterId = 0;
  const pointToClusterMap: Record<string, number> = {}; // Maps each point's ID to a cluster ID
  const visitedPoints: Record<string, boolean> = {}; // Tracks which points have been visited

  // Recursive Depth-First Search (DFS) to explore all connected points
  function dfsExploreCluster(currentPoint: Point) {
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

  return pointToClusterMap; // Return the map of point IDs to their respective cluster IDs
}
