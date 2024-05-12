import { vec3 } from "@gltf-transform/core";
import { Point3D } from "chootils/dist/points3d";

// NOTE may be able to import some of these from chootils

export function subtractPoints(mainPoint: Point3D, otherPoint: Point3D): Point3D {
  return {
    x: mainPoint.x - otherPoint.x,
    y: mainPoint.y - otherPoint.y,
    z: mainPoint.z - otherPoint.z,
  };
}

// getDistance
// getDistanceSquared

export function getVectorSpeedQuick(theVector: Point3D): number {
  return theVector.x * theVector.x + theVector.y * theVector.y + theVector.z * theVector.z;
}

export function getVectorSpeed(theVector: Point3D): number {
  return Math.sqrt(getVectorSpeedQuick(theVector));
}

export function getVectorDistance(vectorA: Point3D, vectorB: Point3D): number {
  return Math.abs(getVectorSpeed(subtractPoints(vectorA, vectorB)));
}

export function fromPointArray(pointArray: vec3) {
  return { x: pointArray[0], y: pointArray[1], z: pointArray[2] };
}
