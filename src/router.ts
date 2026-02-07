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
import { SIGMOID_PARAMS } from './constants';

export class ModelRouter {
  private classifier: MessageClassifier;
  private scorer: ModelScorer;

  constructor(
    private dimensions: DimensionsConfig,
    private tiers: TiersConfig
  ) {
    this.classifier = new MessageClassifier();
    this.scorer = new ModelScorer();
  }

  async route(message: MessageContext, preferFree: boolean = true): Promise<RoutingResult> {
    const startTime = Date.now();
    const dimensionScores = this.calculateDimensionScores(message.text);
    const totalScore = this.sumScores(dimensionScores);
    const tier = this.determineComplexityTier(dimensionScores, totalScore);
    const selection = this.selectModel(tier, preferFree);

    return {
      ...selection,
      confidence: this.calculateConfidence(totalScore),
      totalScore,
      scores: dimensionScores,
      executionTimeMs: Date.now() - startTime,
    };
  }

  async scoreModels(message: MessageContext, availableModels: string[]): Promise<ModelScores> {
    const dimensionScores = this.calculateDimensionScores(message.text);
    const totalScore = this.sumScores(dimensionScores);

    return availableModels.reduce((scores, model) => {
      scores[model] = this.scorer.calculateScore(model, dimensionScores, totalScore, message);
      return scores;
    }, {} as ModelScores);
  }

  formatResult(result: RoutingResult, verbose: boolean = false): string {
    const lines = [
      '📊 **Routing Decision**',
      '',
      `**Tier:** ${result.tier}`,
      `**Model:** \`${result.model}\`${verbose ? ` (full: \`${result.fullModel}\`)` : ''}`,
      `**Confidence:** ${(result.confidence * 100).toFixed(1)}%`,
    ];

    if (result.fallback) lines.push(`**Fallback:** \`${result.fallback}\``);
    lines.push(`**Why:** ${result.description}`);

    if (verbose) {
      this.appendDimensionScores(lines, result);
      this.appendExecutionTime(lines, result);
    }

    return lines.join('\n');
  }

  private calculateDimensionScores(text: string): DimensionScore {
    return this.dimensions.dimensions.reduce((scores, dimension) => {
      scores[dimension.name] = dimension.name === 'length'
        ? this.classifier.scoreLength(text, dimension.weight)
        : this.classifier.scoreDimension(text, dimension);
      return scores;
    }, {} as DimensionScore);
  }

  private sumScores(scores: DimensionScore): number {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  }

  private determineComplexityTier(scores: DimensionScore, totalScore: number): ComplexityLevel {
    const t = this.tiers.thresholds;

    if (scores.reasoning >= t.REASONING_TRIGGER) return 'REASONING';
    if (scores.code >= t.CODING_TRIGGER) return 'CODING';
    if (scores.creative >= t.CREATIVE_TRIGGER) return 'CREATIVE';
    if (scores.multistep >= (t.MULTISTEP_TRIGGER || 0.10)) return 'COMPLEX';
    if (scores.simple >= 0.10 && totalScore < 0.30) return 'SIMPLE';
    if (totalScore < t.SIMPLE_MAX) return 'SIMPLE';
    if (totalScore >= t.PREMIUM_MIN) return 'PREMIUM';
    if (totalScore >= t.COMPLEX_MIN) return 'COMPLEX';

    return 'COMPLEX';
  }

  private selectModel(tier: ComplexityLevel, preferFree: boolean) {
    const tierConfig = this.tiers.tiers[tier];
    const useFree = preferFree && tierConfig.free;

    return {
      tier,
      model: useFree ? tierConfig.free! : tierConfig.paid,
      fullModel: useFree ? tierConfig.fullFree! : tierConfig.fullPaid,
      fallback: useFree ? tierConfig.paid : null,
      fullFallback: useFree ? tierConfig.fullPaid : null,
      description: tierConfig.description,
    };
  }

  private calculateConfidence(totalScore: number): number {
    const { K, MIDPOINT } = SIGMOID_PARAMS;
    return 1 / (1 + Math.exp(-K * (totalScore - MIDPOINT)));
  }

  private appendDimensionScores(lines: string[], result: RoutingResult): void {
    const sortedScores = Object.entries(result.scores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a);

    if (sortedScores.length === 0) return;

    lines.push('', '**Dimension Scores:**');
    sortedScores.forEach(([dim, score]) => {
      lines.push(`  • ${dim}: ${score.toFixed(4)}`);
    });
    lines.push(`  • **total**: ${result.totalScore.toFixed(4)}`);
  }

  private appendExecutionTime(lines: string[], result: RoutingResult): void {
    if (result.executionTimeMs !== undefined) {
      lines.push('', `**Execution Time:** ${result.executionTimeMs}ms`);
    }
  }
}
