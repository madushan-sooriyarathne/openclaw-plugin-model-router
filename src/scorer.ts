import { DimensionScore, MessageContext } from './types';
import { 
  DIMENSION_WEIGHTS, 
  CONTEXT_WINDOW_SIZES, 
  MODEL_QUALITY_SCORES 
} from './constants';

export class ModelScorer {
  calculateScore(
    model: string,
    dimensionScores: DimensionScore,
    totalScore: number,
    message: MessageContext
  ): number {
    return (
      this.scoreCost(model, totalScore) * DIMENSION_WEIGHTS.COST_EFFICIENCY +
      this.scoreSuitability(model, dimensionScores) * DIMENSION_WEIGHTS.TASK_SUITABILITY +
      this.scoreContext(model, message) * DIMENSION_WEIGHTS.CONTEXT_WINDOW +
      this.scoreSpeed(model, totalScore) * DIMENSION_WEIGHTS.SPEED +
      this.scoreQuality(model, totalScore) * DIMENSION_WEIGHTS.QUALITY +
      this.scoreReliability(model) * DIMENSION_WEIGHTS.RELIABILITY +
      this.scoreMultilingual(model, message) * DIMENSION_WEIGHTS.MULTILINGUAL +
      this.scoreCodeGen(model, dimensionScores) * DIMENSION_WEIGHTS.CODE_GENERATION +
      this.scoreReasoning(model, dimensionScores) * DIMENSION_WEIGHTS.REASONING_DEPTH +
      this.scoreCreativity(model, dimensionScores) * DIMENSION_WEIGHTS.CREATIVITY +
      this.scoreSafety() * DIMENSION_WEIGHTS.SAFETY +
      this.scoreLatency(model) * DIMENSION_WEIGHTS.LATENCY_TOLERANCE +
      this.scoreProviderDiversity(model) * DIMENSION_WEIGHTS.PROVIDER_DIVERSITY +
      this.scoreExperimental(model) * DIMENSION_WEIGHTS.EXPERIMENTAL_FEATURES
    );
  }

  private scoreCost(model: string, totalScore: number): number {
    if (!this.isFreeModel(model)) return (1.0 - this.getComplexityMultiplier(totalScore)) * 0.5;
    return this.getComplexityMultiplier(totalScore);
  }

  private getComplexityMultiplier(score: number): number {
    if (score < 0.15) return 1.0;
    if (score < 0.35) return 0.8;
    if (score < 0.55) return 0.5;
    return 0.0;
  }

  private scoreSuitability(model: string, scores: DimensionScore): number {
    const name = model.toLowerCase();

    if ((name.includes('coder') || name.includes('code')) && scores.code > 0) return 1.0;
    if ((name.includes('r1') || name.includes('chimera') || name.includes('think')) && scores.reasoning > 0) return 1.0;
    if (name.includes('trinity') && scores.creative > 0) return 1.0;
    if (name.includes('claude') || name.includes('gpt') || name.includes('llama')) return 0.7;

    return 0.5;
  }

  private scoreContext(model: string, message: MessageContext): number {
    const estimatedTokens = Math.ceil(message.text.length / 4);
    const modelContext = this.getContextWindow(model);

    if (estimatedTokens > modelContext * 0.8) return 0.0;
    if (estimatedTokens > modelContext * 0.5) return 0.5;
    return 1.0;
  }

  private scoreSpeed(model: string, totalScore: number): number {
    const speed = this.getModelSpeed(model);
    if (totalScore < 0.15) return speed === 'fast' ? 1.0 : 0.5;
    return 0.7;
  }

  private scoreQuality(model: string, totalScore: number): number {
    const quality = this.getModelQuality(model);
    if (totalScore >= 0.55) return quality >= 0.9 ? 1.0 : 0.3;
    return quality >= 0.6 ? 1.0 : 0.7;
  }

  private scoreReliability(model: string): number {
    if (this.isFreeModel(model)) return 0.7;
    if (model.includes('claude') || model.includes('gpt-4')) return 1.0;
    return 0.8;
  }

  private scoreMultilingual(model: string, message: MessageContext): number {
    const hasNonAscii = /[^\x00-\x7F]/.test(message.text);
    if (!hasNonAscii) return 1.0;
    if (model.includes('qwen') || model.includes('llama')) return 1.0;
    return 0.7;
  }

  private scoreCodeGen(model: string, scores: DimensionScore): number {
    if (scores.code === 0) return 0.5;
    if (model.includes('coder') || model.includes('code')) return 1.0;
    if (model.includes('claude') || model.includes('gpt')) return 0.8;
    return 0.5;
  }

  private scoreReasoning(model: string, scores: DimensionScore): number {
    if (scores.reasoning === 0) return 0.5;
    if (model.includes('r1') || model.includes('chimera') || model.includes('think')) return 1.0;
    if (model.includes('opus')) return 0.9;
    return 0.6;
  }

  private scoreCreativity(model: string, scores: DimensionScore): number {
    if (scores.creative === 0) return 0.5;
    if (model.includes('trinity') || model.includes('claude')) return 1.0;
    return 0.7;
  }

  private scoreSafety(): number {
    return 1.0;
  }

  private scoreLatency(model: string): number {
    return this.getModelSpeed(model) === 'fast' ? 1.0 : 0.7;
  }

  private scoreProviderDiversity(model: string): number {
    return model.includes('openrouter') ? 1.0 : 0.7;
  }

  private scoreExperimental(model: string): number {
    return model.includes('thinking') || model.includes('preview') ? 1.0 : 0.5;
  }

  private isFreeModel(model: string): boolean {
    return model.includes(':free') || model.toLowerCase().includes('free');
  }

  private getContextWindow(model: string): number {
    if (model.includes('claude')) return CONTEXT_WINDOW_SIZES.CLAUDE;
    if (model.includes('gpt-4')) return CONTEXT_WINDOW_SIZES.GPT4;
    if (model.includes('llama')) return CONTEXT_WINDOW_SIZES.LLAMA;
    if (model.includes('qwen')) return CONTEXT_WINDOW_SIZES.QWEN;
    return CONTEXT_WINDOW_SIZES.DEFAULT;
  }

  private getModelSpeed(model: string): 'fast' | 'medium' | 'slow' {
    if (model.includes('haiku') || model.includes('qwen3-80b')) return 'fast';
    if (model.includes('thinking') || model.includes('r1')) return 'slow';
    return 'medium';
  }

  private getModelQuality(model: string): number {
    if (model.includes('opus')) return MODEL_QUALITY_SCORES.OPUS;
    if (model.includes('sonnet')) return MODEL_QUALITY_SCORES.SONNET;
    if (model.includes('gpt-4')) return MODEL_QUALITY_SCORES.GPT4;
    if (model.includes('claude')) return MODEL_QUALITY_SCORES.CLAUDE;
    if (model.includes('llama-3.3')) return MODEL_QUALITY_SCORES.LLAMA_3_3;
    if (model.includes('qwen')) return MODEL_QUALITY_SCORES.QWEN;
    return MODEL_QUALITY_SCORES.DEFAULT;
  }
}
