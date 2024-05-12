import puppeteer from "puppeteer";
import { GltfFilesData, PlaceInfo } from ".";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getScreenshots";

export async function renderPlaceInBabylon({
  gltfFilesData,
  placeInfo,
}: {
  gltfFilesData: GltfFilesData;
  placeInfo: PlaceInfo;
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
  let launchOptions = {
    headless: false,
    // headless: true,
    // ignoreDefaultArgs: true,
    // executablePath: chromePaths.chrome,
    // args,
    args: [`--window-size=1920,1080`],
    defaultViewport: null,
  };

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();

  await page.addStyleTag({
    content: `body{ margin: 0 !important; width: 1920px; height: 1080px}`,
  });
  // await page.addScriptTag({ url: "https://cdn.babylonjs.com/babylon.js" });
  // await page.addScriptTag({
  //   url: "https://cdn.babylonjs.com/babylon.max.js",
  // });

  // Inject the compiled browser bundle
  await page.addScriptTag({
    path: __dirname + "/browser.bundle.js",
    type: "module",
  });

  // await page.addScriptTag({
  //   url: "https://cdn.babylonjs.com/loaders/babylonjs.loaders.js",
  // });

  const {} =
    (await page.evaluate(
      async (gltfFilesData, placeInfo) => {
        const { handleGltfModel, waitForSceneReady, setUpBabylonScene } = window.pageRefs;

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

  for (const camName of camNames ?? []) {
    await page.evaluate(getCameraColorScreenshot, camName);
    await page.screenshot({ path: `./${camName}.png`, fullPage: true });

    await page.evaluate(getCameraDepthScreenshot, camName);
    await page.screenshot({ path: `./${camName}_depth.png`, fullPage: true });
  }

  // ------------------------------------------------
  // Create videos from pic renders
  // ------------------------------------------------

  // close the browser
  await browser.close();
}
