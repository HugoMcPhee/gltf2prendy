import { Node, NodeIO, Camera as gltfCamera } from "@gltf-transform/core";
import { Point3D } from "chootils/dist/points3d";
import { fromPointArray, getVectorDistance } from "./vectors";
import { PlaceInfo } from ".";

// Reads the place detail gltf, and saves a palce gltf based on 3d objects found there

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
  const cameraNodesByName: Record<string, Node> = {}; // Camera
  const camerasByName: Record<string, gltfCamera> = {};

  for (const transformNode of transformNodes) {
    const nodeName = transformNode.getName();
    const nodeParent = transformNode.getParentNode();
    const isARootNode = !nodeParent;

    transformNodesByName[nodeName] = transformNode;

    if (isARootNode) {
      const nodeChildren = transformNode.listChildren();
      console.log(nodeName, nodeChildren.length);

      if (nodeName === "cameras") {
        for (const camNodeChild of nodeChildren) {
          const camName = camNodeChild.getName();
          placeInfo.camNames.push(camName);
          // console.log(camNodeChild.getName());
          // console.log(camNodeChild.listChildren());
          console.log(camName, "camNodeChild.getWorldTranslation()");
          console.log(camNodeChild.getWorldTranslation());

          const innerCamChildren = camNodeChild.listChildren();
          console.log("innerCamChildren");
          console.log(innerCamChildren.map((item) => item.getName()));

          for (const innerCamChild of innerCamChildren) {
            if (innerCamChild.getName() === camName) {
              console.log("innerCamChild");
              // console.log(innerCamChild);

              const foundCamera = innerCamChild.getCamera();
              // const foundCamera = innerCamChild.listChildren()[0];
              // console.log("foundCamera");
              // console.log(foundCamera);
              if (foundCamera) {
                console.log("foundCamera.listParents()");
                console.log(foundCamera.listParents().map((item) => item.getName()));
                console.log(innerCamChild.getName());
                console.log(camName, "innerCamChild.getWorldTranslation()");
                console.log(innerCamChild.getWorldTranslation());

                foundCamera.setName(camName);
                cameraNodesByName[camName] = innerCamChild;
                camerasByName[camName] = foundCamera;

                // foundCamera.parent

                camNodeChild.setCamera(foundCamera);
              }
              // innerCamChild.dispose(); // NOTE Disposing it here was causing issues before reading it
            }
          }

          console.log("=============================");
          console.log("camNodeChild.listChildren()");
          console.log(camNodeChild.listChildren().map((item) => item.getName()));

          // find the cameras, and remove the extra wrapping node for each one
        }
      } else if (nodeName === "walls") {
        for (const camNodeChild of nodeChildren) {
          placeInfo.wallNames.push(camNodeChild.getName());
        }
      } else if (nodeName === "triggers") {
        for (const camNodeChild of nodeChildren) {
          placeInfo.triggerNames.push(camNodeChild.getName());
        }
      } else if (nodeName === "spots") {
        for (const camNodeChild of nodeChildren) {
          placeInfo.spotNames.push(camNodeChild.getName());
        }
      } else if (nodeName === "floors") {
        for (const camNodeChild of nodeChildren) {
          placeInfo.floorNames.push(camNodeChild.getName());
        }
      } else if (nodeName === "details") {
        // find the details node and delete it
        transformNode.listChildren().forEach((item) => item.dispose());
        transformNode.dispose();
      }
    }

    // Could check if the node name is walls etc, but ideally check the root children instead
  }

  // Update camera min and max z if they have depth points
  for (const camName of placeInfo.camNames) {
    // get the camera node
    const camNode = cameraNodesByName[camName];
    const foundCamera = camerasByName[camName];

    if (camNode && foundCamera) {
      let nearDepthPoint: Point3D | null = null;
      let farDepthPoint: Point3D | null = null;
      // get the camera position
      const camPos = fromPointArray(camNode.getWorldTranslation());
      // check if it has a near depth point
      const nearDepthNode = transformNodesByName[camName + "_depth_near"];
      if (nearDepthNode) {
        nearDepthPoint = fromPointArray(nearDepthNode.getWorldTranslation());
      }

      // check if it has a far depth point
      const farDepthNode = transformNodesByName[camName + "_depth"] || transformNodesByName[camName + "_depth_far"];

      if (farDepthNode) {
        farDepthPoint = fromPointArray(farDepthNode.getWorldTranslation());
      }

      console.log(camName, "zNear", nearDepthPoint ? getVectorDistance(nearDepthPoint, camPos) : 1);
      console.log(camName, "zFar", farDepthPoint ? getVectorDistance(farDepthPoint, camPos) : 1);
      console.log(camName, "camPos", camPos);
      console.log(camName, "farDepthPoint", farDepthPoint);
      console.log(camName, "nearDepthPoint", nearDepthPoint);

      // get the vector distance using chootils
      foundCamera.setZNear(nearDepthPoint ? getVectorDistance(camPos, nearDepthPoint) : 1);
      foundCamera.setZFar(farDepthPoint ? getVectorDistance(camPos, farDepthPoint) : 100);
    }
  }

  // Edit

  // udpate the cameras min and maxZ based on the distances (NOTE may need to to this later from babylonjs! and return the values)

  // Write. // NOTE move this to below the babylonjs parts
  // NOTE won't work is _detail is writtern somewhere else, it might be better to build the new path from the placename

  if (false) {
    await io.write(
      // placeDetailGlbPath?.replace("_detail", "_edited"),
      placeDetailGlbPath?.replace("_detail", ""),
      gltfDocument
    ); // → void
  }
  // const newGlb = await io.writeBinary(gltfDocument); // Document → Uint8Array
}
