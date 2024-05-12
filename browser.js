"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import libraries if needed, e.g., Babylon.js
// import * as BABYLON from "babylonjs";
const arrays_1 = require("chootils/dist/arrays");
const loops_1 = require("chootils/dist/loops");
const core_1 = require("@babylonjs/core");
require("@babylonjs/loaders/glTF");
// import { AbstractMesh } from "babylonjs/Meshes/abstractMesh";
// import { AnimationGroup } from "babylonjs/Animations/animationGroup";
// import { AssetContainer } from "babylonjs/assetContainer";
// import { Camera } from "babylonjs/Cameras/camera";
// import { DepthRenderer } from "babylonjs/Rendering/depthRenderer";
// import { Engine } from "babylonjs/Engines/engine";
// import { FreeCamera } from "babylonjs/Cameras/freeCamera";
// import { HemisphericLight } from "babylonjs/Lights/hemisphericLight";
// import { PBRMaterial } from "babylonjs/Materials/PBR/pbrMaterial";
// import { PostProcess } from "babylonjs/PostProcesses/postProcess";
// import { Scene } from "babylonjs/scene";
// import { SceneLoader } from "babylonjs/Loading/sceneLoader";
// import { ShaderStore } from "babylonjs/Engines/shaderStore";
// import { Skeleton } from "babylonjs/Bones/skeleton";
// import { Texture } from "babylonjs/Materials/Textures/texture";
// import { TransformNode } from "babylonjs/Meshes/index";
// import { Vector3 } from "babylonjs/Maths/math.vector";
// Expose everything on window.pageRefs
window.pageRefs = {
    forEach: loops_1.forEach,
    keyBy: arrays_1.keyBy,
    delay: async (time) => new Promise((resolve) => setTimeout(resolve, time)),
};
window.BABYLON = {
    AbstractMesh: core_1.AbstractMesh,
    PBRMaterial: core_1.PBRMaterial,
    Texture: core_1.Texture,
    TransformNode: core_1.TransformNode,
    AnimationGroup: core_1.AnimationGroup,
    Skeleton: core_1.Skeleton,
    Camera: core_1.Camera,
    AssetContainer: core_1.AssetContainer,
    Engine: core_1.Engine,
    Scene: core_1.Scene,
    PostProcess: core_1.PostProcess,
    FreeCamera: core_1.FreeCamera,
    Vector3: core_1.Vector3,
    HemisphericLight: core_1.HemisphericLight,
    SceneLoader: core_1.SceneLoader,
    ShaderStore: core_1.ShaderStore,
    DepthRenderer: core_1.DepthRenderer,
};
