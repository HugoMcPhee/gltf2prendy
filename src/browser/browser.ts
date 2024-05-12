// Import libraries if needed, e.g., Babylon.js
import { keyBy } from "chootils/dist/arrays";
import { forEach } from "chootils/dist/loops";
import {
  AbstractMesh,
  AnimationGroup,
  AssetContainer,
  Camera,
  DepthRenderer,
  Engine,
  FreeCamera,
  HemisphericLight,
  PBRMaterial,
  PostProcess,
  Scene,
  SceneLoader,
  ShaderStore,
  Skeleton,
  Texture,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { getFileFromBase64 } from "./getFileFromBase64";
import { handleGltfModel } from "./handleGltfModel";
import { loadModelFile } from "./loadModelFile";
import { setUpBabylonScene } from "./setUpBabylonScene";
import { shaders } from "./shaders";
import { waitForSceneReady } from "./waitForSceneReady";

// Expose everything on window.pageRefs

export const BABYLON = {
  AbstractMesh,
  PBRMaterial,
  Texture,
  TransformNode,
  AnimationGroup,
  Skeleton,
  Camera,
  AssetContainer,
  Engine,
  Scene,
  PostProcess,
  FreeCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  ShaderStore,
  DepthRenderer,
};

export const pageRefs = {
  forEach,
  keyBy,
  getFileFromBase64,
  loadModelFile,
  BABYLON,
  shaders,
  handleGltfModel,
  waitForSceneReady,
  setUpBabylonScene,
  delay: async (time: number) => new Promise((resolve) => setTimeout(resolve, time)),
};

export type PageRefs = typeof pageRefs;

if (typeof window !== "undefined") {
  (window as any).pageRefs = pageRefs;
}
