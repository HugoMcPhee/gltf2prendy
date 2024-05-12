export function getFovScaleFactor(originalFOV: number, expandedFOV: number): number {
  // Calculate the scale factor using the tangent of half the field of view
  const scale = Math.tan(originalFOV / 2) / Math.tan(expandedFOV / 2);

  return scale;
}
