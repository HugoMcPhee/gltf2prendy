#!/usr/bin/env node

import * as BABYLON from "babylonjs";
// import puppeteer from "puppeteer";
import puppeteer from "puppeteer-core";
import chromePaths from "chrome-paths";

// import chromePaths from "chrome-paths";
import fs from "fs/promises";
import path, { resolve } from "path";
import { log } from "console";
// import delayNode from "delay";

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

  const probeResolution = process.argv[2] ? parseInt(process.argv[2], 10) : 256;
  // probeResolution = parseInt(probeResolution, 10);

  // type HDRFileProbeData = { name: "probe.hdr" , data: base64String}
  const hdrFilesData = [] as HDRFileProbeData[];
  const gltfFilesData = {} as GltfFilesData;

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

  // console.log("gltfFilesData");
  // console.log(gltfFilesData);

  // Don't disable the gpu
  let args = puppeteer.defaultArgs().filter((arg) => arg !== "--disable-gpu");
  // Run in non-headless mode
  args = args.filter((arg) => arg !== "--headless");
  // Use desktop graphics
  args.push("--use-gl=desktop");
  args.push(`--window-size=1000,1000`);
  // Lanch pupeteer with custom arguments
  // const browser = await puppeteer.launch({
  //   headless: false,
  //   ignoreDefaultArgs: true,
  //   args,
  // });

  let launchOptions = {
    // headless: true,
    headless: false,
    // ignoreDefaultArgs: true,
    executablePath: chromePaths.chrome,
    // args,
    args: [`--window-size=1920,1080`],
    defaultViewport: null,
  };

  const browser = await puppeteer.launch(launchOptions);
  // const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.addStyleTag({
    content: `body{ margin: 0 !important; width: 1920px; height: 1080px}`,
  });
  // await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.js" });
  await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.max.js" });
  await page.addScriptTag({
    url: "https://cdn.babylonjs.com/loaders/babylonjs.loaders.js",
  });

  // page.exposeFunction("delay", delay);

  // await page.screenshot({ path: `./public/${camName}.png` });

  // const takeScreenshot = page.screenshot;
  // page.exposeFunction("takeScreenshot", takeScreenshot);

  console.log("found");
  console.log(hdrFilesData.map((item) => item.name));
  console.log(`converting to env files with a size of ${probeResolution}`);

  // function logSomethingToConsole(thing: string | any) {
  //   console.log(`logging something to console`);
  //   console.log(thing);
  // }

  const envFilesData = await page.evaluate(
    async (hdrFilesData, probeResolution, gltfFilesData) => {
      // type EnvFileData = { name: "probe.hdr" , data: binaryString}
      const envFilesData = [] as EnvFileData[];

      // ----------------------------------
      // Setting up a babylonjs scene
      // ----------------------------------
      var canvas = document.createElement("canvas");
      canvas.id = "renderCanvas";
      canvas.width = 1920;
      canvas.height = 1080;
      document.body.appendChild(canvas);

      // logSomethingToConsole("hello");

      var engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        premultipliedAlpha: false,
      });
      var scene = new BABYLON.Scene(engine);
      // logSomethingToConsole(scene);
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
      // From chootils
      // TODO (import in node and transfer to pupeteer page?)
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

      // ----------------------------------
      // Other helpers
      // ----------------------------------

      async function delay(time: number) {
        return new Promise((resolve, reject) => {
          setTimeout(resolve, time);
        });
      }

      // ----------------------------------
      // Rendering GTLF file pics
      // ----------------------------------

      function getFileFromBase64(base64String: string, fileName: string): File {
        console.log("base64String");
        console.log(base64String);

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
        return new File([blob], fileName, { type: "application/octet-stream" });
      }

      async function loadModelFile({
        modelBase64,
        scene,
      }: {
        modelBase64: string;
        scene: BABYLON.Scene | null;
      }) {
        if (!scene) return;
        // const modelAsBase64 = await loadGltfFileAsBase64(modelPath);
        // const modelAsBase64 = await loadGltfFileAsBase64(modelPath);
        // const modelAsBase64 = gltfFilesData.detailModel;
        const modelAsBase64 = modelBase64;
        const modelAsBase64Edited = modelAsBase64;
        if (!modelAsBase64Edited) return;
        const modelAsFile = getFileFromBase64(
          modelAsBase64Edited,
          "exampleFilename.glb"
        );

        const container: BABYLON.AssetContainer =
          await BABYLON.SceneLoader.LoadAssetContainerAsync(
            "model",
            modelAsFile,
            scene
          );

        // const container: AssetContainer = await SceneLoader.LoadAssetContainerAsync(
        //   modelPath,
        //   undefined,
        //   scene
        // );
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
            // since nomad calls it the same as the camera name,
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
      
          #ifdef GL_ES
            precision mediump float;
          #endif
      
          // #ifdef LOGARITHMICDEPTH
          //   gl_FragDepthEXT = log2(vFragmentDepth) * logarithmicDepthConstant * 0.5;
          // #endif
          
          
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
          
          // #ifdef LOGARITHMICDEPTH
          //   vFragmentDepth = 1.0 + gl_Position.w;
          //   gl_Position.z = log2(max(0.000001, vFragmentDepth)) * logarithmicDepthConstant;
          // #endif
          
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

      type RendersByCamName = Record<
        string,
        { colorPic?: string; depthPic?: string }
      >;

      async function renderPics({
        modelFile,
        engine,
        scene,
      }: {
        modelFile: Awaited<ReturnType<typeof loadModelFile>>;
        scene: BABYLON.Scene | null;
        engine: BABYLON.Engine | null;
      }) {
        console.log("---------------------------");
        console.log("---------------------------");
        console.log("---------------------------");
        console.log("renderPics");

        if (!modelFile) return;
        const cameraRendersByName: RendersByCamName = {};

        let depthRenderer: null | BABYLON.DepthRenderer = null;
        let depthPostProcess: null | BABYLON.PostProcess = null;

        modelFile.transformNodes.walls?.setEnabled(false);
        modelFile.transformNodes.triggers?.setEnabled(false);
        modelFile.transformNodes.floors?.setEnabled(false);

        const camNames = Object.keys(modelFile.cameras);
        for (const camName of camNames) {
          modelFile.transformNodes?.[camName]?.setEnabled(false);
        }
        console.log("got to here 1");

        BABYLON.ShaderStore.ShadersStore["viewDepthPixelShader"] =
          shaders.viewDepth.fragment;
        BABYLON.ShaderStore.ShadersStore["viewDepthVertexShader"] =
          shaders.viewDepth.vertex;
        console.log("got to here 2");
        console.log(camNames);
        for (const camName of camNames) {
          const camera = modelFile.cameras[camName];
          cameraRendersByName[camName] = {};

          console.log("got to here 3", camName);
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

          if (!camera || !engine || !scene) break;

          engine.setSize(1920, 1080);

          camera.minZ = 0.1;
          camera.maxZ = 10000;
          scene.activeCamera = camera;

          scene.render();
          console.log("before first delay");

          await delay(250);
          console.log("after first delay");

          function makeScreenShotAsync(
            engine: BABYLON.Engine,
            camera: BABYLON.Camera
          ) {
            return new Promise<string | undefined>((resolve, reject) => {
              if (camera) {
                BABYLON.CreateScreenshotUsingRenderTarget(
                  engine,
                  camera,
                  { width: 1920, height: 1080 },
                  (result) => {
                    resolve(result);
                  }
                );
              } else {
                resolve(undefined);
              }
            });
          }

          // const colorScreenshotData =
          //   await BABYLON.CreateScreenshotUsingRenderTargetAsync(
          //     engine,
          //     scene?.activeCamera,
          //     { width: 1920, height: 1080 }
          //   );

          console.log("after screenshot");

          // cameraRendersByName[camName].colorPic = colorScreenshotData;
          // downloadBase64Image("png", screenshotData, camera.name + ".png");

          await delay(250);
          console.log("after storic color pic");
          camera.minZ = depthMinZ;
          camera.maxZ = depthMaxZ;

          scene.enableDepthRenderer;
          depthRenderer = scene.enableDepthRenderer(camera, false);

          // refs.scene?.setActiveCameraByName(camera.name);
          scene.activeCamera = camera;

          console.log("before depth post process");
          // depthPostProcess = new BABYLON.PostProcess(
          //   "viewDepthShader",
          //   "viewDepth",
          //   [],
          //   ["textureSampler", "SceneDepthTexture"], // textures
          //   { width: 1920, height: 1080 },
          //   camera,
          //   // globalRefs.activeCamera
          //   // Texture.NEAREST_SAMPLINGMODE // sampling
          //   // globalRefs.scene.engine // engine,
          //   // Texture.BILINEAR_SAMPLINGMODE,
          //   undefined,
          //   undefined,
          //   undefined,
          //   undefined,
          //   undefined,
          //   "viewDepth"
          // );
          const depthRenderTarget = depthRenderer?.getDepthMap();

          if (depthRenderTarget) {
            depthRenderTarget.activeCamera = camera;
          }
          // depthPostProcess.onApply = (effect) => {
          //   if (depthRenderTarget) {
          //     effect?.setTexture("SceneDepthTexture", depthRenderTarget);
          //   }
          // };

          console.log("before render");

          scene.render();
          await delay(250);
          console.log("before depth screenshot");
          // const depthScreenshotData =
          //   await BABYLON.CreateScreenshotUsingRenderTargetAsync(
          //     engine,
          //     scene?.activeCamera,
          //     { width: 1920, height: 1080 }
          //   );
          // cameraRendersByName[camName].depthPic = depthScreenshotData;

          // const depthScreenshotData = await makeScreenShotAsync(
          //   engine,
          //   scene?.activeCamera
          // );
          // const depthScreenshotData =
          //   await BABYLON.CreateScreenshotUsingRenderTargetAsync(
          //     engine,
          //     scene?.activeCamera,
          //     { width: 1920, height: 1080 }
          //   );
          // cameraRendersByName[camName].depthPic = depthScreenshotData;

          // await takeScreenshot({ path: `./public/${camName}_depth.png` });

          // downloadBase64Image(
          //   "png",
          //   screenshotData,
          //   camera.name + "_depth" + ".png"
          // );

          await delay(250);

          // depthPostProcess.dispose();

          camera.minZ = originalMinZ;
          camera.maxZ = originalMaxZ;
        }
        console.log("after camNames");

        return cameraRendersByName;
      }

      async function handleGltfModel() {
        if (gltfFilesData.detailModel) {
          console.log("---------------------");
          console.log("camera file");
          const modelFile = await loadModelFile({
            modelBase64: gltfFilesData.detailModel,
            scene: scene,
          });
          console.log("modelFile");
          console.log(modelFile);

          console.log("modelFile.transformNodes");
          console.log(modelFile?.transformNodes);

          const cameraRendersByName = await renderPics({
            scene,
            engine,
            modelFile,
          });

          console.log("cameraRendersByName");
          console.log(cameraRendersByName);
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
      }
      async function getEnvFileBinaryStringFromHdrString(hdrString: string) {
        const environment = new BABYLON.HDRCubeTexture(
          hdrString,
          scene,
          probeResolution,
          false,
          true,
          false,
          true
        );
        await waitForSceneReady();
        const arrayBuffer =
          await BABYLON.EnvironmentTextureTools.CreateEnvTextureAsync(
            environment
          );
        var blob = new Blob([arrayBuffer], { type: "octet/stream" });
        const binaryFileResult = await getBlobAsBinaryString(blob);
        environment.dispose();
        return binaryFileResult;
      }

      async function getEnvFileDataFromHdrFileData(
        hdrDataItem: HDRFileProbeData
      ) {
        const newData = await getEnvFileBinaryStringFromHdrString(
          hdrDataItem.data
        );
        return {
          data: newData,
          name: hdrDataItem.name.replace(".hdr", ".env"),
        };
      }

      await waitForSceneReady();

      await handleGltfModel();

      for (const hdrFileData of hdrFilesData) {
        const envFileData = await getEnvFileDataFromHdrFileData(hdrFileData);
        envFilesData.push(envFileData);
      }

      // load gltf files here (from base64?)
      // gltfFilesData

      return envFilesData;
    },
    hdrFilesData,
    probeResolution,
    gltfFilesData
  );

  async function writeEnvFileDataToFile(envDataItem: EnvFileData) {
    const envFilePath = path.join(folderPath, envDataItem.name);
    const envData = envDataItem.data;
    if (typeof envData === "string") {
      const nodeFile = Buffer.from(envData, "binary");
      await fs.writeFile(envFilePath, nodeFile, "binary");
    }
  }

  await Promise.all(
    envFilesData.map((envFileData) => writeEnvFileDataToFile(envFileData))
  );

  await page.screenshot({ path: `./${"testCam"}.png`, fullPage: true });

  // close the browser
  await browser.close();
})();
