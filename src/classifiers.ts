/**
 * Message classification utilities
 */

import { MessageFeatures, Dimension } from './types';

export class MessageClassifier {
  /**
   * Extract features from message text
   */
  extractFeatures(text: string): MessageFeatures {
    return {
      tokenCount: this.estimateTokenCount(text),
      hasCode: this.hasCode(text),
      hasMath: this.hasMath(text),
      isQuestion: this.isQuestion(text),
      technicalTerms: this.countTechnicalTerms(text),
      questionMarks: this.countQuestionMarks(text),
      codeBlockCount: this.countCodeBlocks(text),
      imperativeStart: this.hasImperativeStart(text),
      hasConstraints: this.hasConstraints(text),
      hasReference: this.hasReference(text),
      hasNegation: this.hasNegation(text),
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if text contains code
   */
  private hasCode(text: string): boolean {
    const codePatterns = [
      /```/,
      /\bfunction\b/,
      /\bclass\b/,
      /\bconst\b/,
      /\bdef\b/,
      /\breturn\b/,
      /\bimport\b/,
      /\basync\b/,
      /\bawait\b/,
      /\.py\b/,
      /\.js\b/,
      /\.ts\b/,
    ];

    return codePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text contains math
   */
  private hasMath(text: string): boolean {
    const mathPatterns = [
      /\d+\s*[\+\-\*\/]\s*\d+/,
      /\bequation\b/i,
      /\bcalculate\b/i,
      /\bderive\b/i,
      /\bproof\b/i,
      /\btheorem\b/i,
    ];

    return mathPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text is a question
   */
  private isQuestion(text: string): boolean {
    return /\?|how|what|why|when|where|who/i.test(text);
  }

  /**
   * Count technical terms
   */
  private countTechnicalTerms(text: string): number {
    const technicalTerms = [
      'algorithm',
      'kubernetes',
      'docker',
      'distributed',
      'architecture',
      'microservice',
      'database',
      'api',
      'rest',
      'graphql',
      'aws',
      'gcp',
      'azure',
      'terraform',
      'neural',
      'transformer',
      'model',
      'training',
    ];

    const lowerText = text.toLowerCase();
    return technicalTerms.filter(term => lowerText.includes(term)).length;
  }

  /**
   * Count question marks
   */
  private countQuestionMarks(text: string): number {
    return (text.match(/\?/g) || []).length;
  }

  /**
   * Count code blocks
   */
  private countCodeBlocks(text: string): number {
    return (text.match(/```/g) || []).length / 2;
  }

  /**
   * Check if text starts with imperative verb
   */
  private hasImperativeStart(text: string): boolean {
    return /^(build|create|implement|design|develop|make|write|generate)\b/i.test(text.trim());
  }

  /**
   * Check if text has constraints
   */
  private hasConstraints(text: string): boolean {
    const constraintPatterns = [
      /\bat most\b/i,
      /\bat least\b/i,
      /\bmaximum\b/i,
      /\bminimum\b/i,
      /\bO\([^)]+\)/,
      /\bexactly\b/i,
    ];

    return constraintPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text has references to prior context
   */
  private hasReference(text: string): boolean {
    const referencePatterns = [
      /\bthe docs\b/i,
      /\bthe api\b/i,
      /\babove\b/i,
      /\bprevious(ly)?\b/i,
      /\bearlier\b/i,
      /\bmentioned\b/i,
    ];

    return referencePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if text has negations
   */
  private hasNegation(text: string): boolean {
    const negationPatterns = [
      /\bdon'?t\b/i,
      /\bavoid\b/i,
      /\bwithout\b/i,
      /\bnever\b/i,
      /\bexcept\b/i,
    ];

    return negationPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Score a dimension based on pattern matches
   */
  scoreDimension(text: string, dimension: Dimension): number {
    if (!dimension.patterns || dimension.patterns.length === 0) {
      return 0;
    }

    let matches = 0;
    for (const patternStr of dimension.patterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        if (pattern.test(text)) {
          matches++;
        }
      } catch (error) {
        console.warn(`Invalid pattern in dimension ${dimension.name}: ${patternStr}`);
      }
    }

    const capped = Math.min(matches, dimension.max || 3);
    return capped * dimension.weight;
  }

  /**
   * Score text length dimension
   */
  scoreLength(text: string, weight: number = 0.08): number {
    const charCount = text.length;

    if (charCount < 50) {
      return 0.0;
    } else if (charCount < 150) {
      return weight * 0.3;
    } else if (charCount < 500) {
      return weight * 0.6;
    } else if (charCount < 1500) {
      return weight * 1.0;
    } else {
      return weight * 1.5;
    }
  }
}
