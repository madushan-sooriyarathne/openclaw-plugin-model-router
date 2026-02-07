import { MessageFeatures, Dimension } from './types';
import { TOKEN_ESTIMATE_DIVISOR, LENGTH_THRESHOLDS, LENGTH_SCORES } from './constants';

export class MessageClassifier {
  extractFeatures(text: string): MessageFeatures {
    return {
      tokenCount: this.estimateTokens(text),
      hasCode: this.detectCode(text),
      hasMath: this.detectMath(text),
      isQuestion: this.isQuestionFormat(text),
      technicalTerms: this.countTechnicalTerms(text),
      questionMarks: this.countCharacter(text, '?'),
      codeBlockCount: this.countCodeBlocks(text),
      imperativeStart: this.startsWithImperative(text),
      hasConstraints: this.detectConstraints(text),
      hasReference: this.detectReference(text),
      hasNegation: this.detectNegation(text),
    };
  }

  scoreDimension(text: string, dimension: Dimension): number {
    if (!dimension.patterns?.length) return 0;

    const matches = dimension.patterns.filter(pattern => {
      try {
        return new RegExp(pattern, 'i').test(text);
      } catch {
        return false;
      }
    }).length;

    const capped = Math.min(matches, dimension.max || 3);
    return capped * dimension.weight;
  }

  scoreLength(text: string, weight: number): number {
    const length = text.length;

    if (length < LENGTH_THRESHOLDS.TINY) return LENGTH_SCORES.TINY;
    if (length < LENGTH_THRESHOLDS.SHORT) return weight * LENGTH_SCORES.SHORT;
    if (length < LENGTH_THRESHOLDS.MEDIUM) return weight * LENGTH_SCORES.MEDIUM;
    if (length < LENGTH_THRESHOLDS.LONG) return weight * LENGTH_SCORES.LONG;
    return weight * LENGTH_SCORES.VERY_LONG;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / TOKEN_ESTIMATE_DIVISOR);
  }

  private detectCode(text: string): boolean {
    return /```|\bfunction\b|\bclass\b|\bconst\b|\bdef\b|\breturn\b|\bimport\b|\basync\b|\bawait\b|\.py\b|\.js\b|\.ts\b/.test(text);
  }

  private detectMath(text: string): boolean {
    return /\d+\s*[\+\-\*\/]\s*\d+|\bequation\b|\bcalculate\b|\bderive\b|\bproof\b|\btheorem\b/i.test(text);
  }

  private isQuestionFormat(text: string): boolean {
    return /\?|how|what|why|when|where|who/i.test(text);
  }

  private countTechnicalTerms(text: string): number {
    const terms = ['algorithm', 'kubernetes', 'docker', 'distributed', 'architecture', 'microservice', 'database', 'api', 'rest', 'graphql', 'aws', 'gcp', 'azure', 'terraform', 'neural', 'transformer', 'model', 'training'];
    const lower = text.toLowerCase();
    return terms.filter(term => lower.includes(term)).length;
  }

  private countCharacter(text: string, char: string): number {
    return (text.match(new RegExp(`\\${char}`, 'g')) || []).length;
  }

  private countCodeBlocks(text: string): number {
    return (text.match(/```/g) || []).length / 2;
  }

  private startsWithImperative(text: string): boolean {
    return /^(build|create|implement|design|develop|make|write|generate)\b/i.test(text.trim());
  }

  private detectConstraints(text: string): boolean {
    return /\bat most\b|\bat least\b|\bmaximum\b|\bminimum\b|\bO\([^)]+\)|\bexactly\b/i.test(text);
  }

  private detectReference(text: string): boolean {
    return /\bthe docs\b|\bthe api\b|\babove\b|\bprevious(ly)?\b|\bearlier\b|\bmentioned\b/i.test(text);
  }

  private detectNegation(text: string): boolean {
    return /\bdon'?t\b|\bavoid\b|\bwithout\b|\bnever\b|\bexcept\b/i.test(text);
  }
}
