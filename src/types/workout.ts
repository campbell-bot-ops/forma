import { Exercise, WorkoutSession } from '../constants/workout';

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number;
  isCompleted?: boolean;
}

export interface ExerciseLogs {
  [exerciseId: string]: WorkoutSet[];
}

export interface CardioDetails {
  duration?: number;
  workoutDuration?: number; // global stopwatch elapsed duration
  caloriesBurned?: number;
  avgHeartRate?: number;
}

export interface RecoveryDetails {
  duration?: number;
  distance?: number;
  coordinates?: [number, number][]; // canvas map coordinates
}

export interface RestDetails {
  walkLogged?: boolean;
  notes?: string;
}

export interface CompletedWorkout {
  id?: string; // database ID if applicable
  sessionId: string;
  sessionTitle: string;
  sessionFocus: string;
  date: string;
  actualTonnage: number;
  logs: ExerciseLogs;
  completedSetsCount?: number;
  totalSetsCount?: number;
  notes?: string;
  tags?: string[];
  cnsScore?: number;
  cardioDetails?: CardioDetails;
  recoveryDetails?: RecoveryDetails;
  restDetails?: RestDetails;
}

export interface UserProfile {
  name: string;
  email: string;
  weight: number;
  height: number;
  bodyFat: number;
  units?: 'metric' | 'imperial';
}

export interface UserSession {
  name: string;
  email: string;
  token: string;
}
