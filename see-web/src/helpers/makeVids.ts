import { RendersByCamName } from "./renderPics";

/*

how to know what order to render cameras?
I guess whatever it is in 

*/

export type RendersByPlaceByCam = Record<string, RendersByCamName>;
export type CamNamesByPlace = Record<string, string[]>;
// NOTE this makes a color vid, and depth vid
// actually it should be done in more stpes

// note it can be done for each place one at a time

// Makes individual short videos (1s?) from each camera
export function makeBackdropVids(rendersByCamName: RendersByCamName) {}

// Joins all short videos of each camera, 1 for color, and 1 for depth
export function joinBackdropVids() {}

// stitches the full color anddepth videos to be ontop of eachother
export function stitchDepthAndColorVids() {}
