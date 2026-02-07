/**
 * Configuration management for Model Router Plugin
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { PluginConfig, DimensionsConfig, TiersConfig } from './types';

const DEFAULT_CONFIG: PluginConfig = {
  enabled: true,
  strategy: 'cost-optimized',
  models: {
    free: [
      'openrouter/qwen/qwen3-next-80b-a3b-instruct:free',
      'openrouter/meta-llama/llama-3.3-70b-instruct:free',
      'openrouter/qwen/qwen3-coder:free',
      'openrouter/arcee-ai/trinity-large-preview:free',
      'openrouter/tngtech/deepseek-r1t2-chimera:free',
    ],
    premium: [
      'google-antigravity/claude-opus-4-5-thinking',
      'anthropic/claude-sonnet-4-5',
      'anthropic/claude-opus-4-5',
    ],
  },
  thresholds: {
    simple_max_tokens: 50,
    coding_keywords: ['code', 'function', 'debug', 'error', 'script'],
    premium_min_score: 0.55,
  },
  timeout_ms: 100,
  cache_decisions: true,
  cache_ttl_seconds: 300,
  log_decisions: true,
  log_level: 'info',
  channels: {
    whatsapp: { enabled: true },
    telegram: { enabled: true },
  },
};

export class ConfigManager {
  private config!: PluginConfig;
  private dimensions!: DimensionsConfig;
  private tiers!: TiersConfig;
  private configPath: string;

  constructor(baseDir?: string) {
    this.configPath = baseDir || path.join(process.env.HOME!, '.openclaw', 'plugins', 'model-router');
  }

  async load(): Promise<void> {
    // Load main config
    this.config = await this.loadConfig();
    
    // Load dimensions and tiers
    this.dimensions = await this.loadDimensions();
    this.tiers = await this.loadTiers();
  }

  private async loadConfig(): Promise<PluginConfig> {
    const configFile = path.join(this.configPath, 'config', 'default.yaml');
    
    try {
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8');
        const loaded = yaml.parse(content);
        
        // Merge with defaults
        return { ...DEFAULT_CONFIG, ...loaded };
      }
    } catch (error) {
      console.warn(`Failed to load config from ${configFile}, using defaults:`, error);
    }
    
    return DEFAULT_CONFIG;
  }

  private async loadDimensions(): Promise<DimensionsConfig> {
    const dimensionsFile = path.join(this.configPath, 'config', 'dimensions.json');
    
    try {
      if (fs.existsSync(dimensionsFile)) {
        const content = fs.readFileSync(dimensionsFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Failed to load dimensions from ${dimensionsFile}:`, error);
    }
    
    // Fallback: load from Python skill location
    const fallbackPath = path.join(
      process.env.HOME!,
      '.openclaw',
      'workspace',
      'skills',
      'model-router',
      'dimensions.json'
    );
    
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, 'utf8');
      return JSON.parse(content);
    }
    
    throw new Error('dimensions.json not found in plugin or skill directory');
  }

  private async loadTiers(): Promise<TiersConfig> {
    const tiersFile = path.join(this.configPath, 'config', 'tiers.json');
    
    try {
      if (fs.existsSync(tiersFile)) {
        const content = fs.readFileSync(tiersFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Failed to load tiers from ${tiersFile}:`, error);
    }
    
    // Fallback: load from Python skill location
    const fallbackPath = path.join(
      process.env.HOME!,
      '.openclaw',
      'workspace',
      'skills',
      'model-router',
      'tiers.json'
    );
    
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, 'utf8');
      return JSON.parse(content);
    }
    
    throw new Error('tiers.json not found in plugin or skill directory');
  }

  getConfig(): PluginConfig {
    return this.config;
  }

  getDimensions(): DimensionsConfig {
    return this.dimensions;
  }

  getTiers(): TiersConfig {
    return this.tiers;
  }

  isEnabled(channel?: string): boolean {
    if (!this.config.enabled) {
      return false;
    }
    
    if (channel && this.config.channels[channel]) {
      return this.config.channels[channel].enabled;
    }
    
    return true;
  }

  getStrategy(): 'cost-optimized' | 'quality-first' | 'balanced' {
    return this.config.strategy;
  }
}
