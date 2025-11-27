export type ExerciseType = 'SQUAT' | 'PUSHUP' | 'BICEP_CURL' | 'OVERHEAD_PRESS';

export interface ExerciseDef {
  id: ExerciseType;
  name: string;
  description: string;
  muscleGroup: string;
}

export interface SetLog {
  id: string;
  reps: number;
  weight: number;
  timestamp: number;
}

export interface WorkoutExercise {
  exerciseId: ExerciseType;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  startTime: number;
  endTime?: number;
  exercises: WorkoutExercise[];
  name: string;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  score?: number;
  z?: number;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

export enum RepState {
  UP = 'UP',
  DOWN = 'DOWN',
  MID = 'MID'
}