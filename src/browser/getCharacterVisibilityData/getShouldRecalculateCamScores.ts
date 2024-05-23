export function getShouldRecalculateCamScores() {
  // To clear cached points data
  // localStorage.clear();

  // pointsInfo, pointIslandsByCamera, gridPointMap, gridPointsOrganized

  const { pointsInfo, pointIslandsByCamera, getDidGridSettingsChange } = window.pageRefs;

  // Check if localStorage has pointsInfo stored
  const pointsInfoFromStorage = localStorage.getItem("pointsInfo");
  if (pointsInfoFromStorage) {
    const parsedPointsInfo = JSON.parse(pointsInfoFromStorage);
    Object.assign(pointsInfo, parsedPointsInfo);
  }
  const pointIslandsByCameraFromStorage = localStorage.getItem("pointIslandsByCamera");
  if (pointIslandsByCameraFromStorage) {
    const parsedPointIslandsByCamera = JSON.parse(pointIslandsByCameraFromStorage);
    Object.assign(pointIslandsByCamera, parsedPointIslandsByCamera);
  }

  const didLoadPointsInfo = Object.keys(pointsInfo).length > 0;
  const didLoadPointIslandsByCamera = Object.keys(pointIslandsByCamera).length > 0;

  const didLoadData = didLoadPointsInfo && didLoadPointIslandsByCamera;

  const didGridSettingsChange = getDidGridSettingsChange();

  const shouldRecalculateCamScores = !didLoadData || didGridSettingsChange;

  return shouldRecalculateCamScores;
}
