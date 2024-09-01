import { relative } from "path/posix";
import { PlaceInfo } from "../..";
import { PointCamInfo, PointsInfo } from "../browser";

type CameraData = {
  visibilityScore: number; // 0 to 1, where 1 means fully visible
  screenCoverage: number; // 0 to 1, represents the percentage of the screen the character occupies
  characterDistance: number; // Raw distance from the camera to the character
  relativeDistanceScore: number; // 0 to 1, where 1 is closest distance
};

export function calculateCameraScore(pointCamInfo: PointCamInfo): number {
  const { characterDistance, relativeDistanceScore, screenCoverage, visibilityScore } = pointCamInfo;
  if (!characterDistance || !screenCoverage || !visibilityScore || !relativeDistanceScore) {
    console.log("Missing data for camera score calculation");
    return 0;
  }

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

  if (characterDistance < optimalMinDistance) {
    normalizedDistanceScore = characterDistance / optimalMinDistance; // Decreases as distance decreases below min
  } else if (characterDistance > optimalMaxDistance) {
    normalizedDistanceScore = optimalMaxDistance / characterDistance; // Decreases as distance increases above max
  } else {
    normalizedDistanceScore = 1; // Optimal distance
  }

  // Calculate total score
  const totalScore =
    visibilityScore * visibilityWeight + screenCoverage * occupancyWeight + normalizedDistanceScore * distanceWeight;

  // return totalScore * (1 + relativeDistanceScore) - totalScore / 2;

  return totalScore * (0.5 + relativeDistanceScore);
}

export async function calculateRelativeDistanceScores(pointsInfo: PointsInfo, placeInfo: PlaceInfo) {
  const { delay, gridPointMap, findIslandsFromPoints, pointIslandsByCamera, GRID_SPACE } = window.pageRefs;
  await delay(1); // may be needed for the points data to be ready

  const gridPointIds = Object.keys(gridPointMap);
  const camNames = placeInfo.camNames;

  const cameraMinMaxDistances: Record<string, { min: number; max: number }> = {};

  // Initialize min and max distances for each camera
  for (const pointId of gridPointIds) {
    const camInfos = pointsInfo[pointId].camInfos;
    for (const camName of camNames) {
      const { characterDistance } = camInfos[camName];
      if (!characterDistance) continue;
      if (!cameraMinMaxDistances[camName]) {
        cameraMinMaxDistances[camName] = { min: Infinity, max: -Infinity };
      }
      const distance = characterDistance;
      if (distance < cameraMinMaxDistances[camName].min) {
        cameraMinMaxDistances[camName].min = distance;
      }
      if (distance > cameraMinMaxDistances[camName].max) {
        cameraMinMaxDistances[camName].max = distance;
      }
    }
  }

  // Calculate relativeDistanceScore for each camera at each point
  for (const pointId of gridPointIds) {
    const camInfos = pointsInfo[pointId].camInfos;
    for (const camName of camNames) {
      const info = camInfos[camName];
      const { characterDistance } = info;
      if (!characterDistance) continue;
      const { min, max } = cameraMinMaxDistances[camName];
      const normalizedDistance = (characterDistance - min) / (max - min);
      // Apply non-linear falloff, here using a quadratic decay
      info.relativeDistanceScore = 1 - normalizedDistance * normalizedDistance;
    }
  }

  // calucalte the cameraScore for each point influenced by the new relativeDistanceScore
  for (const pointId of gridPointIds) {
    const camInfos = pointsInfo[pointId].camInfos;
    for (const camName of camNames) {
      camInfos[camName].cameraScore = calculateCameraScore(camInfos[camName]);
    }
  }

  // Find the best camera for each point
  for (const pointId of gridPointIds) {
    const camInfos = pointsInfo[pointId].camInfos;

    let bestCam = "";
    let bestScore = 0;

    for (const camName of camNames) {
      const cameraScore = camInfos[camName].cameraScore;
      if (cameraScore > bestScore) {
        bestScore = cameraScore;
        bestCam = camName;
      }
      if (bestScore < 0.1) bestCam = "";
    }

    pointsInfo[pointId].bestCam = bestCam;
  }

  // debugCamScores(placeInfo);

  // organise the points info into a record of <CameraName, { x, y, z, pointId }[] >
  const pointIdsByBestCam: Record<string, string[]> = {};
  for (const pointId of gridPointIds) {
    const bestCam = pointsInfo[pointId].bestCam;
    if (!bestCam) continue;

    if (!pointIdsByBestCam[bestCam]) pointIdsByBestCam[bestCam] = [];
    pointIdsByBestCam[bestCam].push(pointId);
  }

  //   for each Camera,  get the isalnds and store it in a pointIslandsByCamera map (using findIslandsFromPoints)
  for (const camName of camNames) {
    const pointIds = pointIdsByBestCam[camName];
    const islands = findIslandsFromPoints(pointIds, GRID_SPACE);
    // await delay(5000);
    pointIslandsByCamera[camName] = islands;
  }

  // Save pointsInfo and pointIslandsByCamera to localStorage

  // First remove uneeded properties so more can be saved
  const newPointsInfo: PointsInfo = {};
  for (const pointId of gridPointIds) {
    const { point, camInfos, bestCam } = pointsInfo[pointId];
    // Loop through camInfos
    const newCamInfos: Record<string, PointCamInfo> = {};
    for (const camName in camInfos) {
      const { cameraScore } = camInfos[camName];
      newCamInfos[camName] = { cameraScore };
    }
    newPointsInfo[pointId] = { point, camInfos: newCamInfos, bestCam };
  }

  localStorage.setItem("pointsInfo", JSON.stringify(newPointsInfo));
  localStorage.setItem("pointIslandsByCamera", JSON.stringify(pointIslandsByCamera));
}
