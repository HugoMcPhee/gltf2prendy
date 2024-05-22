import { IdPoint3D } from "../getCharacterVisiblityData";

function findNearestNeighbors(
  point: IdPoint3D,
  points: IdPoint3D[],
  maxDistanceXZ: number,
  maxDistanceY: number
): IdPoint3D[] {
  const maxDistanceXZSquared = maxDistanceXZ ** 2; // Precompute the square of the maximum horizontal distance
  // Filter points based on squared distance and vertical limit, then sort by proximity
  let neighbors = points.filter(
    (p) =>
      (p.x - point.x) ** 2 + (p.z - point.z) ** 2 <= maxDistanceXZSquared && Math.abs(p.y - point.y) <= maxDistanceY
  );
  neighbors.sort((a, b) => {
    const distA = (a.x - point.x) ** 2 + (a.z - point.z) ** 2;
    const distB = (b.x - point.x) ** 2 + (b.z - point.z) ** 2;
    return distA - distB;
  });
  return neighbors.slice(0, 2); // Return the two nearest points
}

export function generateTrianglesFromPoints(
  points: IdPoint3D[],
  maxDistanceXZ: number,
  maxDistanceY: number
): IdPoint3D[][] {
  let usedPoints: Record<string, boolean> = {}; // Tracks whether a point has been used in a triangle
  let triangles: IdPoint3D[][] = [];

  points.forEach((point) => {
    if (!usedPoints[point.id]) {
      let neighbors = findNearestNeighbors(
        point,
        points.filter((p) => !usedPoints[p.id]),
        maxDistanceXZ,
        maxDistanceY
      );
      if (neighbors.length === 2) {
        // Ensure triangle points are defined in a consistent winding order
        triangles.push([point, neighbors[0], neighbors[1]]);
        usedPoints[point.id] = true; // Mark the current point as used
        neighbors.forEach((n) => (usedPoints[n.id] = true)); // Mark the neighbors as used
      }
    }
  });

  return triangles;
}
