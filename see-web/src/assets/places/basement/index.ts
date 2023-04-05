import modelFile from "./basement.glb";

import backdropVideoFile from "./backdrops.mp4";
import first_cam_probe_image from "./first_cam_probe.env";
import waterfall_cam_probe_image from "./waterfall_cam_probe.env";

export const probesByCamera = {
  first_cam: first_cam_probe_image,
  waterfall_cam: waterfall_cam_probe_image,
};
export const segmentTimesByCamera = {
  first_cam: {
    start: 0,
  },
  waterfall_cam: {
    start: 1.73333,
  },
} as const;
export type CameraName = keyof typeof probesByCamera &
  keyof typeof segmentTimesByCamera;
export const cameraNames = Object.keys(probesByCamera) as Readonly<
  CameraName[]
>;

export const videoFiles = {
  backdrop: backdropVideoFile,
};
export const segmentDurations = {
  start: 1.6666666666666667,
};
export type SegmentName = keyof typeof segmentDurations;
export const segmentNames = Object.keys(segmentDurations) as SegmentName[];

export const wallNames = ["wall_1"] as const;

export const floorNames = ["floor_1"] as const;

export const triggerNames = ["the_door"] as const;

export const spotNames = ["start_spot"] as const;

export const soundspotNames = [] as const;

export type WallName = typeof wallNames[number];
export type FloorName = typeof floorNames[number];
export type TriggerName = typeof triggerNames[number];
export type SpotName = typeof spotNames[number];

export type SoundspotName = typeof soundspotNames[number];

export const placeInfo = {
  modelFile,
  videoFiles,
  cameraNames,
  segmentDurations,
  segmentNames,
  wallNames,
  floorNames,
  triggerNames,
  spotNames,
  soundspotNames,
  probesByCamera,
  segmentTimesByCamera,
} as const;
