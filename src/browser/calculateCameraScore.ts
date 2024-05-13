type CameraData = {
  visibility: number; // 0 to 1, where 1 means fully visible
  screenOccupancy: number; // 0 to 1, represents the percentage of the screen the character occupies
  distance: number; // Raw distance from the camera to the character
};

export function calculateCameraScore(data: CameraData): number {
  // Constants for weight - these might need to be adjusted based on testing and gameplay feedback
  const visibilityWeight = 0.6;
  const occupancyWeight = 0.3;
  const distanceWeight = 0.1;

  // Normalize distance into a score: we assume a certain optimal distance range
  // Let's assume optimal distance is between 10 and 50 units
  const optimalMinDistance = 10;
  const optimalMaxDistance = 50;
  let normalizedDistanceScore: number;

  if (data.distance < optimalMinDistance) {
    normalizedDistanceScore = data.distance / optimalMinDistance; // Decreases as distance decreases below min
  } else if (data.distance > optimalMaxDistance) {
    normalizedDistanceScore = optimalMaxDistance / data.distance; // Decreases as distance increases above max
  } else {
    normalizedDistanceScore = 1; // Optimal distance
  }

  // Calculate total score
  const totalScore =
    data.visibility * visibilityWeight +
    data.screenOccupancy * occupancyWeight +
    normalizedDistanceScore * distanceWeight;

  return totalScore;
}
