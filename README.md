# CertScout Starter

Starter files for Chapter 1 of [From Prompts to Pipelines](https://github.com/ciscoittech/prompts-to-pipelines-openclaw). A compliance auditor lead generation system built on [OpenClaw](https://openclaw.ai).

The system scrapes a public certification registry, scores leads by urgency and value, stores them with deduplication, and reports what's new. Run it twice and it only shows leads it hasn't seen before.

## Quick Start

```bash
# 1. Install OpenClaw if you haven't
curl -fsSL https://openclaw.ai/install.sh | bash

# 2. Clone this into your certscout project
git clone https://github.com/ciscoittech/certscout-starter.git certscout
cd certscout

# 3. Link the config so OpenClaw can find it
mkdir -p ~/.openclaw
ln -sf $(pwd)/openclaw.json ~/.openclaw/openclaw.json

# 4. Set your API key
export OPENROUTER_API_KEY=your-key-here

# 5. Install the plugins
openclaw plugins install ./plugins/cert-scraper
openclaw plugins install ./plugins/lead-db
cd ~/.openclaw/extensions/lead-db && npm install --omit=dev && npm approve-scripts better-sqlite3 && cd ~/certscout

# 6. Start the gateway
openclaw config set gateway.mode local
openclaw gateway
```

Then type `find leads` and watch it work.

Plugins are **pre-built** so you don't need TypeScript or a build step. The `plugins install` command registers them with OpenClaw and the `export` sets your API key for the session.

## What's Inside

```
certscout-starter/
├── plugins/
│   ├── cert-scraper/      # Scrapes certification registries
│   │   ├── src/           # Source code (TypeScript)
│   │   └── dist/          # Pre-built (ready to run)
│   └── lead-db/           # Stores and scores leads
│       ├── src/           # Source code (TypeScript)
│       └── dist/          # Pre-built (ready to run)
├── skills/
│   └── daily-scout/       # The skill file that ties it together
│       └── SKILL.md       # 5-step workflow: scrape, dedup, add, score, report
└── README.md
```

## Adapting to Your Industry

CertScout works with any industry that has public certification registries:
- Environmental compliance
- Safety inspections
- Healthcare accreditation
- Accessibility audits

Set the `REGISTRY_URL` environment variable to point to your registry's CSV endpoint, and update the column mappings in `src/csv-parser.ts` if the column names differ.

## The Framework

This system uses four concepts from the book:

| Concept | Where You See It |
|---------|-----------------|
| **Instruction** | The skill file tells the system what to do, step by step |
| **Memory** | The lead database persists between sessions |
| **Control** | Deduplication prevents reporting old leads as new |
| **Flow** | Five stages, each feeding the next |

**Read the free chapter:** [Why That Worked (And Why Most AI Doesn't)](https://github.com/ciscoittech/prompts-to-pipelines-openclaw/blob/main/book/chapters/ch02-v4-draft.md)

**Get the full book:** [From Prompts to Pipelines](https://github.com/ciscoittech/prompts-to-pipelines-openclaw)

## For Developers

If you want to modify the plugins:

```bash
# Install dev dependencies (includes TypeScript + OpenClaw SDK)
cd plugins/cert-scraper && npm install && npm run build
cd ../lead-db && npm install && npm run build
```

Note: building requires ~2GB RAM due to the OpenClaw SDK. Pre-built dist/ files are included for environments with limited resources.

## License

MIT
