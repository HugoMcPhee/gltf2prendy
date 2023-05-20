#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subtractPoints = void 0;
const BABYLON = __importStar(require("babylonjs"));
const puppeteer_1 = __importDefault(require("puppeteer"));
// import chromePaths from "chrome-paths";
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@gltf-transform/core");
const main_1 = require("@ffmpeg.wasm/main");
const makeTypescriptFiles_1 = require("./makeTypescriptFiles");
// function getDistance(value1: Point3D, value2: Point3D): number {
//   return Math.sqrt(getDistanceSquared(value1, value2));
// }
// function getDistanceSquared(value1: Point3D, value2: Point3D): number {
//   const x = value1.x - value2.x;
//   const y = value1.y - value2.y;
//   const z = value1.z - value2.z;
//   return x * x + y * y + z * z;
// }
function subtractPoints(mainPoint, otherPoint) {
    return {
        x: mainPoint.x - otherPoint.x,
        y: mainPoint.y - otherPoint.y,
        z: mainPoint.z - otherPoint.z,
    };
}
exports.subtractPoints = subtractPoints;
function getVectorSpeedQuick(theVector) {
    return (theVector.x * theVector.x +
        theVector.y * theVector.y +
        theVector.z * theVector.z);
}
function getVectorSpeed(theVector) {
    return Math.sqrt(getVectorSpeedQuick(theVector));
}
function getVectorDistance(vectorA, vectorB) {
    return Math.abs(getVectorSpeed(subtractPoints(vectorA, vectorB)));
}
function splitFilePath(fullPathOriginal) {
    const fullPath = fullPathOriginal.replaceAll("\\", "/");
    const lastSeparatorIndex = fullPath.lastIndexOf("/");
    const directoryPath = fullPath.slice(0, lastSeparatorIndex); // returns '/path/to'
    const lastDirectorySeparatorIndex = directoryPath.lastIndexOf("/");
    const parentFolderName = directoryPath.slice(lastDirectorySeparatorIndex + 1); // returns 'to'
    const filename = fullPath.slice(lastSeparatorIndex + 1); // returns 'file.txt'
    console.log("fullPath");
    console.log(fullPath);
    const lastDotIndex = filename.lastIndexOf(".");
    const filenameWithoutExtension = filename.slice(lastSeparatorIndex + 1, lastDotIndex); // returns 'file'
    const fileExtension = fullPath.slice(lastDotIndex + 1); // returns 'txt'
    return {
        filename,
        directoryPath,
        parentFolderName,
        name: filenameWithoutExtension,
        extension: fileExtension,
    };
}
function splitFolderPath(fullPathOriginal) {
    const fullPath = fullPathOriginal.replaceAll("\\", "/");
    const lastSeparatorIndex = fullPath.lastIndexOf("/");
    const directoryPath = fullPath.slice(0, lastSeparatorIndex); // returns '/path/to'
    const lastDirectorySeparatorIndex = directoryPath.lastIndexOf("/");
    const parentFolderName = directoryPath.slice(lastDirectorySeparatorIndex + 1); // returns 'to'
    const foldername = fullPath.slice(lastSeparatorIndex + 1); // returns 'file.txt'
    return {
        foldername,
        directoryPath,
        parentFolderName,
    };
}
function fromPointArray(pointArray) {
    return { x: pointArray[0], y: pointArray[1], z: pointArray[2] };
}
const ffmpeg = (0, main_1.createFFmpeg)({ log: true });
(async () => {
    // const nodeScriptPath = __dirname;
    const folderPath = process.cwd();
    // type HDRFileProbeData = { name: "probe.hdr" , data: base64String}
    const hdrFilesData = [];
    const gltfFilesData = {};
    // let camNames = [] as string[]; // use evaluate to get camNames
    const HDRMimeType = "image/vnd.radiance";
    const prefixForHDRDataUrl = `data:${HDRMimeType};base64,`;
    const gltfMimeType = "model/gltf-binary";
    const prefixForGltfDataUrl = `data:${gltfMimeType};base64,`;
    let placeDetailGlbFile = null;
    let placeDetailGlbPath = "";
    const folderPathInfo = splitFolderPath(folderPath);
    const placeName = folderPathInfo.foldername;
    console.log("placeName", placeName);
    console.log("folderPathInfo");
    console.log(folderPathInfo);
    // const parentFolder = __dirname + "/../"; // Assuming the parent folder is one level up from the current directory
    const parentFolder = process.cwd() + "/../"; // Assuming the parent folder is one level up from the current directory
    const parentFolderFiles = await promises_1.default.readdir(parentFolder, {
        withFileTypes: true,
    });
    const placeNames = parentFolderFiles
        .filter((file) => file.isDirectory())
        .map((file) => file.name);
    console.log("Place names:", placeNames);
    const placeInfo = {
        camNames: [],
        floorNames: [],
        spotNames: [],
        triggerNames: [],
        wallNames: [],
        placeName,
        soundspotNames: [],
    };
    // checks a file or folder and saves the HDR data if it's a HDR file
    async function checkDirectoryItem(fileName) {
        const filePath = path_1.default.join(folderPath, fileName);
        const isHDRFile = filePath.toLowerCase().includes(".hdr");
        if (isHDRFile) {
            const fileDataUrl = await promises_1.default.readFile(filePath, { encoding: "base64" });
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
            if (isPlaceDetailFile)
                placeDetailGlbPath = filePath;
            if (isPlaceGameFile || isPlaceDetailFile) {
                const fileDataUrl = await promises_1.default.readFile(filePath, { encoding: "base64" });
                const dataUrlWithMimeType = prefixForGltfDataUrl + fileDataUrl;
                if (isPlaceGameFile)
                    gltfFilesData.gameModel = dataUrlWithMimeType;
                if (isPlaceDetailFile)
                    gltfFilesData.detailModel = dataUrlWithMimeType;
            }
            // if (fileName.includes("_detail"))
        }
    }
    const files = await promises_1.default.readdir(folderPath);
    await Promise.all(files.map((fileName) => checkDirectoryItem(fileName)));
    // ------------------------------------------------
    // Read Gltf data
    // ------------------------------------------------
    // Get place info, like triggerNames, spotNames, camNames etc
    // read glft file
    const io = new core_1.NodeIO();
    // Read.
    let gltfDocument = await io.read(placeDetailGlbPath); // → Document
    // document = await io.readBinary(placeDetailGlbFile); // Uint8Array → Document
    console.log("gltfDocument.getRoot().listNodes()");
    const placeRoot = gltfDocument.getRoot();
    const transformNodes = placeRoot.listNodes();
    const transformNodesByName = {};
    const cameraNodesByName = {}; // Camera
    const camerasByName = {};
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
                    console.log("=============================");
                    console.log("=============================");
                    console.log("camNodeChild.listChildren()");
                    console.log(camNodeChild.listChildren().map((item) => item.getName()));
                    // find the cameras, and remove the extra wrapping node for each one
                }
            }
            else if (nodeName === "walls") {
                for (const camNodeChild of nodeChildren) {
                    placeInfo.wallNames.push(camNodeChild.getName());
                }
            }
            else if (nodeName === "triggers") {
                for (const camNodeChild of nodeChildren) {
                    placeInfo.triggerNames.push(camNodeChild.getName());
                }
            }
            else if (nodeName === "spots") {
                for (const camNodeChild of nodeChildren) {
                    placeInfo.spotNames.push(camNodeChild.getName());
                }
            }
            else if (nodeName === "floors") {
                for (const camNodeChild of nodeChildren) {
                    placeInfo.floorNames.push(camNodeChild.getName());
                }
            }
            else if (nodeName === "details") {
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
            let nearDepthPoint = null;
            let farDepthPoint = null;
            // get the camera position
            const camPos = fromPointArray(camNode.getWorldTranslation());
            // check if it has a near depth point
            const nearDepthNode = transformNodesByName[camName + "_depth_near"];
            if (nearDepthNode) {
                nearDepthPoint = fromPointArray(nearDepthNode.getWorldTranslation());
            }
            // check if it has a far depth point
            const farDepthNode = transformNodesByName[camName + "_depth"] ||
                transformNodesByName[camName + "_depth_far"];
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
    await io.write(placeDetailGlbPath?.replace("_detail", "_edited"), gltfDocument); // → void
    // const newGlb = await io.writeBinary(gltfDocument); // Document → Uint8Array
    // ------------------------------------------------
    // Render pics in babylonjs
    // ------------------------------------------------
    if (false) {
        // Reccomended pupeteer args by babylonjs, not used yet
        // Don't disable the gpu
        let args = puppeteer_1.default.defaultArgs().filter((arg) => arg !== "--disable-gpu");
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
        const browser = await puppeteer_1.default.launch(launchOptions);
        const page = await browser.newPage();
        await page.addStyleTag({
            content: `body{ margin: 0 !important; width: 1920px; height: 1080px}`,
        });
        // await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.js" });
        await page.addScriptTag({
            url: "https://cdn.babylonjs.com/babylon.max.js",
        });
        await page.addScriptTag({
            url: "https://cdn.babylonjs.com/loaders/babylonjs.loaders.js",
        });
        const {} = (await page.evaluate(async (gltfFilesData, placeInfo) => {
            // ----------------------------------
            // From chootils    TODO (import in node and transfer to pupeteer page?)
            // ----------------------------------
            function forEach(theArray, whatToDo) {
                const arrayLength = theArray.length;
                for (let index = 0; index < arrayLength; index++) {
                    whatToDo(theArray[index], index);
                }
            }
            function keyBy(theArray, theKey = "name", transformKey, // to allow editing a key before storing it
            excludeName) {
                const newObject = {};
                if (excludeName) {
                    forEach(theArray, (loopedItem) => {
                        const loopedName = loopedItem[theKey];
                        if (loopedName !== excludeName) {
                            const newKey = transformKey?.(loopedItem[theKey]) ?? loopedItem[theKey];
                            newObject[newKey] = loopedItem;
                        }
                    });
                }
                else {
                    forEach(theArray, (loopedItem) => {
                        const newKey = transformKey?.(loopedItem[theKey]) ?? loopedItem[theKey];
                        newObject[newKey] = loopedItem;
                    });
                }
                return newObject;
            }
            window.pageRefs = {
                delay: async (time) => {
                    return new Promise((resolve, reject) => {
                        setTimeout(resolve, time);
                    });
                },
                forEach,
                keyBy,
            };
            const pageRefs = window.pageRefs;
            const { delay } = window.pageRefs;
            if (!delay)
                return;
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
            var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
            const mainLight = new BABYLON.HemisphericLight("light1", BABYLON.Vector3.Up(), scene);
            mainLight.intensity = 0.7;
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);
            engine.setSize(1920, 1080);
            // ----------------------------------
            // Rendering GTLF file pics
            // ----------------------------------
            function getFileFromBase64(base64String, fileName) {
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
            async function loadModelFile({ modelBase64, scene, }) {
                if (!scene || !modelBase64)
                    return;
                const modelAsFile = getFileFromBase64(modelBase64, "exampleFilename.glb");
                const container = await BABYLON.SceneLoader.LoadAssetContainerAsync("model", modelAsFile, scene);
                container.addAllToScene();
                const meshes = keyBy(container.meshes);
                const materials = keyBy(container.materials);
                const textures = keyBy(container.textures);
                let cameras = {};
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
                const transformNodes = keyBy(container.transformNodes);
                console.log("container.transformNodes");
                console.log(container.transformNodes);
                const animationGroups = keyBy(container.animationGroups);
                const skeletons = keyBy(container.skeletons);
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
            async function setUpPlaceForRendering({ modelFile, engine, scene, }) {
                if (!modelFile)
                    return;
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
            async function getBlobAsBinaryString(theBlob) {
                return new Promise(async (resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsBinaryString(theBlob);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject("Error occurred while reading binary string");
                });
                // var blob = new Blob([arrayBuffer], { type: "octet/stream" });
                // const binaryFileResult = await getBlobAsBinaryString(blob);
            }
            await waitForSceneReady();
            await handleGltfModel();
            // load gltf files here (from base64?)
            // gltfFilesData
            return {};
        }, gltfFilesData, placeInfo)) ?? {};
        console.log("placeInfo.camNames");
        console.log(placeInfo.camNames);
        console.log("placeInfo");
        console.log(placeInfo);
        async function getCameraColorScreenshot(camName) {
            // use this whole function inside evaluate
            // remove the old depth postProcess
            window.pageRefs.depthPostProcess?.dispose();
            const { modelFile, delay, engine, scene } = window.pageRefs;
            if (!delay || !modelFile || !engine || !scene)
                return;
            const camera = modelFile.cameras[camName];
            if (!camera)
                return;
            const originalMinZ = camera.minZ;
            const originalMaxZ = camera.maxZ;
            engine.setSize(1920, 1080);
            camera.minZ = 0.1;
            camera.maxZ = 10000;
            scene.activeCamera = camera;
            scene.render();
            // allow some time for rendering
            await delay(50);
            // set cameras view distance back to their original
            camera.minZ = originalMinZ;
            camera.maxZ = originalMaxZ;
        }
        async function getCameraDepthScreenshot(camName) {
            // use this whole function inside evaluate
            const { modelFile, delay, engine, scene } = window.pageRefs;
            if (!delay || !modelFile || !engine || !scene)
                return;
            const camera = modelFile.cameras[camName];
            const cameraNode = modelFile.transformNodes[camName + "_node"];
            if (!camera)
                return;
            if (!cameraNode)
                return;
            let depthRenderer = null;
            camera.computeWorldMatrix();
            const cameraDepthFarPoint = modelFile.transformNodes[camName + "_depth_far"] ??
                modelFile.transformNodes[camName + "_depth"];
            const cameraDepthNearPoint = modelFile.transformNodes[camName + "_depth_near"];
            if (cameraDepthFarPoint)
                cameraDepthFarPoint.computeWorldMatrix();
            if (cameraDepthNearPoint)
                cameraDepthNearPoint.computeWorldMatrix();
            if (cameraNode)
                cameraNode.computeWorldMatrix();
            const originalMinZ = camera.minZ;
            const originalMaxZ = camera.maxZ;
            const depthMinZ = cameraDepthNearPoint
                ? BABYLON.Vector3.Distance(camera.globalPosition, cameraDepthNearPoint.absolutePosition)
                : 1;
            const depthMaxZ = cameraDepthFarPoint
                ? BABYLON.Vector3.Distance(camera.globalPosition, cameraDepthFarPoint.absolutePosition)
                : 100;
            function vector3ToPoint3(value) {
                return { x: value?._x, y: value?._y, z: value?._z };
            }
            if (camName.includes("room")) {
                console.log(camName, "depthMinZ", depthMinZ);
                console.log(camName, "depthMaxZ", depthMaxZ);
                console.log(camName, "camera.position", vector3ToPoint3(camera?.position));
                console.log(camName, "camera.globalPosition", vector3ToPoint3(camera?.globalPosition));
                console.log(camName, "cameraNode.absolutePosition", vector3ToPoint3(cameraNode?.absolutePosition));
                console.log(camName, "cameraDepthNearPoint", cameraDepthNearPoint?.absolutePosition);
                console.log(camName, "cameraDepthFarPoint", cameraDepthFarPoint?.absolutePosition);
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
            window.pageRefs.depthPostProcess = new BABYLON.PostProcess("viewDepthShader", "viewDepth", [], ["textureSampler", "SceneDepthTexture"], // textures
            { width: 1920, height: 1080 }, camera, 
            // globalRefs.activeCamera
            // Texture.NEAREST_SAMPLINGMODE // sampling
            // globalRefs.scene.engine // engine,
            // Texture.BILINEAR_SAMPLINGMODE,
            undefined, undefined, undefined, undefined, undefined, "viewDepth");
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
            await delay(50);
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
        async function writeEnvFileDataToFile(envDataItem) {
            const envFilePath = path_1.default.join(folderPath, envDataItem.name);
            const envData = envDataItem.data;
            if (typeof envData === "string") {
                const nodeFile = Buffer.from(envData, "binary");
                await promises_1.default.writeFile(envFilePath, nodeFile, "binary");
            }
        }
        // close the browser
        await browser.close();
    }
    // find the images and load into ffmpeg stuff
    await ffmpeg.load();
    console.log("ffmpeg loaded");
    const chosenFramerate = 1;
    const frame_image_path = "";
    const videoQuality = 25;
    const keyframes = 1;
    const video_output_path = "";
    async function makeVideoFromPics(isDepthVid) {
        const frameDuration = 1 + 1; // seconds + 1 frame padding (blender duplicates the last frame after rendering to add padding)
        // const makeVideoCommand = `C:\\ffmpeg -framerate ${chosen_framerate} -f image2 -i "${frame_image_path}%04d.png" -vcodec libx264 -crf ${video_quality} -g ${keyframes} -vf "fps=${chosen_framerate},format=yuv420p,scale=1280:720" -y -movflags faststart "${video_output_path}.mp4" -hide_banner -loglevel error`;
        const makeVideoCommand = `C:\\ffmpeg -framerate ${chosenFramerate} -f image2 -i "${frame_image_path}%04d.png" -vcodec libx264 -crf ${videoQuality} -g ${keyframes} -vf "fps=${chosenFramerate},format=yuv420p,scale=1280:720" -y -movflags faststart "${video_output_path}.mp4" -hide_banner -loglevel error`;
        let text = ``;
        for (const camName of placeInfo.camNames) {
            const fileName = `${camName}${isDepthVid ? "_depth" : ""}.png`;
            text += `file ${fileName}` + "\n";
            text += `outpoint ${frameDuration}` + "\n";
            const isLastCam = camName === placeInfo.camNames[placeInfo.camNames.length - 1];
            // for some reason, ffmpeg cuts off the last frame? so we add an extra frame to the end
            if (isLastCam) {
                text += `file ${fileName}` + "\n";
                text += `outpoint ${frameDuration}` + "\n";
            }
            ffmpeg.FS("writeFile", fileName, await (0, main_1.fetchFile)(`./${fileName}`));
        }
        /*
    file 1.png
    outpoint 5
    file 2.png
    outpoint 2
    */
        const textFilePath = path_1.default.join(folderPath, "in.txt"); // NOTE not needed, it will save to the current path
        await promises_1.default.writeFile("in.txt", text);
        console.log("finished writing file");
        // ffmpeg.FS("")
        // ffmpeg.run()
        ffmpeg.FS("writeFile", "in.txt", await (0, main_1.fetchFile)("./in.txt"));
        const vidFileName = `${placeName}${isDepthVid ? "_depth" : "_color"}.mp4`;
        await ffmpeg.run("-f", "concat", "-i", "in.txt", 
        // "file:" + textFilePath,
        // "-framerate",
        // "1",
        "-framerate", `${chosenFramerate}`, 
        // "-c:v",
        // "libx264",
        "-vcodec", "libx264", 
        // "-shortest",
        "-r", `${chosenFramerate}`, 
        // "30",
        // "-pix_fmt",
        // "yuv420p",
        "-vf", `fps=${chosenFramerate},format=yuv420p,scale=1280:720`, "-y", "-movflags", "faststart", "-crf", `${videoQuality}`, "-g", `${keyframes}`, vidFileName);
        // await ffmpeg.run(
        //   "-framerate",
        //   `${chosen_framerate}`,
        //   "-f",
        //   "image2",
        //   "-i",
        //   `${frame_image_path}%04d.png`,
        //   "-vcodec",
        //   "libx264",
        //   "-crf",
        //   `${video_quality}`,
        //   "-g",
        //   `${keyframes}`,
        //   "-vf",
        //   `fps=${chosen_framerate}`,
        //   "format=yuv420p",
        //   "scale=1280:720",
        //   "-y",
        //   "-movflags",
        //   "faststart",
        //   `${video_output_path}.mp4`,
        //   "-hide_banner",
        //   "-loglevel",
        //   "error"
        // );
        ffmpeg.FS("readdir", "./");
        await promises_1.default.writeFile(`./${vidFileName}`, ffmpeg.FS("readFile", vidFileName));
        console.log("finished writing video file");
    }
    await makeVideoFromPics(false);
    await makeVideoFromPics(true);
    const combineColorAndDepthVertically = 
    // Join the color and depth vids
    // NOTE if it uses too much memory, could save each one to a file and combine later :think
    await ffmpeg.run("-i", `${placeName}_color.mp4`, "-i", `${placeName}_depth.mp4`, "-filter_complex", "vstack=inputs=2", "-vcodec", "libx264", "-crf", `${videoQuality}`, "-g", `${keyframes}`, "-y", "-movflags", "faststart", "backdrops.mp4", "-hide_banner", "-loglevel", "error");
    await promises_1.default.writeFile("./backdrops.mp4", ffmpeg.FS("readFile", "backdrops.mp4"));
    ffmpeg.exit();
    const placeTsFile = (0, makeTypescriptFiles_1.makePlaceTypescriptFile)(placeInfo);
    // await fs.writeFile(placeInfo.placeName + ".ts", placeTsFile);
    await promises_1.default.writeFile("index.ts", placeTsFile);
    console.log("finsihed writing place txt file");
    const placesTsFile = (0, makeTypescriptFiles_1.makePlacesTypescriptFile)(placeNames);
    await promises_1.default.writeFile("../places.ts", placesTsFile);
    console.log("finsihed writing places txt file");
    // go to parent folder and write the places file
})();
