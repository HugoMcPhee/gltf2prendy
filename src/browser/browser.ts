// Import libraries if needed, e.g., Babylon.js
import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  AssetContainer,
  Camera,
  Color3,
  Color4,
  DepthRenderer,
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PostProcess,
  Quaternion,
  Ray,
  Scene,
  SceneLoader,
  ShaderStore,
  Skeleton,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexBuffer,
  VertexData,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { filterMap, keyBy } from "chootils/dist/arrays";
import { forEach } from "chootils/dist/loops";
import { applyBlackMaterialToDetails } from "./getCharacterVisibilityData/applyBlackMaterialToDetails";
import {
  calculateCameraScore,
  calculateRelativeDistanceScores,
} from "./getCharacterVisibilityData/calculateCameraScore";
import { countWhitePixels } from "./getCharacterVisibilityData/countWhitePixels";
import {
  GridPointMap,
  GridPointsOrganized,
  GridPolyMap,
  IslandPolyIdsByCamera,
  PointIslandsByCamera,
  createVisualMarker,
  generateFloorPoints,
} from "./getCharacterVisibilityData/findPointsOnFloors";
import { createAndExtrudeMesh } from "./getCharacterVisibilityData/makeCamCubes/createAndExtrudeMesh";
import {
  findGridPolyForGridPoint,
  findGridPolysForIsland,
  findPolyTypeFromPoints,
} from "./getCharacterVisibilityData/makeCamCubes/findGridPolysForIsland";
import { findIslandsFromPoints } from "./getCharacterVisibilityData/makeCamCubes/findIslandsFromPoints";
import { generateTrianglesFromPoints } from "./getCharacterVisibilityData/makeCamCubes/generateTrianglesFromPoints";
import { setupFakeCharacter } from "./getCharacterVisibilityData/setupFakeCharacter";
import { getFovScaleFactor } from "./getCharacterVisibilityData/getFovScaleFactor";
import { handleGltfModel } from "./handleGltfModel";
import { loadModelFile } from "./loadModelFile/loadModelFile";
import { setUpBabylonScene } from "./setUpBabylonScene";
import { shaders } from "./shaders";
import { waitForSceneReady } from "./waitForSceneReady";
import { getFileFromBase64 } from "./loadModelFile/getFileFromBase64";
import { debugCamScores } from "./getCharacterVisibilityData/debugCamScores";
import { renderDebugGridPoly } from "./getCharacterVisibilityData/makeCamCubes/renderDebugGridPoly";
import { getTriPointsFromGridPolyIds } from "./getCharacterVisibilityData/makeCamCubes/getTriPointsFromGridPolyIds";
import { createTriMeshFromGridPolyIds } from "./getCharacterVisibilityData/makeCamCubes/createTriMeshFromGridPolyIds";
import { getDidGridSettingsChange } from "./getCharacterVisibilityData/getDidGridSettingsChange";
import { getShouldRecalculateCamScores } from "./getCharacterVisibilityData/getShouldRecalculateCamScores";
import { findOuterEdgesFunctions } from "./getCharacterVisibilityData/makeCamCubes/findOuterEdges";
import { pointsFunctions } from "./utils/points";

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
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  ShaderStore,
  DepthRenderer,
  MeshBuilder,
  Color3,
  Color4,
  StandardMaterial,
  Ray,
  Quaternion,
  Mesh,
  VertexData,
  VertexBuffer,
};
const pageRefsFunctions = {
  handleGltfModel,
  forEach,
  keyBy,
  getFileFromBase64,
  loadModelFile,
  BABYLON,
  shaders,
  waitForSceneReady,
  setUpBabylonScene,
  generateFloorPoints,
  countWhitePixels,
  setupFakeCharacter,
  applyBlackMaterialToDetails,
  getFovScaleFactor,
  calculateCameraScore,
  createVisualMarker,
  calculateRelativeDistanceScores,
  findIslandsFromPoints,
  generateTrianglesFromPoints,
  createAndExtrudeMesh,
  findGridPolyForGridPoint,
  findGridPolysForIsland,
  findPolyTypeFromPoints,
  debugCamScores,
  renderDebugGridPoly,
  getTriPointsFromGridPolyIds,
  createTriMeshFromGridPolyIds,
  getDidGridSettingsChange,
  getShouldRecalculateCamScores,
  filterMap,
  ...findOuterEdgesFunctions,
  ...pointsFunctions,
  delay: async (time: number) => new Promise((resolve) => setTimeout(resolve, time)),
};

export const initialPageRefs = {
  pointsInfo: {},
  gridPointMap: {},
  gridPointsOrganized: {},
  pointIslandsByCamera: {},
  gridPolyMap: {},
  islandPolyIdsByCamera: {},
  GRID_SPACE: 4,
  RESOLUTION_LEVEL: 5,
  CAMCUBE_HEIGHT: 3,
  //
  ...pageRefsFunctions,
  ...pointsFunctions,
};

export type PageRefsFunctions = typeof pageRefsFunctions;

export type PointCamInfo = {
  screenCoverage: number;
  visibilityScore: number;
  characterDistance: number;
  relativeDistanceScore: number; // 0 to 1, where 1 is closest distance
  cameraScore: number; // cameraScore is made of the other scores mostly, but potentially also other influences
};

export type PointsInfo = Record<
  string, // point key, its the x_y_z of the point as a string
  {
    point: [number, number, number]; // x y z
    camInfos: Record<string, PointCamInfo>; // Camera name to cam info
    bestCam: string;
  }
>;

type ModelFile = {
  meshes: Record<string, AbstractMesh>;
  materials: Record<string, PBRMaterial>;
  textures: Record<string, Texture>;
  transformNodes: Record<string, TransformNode>;
  animationGroups: Record<string, AnimationGroup>;
  skeletons: Record<string, Skeleton>;
  cameras: Record<string, Camera>;
  container: AssetContainer;
};

export type PageRefsExtras = {
  // data
  canvas?: HTMLCanvasElement;
  engine?: Engine;
  scene?: Scene;
  freeCamera?: FreeCamera;
  modelFile?: ModelFile;
  depthPostProcess?: PostProcess;
  placeDetailGlbPath?: string;
  fakeCharacter?: Mesh;

  GRID_SPACE: number; // space between grid points, in meters, more space means less points to check
  RESOLUTION_LEVEL: number; // higher resolution means more pixels to check, so more accurate but slower
  CAMCUBE_HEIGHT: number;

  pointsInfo: PointsInfo;
  gridPointMap: GridPointMap;
  gridPointsOrganized: GridPointsOrganized;
  pointIslandsByCamera: PointIslandsByCamera;
  gridPolyMap: GridPolyMap;
  islandPolyIdsByCamera: IslandPolyIdsByCamera;

  // imports for browser
};

export type PageRefs = PageRefsFunctions & PageRefsExtras;

if (typeof window !== "undefined") {
  (window as any).pageRefs = initialPageRefs;
}
