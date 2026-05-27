export interface Exercise {
  id: string;
  name: string;
  targetGroup: string;
  keyMovement: boolean;
  defaultSets: number;
  targetRepsRange: string;
  ghostSets: Array<{
    setNumber: number;
    weight: number; // in kg
    reps: number;
    rpe: number; // 1-10
  }>;
}

export interface WorkoutSession {
  id: string;
  day: string;
  title: string;
  focus: string;
  type: 'workout' | 'recovery' | 'rest';
  keyMovementName?: string;
  primaryGoal: string;
  totalTonnage: number;
  exercises: Exercise[];
}

export const GENESIS_SPLIT: WorkoutSession[] = [
  {
    id: "upper-1",
    day: "Monday",
    title: "Upper Body",
    focus: "Push/Chest & Shoulders",
    type: "workout",
    keyMovementName: "Incline DB Press",
    primaryGoal: "Upper chest focus for that \"bigger build\" look + width cap.",
    totalTonnage: 3240,
    exercises: [
      {
        id: "incline-db-press",
        name: "Incline Dumbbell Press",
        targetGroup: "Chest",
        keyMovement: true,
        defaultSets: 3,
        targetRepsRange: "8-10",
        ghostSets: [
          { setNumber: 1, weight: 32, reps: 10, rpe: 7 },
          { setNumber: 2, weight: 32, reps: 9, rpe: 8 },
          { setNumber: 3, weight: 32, reps: 8, rpe: 9 }
        ]
      },
      {
        id: "lat-pulldowns",
        name: "Weighted Pull-Ups / Lat Pulldowns",
        targetGroup: "Lats",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "10-12",
        ghostSets: [
          { setNumber: 1, weight: 65, reps: 12, rpe: 8 },
          { setNumber: 2, weight: 65, reps: 10, rpe: 9 },
          { setNumber: 3, weight: 65, reps: 9, rpe: 9.5 }
        ]
      },
      {
        id: "overhead-press",
        name: "Overhead Press (DB or Barbell)",
        targetGroup: "Shoulders",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "8-10",
        ghostSets: [
          { setNumber: 1, weight: 45, reps: 10, rpe: 7 },
          { setNumber: 2, weight: 45, reps: 9, rpe: 8 },
          { setNumber: 3, weight: 45, reps: 8, rpe: 9 }
        ]
      },
      {
        id: "seated-cable-rows",
        name: "Seated Cable Rows",
        targetGroup: "Back / Lat Thickness",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "12",
        ghostSets: [
          { setNumber: 1, weight: 55, reps: 12, rpe: 8 },
          { setNumber: 2, weight: 55, reps: 12, rpe: 8 },
          { setNumber: 3, weight: 55, reps: 11, rpe: 9 }
        ]
      },
      {
        id: "lateral-raises",
        name: "Lateral Raises",
        targetGroup: "Side Delts",
        keyMovement: false,
        defaultSets: 4,
        targetRepsRange: "15",
        ghostSets: [
          { setNumber: 1, weight: 12.5, reps: 15, rpe: 8 },
          { setNumber: 2, weight: 12.5, reps: 15, rpe: 8 },
          { setNumber: 3, weight: 12.5, reps: 14, rpe: 9 },
          { setNumber: 4, weight: 12.5, reps: 13, rpe: 9 }
        ]
      }
    ]
  },
  {
    id: "lower-1",
    day: "Tuesday",
    title: "Lower Body",
    focus: "Quads & Core",
    type: "workout",
    keyMovementName: "Goblet Squat",
    primaryGoal: "Quad density + Structural core stability.",
    totalTonnage: 4860,
    exercises: [
      {
        id: "goblet-squat",
        name: "Goblet Squats or Barbell Squats",
        targetGroup: "Quads",
        keyMovement: true,
        defaultSets: 3,
        targetRepsRange: "8-10",
        ghostSets: [
          { setNumber: 1, weight: 36, reps: 10, rpe: 7 },
          { setNumber: 2, weight: 36, reps: 9, rpe: 8 },
          { setNumber: 3, weight: 36, reps: 8, rpe: 8.5 }
        ]
      },
      {
        id: "leg-press",
        name: "Leg Press",
        targetGroup: "Quads / Glutes",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "12-15",
        ghostSets: [
          { setNumber: 1, weight: 160, reps: 15, rpe: 8 },
          { setNumber: 2, weight: 160, reps: 14, rpe: 8 },
          { setNumber: 3, weight: 160, reps: 12, rpe: 9 }
        ]
      },
      {
        id: "leg-extensions",
        name: "Leg Extensions",
        targetGroup: "Quads isolation",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "15",
        ghostSets: [
          { setNumber: 1, weight: 45, reps: 15, rpe: 8 },
          { setNumber: 2, weight: 45, reps: 15, rpe: 8.5 },
          { setNumber: 3, weight: 45, reps: 13, rpe: 9 }
        ]
      },
      {
        id: "hanging-leg-raises",
        name: "Hanging Leg Raises",
        targetGroup: "Lower Abs",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "to failure",
        ghostSets: [
          { setNumber: 1, weight: 0, reps: 12, rpe: 9 },
          { setNumber: 2, weight: 0, reps: 10, rpe: 10 },
          { setNumber: 3, weight: 0, reps: 9, rpe: 10 }
        ]
      },
      {
        id: "planks",
        name: "Plank",
        targetGroup: "Transverse Abdominis",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "60 seconds",
        ghostSets: [
          { setNumber: 1, weight: 0, reps: 60, rpe: 8 },
          { setNumber: 2, weight: 0, reps: 60, rpe: 8.5 },
          { setNumber: 3, weight: 0, reps: 60, rpe: 9 }
        ]
      }
    ]
  },
  {
    id: "recovery-wed",
    day: "Wednesday",
    title: "Active Recovery",
    focus: "Cardio & Tissue Flush",
    type: "recovery",
    primaryGoal: "20-30 mins of steady-state cardio (jog, swim, fast walk). Fat loss without muscle tax.",
    totalTonnage: 0,
    exercises: []
  },
  {
    id: "upper-2",
    day: "Thursday",
    title: "Upper Body",
    focus: "Pull/Back & Arms",
    type: "workout",
    keyMovementName: "Bent Over Row",
    primaryGoal: "Back thickness + Arm volume (Tricep / Bicep hypertrophy).",
    totalTonnage: 3600,
    exercises: [
      {
        id: "bent-over-rows",
        name: "Bent Over Rows",
        targetGroup: "Back Lats & Rhomboids",
        keyMovement: true,
        defaultSets: 3,
        targetRepsRange: "8-10",
        ghostSets: [
          { setNumber: 1, weight: 60, reps: 10, rpe: 7 },
          { setNumber: 2, weight: 60, reps: 9, rpe: 8 },
          { setNumber: 3, weight: 60, reps: 8, rpe: 9 }
        ]
      },
      {
        id: "flat-bench-press",
        name: "Flat Bench Press",
        targetGroup: "Chest",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "8-10",
        ghostSets: [
          { setNumber: 1, weight: 80, reps: 10, rpe: 8 },
          { setNumber: 2, weight: 80, reps: 9, rpe: 8.5 },
          { setNumber: 3, weight: 80, reps: 8, rpe: 9 }
        ]
      },
      {
        id: "face-pulls",
        name: "Face Pulls",
        targetGroup: "Rear Delts / Posture",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "15",
        ghostSets: [
          { setNumber: 1, weight: 22.5, reps: 15, rpe: 8 },
          { setNumber: 2, weight: 22.5, reps: 15, rpe: 8 },
          { setNumber: 3, weight: 22.5, reps: 13, rpe: 9 }
        ]
      },
      {
        id: "bicep-curls-db",
        name: "Bicep Curls (Dumbbell)",
        targetGroup: "Biceps",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "12",
        ghostSets: [
          { setNumber: 1, weight: 16, reps: 12, rpe: 8 },
          { setNumber: 2, weight: 16, reps: 12, rpe: 8.5 },
          { setNumber: 3, weight: 16, reps: 10, rpe: 9 }
        ]
      },
      {
        id: "tricep-overhead-extensions",
        name: "Tricep Overhead Extensions",
        targetGroup: "Triceps Long Head",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "12",
        ghostSets: [
          { setNumber: 1, weight: 24, reps: 12, rpe: 8 },
          { setNumber: 2, weight: 24, reps: 12, rpe: 8.5 },
          { setNumber: 3, weight: 24, reps: 10, rpe: 9.5 }
        ]
      }
    ]
  },
  {
    id: "lower-2",
    day: "Friday",
    title: "Lower Body",
    focus: "Posterior Chain & Core",
    type: "workout",
    keyMovementName: "Romanian Deadlift",
    primaryGoal: "Hamstring/Glute power + Lower back health.",
    totalTonnage: 4320,
    exercises: [
      {
        id: "romanian-deadlifts",
        name: "Romanian Deadlifts",
        targetGroup: "Hamstrings / Glutes",
        keyMovement: true,
        defaultSets: 3,
        targetRepsRange: "10-12",
        ghostSets: [
          { setNumber: 1, weight: 90, reps: 12, rpe: 7 },
          { setNumber: 2, weight: 90, reps: 11, rpe: 8 },
          { setNumber: 3, weight: 90, reps: 10, rpe: 9 }
        ]
      },
      {
        id: "leg-curls",
        name: "Leg Curls",
        targetGroup: "Hamstrings",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "12-15",
        ghostSets: [
          { setNumber: 1, weight: 45, reps: 15, rpe: 8 },
          { setNumber: 2, weight: 45, reps: 13, rpe: 8.5 },
          { setNumber: 3, weight: 45, reps: 12, rpe: 9 }
        ]
      },
      {
        id: "walking-lunges",
        name: "Walking Lunges",
        targetGroup: "Quads / Glutes",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "12 per leg",
        ghostSets: [
          { setNumber: 1, weight: 16, reps: 12, rpe: 8 },
          { setNumber: 2, weight: 16, reps: 12, rpe: 8 },
          { setNumber: 3, weight: 16, reps: 11, rpe: 9 }
        ]
      },
      {
        id: "weighted-russian-twists",
        name: "Weighted Russian Twists",
        targetGroup: "Obliques",
        keyMovement: false,
        defaultSets: 3,
        targetRepsRange: "20",
        ghostSets: [
          { setNumber: 1, weight: 10, reps: 20, rpe: 8 },
          { setNumber: 2, weight: 10, reps: 20, rpe: 8.5 },
          { setNumber: 3, weight: 10, reps: 20, rpe: 9 }
        ]
      }
    ]
  },
  {
    id: "rest-weekend",
    day: "Sat/Sun",
    title: "Weekend Rest",
    focus: "Recovery & Light Activity",
    type: "rest",
    primaryGoal: "Long walk or light stretching. Recharge CNS.",
    totalTonnage: 0,
    exercises: []
  }
];

export interface LoggedSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number;
}

export interface LoggedWorkout {
  sessionId: string;
  date: string;
  actualTonnage: number;
  logs: {
    [exerciseId: string]: LoggedSet[];
  };
}

export const ARCHIVE_WEEKLY_AUDIT = {
  strengthChange: "+6.8%",
  tonnageChange: "+4.2%",
  volumeConsistency: "98.5%",
  totalWorkouts: 16,
  recentLogs: [
    { week: "Week 1", tonnage: 21200, strength: 100 },
    { week: "Week 2", tonnage: 21900, strength: 102.5 },
    { week: "Week 3", tonnage: 22100, strength: 104.2 },
    { week: "Week 4", tonnage: 22800, strength: 106.8 }
  ]
};
