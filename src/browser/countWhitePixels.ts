import { Scene } from "@babylonjs/core";

/**
 * Counts the number of pixels in the rendered scene that are more than 50% white
 * and where the red, green, and blue components are nearly the same.
 * @param scene The Babylon.js scene to render and analyze.
 * @returns The count of such pixels.
 */
export async function countWhitePixels(scene: Scene): Promise<number> {
  // Ensure the scene is rendered to update the canvas
  scene.render();

  const engine = scene.getEngine();
  const width = engine.getRenderWidth();
  const height = engine.getRenderHeight();

  // Read pixels from the canvas (now asynchronous)
  const buffer = (await engine.readPixels(0, 0, width, height)) as Uint8Array;

  let nearWhitePixelCount = 0;
  const threshold = 128; // 50% of the maximum value 255
  const colorDifferenceThreshold = 10; // Allowable difference between R, G, B to consider them as nearly the same

  // Loop through each pixel to count pixels that meet the condition
  for (let i = 0; i < buffer.length; i += 4) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    const a = buffer[i + 3];

    // Check if the pixel is more than 50% white and colors are nearly the same
    if (
      r > threshold &&
      g > threshold &&
      b > threshold &&
      a === 255 &&
      Math.abs(r - g) < colorDifferenceThreshold &&
      Math.abs(g - b) < colorDifferenceThreshold &&
      Math.abs(b - r) < colorDifferenceThreshold
    ) {
      nearWhitePixelCount++;
    }
  }

  return nearWhitePixelCount;
}
