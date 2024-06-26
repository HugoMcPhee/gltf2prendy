import puppeteer, { PuppeteerLaunchOptions } from "puppeteer";
import { GltfFilesData, PlaceInfo } from ".";
import { getCharacterVisibilityData } from "./browser/getCharacterVisibilityData/getCharacterVisiblityData";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getRenderScreenshots";

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
    args: [`--window-size=1920,1080`],
    defaultViewport: null,
    userDataDir: "./tmp",
  };

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    request.respond({ status: 200, contentType: "text/html", body: "<html></html>" });
  });

  await page.goto("http://127.0.0.1", { timeout: 0 });

  await page.addStyleTag({
    content: `body{ margin: 0 !important; width: 1920px; height: 1080px; background-color: black}`,
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

  await page.evaluate(getCharacterVisibilityData, placeInfo);

  // ------------------------------------------------
  // Create videos from pic renders
  // ------------------------------------------------

  // close the browser

  await browser.close();
  // setTimeout(async () => {
  //   await browser.close();
  // }, 60000);
}
