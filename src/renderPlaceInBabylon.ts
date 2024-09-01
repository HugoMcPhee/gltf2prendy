import puppeteer, { PuppeteerLaunchOptions } from "puppeteer";
import { GltfFilesData, PlaceInfo } from ".";
import { getCharacterVisibilityData } from "./browser/getCharacterVisibilityData/getCharacterVisiblityData";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getRenderScreenshots";
import delay from "delay";
import { FloatArray, IndicesArray, Nullable } from "@babylonjs/core";
import { Document, NodeIO, Mesh, Primitive, Accessor, Scene, Buffer } from "@gltf-transform/core";

// function convertToFloat32Array(data: number[] | Float32Array): Float32Array {
//   if (data instanceof Float32Array) {
//     return data;
//   }
//   return new Float32Array(data);
// }

// function convertToUint32Array(data: number[] | Uint32Array): Uint32Array {
//   if (data instanceof Uint32Array) {
//     return data;
//   }
//   return new Uint32Array(data);
// }

function convertToFloat32Array(data: number[]): Float32Array {
  return new Float32Array(data);
}

function convertToUint32Array(data: number[]): Uint32Array {
  return new Uint32Array(data);
}

function convertToUint16Array(data: number[]): Uint16Array {
  return new Uint16Array(data);
}

async function addGltfMesh(
  doc: Document,
  docScene: Scene,
  buffer: Buffer,
  meshName: string,
  positionsNumbers: number[],
  indicesNumbers: number[],
  normalsNumbers?: number[]
) {
  const positions = new Float32Array(positionsNumbers);
  const indices =
    indicesNumbers.length && Math.max(...indicesNumbers) > 65535
      ? new Uint32Array(indicesNumbers)
      : new Uint16Array(indicesNumbers);
  const normals = new Float32Array(normalsNumbers ?? []);

  const positionAccessor = doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer);

  // Ensuring the correct type for indices (Uint16Array or Uint32Array)
  const indexAccessor = doc
    .createAccessor()
    .setType("SCALAR")
    .setArray(indices instanceof Uint32Array ? new Uint32Array(indices) : new Uint16Array(indices))
    .setBuffer(buffer);

  const prim = doc.createPrimitive().setAttribute("POSITION", positionAccessor).setIndices(indexAccessor);

  // if (normals) {
  //   const normalAccessor = doc.createAccessor().setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buffer);
  //   prim.setAttribute("NORMAL", normalAccessor);
  // }

  const mesh = doc.createMesh().addPrimitive(prim).setName(meshName);
  const node = doc
    .createNode()
    .setMesh(mesh)
    .setName(meshName + "_node");
  docScene.addChild(node); // Corrected to use only one scene

  console.log("Mesh has been added:", meshName);

  return doc;
}

async function createGlbFile(doc: Document, name: string) {
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc); // Use writeBinary to create a .glb file
  // fs.writeFileSync(newName + "_output.glb", glbBuffer);

  require("fs").writeFileSync(name + ".glb", glbBuffer);
  console.log("GLB file has been saved as:", name + ".glb");
}

export async function renderPlaceInBabylon({
  gltfFilesData,
  placeInfo,
}: // pointsInfo,
{
  gltfFilesData: GltfFilesData;
  placeInfo: PlaceInfo;
  // pointsInfo: PointsInfo;
}) {
  // Reccomended pupeteer args by babylonjs, not used yet
  // Don't disable the gpu
  let args = puppeteer.defaultArgs().filter((arg) => arg !== "--disable-gpu");
  // Run in non-headless mode
  args = args.filter((arg) => arg !== "--headless");
  // Use desktop graphics
  args.push("--use-gl=desktop");
  args.push(`--window-size=1000,1000`);

  // Lanch pupeteer with custom arguments
  let launchOptions: PuppeteerLaunchOptions = {
    headless: false,
    // headless: true,
    // ignoreDefaultArgs: true,
    // executablePath: chromePaths.chrome,
    // args,
    args: [`--window-size=1440,1440`],
    defaultViewport: null,
    userDataDir: "./tmp",
    protocolTimeout: 240000,
    timeout: 240000,
  };

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    request.respond({ status: 200, contentType: "text/html", body: "<html></html>" });
  });

  await page.goto("http://127.0.0.1", { timeout: 0 });

  await page.addStyleTag({
    content: `body{ margin: 0 !important; width: 1440px; height: 1440px; background-color: black}`,
  });

  // await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.js" });
  // await page.addScriptTag({
  //   url: "https://cdn.babylonjs.com/babylon.max.js",
  // });

  // Inject the compiled browser bundle
  await page.addScriptTag({
    path: __dirname + "/browser.js",
    type: "module",
  });

  // await page.addScriptTag({
  //   url: "https://cdn.babylonjs.com/loaders/babylonjs.loaders.js",
  // });

  const {} =
    (await page.evaluate(
      async (gltfFilesData, placeInfo) => {
        console.log("Running in browser");
        // await window.pageRefs.delay(1000);
        // console.log(window.pageRefs);

        // await window.pageRefs.delay(10000);

        const { handleGltfModel, waitForSceneReady, setUpBabylonScene, delay } = window.pageRefs;

        await delay(1000);

        setUpBabylonScene();

        const { scene } = window.pageRefs;
        if (!scene) return;

        await waitForSceneReady(scene);
        await handleGltfModel({ gltfFilesData, placeInfo, scene });

        return {};
      },
      gltfFilesData,
      placeInfo
    )) ?? {};

  // Get color and depth renders for all cameras

  const camNames = placeInfo.camNames.slice();
  // Duplicate the first cam name, add it to the start of the array
  // for some reason, the first cam doesn't get all objects rendered, but rendering again fixes it
  camNames.unshift(camNames[0]);

  if (false) {
    for (const camName of camNames ?? []) {
      await page.evaluate(getCameraColorScreenshot, camName);
      await page.screenshot({ path: `./renders/${camName}.png`, fullPage: true });

      // Maybe something in here sets it up so the other one works better
      await page.evaluate(getCameraDepthScreenshot, camName);
      await page.screenshot({ path: `./renders/${camName}_depth.png`, fullPage: true });
    }
  }

  const returnedData = await page.evaluate(getCharacterVisibilityData, placeInfo);

  console.log("------------");
  console.log("------------");
  console.log("------------");
  console.log("------------");
  console.log("------------");
  console.log("returnedData");

  if (returnedData) {
    const doc = new Document();
    const docScene = doc.createScene();
    const docBuffer = doc.createBuffer();

    // console.log(JSON.stringify(returnedData));
    // go through each of the cameras , and their islands, and create a mesh (gltf) for each island
    const camNames = Object.keys(returnedData);
    for (const camName of camNames) {
      const islandNames = Object.keys(returnedData[camName]);
      const islands = returnedData[camName];
      for (const islandName of islandNames) {
        const island = returnedData[camName][islandName];
        const positions = island.positions;
        const indices = island.indices;
        const normals = island.normals;
        const camCubeName = camName + "_" + islandName;

        await addGltfMesh(
          doc,
          docScene,
          docBuffer,
          camCubeName,
          positions as number[],
          indices as number[],
          normals as number[]
        );
      }
    }
    await createGlbFile(doc, "camCubes");
  }

  // await delay(5000);

  // ------------------------------------------------
  // Create videos from pic renders
  // ------------------------------------------------

  // close the browser

  await browser.close();
  // setTimeout(async () => {
  //   await browser.close();
  // }, 60000);
}
