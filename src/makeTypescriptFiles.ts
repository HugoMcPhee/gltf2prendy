import { PlaceInfo } from ".";
import * as fs from "fs";

type SegmentInfo = {
  name: string;
  duration: number;
  time: number;
  frameStart: number; // marker frame, for now always 0
  frameEnd: number; // for now always the last frame
};

const segmentsInfo: Record<string, SegmentInfo> = {
  start: {
    name: "start",
    duration: 1.0, // in s
    time: 0,
    frameStart: 0,
    frameEnd: 60,
  },
};

const sceneFramerate = 60;
const sceneFramestep = 60;
const chosenFramerate = sceneFramerate / sceneFramestep; // in fps

const oneFrameTime = 1 / chosenFramerate;

// default is 1s starting on frame 0 ending on frame 60

// `${parent_folder_path}${os.sep}${this_place_name}.ts`,

export function makePlaceTypescriptFile(placeInfo: PlaceInfo) {
  const {
    camNames,
    floorNames,
    placeName,
    soundspotNames,
    spotNames,
    triggerNames,
    wallNames,
  } = placeInfo;

  // Save index file
  let content = "";

  content += `import modelFile from "./${placeName}.glb";\n\n`;
  content += `import backdropVideoFile from "./backdrops.mp4";\n`;

  for (const loopedName of camNames) {
    content += `import ${loopedName}_probe_image from "./${loopedName}_probe.env";\n`;
  }
  content += "\n";

  // probesByCamera
  content += "export const probesByCamera = {\n";
  for (const camName of camNames) {
    content += `  ${camName}: ${camName}_probe_image,\n`;
  }
  content += "};\n";

  let totalTimeCounted = 0;
  let cam_counter = 0;

  // segmentTimesByCamera
  content += "export const segmentTimesByCamera = {\n";
  for (const camName of camNames) {
    content += `  ${camName}: {\n`;
    // const segments_for_cams =
    // NOTE need to do this,
    // maybe loop cmaeras and add the duration to the start time

    // for (const segment_name of segments_for_cams[cam_name]) {
    const segmentName = "start";
    const segmentInfo = segmentsInfo[segmentName];
    content += `    ${segmentName}: ${totalTimeCounted},\n`;
    totalTimeCounted += segmentInfo.duration + oneFrameTime;
    // }
    content += "  },\n";
    cam_counter += 1;
  }
  content += "} as const;\n";

  // CameraName type
  content += `export type CameraName = keyof typeof probesByCamera & keyof typeof segmentTimesByCamera;\n`;

  // cameraNames array
  content += `export const cameraNames = Object.keys(probesByCamera) as Readonly<CameraName[]>;\n\n`;

  // videoFiles
  content += `export const videoFiles = {\n  backdrop: backdropVideoFile,\n};\n`;

  // Get the markers (sections)
  content += `export const segmentDurations = {\n`;

  // for (const segment_name of segments_order) {
  const segmentName = "start";
  const segment = segmentsInfo[segmentName];
  content += `  ${segment.name}: ${segment.duration},\n`;
  // }

  content += `};\n`;
  content += `export type SegmentName = keyof typeof segmentDurations;\n`;
  content += `export const segmentNames = Object.keys(segmentDurations) as SegmentName[];\n\n`;

  // wallNames array
  content += `export const wallNames = [\n`;
  for (const loopedName of wallNames) {
    content += `  "${loopedName}",\n`;
  }
  content += `] as const;\n\n`;

  // floorNames array
  content += `export const floorNames = [\n`;
  for (const loopedName of floorNames) {
    content += `  "${loopedName}",\n`;
  }
  content += `] as const;\n\n`;

  // triggerNames array
  content += `export const triggerNames = [\n`;
  for (const loopedName of triggerNames) {
    content += `  "${loopedName}",\n`;
  }
  content += `] as const;\n\n`;

  // spotNames array
  content += `export const spotNames = [\n`;
  for (const loopedName of spotNames) {
    content += `  "${loopedName}",\n`;
  }
  content += `] as const;\n\n`;

  // soundspotNames array
  content += `export const soundspotNames = [\n`;
  for (const loopedName of soundspotNames) {
    content += `  "${loopedName}",\n`;
  }
  content += `] as const;\n\n`;

  content += `export type WallName = typeof wallNames[number];\n`;
  content += `export type FloorName = typeof floorNames[number];\n`;
  content += `export type TriggerName = typeof triggerNames[number];\n`;
  content += `export type SpotName = typeof spotNames[number];\n\n`;
  content += `export type SoundspotName = typeof soundspotNames[number];\n\n`;

  content += `export const placeInfo = {\n`;
  content += `  modelFile,\n`;
  content += `  videoFiles,\n`;
  content += `  cameraNames,\n`;
  content += `  segmentDurations,\n`;
  content += `  segmentNames,\n`;
  content += `  wallNames,\n`;
  content += `  floorNames,\n`;
  content += `  triggerNames,\n`;
  content += `  spotNames,\n`;
  content += `  soundspotNames,\n`;
  content += `  probesByCamera,\n`;
  content += `  segmentTimesByCamera,\n`;
  content += `} as const;\n`;

  return content;
}

// fs.writeFileSync(`${grandparent_folder_path}${os.sep}places.ts`, () => {

export function makePlacesTypescriptFile(placeNames: string[]) {
  // Save all places index file
  let content = "";

  for (const loopedName of placeNames) {
    content += `import { placeInfo as ${loopedName}Info } from "./${loopedName}";\n`;
  }

  content += "\n";
  content += "export const placeInfoByName = {\n";

  for (const loopedName of placeNames) {
    content += `  ${loopedName}: ${loopedName}Info,\n`;
  }
  content += "} as const;\n";

  content += "\n";
  content += "export type PlaceName = keyof typeof placeInfoByName;\n\n";
  content +=
    "export const placeNames = Object.keys(placeInfoByName) as PlaceName[];\n\n";
  content += "type PlaceInfoByName = typeof placeInfoByName;\n\n";
  content +=
    "export type CameraNameByPlace = {\n" +
    '  [P_PlaceName in PlaceName]: PlaceInfoByName[P_PlaceName]["cameraNames"][number];\n' +
    "};\n\n";
  content +=
    'export type CameraNameFromPlace<T_Place extends keyof PlaceInfoByName> = keyof PlaceInfoByName[T_Place]["segmentTimesByCamera"];\n\n';
  content += "export type AnyCameraName = CameraNameByPlace[PlaceName];\n\n";
  content +=
    "export type SpotNameByPlace = {\n" +
    '  [P_PlaceName in PlaceName]: PlaceInfoByName[P_PlaceName]["spotNames"][number];\n' +
    "};\n";
  content += "export type AnySpotName = SpotNameByPlace[PlaceName];\n\n";
  content +=
    "export type SoundspotNameByPlace = {\n" +
    '  [P_PlaceName in PlaceName]: PlaceInfoByName[P_PlaceName]["soundspotNames"][number];\n' +
    "};\n";
  content +=
    "export type AnySoundspotName = SoundspotNameByPlace[PlaceName];\n\n";
  content +=
    "export type SegmentNameByPlace = {\n" +
    '  [P_PlaceName in PlaceName]: PlaceInfoByName[P_PlaceName]["segmentNames"][number];\n' +
    "};\n";
  content +=
    "export type SegmentNameByCameraByPlace = {\n" +
    "  [P_Place in keyof PlaceInfoByName]: {\n" +
    '    [P_Cam in keyof PlaceInfoByName[P_Place]["segmentTimesByCamera"]]: keyof PlaceInfoByName[P_Place]["segmentTimesByCamera"][P_Cam];\n' +
    "  };\n" +
    "};\n";
  content +=
    'export type SegmentNameFromCameraAndPlace<T_Place extends keyof PlaceInfoByName, T_Cam extends keyof PlaceInfoByName[T_Place]["segmentTimesByCamera"]> = keyof PlaceInfoByName[T_Place]["segmentTimesByCamera"][T_Cam];\n';
  content += "export type AnySegmentName = SegmentNameByPlace[PlaceName];\n\n";
  content +=
    "export type TriggerNameByPlace = {\n" +
    '  [P_PlaceName in PlaceName]: PlaceInfoByName[P_PlaceName]["triggerNames"][number];\n' +
    "};\n";
  content += "export type AnyTriggerName = TriggerNameByPlace[PlaceName];\n\n";

  content +=
    "export type WallNameByPlace = {\n" +
    '  [P_PlaceName in PlaceName]: PlaceInfoByName[P_PlaceName]["wallNames"][number];\n' +
    "};\n";
  content += "export type AnyWallName = WallNameByPlace[PlaceName];\n\n";

  content += "\nexport const allCameraNames = [\n";
  for (const loopedName of placeNames) {
    content += `  ...${loopedName}Info.cameraNames,\n`;
  }
  content += "];\n";

  return content;
}
