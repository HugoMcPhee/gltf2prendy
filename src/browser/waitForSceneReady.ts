import { Scene } from "@babylonjs/core";

export async function waitForSceneReady(scene: Scene) {
  return new Promise(async (resolve, reject) => {
    scene?.executeWhenReady(() => resolve(null));
  });
}
