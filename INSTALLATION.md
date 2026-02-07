# Quick Installation Guide

## For OpenClaw Users

### 1. Clone the Plugin

```bash
cd ~/.openclaw/plugins
git clone https://github.com/madushan-sooriyarathne/openclaw-plugin-model-router.git model-router
cd model-router
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Plugin

```bash
npm run build
```

### 4. Enable in OpenClaw

Add to your OpenClaw config (`~/.openclaw/config.yaml`):

```yaml
plugins:
  - name: model-router
    path: ~/.openclaw/plugins/model-router
    enabled: true
```

### 5. Restart OpenClaw

```bash
openclaw gateway restart
```

### 6. Verify Installation

Check logs:

```bash
tail -f ~/.openclaw/logs/openclaw.log | grep model-router
```

You should see:
```
[INFO] Model Router Plugin initialized successfully
```

## Standalone Testing

Test without OpenClaw:

```bash
cd ~/.openclaw/plugins/model-router
node dist/index.js "Your test prompt here" --verbose
```

## Configuration

Edit settings in `config/default.yaml`:

```yaml
model-router:
  enabled: true
  strategy: cost-optimized  # or quality-first, balanced
  log_decisions: true
```

## Troubleshooting

**Build fails?**
- Ensure Node.js 18+ installed: `node --version`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

**Plugin not routing?**
- Check it's enabled in OpenClaw config
- Verify build succeeded: `ls dist/` should show .js files
- Check logs for errors

**Need help?**
- GitHub Issues: https://github.com/madushan-sooriyarathne/openclaw-plugin-model-router/issues
- OpenClaw Docs: https://docs.openclaw.ai

## Next Steps

- See [README.md](README.md) for full documentation
- Check [config/default.yaml](config/default.yaml) for all settings
- Review decision logs: `~/.openclaw/logs/model-router/decisions.jsonl`
