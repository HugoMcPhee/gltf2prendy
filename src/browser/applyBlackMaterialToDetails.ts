export async function applyBlackMaterialToDetails() {
  const { modelFile } = window.pageRefs;
  if (!modelFile) return;

  const transformNode = modelFile.transformNodes.details;

  const { BABYLON, scene } = window.pageRefs;

  // Create the unlit black material
  const blackMaterial = new BABYLON.StandardMaterial("unlitBlackMaterial", scene);
  blackMaterial.disableLighting = true;
  blackMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0); // Black color

  // Apply this material to all descendants of the transformNode that are meshes
  transformNode.getChildMeshes().forEach((mesh) => {
    mesh.material = blackMaterial;
  });
}
