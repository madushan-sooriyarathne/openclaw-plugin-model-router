/**
 * Model Router Plugin for OpenClaw
 * 
 * Intelligently routes incoming messages to optimal LLM models based on 
 * 14-dimension scoring algorithm. Prioritizes free models for cost optimization
 * while maintaining quality for complex tasks.
 * 
 * @version 1.0.0
 * @author OpenClaw Model Router Team
 */

import { ModelRouter } from './router';
import { ConfigManager } from './config';
import { DecisionLogger } from './logger';
import { MessageContext, PluginContext, Logger } from './types';

/**
 * Plugin metadata
 */
export const metadata = {
  name: 'model-router',
  version: '1.0.0',
  description: 'Intelligent model routing for OpenClaw based on 14-dimension scoring',
  author: 'OpenClaw',
  repository: 'https://github.com/madushan-sooriyarathne/openclaw-plugin-model-router',
};

/**
 * Simple logger implementation for standalone usage
 */
class SimpleLogger implements Logger {
  private prefix: string;

  constructor(prefix: string = '[ModelRouter]') {
    this.prefix = prefix;
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`${this.prefix} [DEBUG]`, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`${this.prefix} [INFO]`, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} [WARN]`, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} [ERROR]`, message, ...args);
  }
}

/**
 * Main plugin class
 */
export class ModelRouterPlugin {
  private router: ModelRouter | null = null;
  private configManager: ConfigManager | null = null;
  private logger: DecisionLogger | null = null;
  private pluginLogger: Logger;
  private initialized: boolean = false;

  constructor(pluginLogger?: Logger) {
    this.pluginLogger = pluginLogger || new SimpleLogger();
  }

  /**
   * Initialize the plugin
   */
  async init(context?: PluginContext): Promise<void> {
    try {
      this.pluginLogger.info('Initializing Model Router Plugin v1.0.0...');

      // Load configuration
      this.configManager = new ConfigManager(context?.configPath);
      await this.configManager.load();

      const config = this.configManager.getConfig();
      const dimensions = this.configManager.getDimensions();
      const tiers = this.configManager.getTiers();

      this.pluginLogger.info(`Loaded ${dimensions.dimensions.length} dimensions and ${Object.keys(tiers.tiers).length} tiers`);

      // Initialize router
      this.router = new ModelRouter(dimensions, tiers);

      // Initialize logger
      this.logger = new DecisionLogger(config.log_decisions);

      this.initialized = true;
      this.pluginLogger.info('Model Router Plugin initialized successfully');
    } catch (error) {
      this.pluginLogger.error('Failed to initialize Model Router Plugin:', error);
      throw error;
    }
  }

  /**
   * Hook: message:before-agent
   * 
   * Intercepts incoming messages and routes to optimal model
   */
  async onMessageBeforeAgent(
    message: MessageContext,
    context: PluginContext
  ): Promise<PluginContext> {
    // Graceful degradation if not initialized
    if (!this.initialized || !this.router || !this.configManager) {
      this.pluginLogger.warn('Plugin not initialized, skipping routing');
      return context;
    }

    try {
      // Check if routing is enabled for this channel
      if (!this.configManager.isEnabled(message.channel)) {
        this.pluginLogger.debug(`Routing disabled for channel: ${message.channel}`);
        return context;
      }

      const startTime = Date.now();

      // Perform routing
      const strategy = this.configManager.getStrategy();
      const preferFree = strategy === 'cost-optimized';
      
      const result = await this.router.route(message, preferFree);

      // Log decision
      if (this.logger) {
        await this.logger.logDecision(
          message.id,
          message.channel,
          result,
          `${result.tier} tier detected with ${(result.confidence * 100).toFixed(1)}% confidence`
        );
      }

      // Set model override
      context.modelOverride = result.fullModel;

      const duration = Date.now() - startTime;
      this.pluginLogger.info(
        `Routed to ${result.model} (${result.tier}) in ${duration}ms [confidence: ${(result.confidence * 100).toFixed(1)}%]`
      );

      // Rotate logs if needed
      if (this.logger) {
        await this.logger.rotateLogIfNeeded();
      }

      return context;
    } catch (error) {
      this.pluginLogger.error('Routing failed, using default model:', error);
      // Graceful degradation - return context unchanged
      return context;
    }
  }

  /**
   * Route a message (standalone usage)
   */
  async route(text: string, channel: string = 'default'): Promise<any> {
    if (!this.router) {
      throw new Error('Plugin not initialized. Call init() first.');
    }

    const message: MessageContext = {
      id: `standalone-${Date.now()}`,
      text,
      channel,
      timestamp: Date.now(),
    };

    const strategy = this.configManager!.getStrategy();
    const preferFree = strategy === 'cost-optimized';

    return await this.router.route(message, preferFree);
  }

  /**
   * Format routing result
   */
  formatResult(result: any, verbose: boolean = false): string {
    if (!this.router) {
      throw new Error('Plugin not initialized. Call init() first.');
    }

    return this.router.formatResult(result, verbose);
  }

  /**
   * Cleanup plugin resources
   */
  async destroy(): Promise<void> {
    this.pluginLogger.info('Model Router Plugin shutting down');
    this.initialized = false;
    this.router = null;
    this.configManager = null;
    this.logger = null;
  }

  /**
   * Get plugin status
   */
  getStatus(): any {
    return {
      initialized: this.initialized,
      version: metadata.version,
      enabled: this.configManager?.isEnabled() || false,
      strategy: this.configManager?.getStrategy() || 'unknown',
    };
  }
}

/**
 * Export default plugin instance creator
 */
export default function createPlugin(context?: PluginContext): ModelRouterPlugin {
  const plugin = new ModelRouterPlugin(context?.logger);
  return plugin;
}

/**
 * Standalone CLI usage
 */
if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('Usage: node index.js "<prompt>" [--verbose] [--paid]');
      process.exit(1);
    }

    const prompt = args[0];
    const verbose = args.includes('--verbose') || args.includes('-v');

    const plugin = new ModelRouterPlugin();
    await plugin.init();

    const result = await plugin.route(prompt);
    
    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(plugin.formatResult(result, verbose));
    }
  }

  main().catch(console.error);
}
