# CertScout Starter

Starter files for Chapter 1 of [From Prompts to Pipelines](https://github.com/ciscoittech/prompts-to-pipelines-openclaw). A compliance auditor lead generation system built on [OpenClaw](https://openclaw.ai).

The system scrapes a public certification registry, scores leads by urgency and value, stores them with deduplication, and reports what's new. Run it twice and it only shows leads it hasn't seen before.

## Quick Start

```bash
# 1. Install OpenClaw if you haven't
curl -fsSL https://openclaw.ai/install.sh | bash

# 2. Clone this into your certscout project
git clone https://github.com/ciscoittech/certscout-starter.git
cd certscout-starter

# 3. Build the plugins
cd plugins/cert-scraper && npm install && npm run build && cd ../..
cd plugins/lead-db && npm install && npm run build && cd ../..

# 4. Set up your environment
echo "OPENROUTER_API_KEY=your-key-here" > .env

# 5. Start the gateway
openclaw gateway
```

Then type `find leads` and watch it work.

## What's Inside

```
certscout-starter/
├── plugins/
│   ├── cert-scraper/      # Scrapes certification registries
│   │   └── src/index.ts   # scrape_certifications, get_audit_stats
│   └── lead-db/           # Stores and scores leads
│       └── src/index.ts   # add_lead, score_lead, get_pipeline, get_stats
├── skills/
│   └── daily-scout/       # The skill file that ties it together
│       └── SKILL.md       # 5-step workflow: scrape → dedup → add → score → report
└── README.md
```

## Adapting to Your Industry

CertScout works with any industry that has public certification registries:
- Environmental compliance
- Safety inspections
- Healthcare accreditation
- Accessibility audits

Change the `registryUrl` in your `openclaw.json` plugin config and update the column mappings in `csv-parser.ts` to match your registry's format.

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

## License

MIT
