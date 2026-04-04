export interface DashboardData {
  user: {
    displayName: string | null;
    email: string;
    lastUploadAt: string | null;
    gender: string | null;
  };
  summary: {
    totalScores: number;
    uniqueWorkouts: number;
    dateRange: string[];
    rxCount: number;
    scaledCount: number;
    monthlyChallengeEntries: number;
    categories: Record<string, number>;
    repeatWorkouts: number;
  };
  workouts: DashboardWorkout[];
  movements: DashboardMovement[];
  strengthPRs: Record<string, StrengthPR>;
  clusters: Record<string, number[]>;
  repeatWorkoutProgressions: RepeatWorkoutProgression[];
  allCategories: { id: number; name: string }[];
}

export interface DashboardWorkout {
  scoreId: number;
  workoutId: number;
  rawTitle: string | null;
  rawDescription: string;
  canonicalTitle: string | null;
  titleSource: string | null;
  rawScore: string;
  rawDivision: string | null;
  rawNotes: string | null;
  workoutDate: string;
  workoutType: string | null;
  scoreType: string | null;
  category: string | null;
  categoryId: number | null;
  similarityCluster: string | null;
  aiSummary: string | null;
  isMonthlyChallenge: boolean | null;
}

export interface DashboardMovement {
  userScoreId: number;
  movementId: number;
  movementName: string;
  movementCategory: string | null;
  estimatedActualWeight: number | null;
  estimatedMaxWeight: number | null;
  estimatedRepsCompleted: number | null;
  isLimitingFactor: boolean | null;
  limitingFactorScore: number | null;
  inferredScalingDetail: string | null;
  confidence: string | null;
  extractionMethod: string | null;
}

export interface StrengthPR {
  estimatedMax: number;
  bestReps: number | null;
  bestWeight: number | null;
  rawScoreMisinterpretation: string | null;
  confidence: string;
  extractionMethod: string | null;
  e1rmSource: string | null;
  history: { date: string; weight: number }[];
  projected1RM: number | null;
  projectedFrom: string | null;
}

export interface RepeatWorkoutProgression {
  workoutId: number;
  title: string;
  scoreType: 'for_time' | 'amrap' | 'for_load' | 'unknown';
  scores: {
    date: string;
    score: string;
    division: string | null;
    parsedTime?: number;
    parsedRounds?: number;
    parsedWeight?: number;
  }[];
  improvement: {
    type: 'scaled_to_rx' | 'time_improvement' | 'rounds_improvement' | 'weight_improvement' | 'mixed';
    summary: string;
    percentChange?: number;
  } | null;
  impressivenessScore: number;
}
