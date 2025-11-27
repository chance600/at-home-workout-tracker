import { Coordinates } from '../../types';

export const calculateAngle = (a: Coordinates, b: Coordinates, c: Coordinates): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
};

export const calculateMidpoint = (a: Coordinates, b: Coordinates): Coordinates => {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
};

export const normalizeKeypoints = (keypoints: any[], width: number, height: number) => {
  return keypoints.map(kp => ({
    ...kp,
    x: kp.x * width,
    y: kp.y * height
  }));
};