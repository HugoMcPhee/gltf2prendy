import { Camera, FreeCamera } from "@babylonjs/core";
import { PlaceInfo } from "../..";

// TODO fix this
export async function debugCamScores(placeInfo: PlaceInfo) {
  const { modelFile, delay, scene, canvas, BABYLON, pointsInfo, gridPointMap } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  const gridPointIds = Object.keys(gridPointMap);
  const camNames = placeInfo.camNames;

  // Find the highest camera score from all cameras ( to normalize the scores )
  let highestCamScoreFound = 0;
  for (const camName of camNames) {
    for (const pointId of gridPointIds) {
      const cameraScore = pointsInfo[pointId].camInfos[camName].cameraScore;
      if (cameraScore > highestCamScoreFound) highestCamScoreFound = cameraScore;
    }
  }

  for (const camName of camNames) {
    const camera = modelFile.cameras[camName] as FreeCamera;
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;
    camera.minZ = 0.1;
    camera.maxZ = 10000;

    scene.activeCamera = camera;
    scene.activeCamera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
    modelFile.transformNodes.details.setEnabled(true);

    for (const pointId of gridPointIds) {
      const gridPoint = gridPointMap[pointId];
      if (!gridPoint?.point) continue;
      const pointInfoKey = pointId;
      const cameraScore = pointsInfo[pointInfoKey].camInfos[camName].cameraScore;

      // Show the point with a color based on the camera score
      // let color = new BABYLON.Color3(1, 0, 0);
      // if (camName === bestCam) {
      //   color = new BABYLON.Color3(0, 1, 0);
      // } else if (!bestCam) {
      //   color = new BABYLON.Color3(0, 0, 1);
      // }
      //   color = new BABYLON.Color3(1 - cameraScore, cameraScore, 0);
      //   createVisualMarker(vectorPoint, color);
    }
    await delay(1);
    modelFile.transformNodes.details.setEnabled(false);
    scene.render();
    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;
    modelFile.transformNodes.details.setEnabled(true);
  }
}
