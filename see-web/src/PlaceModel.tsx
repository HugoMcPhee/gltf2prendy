// AssetManager.tsx

// NOTE may need to load this with a live import/ require
// OR need to load it as a blob/file in nodejs eventually
import stairyDetailModelFile from "./assets/places/stairy/stairy_detail.glb";

import {
  Engine as BabylonEngine,
  Scene as BabylonScene,
} from "@babylonjs/core";

// import "@babylonjs/inspector";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Suspense, useContext, useEffect, useRef } from "react";
import {
  AssetManagerContext,
  Engine,
  Scene,
  useBeforeRender,
} from "react-babylonjs";
import { loadGltfFileAsBase64, loadModelFile } from "./helpers/loadModelFile";
import renderPics from "./helpers/renderPics";

const refs = {
  scene: null as BabylonScene | null,
  engine: null as BabylonEngine | null,
};

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

  // const modelFile = useModelFile(stairyDetailModelFile, refs.scene);

  useEffect(() => {
    async function asyncEffect() {
      const modelBase64 = await loadGltfFileAsBase64(stairyDetailModelFile);

      console.log("----------------");
      console.log("modelBase64");
      console.log(modelBase64);
      console.log(typeof modelBase64);

      const modelFile = await loadModelFile({
        modelPath: stairyDetailModelFile,
        scene: refs.scene,
      });
      console.log("modelFile");
      console.log(modelFile);

      console.log("modelFile.transformNodes");
      console.log(modelFile?.transformNodes);

      renderPics({ engine: refs.engine, scene: refs.scene, modelFile });
    }

    asyncEffect();
  }, [stairyDetailModelFile]);
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
