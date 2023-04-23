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
// import delayNode from "delay";

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

  const placeName = splitFilePath(folderPath).filename;
  console.log("placeName", placeName);

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
    // headless: false,
    headless: true,
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

  const { camNames } =
    (await page.evaluate(async (gltfFilesData) => {
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

      function getFileFromBase64(base64String: string, fileName: string): File {
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
            camera.parent.name = camName + "_nomad";
            camera.parent.id = camName + "_nomad";
          }
        });

        const transformNodes: Record<string, BABYLON.TransformNode> = keyBy(
          container.transformNodes
        );

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

        const camNames = Object.keys(modelFile.cameras);
        for (const camName of camNames) {
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

          if (modelFile) {
            const camNames = Object.keys(modelFile.cameras);
            return { camNames };
          }
        }
        return { camNames: [] };
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

      const { camNames } = await handleGltfModel();

      // load gltf files here (from base64?)
      // gltfFilesData

      return { camNames };
    }, gltfFilesData)) ?? {};

  console.log("camNames");
  console.log(camNames);

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
    if (!camera) return;

    let depthRenderer: null | BABYLON.DepthRenderer = null;

    camera.computeWorldMatrix();
    const cameraDepthFarPoint =
      modelFile.transformNodes[camName + "_depth_far"] ??
      modelFile.transformNodes[camName + "_depth"];
    const cameraDepthNearPoint =
      modelFile.transformNodes[camName + "_depth_near"];

    if (cameraDepthFarPoint) cameraDepthFarPoint.computeWorldMatrix();
    if (cameraDepthNearPoint) cameraDepthNearPoint.computeWorldMatrix();

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
  for (const camName of camNames ?? []) {
    await page.evaluate(getCameraColorScreenshot, camName);
    await page.screenshot({ path: `./${camName}.png`, fullPage: true });

    await page.evaluate(getCameraDepthScreenshot, camName);
    await page.screenshot({ path: `./${camName}_depth.png`, fullPage: true });
  }

  // Get place info, like triggerNames, spotNames, camNames etc
  // await page.evaluate(async () => {
  //   const pageRefs = window.pageRefs;
  // });

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
