export function setUpBabylonScene() {
  const pageRefs = window.pageRefs;

  const { delay, BABYLON, handleGltfModel, waitForSceneReady } = window.pageRefs;
  if (!delay) return;

  // ----------------------------------
  // Setting up a babylonjs scene
  // ----------------------------------
  const canvas = document.createElement("canvas");
  canvas.id = "renderCanvas";
  canvas.width = 1440;
  canvas.height = 1440;
  document.body.appendChild(canvas);

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    premultipliedAlpha: false,
    antialias: false,
  });
  pageRefs.engine = engine;
  pageRefs.canvas = canvas;

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // RGBA where R, G, B are 0 for black and A (alpha) is 1 for fully opaque

  pageRefs.scene = scene;

  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);

  const mainLight = new BABYLON.HemisphericLight("light1", BABYLON.Vector3.Up(), scene);
  mainLight.intensity = 0.7;
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);
  engine.setSize(1440, 1440);

  pageRefs.freeCamera = camera;
  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
}
