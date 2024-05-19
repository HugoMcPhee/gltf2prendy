import { relative } from "path/posix";
import { PointCamInfo, PointsInfo } from "..";

type CameraData = {
  visibility: number; // 0 to 1, where 1 means fully visible
  screenCovered: number; // 0 to 1, represents the percentage of the screen the character occupies
  distance: number; // Raw distance from the camera to the character
  relativeDistance: number; // 0 to 1, where 1 is closest distance
};

export function calculateCameraScore(pointCamInfo: PointCamInfo): number {
  const data: CameraData = {
    visibility: pointCamInfo.visibilityScore,
    screenCovered: pointCamInfo.screenCoverage,
    distance: pointCamInfo.characterDistance,
    relativeDistance: pointCamInfo.relativeDistanceScore,
  };

  // Constants for weight - these might need to be adjusted based on testing and gameplay feedback
  const visibilityWeight = 0.3;
  const occupancyWeight = 0.9;
  const distanceWeight = 0.1;

  // Normalize distance into a score: we assume a certain optimal distance range
  // Let's assume optimal distance is between 10 and 50 units
  const optimalMinDistance = 5;
  const optimalMaxDistance = 20;
  let normalizedDistanceScore: number;

  // console.log("distance", data.distance);

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
    data.screenCovered * occupancyWeight +
    normalizedDistanceScore * distanceWeight;

  // return totalScore * (1 + data.relativeDistanceScore) - totalScore / 2;

  return totalScore * (0.5 + data.relativeDistance);
}

export function calculateRelativeDistanceScores(pointsInfo: PointsInfo): void {
  console.log("calculateRelativeDistanceScores");

  const cameraMinMaxDistances: Record<string, { min: number; max: number }> = {};

  // Initialize min and max distances for each camera
  for (const pointKey in pointsInfo) {
    const camInfos = pointsInfo[pointKey].camInfos;
    Object.keys(camInfos).forEach((camName) => {
      if (!cameraMinMaxDistances[camName]) {
        cameraMinMaxDistances[camName] = { min: Infinity, max: -Infinity };
      }
      const distance = camInfos[camName].characterDistance;
      if (distance < cameraMinMaxDistances[camName].min) {
        cameraMinMaxDistances[camName].min = distance;
      }
      if (distance > cameraMinMaxDistances[camName].max) {
        cameraMinMaxDistances[camName].max = distance;
      }
    });
  }

  console.log("cameraMinMaxDistances", cameraMinMaxDistances);

  // Calculate relativeDistanceScore for each camera at each point
  for (const pointKey in pointsInfo) {
    const camInfos = pointsInfo[pointKey].camInfos;
    Object.keys(camInfos).forEach((camName) => {
      const info = camInfos[camName];
      const { min, max } = cameraMinMaxDistances[camName];
      const normalizedDistance = (info.characterDistance - min) / (max - min);
      // Apply non-linear falloff, here using a quadratic decay
      info.relativeDistanceScore = 1 - normalizedDistance * normalizedDistance;
    });
  }
}
