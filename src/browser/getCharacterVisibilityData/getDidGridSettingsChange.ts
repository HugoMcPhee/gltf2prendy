export function getDidGridSettingsChange() {
  const { GRID_SPACE, RESOLUTION_LEVEL } = window.pageRefs;

  const GRID_SPACEFromStorage = localStorage.getItem("GRID_SPACE");
  const RESOLUTION_LEVELFromStorage = localStorage.getItem("RESOLUTION_LEVEL");

  if (GRID_SPACEFromStorage && RESOLUTION_LEVELFromStorage) {
    if (GRID_SPACE !== parseInt(GRID_SPACEFromStorage) || RESOLUTION_LEVEL !== parseInt(RESOLUTION_LEVELFromStorage)) {
      return true;
    }
  } else {
    return true;
  }

  return false;
}
