import { ModelRouter } from './router';
import { ConfigManager } from './config';
import { DecisionLogger } from './logger';
import { MessageContext, PluginContext, Logger } from './types';

export const metadata = {
  name: 'model-router',
  version: '1.0.0',
  description: 'Intelligent model routing for OpenClaw based on 14-dimension scoring',
  author: 'OpenClaw',
  repository: 'https://github.com/madushan-sooriyarathne/openclaw-plugin-model-router',
};

class SimpleLogger implements Logger {
  constructor(private prefix: string = '[ModelRouter]') {}

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

export class ModelRouterPlugin {
  private router: ModelRouter | null = null;
  private configManager: ConfigManager | null = null;
  private logger: DecisionLogger | null = null;
  private pluginLogger: Logger;
  private initialized: boolean = false;

  constructor(pluginLogger?: Logger) {
    this.pluginLogger = pluginLogger || new SimpleLogger();
  }

  async init(context?: PluginContext): Promise<void> {
    try {
      this.pluginLogger.info('Initializing Model Router Plugin v1.0.0...');

      this.configManager = new ConfigManager(context?.configPath);
      await this.configManager.load();

      const config = this.configManager.getConfig();
      const dimensions = this.configManager.getDimensions();
      const tiers = this.configManager.getTiers();

      this.pluginLogger.info(`Loaded ${dimensions.dimensions.length} dimensions and ${Object.keys(tiers.tiers).length} tiers`);

      this.router = new ModelRouter(dimensions, tiers);
      this.logger = new DecisionLogger(config.log_decisions);
      this.initialized = true;

      this.pluginLogger.info('Model Router Plugin initialized successfully');
    } catch (error) {
      this.pluginLogger.error('Failed to initialize Model Router Plugin:', error);
      throw error;
    }
  }

  async onMessageBeforeAgent(message: MessageContext, context: PluginContext): Promise<PluginContext> {
    if (!this.isReady()) {
      this.pluginLogger.warn('Plugin not initialized, skipping routing');
      return context;
    }

    if (!this.configManager!.isEnabled(message.channel)) {
      this.pluginLogger.debug(`Routing disabled for channel: ${message.channel}`);
      return context;
    }

    try {
      const result = await this.performRouting(message);
      await this.logRoutingDecision(message, result);
      
      context.modelOverride = result.fullModel;
      
      this.pluginLogger.info(
        `Routed to ${result.model} (${result.tier}) in ${result.executionTimeMs}ms [confidence: ${(result.confidence * 100).toFixed(1)}%]`
      );

      await this.logger!.rotateLogIfNeeded();
      return context;
    } catch (error) {
      this.pluginLogger.error('Routing failed, using default model:', error);
      return context;
    }
  }

  async route(text: string, channel: string = 'default'): Promise<any> {
    if (!this.router) throw new Error('Plugin not initialized. Call init() first.');

    const message: MessageContext = {
      id: `standalone-${Date.now()}`,
      text,
      channel,
      timestamp: Date.now(),
    };

    const preferFree = this.configManager!.getStrategy() === 'cost-optimized';
    return await this.router.route(message, preferFree);
  }

  formatResult(result: any, verbose: boolean = false): string {
    if (!this.router) throw new Error('Plugin not initialized. Call init() first.');
    return this.router.formatResult(result, verbose);
  }

  async destroy(): Promise<void> {
    this.pluginLogger.info('Model Router Plugin shutting down');
    this.initialized = false;
    this.router = null;
    this.configManager = null;
    this.logger = null;
  }

  getStatus(): any {
    return {
      initialized: this.initialized,
      version: metadata.version,
      enabled: this.configManager?.isEnabled() || false,
      strategy: this.configManager?.getStrategy() || 'unknown',
    };
  }

  private isReady(): boolean {
    return this.initialized && !!this.router && !!this.configManager;
  }

  private async performRouting(message: MessageContext) {
    const preferFree = this.configManager!.getStrategy() === 'cost-optimized';
    return await this.router!.route(message, preferFree);
  }

  private async logRoutingDecision(message: MessageContext, result: any) {
    if (this.logger) {
      const reason = `${result.tier} tier detected with ${(result.confidence * 100).toFixed(1)}% confidence`;
      await this.logger.logDecision(message.id, message.channel, result, reason);
    }
  }
}

export default function createPlugin(context?: PluginContext): ModelRouterPlugin {
  return new ModelRouterPlugin(context?.logger);
}

if (require.main === module) {
  async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('Usage: node index.js "<prompt>" [--verbose] [--json]');
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
