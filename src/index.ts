#!/usr/bin/env node

import * as BABYLON from "babylonjs";
import puppeteer from "puppeteer";
// import puppeteer from "puppeteer-core";
import chromePaths from "chrome-paths";

// import chromePaths from "chrome-paths";
import fs from "fs/promises";
import path, { resolve } from "path";
import { log } from "console";
import delay from "delay";
import { NodeIO, Node, Camera, vec3 } from "@gltf-transform/core";
// import delayNode from "delay";
// import { getVectorDistance } from "chootils/dist/speedAngleDistance3d";
import { Point3D } from "chootils/dist/points3d";

// function getDistance(value1: Point3D, value2: Point3D): number {
//   return Math.sqrt(getDistanceSquared(value1, value2));
// }

// function getDistanceSquared(value1: Point3D, value2: Point3D): number {
//   const x = value1.x - value2.x;
//   const y = value1.y - value2.y;
//   const z = value1.z - value2.z;

//   return x * x + y * y + z * z;
// }

export function subtractPoints(
  mainPoint: Point3D,
  otherPoint: Point3D
): Point3D {
  return {
    x: mainPoint.x - otherPoint.x,
    y: mainPoint.y - otherPoint.y,
    z: mainPoint.z - otherPoint.z,
  };
}

function getVectorSpeedQuick(theVector: Point3D): number {
  return (
    theVector.x * theVector.x +
    theVector.y * theVector.y +
    theVector.z * theVector.z
  );
}

function getVectorSpeed(theVector: Point3D): number {
  return Math.sqrt(getVectorSpeedQuick(theVector));
}

function getVectorDistance(vectorA: Point3D, vectorB: Point3D): number {
  return Math.abs(getVectorSpeed(subtractPoints(vectorA, vectorB)));
}

type ModelFile = {
  meshes: Record<string, BABYLON.AbstractMesh>;
  materials: Record<string, BABYLON.PBRMaterial>;
  textures: Record<string, BABYLON.Texture>;
  transformNodes: Record<string, BABYLON.TransformNode>;
  animationGroups: Record<string, BABYLON.AnimationGroup>;
  skeletons: Record<string, BABYLON.Skeleton>;
  cameras: Record<string, BABYLON.Camera>;
  container: BABYLON.AssetContainer;
};

type PageRefs = {
  canvas?: HTMLCanvasElement;
  engine?: BABYLON.Engine;
  scene?: BABYLON.Scene;
  modelFile?: ModelFile;
  depthPostProcess?: BABYLON.PostProcess;
  // functions
  delay?: (time: number) => Promise<void>;
  // from chootils
  forEach?: <T_ArrayItem>(
    theArray: T_ArrayItem[] | Readonly<T_ArrayItem[]>,
    whatToDo: (item: T_ArrayItem, index: number) => any
  ) => void;
  keyBy?: <T_ArrayItem extends Record<any, any>>(
    theArray: T_ArrayItem[],
    theKey: keyof T_ArrayItem,
    transformKey?: (theKey: string) => string, // to allow editing a key before storing it
    excludeName?: string
  ) => Record<string, T_ArrayItem>;
};

declare global {
  interface Window {
    pageRefs: PageRefs;
  }
}

type PlaceInfo = {
  camNames: string[];
  triggerNames: string[];
  spotNames: string[];
  wallNames: string[];
  floorNames: string[];
  // might need extra info about cams etc
};

type HDRFileProbeData = { name: string; data: string };
type EnvFileData = { name: string; data: string | ArrayBuffer | null };
type GltfFilesData = { detailModel?: string; gameModel?: string };

function splitFilePath(fullPathOriginal: string) {
  const fullPath = fullPathOriginal.replaceAll("\\", "/");
  const lastSeparatorIndex = fullPath.lastIndexOf("/");
  const directoryPath = fullPath.slice(0, lastSeparatorIndex); // returns '/path/to'
  const lastDirectorySeparatorIndex = directoryPath.lastIndexOf("/");
  const parentFolderName = directoryPath.slice(lastDirectorySeparatorIndex + 1); // returns 'to'
  const filename = fullPath.slice(lastSeparatorIndex + 1); // returns 'file.txt'

  const lastDotIndex = filename.lastIndexOf(".");
  const filenameWithoutExtension = filename.slice(
    lastSeparatorIndex + 1,
    lastDotIndex
  ); // returns 'file'
  const fileExtension = fullPath.slice(lastDotIndex + 1); // returns 'txt'

  return {
    filename,
    directoryPath,
    parentFolderName,
    name: filenameWithoutExtension,
    extension: fileExtension,
  };
}

function fromPointArray(pointArray: vec3) {
  return { x: pointArray[0], y: pointArray[1], z: pointArray[2] };
}

(async () => {
  // const nodeScriptPath = __dirname;
  const folderPath = process.cwd();

  // type HDRFileProbeData = { name: "probe.hdr" , data: base64String}
  const hdrFilesData = [] as HDRFileProbeData[];
  const gltfFilesData = {} as GltfFilesData;
  // let camNames = [] as string[]; // use evaluate to get camNames

  const HDRMimeType = "image/vnd.radiance";
  const prefixForHDRDataUrl = `data:${HDRMimeType};base64,`;

  const gltfMimeType = "model/gltf-binary";
  const prefixForGltfDataUrl = `data:${gltfMimeType};base64,`;

  let placeDetailGlbFile = null as null | Uint8Array;
  let placeDetailGlbPath = "";

  const placeName = splitFilePath(folderPath).filename;
  console.log("placeName", placeName);

  const placeInfo: PlaceInfo = {
    camNames: [],
    floorNames: [],
    spotNames: [],
    triggerNames: [],
    wallNames: [],
  };

  // checks a file or folder and saves the HDR data if it's a HDR file
  async function checkDirectoryItem(fileName: string) {
    const filePath = path.join(folderPath, fileName);

    const isHDRFile = filePath.toLowerCase().includes(".hdr");
    if (isHDRFile) {
      const fileDataUrl = await fs.readFile(filePath, { encoding: "base64" });
      const dataUrlWithMimeType = prefixForHDRDataUrl + fileDataUrl;
      hdrFilesData.push({ name: fileName, data: dataUrlWithMimeType });
    }

    const isGltfFile = filePath.toLowerCase().includes(".glb");
    if (isGltfFile) {
      //
      console.log("------------------------");
      console.log("fileName", fileName);
      console.log("filePath", filePath);
      console.log("folder name", splitFilePath(filePath).parentFolderName);

      // get the placeName from the folderPath
      // if the filename matches placeName.glb or placeName_detail.glb

      const isPlaceGameFile = fileName === placeName + ".glb";
      const isPlaceDetailFile = fileName === placeName + "_detail.glb";

      if (isPlaceDetailFile) placeDetailGlbPath = filePath;

      if (isPlaceGameFile || isPlaceDetailFile) {
        const fileDataUrl = await fs.readFile(filePath, { encoding: "base64" });
        const dataUrlWithMimeType = prefixForGltfDataUrl + fileDataUrl;

        if (isPlaceGameFile) gltfFilesData.gameModel = dataUrlWithMimeType;
        if (isPlaceDetailFile) gltfFilesData.detailModel = dataUrlWithMimeType;
      }

      // if (fileName.includes("_detail"))
    }
  }

  const files = await fs.readdir(folderPath);
  await Promise.all(files.map((fileName) => checkDirectoryItem(fileName)));

  // ------------------------------------------------
  // Read Gltf data
  // ------------------------------------------------

  // Get place info, like triggerNames, spotNames, camNames etc
  // read glft file

  const io = new NodeIO();

  // Read.
  let gltfDocument = await io.read(placeDetailGlbPath); // → Document
  // document = await io.readBinary(placeDetailGlbFile); // Uint8Array → Document
  console.log("gltfDocument.getRoot().listNodes()");
  const placeRoot = gltfDocument.getRoot();
  const transformNodes = placeRoot.listNodes();

  const transformNodesByName: Record<string, Node> = {};
  const cameraNodesByName: Record<string, Node> = {}; // Camera
  const camerasByName: Record<string, Camera> = {};

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
                console.log(
                  foundCamera.listParents().map((item) => item.getName())
                );
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
          console.log("=============================");
          console.log("=============================");
          console.log("camNodeChild.listChildren()");
          console.log(
            camNodeChild.listChildren().map((item) => item.getName())
          );

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
      const farDepthNode =
        transformNodesByName[camName + "_depth"] ||
        transformNodesByName[camName + "_depth_far"];

      if (farDepthNode) {
        farDepthPoint = fromPointArray(farDepthNode.getWorldTranslation());
      }

      console.log(
        camName,
        "zNear",
        nearDepthPoint ? getVectorDistance(nearDepthPoint, camPos) : 1
      );
      console.log(
        camName,
        "zFar",
        farDepthPoint ? getVectorDistance(farDepthPoint, camPos) : 1
      );
      console.log(camName, "camPos", camPos);
      console.log(camName, "farDepthPoint", farDepthPoint);
      console.log(camName, "nearDepthPoint", nearDepthPoint);

      // get the vector distance using chootils
      foundCamera.setZNear(
        nearDepthPoint ? getVectorDistance(camPos, nearDepthPoint) : 1
      );
      foundCamera.setZFar(
        farDepthPoint ? getVectorDistance(camPos, farDepthPoint) : 100
      );
    }
  }

  // Edit

  // udpate the cameras min and maxZ based on the distances (NOTE may need to to this later from babylonjs! and return the values)

  // Write. // NOTE move this to below the babylonjs parts
  // NOTE won't work is _detail is writtern somewhere else, it might be better to build the new path from the placename
  await io.write(
    placeDetailGlbPath?.replace("_detail", "_edited"),
    gltfDocument
  ); // → void
  // const newGlb = await io.writeBinary(gltfDocument); // Document → Uint8Array

  // ------------------------------------------------
  // Render pics in babylonjs
  // ------------------------------------------------

  // Reccomended pupeteer args by babylonjs, not used yet
  // Don't disable the gpu
  let args = puppeteer.defaultArgs().filter((arg) => arg !== "--disable-gpu");
  // Run in non-headless mode
  args = args.filter((arg) => arg !== "--headless");
  // Use desktop graphics
  args.push("--use-gl=desktop");
  args.push(`--window-size=1000,1000`);

  // Lanch pupeteer with custom arguments
  let launchOptions = {
    headless: false,
    // headless: true,
    // ignoreDefaultArgs: true,
    // executablePath: chromePaths.chrome,
    // args,
    args: [`--window-size=1920,1080`],
    defaultViewport: null,
  };

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();

  await page.addStyleTag({
    content: `body{ margin: 0 !important; width: 1920px; height: 1080px}`,
  });
  // await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.js" });
  await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.max.js" });
  await page.addScriptTag({
    url: "https://cdn.babylonjs.com/loaders/babylonjs.loaders.js",
  });

  const {} =
    (await page.evaluate(
      async (gltfFilesData, placeInfo) => {
        // ----------------------------------
        // From chootils    TODO (import in node and transfer to pupeteer page?)
        // ----------------------------------

        function forEach<T_ArrayItem>(
          theArray: T_ArrayItem[] | Readonly<T_ArrayItem[]>,
          whatToDo: (item: T_ArrayItem, index: number) => any
        ) {
          const arrayLength = theArray.length;
          for (let index = 0; index < arrayLength; index++) {
            whatToDo(theArray[index], index);
          }
        }

        function keyBy<T_ArrayItem extends Record<any, any>>(
          theArray: T_ArrayItem[],
          theKey: keyof T_ArrayItem = "name",
          transformKey?: (theKey: string) => string, // to allow editing a key before storing it
          excludeName?: string
        ) {
          const newObject: Record<string, T_ArrayItem> = {};
          if (excludeName) {
            forEach(theArray, (loopedItem) => {
              const loopedName: string = loopedItem[theKey];
              if (loopedName !== excludeName) {
                const newKey =
                  transformKey?.(loopedItem[theKey]) ?? loopedItem[theKey];
                newObject[newKey] = loopedItem;
              }
            });
          } else {
            forEach(theArray, (loopedItem) => {
              const newKey =
                transformKey?.(loopedItem[theKey]) ?? loopedItem[theKey];
              newObject[newKey] = loopedItem;
            });
          }
          return newObject;
        }

        window.pageRefs = {
          delay: async (time: number) => {
            return new Promise((resolve, reject) => {
              setTimeout(resolve, time);
            });
          },
          forEach,
          keyBy,
        };

        const pageRefs = window.pageRefs;

        const { delay } = window.pageRefs;
        if (!delay) return;

        // ----------------------------------
        // Setting up a babylonjs scene
        // ----------------------------------
        var canvas = document.createElement("canvas");
        canvas.id = "renderCanvas";
        canvas.width = 1920;
        canvas.height = 1080;
        document.body.appendChild(canvas);

        var engine = new BABYLON.Engine(canvas, true, {
          preserveDrawingBuffer: true,
          stencil: true,
          premultipliedAlpha: false,
        });
        pageRefs.engine = engine;

        var scene = new BABYLON.Scene(engine);

        pageRefs.scene = scene;

        var camera = new BABYLON.FreeCamera(
          "camera1",
          new BABYLON.Vector3(0, 5, -10),
          scene
        );

        const mainLight = new BABYLON.HemisphericLight(
          "light1",
          BABYLON.Vector3.Up(),
          scene
        );
        mainLight.intensity = 0.7;

        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(canvas, true);

        engine.setSize(1920, 1080);

        // ----------------------------------
        // Rendering GTLF file pics
        // ----------------------------------

        function getFileFromBase64(
          base64String: string,
          fileName: string
        ): File {
          const editedBase64 = base64String
            .replace("data:", "")
            .replace(/^.+,/, "");

          const byteString = window.atob(editedBase64);
          const byteStringLength = byteString.length;
          const byteArray = new Uint8Array(byteStringLength);
          for (let i = 0; i < byteStringLength; i++) {
            byteArray[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([byteArray], {
            type: "application/octet-stream",
          });
          return new File([blob], fileName, {
            type: "application/octet-stream",
          });
        }

        async function loadModelFile({
          modelBase64,
          scene,
        }: {
          modelBase64: string;
          scene: BABYLON.Scene | null;
        }) {
          if (!scene || !modelBase64) return;

          const modelAsFile = getFileFromBase64(
            modelBase64,
            "exampleFilename.glb"
          );

          const container: BABYLON.AssetContainer =
            await BABYLON.SceneLoader.LoadAssetContainerAsync(
              "model",
              modelAsFile,
              scene
            );

          container.addAllToScene();

          const meshes: Record<string, BABYLON.AbstractMesh> = keyBy(
            container.meshes
          ) as Record<string, BABYLON.AbstractMesh>;
          const materials: Record<string, BABYLON.PBRMaterial> = keyBy(
            container.materials as BABYLON.PBRMaterial[]
          );
          const textures: Record<string, BABYLON.Texture> = keyBy(
            container.textures
          ) as Record<string, BABYLON.Texture>;

          let cameras: Record<string, BABYLON.Camera> = {};
          forEach(container.cameras, (camera) => {
            const camName = camera?.parent?.name ?? camera.name;

            camera.name = camName;
            camera.id = camName;
            cameras[camName] = camera;

            if (camera.parent) {
              // change the transform node name holding the camera,
              // since nomad-sculpt calls it the same as the camera name,
              // but there's already a group called that
              camera.parent.name = camName + "_node";
              camera.parent.id = camName + "_node";
            }
          });

          const transformNodes: Record<string, BABYLON.TransformNode> = keyBy(
            container.transformNodes
          );
          console.log("container.transformNodes");
          console.log(container.transformNodes);

          const animationGroups: Record<string, BABYLON.AnimationGroup> = keyBy(
            container.animationGroups
          );
          const skeletons: Record<string, BABYLON.Skeleton> = keyBy(
            container.skeletons
          );

          return {
            meshes,
            materials,
            textures,
            transformNodes,
            animationGroups,
            skeletons,
            cameras,
            container, // container.removeAllFromScene();
          };
        }

        const shaders = {
          viewDepth: {
            fragment: `
          precision highp float;
          
          /// <summary>
          /// Uniform variables.
          /// <summary>
          uniform highp sampler2D SceneDepthTexture;
          uniform sampler2D textureSampler; // color texture from webgl?
          
          /// <summary>
          /// Varying variables.
          /// <summary>
          varying vec2 vUV;
         
          
          void main(void)
          {  
          vec4 sceneDepthTexture = texture2D(SceneDepthTexture, vUV);
          
          float sceneDepth = sceneDepthTexture.r;	// depth value from DepthRenderer: 0 to 1
              
          vec4 sceneDepthColors = vec4(sceneDepth, sceneDepth, sceneDepth, 1.0);
          gl_FragColor = sceneDepthColors;
          }
              `,
            vertex: `
          // Attributes
          attribute vec2 position;
          
          
          uniform vec2 scale;
          // Output
          varying vec2 vUV;
          
          const vec2 madd = vec2(0.5, 0.5);
          
          
          #define CUSTOM_VERTEX_DEFINITIONS
          
          void main(void) {
          
          #define CUSTOM_VERTEX_MAIN_BEGIN
            
          
            vUV = (position * madd + madd) * scale;
            gl_Position = vec4(position, 0.0, 1.0);
          
          #define CUSTOM_VERTEX_MAIN_END
          }
              `,
          },
        };

        async function setUpPlaceForRendering({
          modelFile,
          engine,
          scene,
        }: {
          modelFile: Awaited<ReturnType<typeof loadModelFile>>;
          scene: BABYLON.Scene | null;
          engine: BABYLON.Engine | null;
        }) {
          if (!modelFile) return;

          modelFile.transformNodes.walls?.setEnabled(false);
          modelFile.transformNodes.triggers?.setEnabled(false);
          modelFile.transformNodes.floors?.setEnabled(false);

          // const camNames = Object.keys(modelFile.cameras);
          for (const camName of placeInfo.camNames) {
            modelFile.transformNodes?.[camName]?.setEnabled(false);
          }

          BABYLON.ShaderStore.ShadersStore["viewDepthPixelShader"] =
            shaders.viewDepth.fragment;
          BABYLON.ShaderStore.ShadersStore["viewDepthVertexShader"] =
            shaders.viewDepth.vertex;
        }

        async function handleGltfModel() {
          if (gltfFilesData.detailModel) {
            const modelFile = await loadModelFile({
              modelBase64: gltfFilesData.detailModel,
              scene: scene,
            });

            window.pageRefs.modelFile = modelFile;

            console.log("modelFile");
            console.log(modelFile);

            console.log("modelFile.transformNodes");
            console.log(modelFile?.transformNodes);

            await setUpPlaceForRendering({ scene, engine, modelFile });
          }
        }

        // ----------------------------------
        // Converting HDR to Env
        // ----------------------------------

        async function waitForSceneReady() {
          return new Promise(async (resolve, reject) => {
            scene?.executeWhenReady(() => {
              resolve(null);
            });
          });
        }
        async function getBlobAsBinaryString(
          theBlob: Blob
        ): Promise<string | ArrayBuffer | null> {
          return new Promise(async (resolve, reject) => {
            const reader = new FileReader();
            reader.readAsBinaryString(theBlob);
            reader.onload = () => resolve(reader.result);
            reader.onerror = () =>
              reject("Error occurred while reading binary string");
          });
          // var blob = new Blob([arrayBuffer], { type: "octet/stream" });
          // const binaryFileResult = await getBlobAsBinaryString(blob);
        }

        await waitForSceneReady();

        await handleGltfModel();

        // load gltf files here (from base64?)
        // gltfFilesData

        return {};
      },
      gltfFilesData,
      placeInfo
    )) ?? {};

  console.log("placeInfo.camNames");
  console.log(placeInfo.camNames);
  console.log("placeInfo");
  console.log(placeInfo);

  async function getCameraColorScreenshot(camName: string) {
    // use this whole function inside evaluate

    // remove the old depth postProcess
    window.pageRefs.depthPostProcess?.dispose();

    const { modelFile, delay, engine, scene } = window.pageRefs;
    if (!delay || !modelFile || !engine || !scene) return;
    const camera = modelFile.cameras[camName];
    if (!camera) return;

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    engine.setSize(1920, 1080);

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;

    scene.render();
    // allow some time for rendering
    await delay(100);

    // set cameras view distance back to their original
    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;
  }

  async function getCameraDepthScreenshot(camName: string) {
    // use this whole function inside evaluate

    const { modelFile, delay, engine, scene } = window.pageRefs;
    if (!delay || !modelFile || !engine || !scene) return;

    const camera = modelFile.cameras[camName];
    const cameraNode = modelFile.transformNodes[camName + "_node"];
    if (!camera) return;
    if (!cameraNode) return;

    let depthRenderer: null | BABYLON.DepthRenderer = null;

    camera.computeWorldMatrix();
    const cameraDepthFarPoint =
      modelFile.transformNodes[camName + "_depth_far"] ??
      modelFile.transformNodes[camName + "_depth"];
    const cameraDepthNearPoint =
      modelFile.transformNodes[camName + "_depth_near"];

    if (cameraDepthFarPoint) cameraDepthFarPoint.computeWorldMatrix();
    if (cameraDepthNearPoint) cameraDepthNearPoint.computeWorldMatrix();
    if (cameraNode) cameraNode.computeWorldMatrix();

    const originalMinZ = camera.minZ;
    const originalMaxZ = camera.maxZ;

    const depthMinZ = cameraDepthNearPoint
      ? BABYLON.Vector3.Distance(
          camera.globalPosition,
          cameraDepthNearPoint.absolutePosition
        )
      : 1;

    const depthMaxZ = cameraDepthFarPoint
      ? BABYLON.Vector3.Distance(
          camera.globalPosition,
          cameraDepthFarPoint.absolutePosition
        )
      : 100;

    function vector3ToPoint3(value: BABYLON.Vector3) {
      return { x: value?._x, y: value?._y, z: value?._z };
    }

    if (camName.includes("room")) {
      console.log(camName, "depthMinZ", depthMinZ);
      console.log(camName, "depthMaxZ", depthMaxZ);
      console.log(
        camName,
        "camera.position",
        vector3ToPoint3(camera?.position)
      );
      console.log(
        camName,
        "camera.globalPosition",
        vector3ToPoint3(camera?.globalPosition)
      );
      console.log(
        camName,
        "cameraNode.absolutePosition",
        vector3ToPoint3(cameraNode?.absolutePosition)
      );
      console.log(
        camName,
        "cameraDepthNearPoint",
        cameraDepthNearPoint?.absolutePosition
      );
      console.log(
        camName,
        "cameraDepthFarPoint",
        cameraDepthFarPoint?.absolutePosition
      );
      // await delay(15000);
    }
    engine.setSize(1920, 1080);

    camera.minZ = 0.1;
    camera.maxZ = 10000;
    scene.activeCamera = camera;

    camera.minZ = depthMinZ;
    camera.maxZ = depthMaxZ;

    scene.enableDepthRenderer;
    depthRenderer = scene.enableDepthRenderer(camera, false);

    scene.activeCamera = camera;

    window.pageRefs.depthPostProcess = new BABYLON.PostProcess(
      "viewDepthShader",
      "viewDepth",
      [],
      ["textureSampler", "SceneDepthTexture"], // textures
      { width: 1920, height: 1080 },
      camera,
      // globalRefs.activeCamera
      // Texture.NEAREST_SAMPLINGMODE // sampling
      // globalRefs.scene.engine // engine,
      // Texture.BILINEAR_SAMPLINGMODE,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "viewDepth"
    );
    const depthRenderTarget = depthRenderer?.getDepthMap();

    if (depthRenderTarget) {
      depthRenderTarget.activeCamera = camera;
    }
    window.pageRefs.depthPostProcess.onApply = (effect) => {
      if (depthRenderTarget) {
        effect?.setTexture("SceneDepthTexture", depthRenderTarget);
      }
    };

    scene.render();

    // allow some time for rendering
    await delay(100);

    // set cameras view distance back to their original
    camera.minZ = originalMinZ;
    camera.maxZ = originalMaxZ;
  }

  // Get color and depth renders for all cameras
  for (const camName of placeInfo.camNames ?? []) {
    await page.evaluate(getCameraColorScreenshot, camName);
    await page.screenshot({ path: `./${camName}.png`, fullPage: true });

    await page.evaluate(getCameraDepthScreenshot, camName);
    await page.screenshot({ path: `./${camName}_depth.png`, fullPage: true });
  }

  // ------------------------------------------------
  // Create videos from pic renders
  // ------------------------------------------------

  async function writeEnvFileDataToFile(envDataItem: EnvFileData) {
    const envFilePath = path.join(folderPath, envDataItem.name);
    const envData = envDataItem.data;
    if (typeof envData === "string") {
      const nodeFile = Buffer.from(envData, "binary");
      await fs.writeFile(envFilePath, nodeFile, "binary");
    }
  }

  // close the browser
  await browser.close();
})();
