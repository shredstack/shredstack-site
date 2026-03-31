export interface DashboardData {
  user: {
    displayName: string | null;
    email: string;
    lastUploadAt: string | null;
  };
  summary: {
    totalWorkouts: number;
    dateRange: string[];
    rxCount: number;
    scaledCount: number;
    categories: Record<string, number>;
  };
  workouts: DashboardWorkout[];
  movements: DashboardMovement[];
  strengthPRs: Record<string, StrengthPR>;
  clusters: Record<string, number[]>;
}

export interface DashboardWorkout {
  id: number;
  rawTitle: string | null;
  rawDescription: string;
  rawScore: string;
  rawDivision: string | null;
  rawNotes: string | null;
  workoutDate: string;
  workoutType: string | null;
  scoreType: string | null;
  category: string | null;
  similarityCluster: string | null;
  aiSummary: string | null;
}

export interface DashboardMovement {
  id: number;
  workoutId: number;
  userId: number;
  movementName: string;
  prescribedReps: number | null;
  prescribedWeight: number | null;
  prescribedUnit: string | null;
  estimatedActualWeight: number | null;
  estimatedMaxWeight: number | null;
  estimatedRepsCompleted: number | null;
  isLimitingFactor: boolean | null;
  confidence: string | null;
}

export interface StrengthPR {
  estimatedMax: number;
  bestReps: number | null;
  bestWeight: number | null;
  rawScoreMisinterpretation: string | null;
  confidence: string;
  history: { date: string; weight: number }[];
}
