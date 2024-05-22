export async function setupFakeCharacter() {
  const { delay, BABYLON, handleGltfModel, waitForSceneReady, scene } = window.pageRefs;

  if (!scene) return;

  const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", {
    diameter: 1.5,
    height: 3,
  });

  cylinder.position = new BABYLON.Vector3(0, 3, 0);

  // set pure white unshaded material on the cylinder
  const material = new BABYLON.PBRMaterial("material", scene);
  material.albedoColor = BABYLON.Color3.White();
  material.unlit = true;
  cylinder.material = material;

  // add cylinder to the scene
  scene.addMesh(cylinder);

  console.log("---------------------------------");
  console.log("---------------------------------");
  console.log("---------------------------------");
  console.log("Fake character created");

  window.pageRefs.fakeCharacter = cylinder;
}
