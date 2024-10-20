import puppeteer, { PuppeteerLaunchOptions } from "puppeteer";
import { CAN } from ".";
import { getCharacterVisibilityData } from "./browser/getCharacterVisibilityData/getCharacterVisiblityData";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getRenderScreenshots";
import delay from "delay";
import { FloatArray, IndicesArray, Nullable } from "@babylonjs/core";
import { Document, NodeIO, Mesh, Primitive, Accessor, Scene, Buffer } from "@gltf-transform/core";
import { GltfFilesData, PlaceInfo } from "./fileInfoHelpers";

export async function setupBrowser() {
  // Reccomended pupeteer args by babylonjs, not used yet
  // Don't disable the gpu
  let args = puppeteer.defaultArgs().filter((arg) => arg !== "--disable-gpu");
  // Run in non-headless mode
  args = args.filter((arg) => arg !== "--headless");
  // Use desktop graphics
  args.push("--use-gl=desktop");
  // args.push(`--window-size=${CAN.vidWidth},${CAN.vidHeight}`);
  args.push(`--window-size=${CAN.viewWidth},${CAN.viewHeight}`);

  // Lanch pupeteer with custom arguments
  let launchOptions: PuppeteerLaunchOptions = {
    headless: false,
    // headless: true,
    // ignoreDefaultArgs: true,
    // executablePath: chromePaths.chrome,
    // args,
    args: [`--window-size=${CAN.viewWidth},${CAN.viewHeight}`],
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

  // TODO use size option here
  await page.addStyleTag({
    content: `body{ margin: 0 !important; width: ${CAN.viewWidth}px; height: ${CAN.viewHeight}px; background-color: black}`,
  });

  // Inject the compiled browser bundle
  await page.addScriptTag({ path: __dirname + "/browser.js", type: "module" });

  return { page, browser };
}
