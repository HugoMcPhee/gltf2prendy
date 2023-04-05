// AssetManager.tsx

// NOTE may need to load this with a live import/ require
// OR need to load it as a blob/file in nodejs eventually
import stairyDetailModelFile from "./assets/places/stairy/stairy_detail.glb";
import basementDetailModelFile from "./assets/places/basement/basement_detail.glb";

import {
  CreateScreenshotUsingRenderTarget,
  Scene as BabylonScene,
  Engine as BabylonEngine,
  Camera as BabylonCamera,
  DepthRenderer,
  RenderTargetTexture,
  DumpTools,
  IScreenshotSize,
  Texture,
  PostProcess,
  ShaderStore,
} from "@babylonjs/core";

// import "@babylonjs/inspector";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshAssetTask } from "@babylonjs/core/Misc/assetsManager";
import React, { Suspense, useContext, useEffect, useMemo, useRef } from "react";
import {
  AssetManagerContext,
  AssetManagerContextProvider,
  Engine,
  Scene,
  Task,
  TaskType,
  useAssetManager,
  useBeforeRender,
} from "react-babylonjs";
import { useModelFile } from "./useModelFile";
import delay from "delay";
import { Constants } from "babylonjs";
import { shaders } from "./shaders";

const refs = {
  scene: null as BabylonScene | null,
  engine: null as BabylonEngine | null,
  modelFile: null as null | ReturnType<typeof useModelFile>,
  depthRenderer: null as null | DepthRenderer,
  depthPostProcess: null as null | PostProcess,
};

function splitFilePath(fullPath: string) {
  const lastSeparatorIndex = fullPath.lastIndexOf("/");
  const directoryPath = fullPath.slice(0, lastSeparatorIndex) + "/"; // returns '/path/to'
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
    name: filenameWithoutExtension,
    extension: fileExtension,
  };
}

function renderTextureToFile(
  engine: BabylonEngine,
  scene: BabylonScene,
  texturesss: RenderTargetTexture,
  camera: BabylonCamera,
  size: { width: number; height: number },
  successCallback?: (data: string) => void,
  mimeType: string = "image/png",
  // samples: number = 1,
  // antialiasing: boolean = false,
  fileName?: string
  // renderSprites: boolean = false,
  // enableStencilBuffer: boolean = false,
  // useLayerMask: boolean = true
) {
  const { height, width } = size;
  const targetTextureSize = { width, height };

  // const texture = new RenderTargetTexture(scene,d,d, d,,d,d,,)

  const originalSize = {
    width: engine.getRenderWidth(),
    height: engine.getRenderHeight(),
  };
  engine.setSize(width, height); // we need this call to trigger onResizeObservable with the screenshot width/height on all the subsystems that are observing this event and that needs to (re)create some resources with the right dimensions

  // const scene = camera.getScene();
  const texture = new RenderTargetTexture(
    "screenShot",
    targetTextureSize,
    scene,
    false,
    false,
    Constants.TEXTURETYPE_UNSIGNED_INT,
    false,
    Texture.NEAREST_SAMPLINGMODE,
    undefined,
    false, //enableStencilBuffer,
    undefined,
    undefined,
    undefined
    // samples
  );
  texture.renderList = scene.meshes.slice();
  // texture.samples = samples;
  // texture.renderSprites = renderSprites;
  texture.activeCamera = camera;
  // texture.forceLayerMaskCheck = useLayerMask;

  texture.renderList = scene.meshes.slice();
  // texture.samples = samples;
  // texture.renderSprites = renderSprites;
  texture.activeCamera = camera;
  // texture.forceLayerMaskCheck = useLayerMask;
  // texture.textureType = Constants.TEXTURETYPE_UNSIGNED_INT;
  texture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);

  const renderToTexture = () => {
    engine.onEndFrameObservable.addOnce(() => {
      texture
        .readPixels(undefined, undefined, undefined, false)!
        .then((data) => {
          DumpTools.DumpData(
            width,
            height,
            data,
            successCallback as (data: string | ArrayBuffer) => void,
            mimeType,
            fileName,
            true
          );
          // texture.dispose();
        });
    });

    // render the RTT
    scene.incrementRenderId();
    scene.resetCachedMaterial();
    texture.render(true);

    // re-render the scene after the camera has been reset to the original camera to avoid a flicker that could occur
    // if the camera used for the RTT rendering stays in effect for the next frame (and if that camera was different from the original camera)
    scene.incrementRenderId();
    scene.resetCachedMaterial();
    engine.setSize(originalSize.width, originalSize.height);
    camera.getProjectionMatrix(true); // Force cache refresh;
    scene.render();
  };
  renderToTexture();
}

const baseUrl =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/";

console.log("--------------------");
console.log("stairyDetailModelFile");
console.log(stairyDetailModelFile);

const stairyModelFilePaths = splitFilePath(stairyDetailModelFile);
const basementModelFilePaths = splitFilePath(basementDetailModelFile);

const modelAssetTasks: Task[] = [
  {
    taskType: TaskType.Mesh,
    rootUrl: stairyModelFilePaths.directoryPath,
    sceneFilename: stairyModelFilePaths.filename,
    name: stairyModelFilePaths.name,
  },
  // {
  //   taskType: TaskType.Mesh,
  //   rootUrl: basementModelFilePaths.directoryPath,
  //   sceneFilename: basementModelFilePaths.filename,
  //   name: basementModelFilePaths.name,
  // },
];

const MyFallback = () => {
  const boxRef = useRef<Mesh | null>(null);
  const context = useContext(AssetManagerContext);
  console.log("context in fallback:", context);

  useBeforeRender((scene) => {
    if (boxRef.current) {
      var deltaTimeInMillis = scene.getEngine().getDeltaTime();

      const rpm = 10;
      boxRef.current.rotation.x = Math.PI / 4;
      boxRef.current.rotation.y +=
        (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
    }
  });

  const eventData = context?.lastProgress?.eventData;

  return (
    <>
      <adtFullscreenUi name="ui">
        <rectangle name="rect" height="50px" width="150px">
          <rectangle>
            {eventData !== undefined && (
              <textBlock
                text={`${eventData.totalCount - eventData.remainingCount}/${
                  eventData.totalCount
                }`}
                fontStyle="bold"
                fontSize={20}
                color="white"
              />
            )}
            {eventData === undefined && (
              <textBlock
                text="0/2"
                fontStyle="bold"
                fontSize={20}
                color="white"
              />
            )}
          </rectangle>
        </rectangle>
      </adtFullscreenUi>
      <box ref={boxRef} name="fallback" size={2} />
    </>
  );
};

const MyModels = () => {
  // const assetManagerResult = useAssetManager(modelAssetTasks);

  const modelFile = useModelFile(stairyDetailModelFile, refs.scene);

  refs.modelFile = modelFile;

  useEffect(() => {
    console.log("modelFile");
    console.log(modelFile);

    function downloadBase64File(
      contentType: string,
      base64Data: string,
      fileName: string
    ) {
      const linkSource = `${base64Data}`;
      const downloadLink = document.createElement("a");
      downloadLink.href = linkSource;
      downloadLink.download = fileName;
      downloadLink.click();
    }
    if (refs.scene) {
      // refs.depthRenderer = refs.scene.enableDepthRenderer(null, false, true);
      // refs.depthRenderer = refs.scene.enableDepthRenderer();
      // refs.depthRenderer = new DepthRenderer(
      //   refs.scene,
      //   Constants.TEXTURETYPE_UNSIGNED_INT,
      //   null,
      //   undefined,
      //   Texture.NEAREST_SAMPLINGMODE
      // );
    }

    async function setDifferentCameras() {
      modelFile.transformNodes.walls?.setEnabled(false);
      modelFile.transformNodes.triggers?.setEnabled(false);
      modelFile.transformNodes.floors?.setEnabled(false);

      const camNames = Object.keys(modelFile.cameras);
      for (const camName of camNames) {
        modelFile.transformNodes?.[camName]?.setEnabled(false);
      }
      ShaderStore.ShadersStore["viewDepthPixelShader"] =
        shaders.viewDepth.fragment;
      ShaderStore.ShadersStore["viewDepthVertexShader"] =
        shaders.viewDepth.vertex;
      for (const camName of camNames) {
        const camera = modelFile.cameras[camName];
        camera.computeWorldMatrix();
        const cameraDepthFarPoint =
          modelFile.transformNodes[camName + "_depth_far"] ??
          modelFile.transformNodes[camName + "_depth"];
        const cameraDepthNearPoint =
          modelFile.transformNodes[camName + "_depth_near"];

        if (cameraDepthFarPoint) cameraDepthFarPoint.computeWorldMatrix();
        if (cameraDepthNearPoint) cameraDepthNearPoint.computeWorldMatrix();

        camera.minZ = cameraDepthNearPoint
          ? Vector3.Distance(
              camera.globalPosition,
              cameraDepthNearPoint.absolutePosition
            )
          : 1;

        camera.maxZ = cameraDepthFarPoint
          ? Vector3.Distance(
              camera.globalPosition,
              cameraDepthFarPoint.absolutePosition
            )
          : 100;

        console.log("minZ and maxZ", camera.minZ, camera.maxZ);

        // camera.minZ += 1;
        // camera.maxZ = (camera.maxZ + 1) * 10;
        const { engine, scene } = refs;
        if (camera && engine && scene) {
          scene.enableDepthRenderer;
          refs.depthRenderer = scene.enableDepthRenderer(camera, false);
          // refs.depthRenderer = scene.enableDepthRenderer(camera, true);

          // (refs.depthRenderer as any)._camera = camera;

          console.log("modelFile.transformNodes");
          console.log(modelFile.transformNodes);

          await delay(500);
          // refs.scene?.setActiveCameraByName(camera.name);
          scene.activeCamera = camera;

          refs.depthPostProcess = new PostProcess(
            "viewDepthShader",
            "viewDepth",
            [],
            ["textureSampler", "SceneDepthTexture"], // textures
            1,
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
          const depthRenderTarget = refs.depthRenderer?.getDepthMap();

          if (depthRenderTarget) {
            depthRenderTarget.activeCamera = camera;
          }
          refs.depthPostProcess.onApply = (effect) => {
            if (depthRenderTarget) {
              // console.log(
              //   "depthRenderTargetdepthRenderTargetdepthRenderTarget"
              // );

              effect?.setTexture("SceneDepthTexture", depthRenderTarget);
            }
          };

          scene.render();
          await delay(500);
          CreateScreenshotUsingRenderTarget(
            engine,
            scene?.activeCamera,
            { width: 1920, height: 1080 },
            (screenshotData) => {
              // console.log("screenshotData");
              // console.log(screenshotData);
              // downloadBase64File("png", screenshotData, camera.name + ".png");
            }
          );
          await delay(500);
          // const depthMap = refs.depthRenderer?.getDepthMap();
          // const depthTexture = depthMap?._texture;

          // if (depthMap) {
          console.log("");
          // refs.depthRenderer?.setMaterialForRendering(scene.meshes);

          // renderTextureToFile(
          //   engine,
          //   scene,
          //   depthMap,
          //   scene?.activeCamera,
          //   { width: 300, height: 300 },
          //   (screenshotData) => {
          //     console.log("screenshotData", camera.name + ".png");
          //     console.log(screenshotData);
          //     downloadBase64File("png", screenshotData, camera.name + ".png");
          //   }
          // );
          // }
        }
      }
    }

    setDifferentCameras();
  }, [modelFile]);
  // useEffect(() => {
  //   console.log("Loaded Tasks", assetManagerResult);
  //   const stairyTask = assetManagerResult.taskNameMap[
  //     stairyModelFilePaths.name
  //   ] as MeshAssetTask;
  //   console.log("stairyTask");
  //   console.log(stairyTask);

  //   // stairyTask.loadedMeshes[0].position = new Vector3(2.5, 0, 0);
  //   // stairyTask.loadedMeshes[1].scaling = new Vector3(20, 20, 20);

  //   // const avocadoTask = assetManagerResult.taskNameMap[
  //   //   basementModelFilePaths.name
  //   // ] as MeshAssetTask;
  //   // avocadoTask.loadedMeshes[0].position = new Vector3(-2.5, 0, 0);
  //   // avocadoTask.loadedMeshes[1].scaling = new Vector3(20, 20, 20);
  // });

  return null;
};

const MyScene = () => {
  return (
    <Engine antialias adaptToDeviceRatio canvasId="babylon-canvas">
      <Scene
        onSceneMount={({ scene, canvas }) => {
          refs.scene = scene;
          refs.engine = scene.getEngine();
        }}
      >
        <arcRotateCamera
          name="camera1"
          alpha={Math.PI / 2}
          beta={Math.PI / 2}
          radius={9.0}
          target={Vector3.Zero()}
          minZ={0.001}
        />
        <hemisphericLight
          name="light1"
          intensity={0.7}
          direction={Vector3.Up()}
        />
        {/* <AssetManagerContextProvider> */}
        <Suspense fallback={<MyFallback />}>
          <MyModels />
        </Suspense>
        {/* </AssetManagerContextProvider> */}
      </Scene>
    </Engine>
  );
};

export default function ModelLoaderStory() {
  return (
    <div style={{ flex: 1, display: "flex" }}>
      <MyScene />
    </div>
  );
}
