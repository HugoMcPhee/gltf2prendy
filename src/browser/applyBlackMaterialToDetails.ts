export async function applyBlackMaterialToDetails() {
  const { modelFile } = window.pageRefs;
  if (!modelFile) return;

  const transformNode = modelFile.transformNodes.details;

  const { BABYLON, scene } = window.pageRefs;

  // Create the unlit black material
  const blackMaterial = new BABYLON.StandardMaterial("unlitBlackMaterial", scene);
  blackMaterial.disableLighting = true;
  // blackMaterial.disableLighting = false;
  blackMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Black color
  blackMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Black color
  blackMaterial.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Black color
  blackMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Black color
  // blackMaterial.alpha = 0.9; // Fully opaque

  // Apply this material to all descendants of the transformNode that are meshes
  transformNode.getChildMeshes().forEach((mesh) => {
    mesh.material = blackMaterial;
  });
}
