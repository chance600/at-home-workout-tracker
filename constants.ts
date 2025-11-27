import { ExerciseDef, ExerciseType } from './types';

export const EXERCISES: Record<ExerciseType, ExerciseDef> = {
  SQUAT: {
    id: 'SQUAT',
    name: 'Bodyweight Squat',
    description: 'Stand with feet shoulder-width apart. Lower your hips back and down.',
    muscleGroup: 'Legs',
  },
  PUSHUP: {
    id: 'PUSHUP',
    name: 'Push Up',
    description: 'Plank position. Lower chest to floor, then push back up.',
    muscleGroup: 'Chest',
  },
  BICEP_CURL: {
    id: 'BICEP_CURL',
    name: 'Bicep Curl',
    description: 'Keep elbows at side. Curl weight up towards shoulders.',
    muscleGroup: 'Arms',
  },
  OVERHEAD_PRESS: {
    id: 'OVERHEAD_PRESS',
    name: 'Overhead Press',
    description: 'Press weight vertically overhead from shoulder level.',
    muscleGroup: 'Shoulders',
  },
};

export const APP_NAME = "Aura AI Fitness";
export const STORAGE_KEY = "aura_fitness_data_v1";
