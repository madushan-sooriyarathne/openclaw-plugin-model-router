/**
 * Decision logging for model router
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionLog, RoutingResult } from './types';

export class DecisionLogger {
  private logDir: string;
  private logFile: string;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.logDir = path.join(process.env.HOME!, '.openclaw', 'logs', 'model-router');
    this.logFile = path.join(this.logDir, 'decisions.jsonl');
    
    if (this.enabled) {
      this.ensureLogDir();
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async logDecision(
    messageId: string,
    channel: string,
    result: RoutingResult,
    selectionReason: string
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const log: DecisionLog = {
      timestamp: new Date().toISOString(),
      message_id: messageId,
      channel,
      complexity: result.tier,
      scores: { [result.model]: 1.0 }, // Simplified for now
      selected_model: result.fullModel,
      selection_reason: selectionReason,
      execution_time_ms: result.executionTimeMs || 0,
      total_score: result.totalScore,
      dimension_scores: result.scores,
    };

    try {
      const logLine = JSON.stringify(log) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write decision log:', error);
    }
  }

  async getRecentDecisions(limit: number = 20): Promise<DecisionLog[]> {
    if (!fs.existsSync(this.logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const decisions = lines.map(line => JSON.parse(line) as DecisionLog);
      return decisions.slice(-limit);
    } catch (error) {
      console.error('Failed to read decision log:', error);
      return [];
    }
  }

  async rotateLogIfNeeded(): Promise<void> {
    if (!fs.existsSync(this.logFile)) {
      return;
    }

    try {
      const stats = fs.statSync(this.logFile);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = `decisions-${timestamp}.jsonl`;
        const archivePath = path.join(this.logDir, archiveName);
        
        fs.renameSync(this.logFile, archivePath);
        console.log(`Rotated log file to ${archiveName}`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}
