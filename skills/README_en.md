<p align="center">
  <img src="chinese-traditional-wisdom-ai-agent-workflow.png" alt="Chinese Traditional Wisdom Skill" width="140" />
</p>

<h1 align="center">Chinese Traditional Wisdom Skill</h1>
<p align="center">A local-first Skill for traditional-culture consultation and reflection.</p>

<p align="center">
  🌐 <a href="README.md">简体中文</a>
</p>

<p align="center">
  <a href="#what-it-does">What It Does</a> ·
  <a href="#get-started">Get Started</a> ·
  <a href="#information-to-prepare">Inputs</a> ·
  <a href="#understanding-results">Results</a> ·
  <a href="#advanced-use">Advanced</a>
</p>

> **Traditional-culture reference, not absolute prediction.** This Skill provides structured calculations, cultural interpretation, and constructive suggestions. It is not medical diagnosis, treatment, financial advice, or a guarantee of real-world outcomes.

## What It Is

Chinese Traditional Wisdom Skill is a local-first Skill for traditional-culture consultation. It turns a question into suitable inputs, uses deterministic local engines to generate reviewable charts, dates, GanZhi data, and rule results, then keeps those results separate from cultural interpretation and practical, cautious suggestions.

```text
Your question
  → Choose a traditional-culture context
  → Local engine calculates reviewable facts
  → Cultural interpretation and constructive suggestions
  → Clear limits, disclaimer, and next steps
```

- **Local-first** — Core calculations run locally; full birth details do not need to be sent to a remote service.
- **No model guessing** — Charts, GanZhi data, values, mappings, and rule matching come from local engines; the model must not infer or fill in deterministic facts.
- **Layered results** — Local facts, cultural interpretation, and practical suggestions are presented separately.
- **Flexible access** — Use the Dashboard directly or invoke it through an AI Agent that supports local Skills.

## What It Does

| Your goal | Traditional-culture context | What you receive |
|---|---|---|
| Understand the Four Pillars associated with a birth time | BaZi, favorable elements, ShenSha, annual cycles, and the dynamic layer | Four Pillars, Five Elements, Ten Gods, decadal/minor fortune, and annual, monthly, and daily pillars for a selected date |
| Reflect on life themes through Ziwei | Ziwei Doushu | Palace, star, and structured-chart information |
| Organize thinking about a specific question through divination | Liuyao, Meihua Yishu, Qimen Dunjia, Daliuren, Taiyi, character divination | Cast or chart results, reviewable rule facts, and bounded cultural interpretation |
| Select dates or plan everyday rhythms | Almanac, date selection, Xingxiu, rhythms, Five Movements and Six Qi | Date data, suitability reference, and seasonal cultural context |
| Explore a traditional perspective on a living space | Flying Stars, Eight Mansions, form and direction reference | Local mappings and rule results for space organization reference |
| Explore constitution tendencies or wellness cultivation | Constitution questionnaire, Five Movements and Six Qi, wellness combinations | Cultural reference and lifestyle suggestions; consult a physician first for symptoms or disease concerns |
| Discuss names, dreams, relationships, or life choices | Name analysis, dream interpretation, marriage compatibility, annual/monthly combinations | Structured reference information and a non-fatalistic discussion framework |

### Complete Dashboard feature directory

The Dashboard currently provides these **24 workspaces**. Calculation workspaces call local TypeScript engines directly; knowledge and local-storage workspaces disclose their reference and data boundaries.

| Category | Feature | Main capabilities |
|---|---|---|
| Charting | BaZi chart | Four Pillars, Five Elements, Ten Gods, favorable elements, ShenSha, decadal/minor fortune, and target-date dynamic layers |
| Charting | Ziwei Doushu | Twelve palaces, principal/supporting stars, transformations, and structured charts |
| Divination | Liuyao divination | Coin, time, or manual casting; NaJia, relations, spirits, host/guest, and changing hexagrams |
| Divination | Meihua Yishu | Time/number casting, body/use, moving lines, mutual, changing, inverse, and reversed hexagrams |
| Divination | Qimen Dunjia | Time-based Qimen Nine Palaces, doors/stars/spirits, Three Wonders/Six Instruments, and pattern hints |
| Divination | Daliuren | Heaven/Earth plates, Four Lessons, Three Transmissions, ShenSha, and pattern reference |
| Divination | Taiyi Shenshu | Taiyi palace, host/guest calculations, Four Generals, and traditional pattern reference |
| Divination | Huangji Jingshi | Yuan/Hui/Yun/Shi cycles, principal/era/year hexagrams, and long-cycle reference |
| Divination | Character divination | Stroke numerology, character-element meanings, form, and optional BaZi complement |
| Calendar and daily use | Daily almanac | Suitability, auspicious/inauspicious hours, solar terms, and seasonal folk reference |
| Calendar and daily use | Twenty-Eight Mansions | Daily and natal mansion, Four Symbols, Seven Luminaries, suitability, and chart |
| Calendar and daily use | Five Movements and Six Qi | Annual movement, controlling/heavenly influence, and six guest-Qi steps |
| Calendar and daily use | Daily rhythm | Twelve double-hours, meridian correspondences, and wellness-rhythm cultural reference |
| Calendar and daily use | Yuan Tiangang bone weight | Lunar bone-weight calculation and traditional verse reference from global birth data |
| Everyday folk reference | Name Five Elements | Strokes, elements, Three Talents, Five Grids, and favorable-element complement reference |
| Everyday folk reference | Dream interpretation | Dream-symbol search, modern explanations, and classical excerpts |
| Fengshui | Fengshui compass | Twenty-Four Mountains, Bagua directions, and related knowledge notes |
| Fengshui | Annual Flying Stars | Year-specific Nine Palace Flying Star structure reference |
| Fengshui | Eight Mansions | Life trigram, house trigram, East/West group, and annual-pattern reference |
| Combined reference | Combined analysis | Annual, monthly, decision, space-time, Three Styles, date selection, marriage, and daily-wellness combinations |
| Health cultural reference | Constitution tendency | Nine-constitution questionnaire, radar chart, and cultivation prompts; not medical care |
| Knowledge and data | Classical text reader | *Bazhai Mingjing* text, mapping notes, keyword search, and highlighting |
| Knowledge and data | Local history and favorites | Up to 30 redacted local summaries, favorites, removal, and privacy notes |
| Development and verification | Test console | Local test registry and development-verification information |

The Dashboard also includes global birth-data management, true-solar-time verification/civil-time fallback status, Command Palette navigation, page-summary copying, structured report export, and local history recording.

> **About the counts:** The 24 Dashboard workspaces are user-facing page entry points. The repository also contains **32 local CLI tools**, including true-solar-time preprocessing, underlying charting/daily calculations, constitution questionnaires, and multiple combined analyses. A CLI tool can map to one or more Dashboard functions. See [tool-index.md](tool-index.md) for exact names, input contracts, and runnable fixtures.

## Get Started

### Option 1: Use the Dashboard

Best for browsing charts, adjusting inputs, and viewing results visually.

```bash
cd apps/visual
pnpm install --frozen-lockfile
pnpm dev
```

The project pins dependencies through Node `24.12.x`, pnpm `10.26.1`, and `pnpm-lock.yaml`; do not generate or commit `package-lock.json`. Open the local URL, select a page, and provide the required information. The Dashboard uses local TypeScript engines. Labels such as `local-exact`, `local-approx`, folk experience, demo, or fallback disclose the calculation mode and availability.

### Option 2: Use Through an AI Agent

Install or load this repository as a local Skill, then have the Agent read [SKILL.md](SKILL.md) and [RULES.md](RULES.md). The Agent must:

1. Understand your question, context, and missing inputs; ask rather than guess.
2. Use local tools for deterministic facts; never present model memory or reference text as a calculation from this request.
3. Keep calculation facts, cultural interpretation, practical suggestions, and disclaimers distinct.

See [README_AI.md](README_AI.md) for the complete Agent invocation contract.

## Information to Prepare

Each context requires different information. Share only what is relevant. If a field is uncertain, say so rather than guessing it.

| Context | Usually required | Before you use it |
|---|---|---|
| Birth charts, such as BaZi, Ziwei, and marriage compatibility | Gregorian birth date, hour/minute, gender, and sometimes birthplace | Birth time affects the result. If unknown, preserve that limitation explicitly. |
| True-solar-time verification | Birth record; verified longitude, IANA time zone, UTC offset on the birth date, DST status, and `utcOffsetEvidence` | Without reliable verification, use civil time only and disclose that true solar time has not been verified. |
| Divination | A clear question, casting/chart time, or a stated method | Focus on one describable question; do not replace real decision processes with divination. |
| Fengshui and spaces | Orientation, construction/move-in year, and space information or photo description | Do not replace building safety, fire safety, legal, or professional renovation advice. |
| Constitution and wellness cultivation | Questionnaire responses, habits, and self-reported feelings | Consult a clinician first for symptoms, illness, medication questions, or acute discomfort. |

### True Solar Time

Civil birth time is not automatically true solar time. This Skill provides `resolve_true_solar_time` as a local correction entry point, but a result may be labeled true solar time only when location and historical time-zone evidence have been verified externally. The tool returns `trueSolarBirth` and `trueSolarResolution` for a verified follow-up BaZi calculation.

When reliable verification is unavailable, civil time may be used with informed consent through `timeBasis: 'civil-unverified'` and `civilFallbackConfirmed: true`. The output must state that true solar time has not been verified and must not be described as a true-solar-time result.

## Understanding Results

Read each result in three layers:

1. **Local calculation facts** — Four Pillars, dates, GanZhi data, palaces, mappings, values, and rule relationships from this local-engine invocation.
2. **Traditional-cultural interpretation** — Meanings, symbols, and perspectives used by different traditions. These are cultural reference, not objective prediction.
3. **Practical suggestions** — Communication, record keeping, rest, professional support, or reassessing choices. These should stay constructive and non-fatalistic; you decide whether to adopt them.

### BaZi Dynamic Layer

To view decadal fortune, minor fortune, annual, monthly, or daily pillars for a selected date, use the existing `bazi_calculate` tool with a strict `transitDate: "YYYY-MM-DD"`. The result remains a `ToolEnvelope`; dynamic facts are in `ToolEnvelope.data.transit`.

Minor fortune uses nominal age. `minor.source: "lunar-exact"` means that it comes from the local calendar sequence; `local-fallback` means a deterministic local fallback was used and must be disclosed. GanZhi relations describe only reviewable rule facts; they do not directly establish career, romance, health, wealth, or any other real-world conclusion.

See [bootstrap/bazi-engine.md](bootstrap/bazi-engine.md) for dynamic-layer inputs, outputs, and claims.

## Boundaries and Privacy

- Do not treat traditional-culture results as absolute prediction or as a substitute for personal judgment, legal advice, financial advice, or medical services.
- For symptoms, acute discomfort, or persistent health concerns, seek medical care first. This Skill does not provide diagnosis, prescriptions, or replacement treatment.
- Do not store full birth details, precise locations, or identifying information in long-term logs, public examples, or commits.
- Preserve limitations for uncertain, incomplete, or unverifiable inputs. Never present approximate, demo, or civil-time results as exact results.

See [RULES.md](RULES.md) for the complete ethical and safety rules.

## Advanced Use

### Local CLI

Developers and CLI-capable Agents can invoke local tools directly:

```bash
cd apps/visual
pnpm install --frozen-lockfile
pnpm engine <tool> <input-json-file>
```

Except for `resolve_true_solar_time`, which returns `TrueSolarTimeResolution` directly, the CLI returns JSON `ToolEnvelope`. Before presenting deterministic facts, extract structured claims only from the current `ToolEnvelope.data` and verify them with the matching local `validate*Claims(data, claims)` function. This does not validate free-form text, cultural interpretation, suggestions, or prediction.

See [tool-index.md](tool-index.md) for standard success fixtures, all tool names, and CLI examples.

### Key Resources

| Resource | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | Skill routing, call order, and output rules |
| [RULES.md](RULES.md) | Ethics, privacy, health, and input-completeness boundaries |
| [README_AI.md](README_AI.md) | Local invocation and recovery instructions for AI Agents |
| [tool-index.md](tool-index.md) | 32 local tools, standard fixtures, and CLI reference |
| [`bootstrap/`](bootstrap/) | Domain guides for BaZi, Ziwei, Liuyao, Meihua, Fengshui, and more |
| [`apps/visual/`](apps/visual/) | Dashboard, pure TypeScript engines, and tests |

### Development Verification

After changing engines, input contracts, or public documentation, run these commands in `apps/visual`:

```bash
node scripts/check-doc-contracts.mjs
npm run test:unit
npm run typecheck
npm run build
```

The documentation-contract check keeps public tool lists, CLI behavior, fixtures, and key usage contracts synchronized.

## Repository Layout

```text
apps/visual/
  scripts/run-engine.ts         # Local CLI entry
  src/legacy/                   # Pure TypeScript engines, ToolEnvelope, and validators
  src/__fixtures__/local-tools/ # Standard CLI input samples
bootstrap/                      # Domain usage guides
knowledge-base/                 # Traditional-culture references and local deterministic mappings
templates/                      # Report templates
SKILL.md                        # Skill entry
RULES.md                        # Safety and ethics rules
```
