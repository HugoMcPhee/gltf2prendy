import puppeteer, { PuppeteerLaunchOptions } from "puppeteer";
import { CAN } from ".";
import {
  getCharacterVisibilityData,
  VisibilityData,
} from "./browser/getCharacterVisibilityData/getCharacterVisiblityData";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getRenderScreenshots";
import delay from "delay";
import { FloatArray, IndicesArray, Nullable } from "@babylonjs/core";
import { Document, NodeIO, Mesh, Primitive, Accessor, Scene, Buffer } from "@gltf-transform/core";
import { GltfFilesData, PlaceInfo } from "./fileInfoHelpers";
import { setupBrowser } from "./setupBrowser";

// function convertToFloat32Array(data: number[] | Float32Array): Float32Array {
//   if (data instanceof Float32Array) {
//     return data;
//   }
//   return new Float32Array(data);
// }

// function convertToUint32Array(data: number[] | Uint32Array): Uint32Array {
//   if (data instanceof Uint32Array) {
//     return data;
//   }
//   return new Uint32Array(data);
// }

function convertToFloat32Array(data: number[]): Float32Array {
  return new Float32Array(data);
}

function convertToUint32Array(data: number[]): Uint32Array {
  return new Uint32Array(data);
}

function convertToUint16Array(data: number[]): Uint16Array {
  return new Uint16Array(data);
}

export async function addGltfMeshToDoc(
  doc: Document,
  docScene: Scene,
  buffer: Buffer,
  meshName: string,
  positionsNumbers: number[],
  indicesNumbers: number[],
  normalsNumbers?: number[]
) {
  const positions = new Float32Array(positionsNumbers);
  const indices =
    indicesNumbers.length && Math.max(...indicesNumbers) > 65535
      ? new Uint32Array(indicesNumbers)
      : new Uint16Array(indicesNumbers);
  const normals = new Float32Array(normalsNumbers ?? []);

  const positionAccessor = doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer);

  // Ensuring the correct type for indices (Uint16Array or Uint32Array)
  const indexAccessor = doc
    .createAccessor()
    .setType("SCALAR")
    .setArray(indices instanceof Uint32Array ? new Uint32Array(indices) : new Uint16Array(indices))
    .setBuffer(buffer);

  const prim = doc.createPrimitive().setAttribute("POSITION", positionAccessor).setIndices(indexAccessor);

  // if (normals) {
  //   const normalAccessor = doc.createAccessor().setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buffer);
  //   prim.setAttribute("NORMAL", normalAccessor);
  // }

  const mesh = doc.createMesh().addPrimitive(prim).setName(meshName);
  const node = doc
    .createNode()
    .setMesh(mesh)
    .setName(meshName + "_node");
  docScene.addChild(node); // Corrected to use only one scene

  console.log("Mesh has been added:", meshName);

  return doc;
}

export async function createGlbFile(doc: Document, name: string) {
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc); // Use writeBinary to create a .glb file
  // fs.writeFileSync(newName + "_output.glb", glbBuffer);

  require("fs").writeFileSync(name + ".glb", glbBuffer);
  console.log("GLB file has been saved as:", name + ".glb");
}

export async function saveVisibilityDataToGtlf(visibilityData: VisibilityData) {
  const doc = new Document();
  const docScene = doc.createScene();
  const docBuffer = doc.createBuffer();

  // console.log(JSON.stringify(visibilityData));
  // go through each of the cameras , and their islands, and create a mesh (gltf) for each island
  const camNames = Object.keys(visibilityData);
  for (const camName of camNames) {
    const islandNames = Object.keys(visibilityData[camName]);
    const islands = visibilityData[camName];
    for (const islandName of islandNames) {
      const island = visibilityData[camName][islandName];
      const positions = island.positions;
      const indices = island.indices;
      const normals = island.normals;
      const camCubeName = camName + "_" + islandName;

      await addGltfMeshToDoc(
        doc,
        docScene,
        docBuffer,
        camCubeName,
        positions as number[],
        indices as number[],
        normals as number[]
      );
    }
  }
  await createGlbFile(doc, "camCubes");
}
