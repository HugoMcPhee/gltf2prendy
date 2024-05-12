import { PlaceInfo, PointsInfo } from "..";

export async function getCharacterVisibilityData(placeInfo: PlaceInfo, pointsInfo: PointsInfo) {
  const {
    modelFile,
    delay,
    scene,
    canvas,
    BABYLON,
    countWhitePixels,
    setupFakeCharacter,
    generateFloorPoints,
    applyBlackMaterialToDetails,
  } = window.pageRefs;
  if (!scene || !modelFile || !BABYLON || !canvas) return;

  const engine = scene.getEngine();
  engine.setSize(192, 108);
  canvas.width = 192;
  canvas.height = 108;

  await setupFakeCharacter();

  await applyBlackMaterialToDetails();

  const pointsOnFloor = await generateFloorPoints(5);

  console.log("pointsOnFloor", pointsOnFloor);

  // use this whole function inside evaluate

  const camNames = placeInfo.camNames;

  for (const camName of camNames) {
    // remove the old depth postProcess
    window.pageRefs.depthPostProcess?.dispose();

    if (!delay || !modelFile || !engine || !scene) return;
    const camera = modelFile.cameras[camName];
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    engine.setSize(192, 108);

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;

    scene.render();

    // allow some time for rendering
    await delay(50);

    // set cameras view distance back to their original
    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;

    const whitePixels = await countWhitePixels(scene);

    await delay(2000);

    //   console.log("whitePixels", camName, whitePixels);
    console.log("whitePixels", whitePixels);
  }

  await delay(5000);
}
