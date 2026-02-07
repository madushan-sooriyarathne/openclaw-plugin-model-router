import * as fs from 'fs';
import * as path from 'path';
import { DecisionLog, RoutingResult } from './types';
import { LOG_FILE_MAX_SIZE } from './constants';

export class DecisionLogger {
  private logDir: string;
  private logFile: string;

  constructor(private enabled: boolean = true) {
    this.logDir = path.join(process.env.HOME!, '.openclaw', 'logs', 'model-router');
    this.logFile = path.join(this.logDir, 'decisions.jsonl');
    
    if (this.enabled) this.ensureLogDir();
  }

  async logDecision(
    messageId: string,
    channel: string,
    result: RoutingResult,
    reason: string
  ): Promise<void> {
    if (!this.enabled) return;

    const log = this.createLogEntry(messageId, channel, result, reason);
    this.writeLog(log);
  }

  async getRecentDecisions(limit: number = 20): Promise<DecisionLog[]> {
    if (!fs.existsSync(this.logFile)) return [];

    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      return lines.slice(-limit).map(line => JSON.parse(line));
    } catch (error) {
      console.error('Failed to read decision log:', error);
      return [];
    }
  }

  async rotateLogIfNeeded(): Promise<void> {
    if (!fs.existsSync(this.logFile)) return;

    try {
      const stats = fs.statSync(this.logFile);
      if (stats.size > LOG_FILE_MAX_SIZE) {
        this.rotateLog();
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private createLogEntry(
    messageId: string,
    channel: string,
    result: RoutingResult,
    reason: string
  ): DecisionLog {
    return {
      timestamp: new Date().toISOString(),
      message_id: messageId,
      channel,
      complexity: result.tier,
      scores: { [result.model]: 1.0 },
      selected_model: result.fullModel,
      selection_reason: reason,
      execution_time_ms: result.executionTimeMs || 0,
      total_score: result.totalScore,
      dimension_scores: result.scores,
    };
  }

  private writeLog(log: DecisionLog): void {
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(log) + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write decision log:', error);
    }
  }

  private rotateLog(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `decisions-${timestamp}.jsonl`;
    const archivePath = path.join(this.logDir, archiveName);
    
    fs.renameSync(this.logFile, archivePath);
    console.log(`Rotated log file to ${archiveName}`);
  }
}
