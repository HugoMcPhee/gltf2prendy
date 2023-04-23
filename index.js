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
const BABYLON = __importStar(require("babylonjs"));
const puppeteer_1 = __importDefault(require("puppeteer"));
// import chromePaths from "chrome-paths";
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@gltf-transform/core");
function splitFilePath(fullPathOriginal) {
    const fullPath = fullPathOriginal.replaceAll("\\", "/");
    const lastSeparatorIndex = fullPath.lastIndexOf("/");
    const directoryPath = fullPath.slice(0, lastSeparatorIndex); // returns '/path/to'
    const lastDirectorySeparatorIndex = directoryPath.lastIndexOf("/");
    const parentFolderName = directoryPath.slice(lastDirectorySeparatorIndex + 1); // returns 'to'
    const filename = fullPath.slice(lastSeparatorIndex + 1); // returns 'file.txt'
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
    const placeName = splitFilePath(folderPath).filename;
    console.log("placeName", placeName);
    const placeInfo = {
        camNames: [],
        floorNames: [],
        spotNames: [],
        triggerNames: [],
        wallNames: [],
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
    for (const transformNode of transformNodes) {
        const nodeName = transformNode.getName();
        const nodeParent = transformNode.getParentNode();
        const isARootNode = !nodeParent;
        if (isARootNode) {
            const nodeChildren = transformNode.listChildren();
            console.log(nodeName, nodeChildren.length);
            if (nodeName === "cameras") {
                for (const camNodeChild of nodeChildren) {
                    const camName = camNodeChild.getName();
                    placeInfo.camNames.push(camName);
                    // console.log(camNodeChild.getName());
                    // console.log(camNodeChild.listChildren());
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
        }
        // Could check if the node name is walls etc, but ideally check the root children instead
    }
    // console.log(gltfDocument.getRoot().listNodes());
    // get the cam names, trigger names, point names wall names and everything else needed from here
    // NOTE maybe try to save the best lighting frame etc inside gltf custom properties or use a default
    // Edit
    // find the details node and delete it
    // find the cameras, and remove the extra wrapping node for each one
    // udpate the cameras min and maxZ based on the distances (NOTE may need to to this later from babylonjs! and return the values)
    // Write. // NOTE move this to below the babylonjs parts
    // NOTE won't work is _detail is writtern somewhere else, it might be better to build the new path from the placename
    // await io.write(placeDetailGlbPath?.replace("_detail", ""), gltfDocument); // → void
    // const newGlb = await io.writeBinary(gltfDocument); // Document → Uint8Array
    // ------------------------------------------------
    // Render pics in babylonjs
    // ------------------------------------------------
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
    await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.max.js" });
    await page.addScriptTag({
        url: "https://cdn.babylonjs.com/loaders/babylonjs.loaders.js",
    });
    const { camNames } = (await page.evaluate(async (gltfFilesData) => {
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
                    camera.parent.name = camName + "_nomad";
                    camera.parent.id = camName + "_nomad";
                }
            });
            const transformNodes = keyBy(container.transformNodes);
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
        const { camNames } = await handleGltfModel();
        // load gltf files here (from base64?)
        // gltfFilesData
        return { camNames };
    }, gltfFilesData)) ?? {};
    console.log("camNames");
    console.log(camNames);
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
        await delay(100);
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
        if (!camera)
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
        const originalMinZ = camera.minZ;
        const originalMaxZ = camera.maxZ;
        const depthMinZ = cameraDepthNearPoint
            ? BABYLON.Vector3.Distance(camera.globalPosition, cameraDepthNearPoint.absolutePosition)
            : 1;
        const depthMaxZ = cameraDepthFarPoint
            ? BABYLON.Vector3.Distance(camera.globalPosition, cameraDepthFarPoint.absolutePosition)
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
})();
