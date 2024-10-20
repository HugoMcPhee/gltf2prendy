import { CAN } from ".";
import { getCharacterVisibilityData } from "./browser/getCharacterVisibilityData/getCharacterVisiblityData";
import { getCameraColorScreenshot, getCameraDepthScreenshot } from "./browser/getRenderScreenshots";
import { GltfFilesData, PlaceInfo } from "./fileInfoHelpers";
import { saveVisibilityDataToGtlf } from "./gltfTransformHelpers";
import { setupBrowser } from "./setupBrowser";

export async function renderPlaceInBabylon({
  gltfFilesData,
  placeInfo,
}: // pointsInfo,
{
  gltfFilesData: GltfFilesData;
  placeInfo: PlaceInfo;
  // pointsInfo: PointsInfo;
}) {
  const { page, browser } = await setupBrowser();

  const {} =
    (await page.evaluate(
      async (gltfFilesData, placeInfo) => {
        console.log("Running in browser");

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

  if (CAN.makeVideos) {
    for (const camName of camNames ?? []) {
      await page.evaluate(getCameraColorScreenshot, camName);
      await page.screenshot({ path: `./renders/${camName}.png`, fullPage: true });

      // Maybe something in here sets it up so the other one works better
      await page.evaluate(getCameraDepthScreenshot, camName);
      await page.screenshot({ path: `./renders/${camName}_depth.png`, fullPage: true });
    }
  }

  if (CAN.makeCamCubes) {
    const visibilityData = await page.evaluate(getCharacterVisibilityData, placeInfo);
    if (visibilityData) await saveVisibilityDataToGtlf(visibilityData);
  }

  // ------------------------------------------------
  // Create videos from pic renders
  // ------------------------------------------------

  // close the browser

  await browser.close();
  // setTimeout(async () => {
  //   await browser.close();
  // }, 60000);
}
