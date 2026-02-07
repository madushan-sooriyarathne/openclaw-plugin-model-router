/**
 * Type definitions for Model Router Plugin
 */

export interface MessageFeatures {
  tokenCount: number;
  hasCode: boolean;
  hasMath: boolean;
  isQuestion: boolean;
  technicalTerms: number;
  questionMarks: number;
  codeBlockCount: number;
  imperativeStart: boolean;
  hasConstraints: boolean;
  hasReference: boolean;
  hasNegation: boolean;
}

export type ComplexityLevel = 'SIMPLE' | 'CODING' | 'CREATIVE' | 'REASONING' | 'COMPLEX' | 'PREMIUM';

export interface DimensionScore {
  [dimension: string]: number;
}

export interface ModelScores {
  [model: string]: number;
}

export interface RoutingResult {
  tier: ComplexityLevel;
  model: string;
  fullModel: string;
  fallback: string | null;
  fullFallback: string | null;
  confidence: number;
  totalScore: number;
  scores: DimensionScore;
  description: string;
  executionTimeMs?: number;
}

export interface ModelConfig {
  cost: number;
  contextWindow: number;
  specialties: string[];
  speed: 'fast' | 'medium' | 'slow';
  quality: number;
  reliability: number;
}

export interface TierConfig {
  description: string;
  free: string | null;
  paid: string;
  fullFree: string | null;
  fullPaid: string;
}

export interface Dimension {
  name: string;
  weight: number;
  max: number;
  patterns: string[];
  description?: string;
}

export interface DimensionsConfig {
  version: string;
  description: string;
  dimensions: Dimension[];
}

export interface TiersConfig {
  version: string;
  description: string;
  tiers: {
    [key: string]: TierConfig;
  };
  thresholds: {
    SIMPLE_MAX: number;
    COMPLEX_MIN: number;
    PREMIUM_MIN: number;
    REASONING_TRIGGER: number;
    CODING_TRIGGER: number;
    CREATIVE_TRIGGER: number;
    MULTISTEP_TRIGGER: number;
  };
}

export interface PluginConfig {
  enabled: boolean;
  strategy: 'cost-optimized' | 'quality-first' | 'balanced';
  models: {
    free: string[];
    premium: string[];
  };
  thresholds: {
    simple_max_tokens: number;
    coding_keywords: string[];
    premium_min_score: number;
  };
  timeout_ms: number;
  cache_decisions: boolean;
  cache_ttl_seconds: number;
  log_decisions: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  channels: {
    [channel: string]: {
      enabled: boolean;
    };
  };
}

export interface MessageContext {
  id: string;
  text: string;
  channel: string;
  sender?: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface PluginContext {
  configPath?: string;
  logger: Logger;
  modelOverride?: string;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface DecisionLog {
  timestamp: string;
  message_id: string;
  channel: string;
  complexity: ComplexityLevel;
  scores: ModelScores;
  selected_model: string;
  selection_reason: string;
  execution_time_ms: number;
  total_score: number;
  dimension_scores: DimensionScore;
}
