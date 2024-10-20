import { Node, NodeIO, Camera as gltfCamera } from "@gltf-transform/core";
import { Point3D } from "chootils/dist/points3d";
import { fromPointArray, getVectorDistance } from "./vectors";
import { PlaceInfo } from ".";

// Reads the place detail gltf, and saves a palce gltf based on 3d objects found there

// Get place info, like triggerNames, spotNames, camNames etc
// read glft file

export async function readAndSavePlaceGltf({
  placeDetailGlbPath,
  placeInfo,
}: {
  placeDetailGlbPath: string;
  placeInfo: PlaceInfo;
}) {
  const io = new NodeIO();

  //   let placeDetailGlbFile = null as null | Uint8Array;

  // Read.
  let gltfDocument = await io.read(placeDetailGlbPath); // → Document
  // document = await io.readBinary(placeDetailGlbFile); // Uint8Array → Document
  const placeRoot = gltfDocument.getRoot();
  const transformNodes = placeRoot.listNodes();

  const transformNodesByName: Record<string, Node> = {};

  const rootNode = transformNodes.find((item) => !item.getParentNode());

  if (!rootNode) {
    console.error("No root node found");
    return;
  }

  //
  const exportableParentNode = rootNode.listChildren().find((item) => item.getName() === "Exportable");
  const exportableChildrenNodes = exportableParentNode?.listChildren() || [];
  const detailsParentNode = rootNode.listChildren().find((item) => item.getName() === "Details");
  const detailsChildrenNodes = detailsParentNode?.listChildren() || [];

  // Delete the details nodes
  detailsChildrenNodes.forEach((item) => item.dispose());
  detailsParentNode?.dispose();

  // Save all nodes to a dictionary (TODO don't do this since there could be dup;icate names)
  for (const transformNode of transformNodes) {
    const nodeName = transformNode.getName();
    transformNodesByName[nodeName] = transformNode;
  }

  const cameraNodesParent = exportableChildrenNodes.find((item) => item.getName() === "cameras");
  const cameraNodes = cameraNodesParent?.listChildren() || [];

  const wallNodesParent = exportableChildrenNodes.find((item) => item.getName() === "walls");
  const wallNodes = wallNodesParent?.listChildren() || [];

  const triggerNodesParent = exportableChildrenNodes.find((item) => item.getName() === "triggers");
  const triggerNodes = triggerNodesParent?.listChildren() || [];

  const spotNodesParent = exportableChildrenNodes.find((item) => item.getName() === "spots");
  const spotNodes = spotNodesParent?.listChildren() || [];

  const floorNodesParent = exportableChildrenNodes.find((item) => item.getName() === "floors");
  const floorNodes = floorNodesParent?.listChildren() || [];

  // Cameras
  for (const camGroupNode of cameraNodes) {
    const camName = camGroupNode.getName();
    const camGroupChildren = camGroupNode.listChildren();
    const camGroupChildrenMap: Record<string, Node> = {};

    for (const innerCamNode of camGroupChildren) {
      const innerNodeName = innerCamNode.getName();
      camGroupChildrenMap[innerNodeName] = innerCamNode;
    }

    // Get the main camera node
    const camNode = camGroupChildrenMap[camName];

    const foundCamera = camNode.getCamera();
    if (foundCamera) {
      foundCamera.setName(camName);
      placeInfo.camNames.push(camName);

      camGroupNode.setCamera(foundCamera);

      // Update camera min and max z if they have depth points
      // (NOTE may need to to this later from babylonjs! and return the values)
      let nearDepthPoint: Point3D | null = null;
      let farDepthPoint: Point3D | null = null;

      // get the camera position
      const camPos = fromPointArray(camNode.getWorldTranslation());

      // check if it has a near depth point
      const nearDepthNode = transformNodesByName[camName + "_depth_near"];
      if (nearDepthNode) nearDepthPoint = fromPointArray(nearDepthNode.getWorldTranslation());

      // check if it has a far depth point
      const farDepthNode = transformNodesByName[camName + "_depth"] || transformNodesByName[camName + "_depth_far"];
      if (farDepthNode) farDepthPoint = fromPointArray(farDepthNode.getWorldTranslation());

      // get the vector distance using chootils
      foundCamera.setZNear(nearDepthPoint ? getVectorDistance(camPos, nearDepthPoint) : 1);
      foundCamera.setZFar(farDepthPoint ? getVectorDistance(camPos, farDepthPoint) : 100);
    }
    // innerCamNode.dispose(); // NOTE Disposing it here was causing issues before reading it
  }

  for (const wallNode of wallNodes) placeInfo.wallNames.push(wallNode.getName()); // Walls
  for (const triggerNode of triggerNodes) placeInfo.triggerNames.push(triggerNode.getName()); // Triggers
  for (const spotNode of spotNodes) placeInfo.spotNames.push(spotNode.getName()); // Spots
  for (const floorNode of floorNodes) placeInfo.floorNames.push(floorNode.getName()); // Floors

  if (false) {
    // Write. // NOTE move this to below the babylonjs parts
    // NOTE won't work if _detail is writtern twice (a_details_park_details), it might be better to build the new path from the placename

    await io.write(
      // placeDetailGlbPath?.replace("_detail", "_edited"),
      placeDetailGlbPath?.replace("_details", ""),
      gltfDocument
    ); // → void
  }
  // const newGlb = await io.writeBinary(gltfDocument); // Document → Uint8Array
}
