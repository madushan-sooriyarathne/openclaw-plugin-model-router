/**
 * Core routing logic - intelligent model selection
 */

import { 
  ComplexityLevel, 
  DimensionScore, 
  ModelScores, 
  RoutingResult,
  MessageContext,
  TiersConfig,
  DimensionsConfig
} from './types';
import { MessageClassifier } from './classifiers';
import { ModelScorer } from './scorer';

export class ModelRouter {
  private classifier: MessageClassifier;
  private scorer: ModelScorer;
  private dimensions: DimensionsConfig;
  private tiers: TiersConfig;

  constructor(dimensions: DimensionsConfig, tiers: TiersConfig) {
    this.classifier = new MessageClassifier();
    this.scorer = new ModelScorer();
    this.dimensions = dimensions;
    this.tiers = tiers;
  }

  /**
   * Main routing function
   */
  async route(message: MessageContext, preferFree: boolean = true): Promise<RoutingResult> {
    const startTime = Date.now();

    // 1. Calculate dimension scores
    const dimensionScores = this.calculateDimensionScores(message.text);
    const totalScore = Object.values(dimensionScores).reduce((sum, score) => sum + score, 0);

    // 2. Determine complexity tier
    const tier = this.determineComplexityTier(dimensionScores, totalScore);

    // 3. Get tier configuration
    const tierConfig = this.tiers.tiers[tier];

    // 4. Select model (free-first if enabled)
    let model: string;
    let fullModel: string;
    let fallback: string | null;
    let fullFallback: string | null;

    if (preferFree && tierConfig.free) {
      model = tierConfig.free;
      fullModel = tierConfig.fullFree!;
      fallback = tierConfig.paid;
      fullFallback = tierConfig.fullPaid;
    } else {
      model = tierConfig.paid;
      fullModel = tierConfig.fullPaid;
      fallback = null;
      fullFallback = null;
    }

    // 5. Calculate confidence
    const confidence = this.sigmoid(totalScore);

    const executionTimeMs = Date.now() - startTime;

    return {
      tier,
      model,
      fullModel,
      fallback,
      fullFallback,
      confidence,
      totalScore,
      scores: dimensionScores,
      description: tierConfig.description,
      executionTimeMs,
    };
  }

  /**
   * Calculate scores for all dimensions
   */
  private calculateDimensionScores(text: string): DimensionScore {
    const scores: DimensionScore = {};

    for (const dimension of this.dimensions.dimensions) {
      if (dimension.name === 'length') {
        scores[dimension.name] = this.classifier.scoreLength(text, dimension.weight);
      } else {
        scores[dimension.name] = this.classifier.scoreDimension(text, dimension);
      }
    }

    return scores;
  }

  /**
   * Determine complexity tier based on dimension scores
   */
  private determineComplexityTier(scores: DimensionScore, totalScore: number): ComplexityLevel {
    const thresholds = this.tiers.thresholds;

    // Priority checks for specialized tiers
    if (scores.reasoning >= thresholds.REASONING_TRIGGER) {
      return 'REASONING';
    }

    if (scores.code >= thresholds.CODING_TRIGGER) {
      return 'CODING';
    }

    if (scores.creative >= thresholds.CREATIVE_TRIGGER) {
      return 'CREATIVE';
    }

    if (scores.multistep >= (thresholds.MULTISTEP_TRIGGER || 0.10)) {
      return 'COMPLEX';
    }

    // Simple questions should stay simple even with some technical terms
    if (scores.simple >= 0.10 && totalScore < 0.30) {
      return 'SIMPLE';
    }

    // General complexity tiers based on total score
    if (totalScore < thresholds.SIMPLE_MAX) {
      return 'SIMPLE';
    }

    if (totalScore >= thresholds.PREMIUM_MIN) {
      return 'PREMIUM';
    }

    if (totalScore >= thresholds.COMPLEX_MIN) {
      return 'COMPLEX';
    }

    // Default to COMPLEX for moderate scores
    return 'COMPLEX';
  }

  /**
   * Score all available models (for advanced routing)
   */
  async scoreModels(
    message: MessageContext,
    availableModels: string[]
  ): Promise<ModelScores> {
    const dimensionScores = this.calculateDimensionScores(message.text);
    const totalScore = Object.values(dimensionScores).reduce((sum, score) => sum + score, 0);

    const scores: ModelScores = {};

    for (const model of availableModels) {
      scores[model] = this.scorer.calculateScore(model, dimensionScores, totalScore, message);
    }

    return scores;
  }

  /**
   * Sigmoid function for confidence calibration
   */
  private sigmoid(x: number, k: number = 10, midpoint: number = 0.3): number {
    return 1 / (1 + Math.exp(-k * (x - midpoint)));
  }

  /**
   * Format routing result for display
   */
  formatResult(result: RoutingResult, verbose: boolean = false): string {
    const lines = [
      '📊 **Routing Decision**',
      '',
      `**Tier:** ${result.tier}`,
      `**Model:** \`${result.model}\`${verbose ? ` (full: \`${result.fullModel}\`)` : ''}`,
      `**Confidence:** ${(result.confidence * 100).toFixed(1)}%`,
    ];

    if (result.fallback) {
      lines.push(`**Fallback:** \`${result.fallback}\``);
    }

    lines.push(`**Why:** ${result.description}`);

    if (verbose && result.scores) {
      lines.push('');
      lines.push('**Dimension Scores:**');
      
      const sortedScores = Object.entries(result.scores)
        .filter(([_, score]) => score > 0)
        .sort(([_, a], [__, b]) => b - a);

      for (const [dim, score] of sortedScores) {
        lines.push(`  • ${dim}: ${score.toFixed(4)}`);
      }
      
      lines.push(`  • **total**: ${result.totalScore.toFixed(4)}`);
    }

    if (verbose && result.executionTimeMs !== undefined) {
      lines.push('');
      lines.push(`**Execution Time:** ${result.executionTimeMs}ms`);
    }

    return lines.join('\n');
  }
}
