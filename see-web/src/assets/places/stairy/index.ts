import modelFile from "./stairy.glb";

import backdropVideoFile from "./backdrops.mp4";
import room_camera_probe_image from "./room_camera_probe.env";
import left_door_camera_probe_image from "./left_door_camera_probe.env";
import downstair_camera_probe_image from "./downstair_camera_probe.env";
import stairs_camera_probe_image from "./stairs_camera_probe.env";

export const probesByCamera = {
  room_camera: room_camera_probe_image,
  left_door_camera: left_door_camera_probe_image,
  downstair_camera: downstair_camera_probe_image,
  stairs_camera: stairs_camera_probe_image,
};
export const segmentTimesByCamera = {
  room_camera: {
    start: 0,
  },
  left_door_camera: {
    start: 1.73333,
  },
  downstair_camera: {
    start: 3.46667,
  },
  stairs_camera: {
    start: 5.2,
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
  light_flicker: 1.6666666666666667,
};
export type SegmentName = keyof typeof segmentDurations;
export const segmentNames = Object.keys(segmentDurations) as SegmentName[];

export const wallNames = [
  "wall_1",
  "wall_2",
  "wall_3",
  "wall_4",
  "wall_5",
  "wall_6",
  "wall_7",
] as const;

export const floorNames = ["floor_1"] as const;

export const triggerNames = ["door_to_basement", "door_to_roof"] as const;

export const spotNames = [
  "start_spot",
  "bottom_stairs_spot",
  "top_stairs_spot",
] as const;

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
