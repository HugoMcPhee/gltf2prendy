import {
  Camera,
  Constants,
  DumpTools,
  Engine,
  FxaaPostProcess,
  IScreenshotSize,
  Logger,
  PostProcess,
  RenderTargetTexture,
  ShaderStore,
  Texture,
} from "@babylonjs/core";
import { shaders } from "./helpers/shaders";

export function createDepthScreenshot(
  depthRenderTarget: RenderTargetTexture,
  engine: Engine,
  camera: Camera,
  size: { width: number; height: number },
  successCallback?: (data: string) => void,
  mimeType: string = "image/png",
  samples: number = 1,
  antialiasing: boolean = false,
  fileName?: string,
  renderSprites: boolean = false,
  enableStencilBuffer: boolean = false,
  useLayerMask: boolean = true
): void {
  const { height, width } = size;
  const targetTextureSize = { width, height };

  if (!(height && width)) {
    Logger.Error("Invalid 'size' parameter !");
    return;
  }

  const originalSize = {
    width: engine.getRenderWidth(),
    height: engine.getRenderHeight(),
  };
  engine.setSize(width, height); // we need this call to trigger onResizeObservable with the screenshot width/height on all the subsystems that are observing this event and that needs to (re)create some resources with the right dimensions

  const scene = camera.getScene();

  // At this point size can be a number, or an object (according to engine.prototype.createRenderTargetTexture method)
  const texture = new RenderTargetTexture(
    "screenShot",
    targetTextureSize,
    scene,
    false,
    false,
    Constants.TEXTURETYPE_UNSIGNED_INT,
    false,
    Texture.NEAREST_SAMPLINGMODE,
    undefined,
    enableStencilBuffer,
    undefined,
    undefined,
    undefined,
    samples
  );
  texture.renderList = scene.meshes.slice();
  texture.samples = samples;
  texture.renderSprites = renderSprites;
  texture.activeCamera = camera;
  texture.forceLayerMaskCheck = useLayerMask;

  const renderToTexture = () => {
    engine.onEndFrameObservable.addOnce(() => {
      texture
        .readPixels(undefined, undefined, undefined, false)!
        .then((data) => {
          DumpTools.DumpData(
            width,
            height,
            data,
            successCallback as (data: string | ArrayBuffer) => void,
            mimeType,
            fileName,
            true
          );
          texture.dispose();
        });
    });

    // render the RTT
    scene.incrementRenderId();
    scene.resetCachedMaterial();
    texture.render(true);

    // re-render the scene after the camera has been reset to the original camera to avoid a flicker that could occur
    // if the camera used for the RTT rendering stays in effect for the next frame (and if that camera was different from the original camera)
    scene.incrementRenderId();
    scene.resetCachedMaterial();
    engine.setSize(originalSize.width, originalSize.height);
    camera.getProjectionMatrix(true); // Force cache refresh;
    scene.render();
  };

  if (antialiasing) {
    ShaderStore.ShadersStore["viewDepthPixelShader"] =
      shaders.viewDepth.fragment;
    ShaderStore.ShadersStore["viewDepthVertexShader"] =
      shaders.viewDepth.vertex;

    // ShaderStore.ShadersStore["translatedFxaaPixelShader"] = shaders.translatedFxaa.translatedFxaaFragment;
    // ShaderStore.ShadersStore["translatedFxaaVertexShader"] = shaders.translatedFxaa.translatedFxaaVertex;

    const depthPostProcess = new PostProcess(
      "backdropAndDepthShader",
      "viewDepth",
      [],
      ["textureSampler", "SceneDepthTexture"], // textures
      1,
      camera,
      // globalRefs.activeCamera
      // Texture.NEAREST_SAMPLINGMODE // sampling
      // globalRefs.scene.engine // engine,
      // Texture.BILINEAR_SAMPLINGMODE,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "viewDepth"
    );

    depthPostProcess.onApply = (effect) => {
      effect?.setTexture("SceneDepthTexture", depthRenderTarget);
    };
    texture.addPostProcess(depthPostProcess);

    if (!depthPostProcess.getEffect().isReady()) {
      depthPostProcess.getEffect().onCompiled = () => {
        renderToTexture();
      };
    }

    // const fxaaPostProcess = new FxaaPostProcess(
    //   "antialiasing",
    //   1.0,
    //   scene.activeCamera
    // );
    // texture.addPostProcess(fxaaPostProcess);
    // // Async Shader Compilation can lead to none ready effects in synchronous code
    // if (!fxaaPostProcess.getEffect().isReady()) {
    //   fxaaPostProcess.getEffect().onCompiled = () => {
    //     renderToTexture();
    //   };
    // }
    // The effect is ready we can render
    else {
      renderToTexture();
    }
  } else {
    // No need to wait for extra resources to be ready
    renderToTexture();
  }
}
