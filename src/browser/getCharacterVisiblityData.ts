import { DepthRenderer } from "@babylonjs/core";
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

  // Loop through points on the floor (pointsOnFloor) and set up the pointInfo object
  // where the key is xyz combined as a string, and the value is an object
  // with the point, bestCam1, and bestCam2 properties
  for (const camName of camNames) {
    // Loop through the camNames and set up the camInfos object
    // where the key is the camName and the value is an object with
    // visiblePixels, fullCharacterPixels, and characterDistance properties
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

    for (const vectorPoint of pointsOnFloor) {
      const { x: realX, y: realY, z: realZ } = vectorPoint;

      // make x y and z limited to 3 decimal places
      const x = Math.round(realX * 1000) / 1000;
      const y = Math.round(realY * 1000) / 1000;
      const z = Math.round(realZ * 1000) / 1000;

      const pointInfoKey = `${x},${y},${z}`;
      if (!pointsInfo[pointInfoKey]) {
        pointsInfo[pointInfoKey] = {
          point: [x, y, z],
          camInfos: {},
          bestCam1: "",
          bestCam2: "",
        };
      }

      const fakeCharacter = window.pageRefs.fakeCharacter;
      if (!fakeCharacter) return;

      // set the character position to the current point
      fakeCharacter?.position.set(x, y, z);

      const cameraDistanceToCharacter = BABYLON.Vector3.Distance(camera.position, fakeCharacter.position);

      scene.render();

      // allow some time for rendering
      await delay(1);

      const whitePixels = await countWhitePixels(scene);
      pointsInfo[pointInfoKey].camInfos[camName] = {
        charcterDistance: cameraDistanceToCharacter,
        fullCharacterPixels: whitePixels,
        visiblePixels: 0,
      };

      //   console.log("whitePixels", camName, whitePixels);
      console.log("whitePixels", whitePixels);
    }

    // set cameras view distance back to their original
    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;
  }

  console.log("pointsInfo");
  console.log(pointsInfo);
  //   console.log(JSON.stringify(pointsInfo, null, 2));

  //   await delay(30000);
}
