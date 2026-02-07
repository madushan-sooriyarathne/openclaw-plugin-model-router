/**
 * 14-dimension scoring algorithm for model routing
 */

import { DimensionScore, MessageContext } from './types';

export class ModelScorer {
  /**
   * Calculate 14-dimension weighted score for a model
   */
  calculateScore(
    model: string,
    dimensionScores: DimensionScore,
    totalScore: number,
    message: MessageContext
  ): number {
    // Weight configuration matching Python implementation
    const weights = {
      costEfficiency: 0.25,
      taskSuitability: 0.20,
      contextWindow: 0.15,
      speed: 0.10,
      quality: 0.10,
      reliability: 0.05,
      multilingual: 0.05,
      codeGeneration: 0.03,
      reasoningDepth: 0.03,
      creativity: 0.02,
      safety: 0.01,
      latencyTolerance: 0.005,
      providerDiversity: 0.0025,
      experimentalFeatures: 0.0025,
    };

    let score = 0;

    // 1. Cost Efficiency (25%)
    score += this.scoreCost(model, totalScore) * weights.costEfficiency;

    // 2. Task Suitability (20%)
    score += this.scoreSuitability(model, dimensionScores) * weights.taskSuitability;

    // 3. Context Window (15%)
    score += this.scoreContext(model, message) * weights.contextWindow;

    // 4. Speed (10%)
    score += this.scoreSpeed(model, totalScore) * weights.speed;

    // 5. Quality Threshold (10%)
    score += this.scoreQuality(model, totalScore) * weights.quality;

    // 6. Reliability (5%)
    score += this.scoreReliability(model) * weights.reliability;

    // 7. Multilingual (5%)
    score += this.scoreMultilingual(model, message) * weights.multilingual;

    // 8. Code Generation (3%)
    score += this.scoreCodeGen(model, dimensionScores) * weights.codeGeneration;

    // 9. Reasoning Depth (3%)
    score += this.scoreReasoning(model, dimensionScores) * weights.reasoningDepth;

    // 10. Creativity (2%)
    score += this.scoreCreativity(model, dimensionScores) * weights.creativity;

    // 11. Safety (1%)
    score += this.scoreSafety(model) * weights.safety;

    // 12. Latency Tolerance (0.5%)
    score += this.scoreLatency(model, message) * weights.latencyTolerance;

    // 13. Provider Diversity (0.25%)
    score += this.scoreProviderDiversity(model) * weights.providerDiversity;

    // 14. Experimental Features (0.25%)
    score += this.scoreExperimental(model) * weights.experimentalFeatures;

    return score;
  }

  /**
   * 1. Cost Efficiency - Free models score higher for simple tasks
   */
  private scoreCost(model: string, totalScore: number): number {
    const isFree = this.isFreeModel(model);
    
    // Complexity multiplier: higher complexity = lower cost advantage
    let complexityMultiplier = 1.0;
    if (totalScore < 0.15) {
      complexityMultiplier = 1.0; // SIMPLE
    } else if (totalScore < 0.35) {
      complexityMultiplier = 0.8; // CODING/CREATIVE
    } else if (totalScore < 0.55) {
      complexityMultiplier = 0.5; // COMPLEX
    } else {
      complexityMultiplier = 0.0; // PREMIUM (cost irrelevant)
    }

    return isFree ? complexityMultiplier : (1.0 - complexityMultiplier) * 0.5;
  }

  /**
   * 2. Task Suitability - Model specialization matching
   */
  private scoreSuitability(model: string, dimensionScores: DimensionScore): number {
    const modelName = model.toLowerCase();

    // Coding specialists
    if (modelName.includes('coder') || modelName.includes('code')) {
      return dimensionScores.code > 0 ? 1.0 : 0.5;
    }

    // Reasoning specialists
    if (modelName.includes('r1') || modelName.includes('chimera') || modelName.includes('think')) {
      return dimensionScores.reasoning > 0 ? 1.0 : 0.5;
    }

    // Creative specialists
    if (modelName.includes('trinity')) {
      return dimensionScores.creative > 0 ? 1.0 : 0.5;
    }

    // General models (Claude, GPT, Llama)
    if (modelName.includes('claude') || modelName.includes('gpt') || modelName.includes('llama')) {
      return 0.7;
    }

    return 0.5;
  }

  /**
   * 3. Context Window - Ensure model can handle message
   */
  private scoreContext(model: string, message: MessageContext): number {
    const estimatedTokens = Math.ceil(message.text.length / 4);
    const modelContext = this.getContextWindow(model);

    if (estimatedTokens > modelContext * 0.8) {
      return 0.0; // Too close to limit
    } else if (estimatedTokens > modelContext * 0.5) {
      return 0.5;
    }

    return 1.0;
  }

  /**
   * 4. Speed - Faster models for simple tasks
   */
  private scoreSpeed(model: string, totalScore: number): number {
    const speed = this.getModelSpeed(model);
    
    // Simple tasks benefit from fast models
    if (totalScore < 0.15) {
      return speed === 'fast' ? 1.0 : 0.5;
    }

    // Complex tasks less sensitive to speed
    return 0.7;
  }

  /**
   * 5. Quality Threshold - Minimum quality for task
   */
  private scoreQuality(model: string, totalScore: number): number {
    const quality = this.getModelQuality(model);
    
    // Premium tasks require high quality
    if (totalScore >= 0.55) {
      return quality >= 0.9 ? 1.0 : 0.3;
    }

    // Simple tasks OK with lower quality
    return quality >= 0.6 ? 1.0 : 0.7;
  }

  /**
   * 6. Reliability - Model uptime/stability
   */
  private scoreReliability(model: string): number {
    // Free models can be less reliable
    if (this.isFreeModel(model)) {
      return 0.7;
    }

    // Premium models more reliable
    if (model.includes('claude') || model.includes('gpt-4')) {
      return 1.0;
    }

    return 0.8;
  }

  /**
   * 7. Multilingual - Non-English support
   */
  private scoreMultilingual(model: string, message: MessageContext): number {
    const hasNonAscii = /[^\x00-\x7F]/.test(message.text);
    
    if (!hasNonAscii) {
      return 1.0; // English - all models fine
    }

    // Qwen and Llama good for multilingual
    if (model.includes('qwen') || model.includes('llama')) {
      return 1.0;
    }

    return 0.7;
  }

  /**
   * 8. Code Generation capability
   */
  private scoreCodeGen(model: string, dimensionScores: DimensionScore): number {
    if (dimensionScores.code === 0) {
      return 0.5; // Not a coding task
    }

    if (model.includes('coder') || model.includes('code')) {
      return 1.0;
    }

    if (model.includes('claude') || model.includes('gpt')) {
      return 0.8;
    }

    return 0.5;
  }

  /**
   * 9. Reasoning Depth
   */
  private scoreReasoning(model: string, dimensionScores: DimensionScore): number {
    if (dimensionScores.reasoning === 0) {
      return 0.5;
    }

    if (model.includes('r1') || model.includes('chimera') || model.includes('think')) {
      return 1.0;
    }

    if (model.includes('opus')) {
      return 0.9;
    }

    return 0.6;
  }

  /**
   * 10. Creativity
   */
  private scoreCreativity(model: string, dimensionScores: DimensionScore): number {
    if (dimensionScores.creative === 0) {
      return 0.5;
    }

    if (model.includes('trinity') || model.includes('claude')) {
      return 1.0;
    }

    return 0.7;
  }

  /**
   * 11. Safety - Content policy compliance
   */
  private scoreSafety(_model: string): number {
    // All major models have safety filters
    return 1.0;
  }

  /**
   * 12. Latency Tolerance
   */
  private scoreLatency(model: string, _message: MessageContext): number {
    // Assume all channels want reasonable latency
    return this.getModelSpeed(model) === 'fast' ? 1.0 : 0.7;
  }

  /**
   * 13. Provider Diversity - Avoid vendor lock-in
   */
  private scoreProviderDiversity(model: string): number {
    if (model.includes('openrouter')) {
      return 1.0; // Already diverse
    }

    return 0.7;
  }

  /**
   * 14. Experimental Features
   */
  private scoreExperimental(model: string): number {
    if (model.includes('thinking') || model.includes('preview')) {
      return 1.0;
    }

    return 0.5;
  }

  // Helper methods

  private isFreeModel(model: string): boolean {
    return model.includes(':free') || model.toLowerCase().includes('free');
  }

  private getContextWindow(model: string): number {
    // Rough estimates
    if (model.includes('claude')) return 200000;
    if (model.includes('gpt-4')) return 128000;
    if (model.includes('llama')) return 128000;
    if (model.includes('qwen')) return 32000;
    return 8000;
  }

  private getModelSpeed(model: string): 'fast' | 'medium' | 'slow' {
    if (model.includes('haiku') || model.includes('qwen3-80b')) return 'fast';
    if (model.includes('thinking') || model.includes('r1')) return 'slow';
    return 'medium';
  }

  private getModelQuality(model: string): number {
    if (model.includes('opus')) return 0.95;
    if (model.includes('sonnet')) return 0.90;
    if (model.includes('gpt-4')) return 0.90;
    if (model.includes('claude')) return 0.85;
    if (model.includes('llama-3.3')) return 0.75;
    if (model.includes('qwen')) return 0.70;
    return 0.60;
  }
}
