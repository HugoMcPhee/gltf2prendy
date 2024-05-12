export function setUpBabylonScene() {
  const pageRefs = window.pageRefs;

  const { delay, BABYLON, handleGltfModel, waitForSceneReady } = window.pageRefs;
  if (!delay) return;

  // ----------------------------------
  // Setting up a babylonjs scene
  // ----------------------------------
  const canvas = document.createElement("canvas");
  canvas.id = "renderCanvas";
  canvas.width = 1920;
  canvas.height = 1080;
  document.body.appendChild(canvas);

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    premultipliedAlpha: false,
  });
  pageRefs.engine = engine;

  const scene = new BABYLON.Scene(engine);

  pageRefs.scene = scene;

  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);

  const mainLight = new BABYLON.HemisphericLight("light1", BABYLON.Vector3.Up(), scene);
  mainLight.intensity = 0.7;
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);
  engine.setSize(1920, 1080);
}
