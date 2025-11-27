import { WorkoutSession, WorkoutExercise, SetLog, ExerciseType } from '../types';
import { STORAGE_KEY } from '../constants';

// Basic LocalStorage Wrapper simulating an offline DB
export const StorageService = {
  getSessions: (): WorkoutSession[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load sessions", e);
      return [];
    }
  },

  saveSession: (session: WorkoutSession): void => {
    const sessions = StorageService.getSessions();
    const updatedSessions = [session, ...sessions.filter(s => s.id !== session.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  },

  deleteSession: (sessionId: string): void => {
    const sessions = StorageService.getSessions();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  },

  createSession: (): WorkoutSession => {
    return {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      name: `Workout ${new Date().toLocaleDateString()}`,
      exercises: [],
    };
  }
};
