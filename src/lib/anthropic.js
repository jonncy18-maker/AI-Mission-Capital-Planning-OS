/* ============================================================
   Capital Planning OS — Anthropic briefing
   ------------------------------------------------------------
   Generates the AI executive briefing. The prompt receives full
   CATEGORY-level detail (actuals vs. budget). Tone: a CFO brief —
   narrative first, not a bullet list. The model is asked to return
   prose with inline traffic-light flags it can render in DM Mono.

   ⚠️  Phase 1 reads VITE_ANTHROPIC_KEY in the browser for local dev.
       Before public launch, route through a Netlify Functions proxy
       and drop the VITE_ prefix so the key never ships to the client.
   ============================================================ */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL =
  import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

/**
 * Build the per-category detail block the model reasons over.
 * @param {object[]} snapshot  rows of { group, category, type, actual, budget }
 */
function buildDetail(snapshot) {
  return snapshot
    .map((g) => {
      const head = `${g.group} — actual $${g.actual.toFixed(0)} / budget $${g.budget.toFixed(0)}`;
      const cats = g.categories
        .map(
          (c) =>
            `    • ${c.name} (${c.type}): $${c.actual.toFixed(0)} / $${c.budget.toFixed(0)}`
        )
        .join('\n');
      return `${head}\n${cats}`;
    })
    .join('\n');
}

const SYSTEM_PROMPT = `You are the chief financial officer for a single household.
You write a short executive briefing on the household's spending against budget.

Voice and format:
- Narrative first. Write in flowing prose paragraphs, NOT a bullet list.
- Lead with the single most important takeaway, then the two or three things
  that most need attention, then a brief forward look.
- Be calm, specific, and quantitative. Cite real category numbers.
- Use plain figures (e.g. $1,240) and whole-percent overages.
- 150–220 words. Three short paragraphs at most.
- Where a category is notably over or under, append an inline flag in this
  exact format so the UI can style it: [[flag:over]], [[flag:watch]], or
  [[flag:ok]] immediately after the relevant clause.
- Never invent numbers not present in the data. Never address the reader as "you".`;

/**
 * Generate the briefing narrative.
 * @param {{ period: string, snapshot: object[], totals: { actual: number, budget: number } }} ctx
 * @returns {Promise<string>} narrative text with inline [[flag:*]] markers
 */
export async function generateBriefing(ctx) {
  const key = import.meta.env.VITE_ANTHROPIC_KEY;
  if (!key) {
    throw new Error(
      'Missing VITE_ANTHROPIC_KEY. Copy .env.example to .env and add your key.'
    );
  }

  const detail = buildDetail(ctx.snapshot);
  const userPrompt = `Reporting period: ${ctx.period}.
Overall: actual $${ctx.totals.actual.toFixed(0)} against budget $${ctx.totals.budget.toFixed(0)}.

Category-level detail (Group rollups, then categories):
${detail}

Write the executive briefing now.`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const detailText = await res.text().catch(() => '');
    throw new Error(`Anthropic request failed (${res.status}). ${detailText}`);
  }

  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/**
 * Split a briefing string into renderable tokens, lifting [[flag:*]] markers
 * out into objects the BriefingCard can render as DM Mono traffic-light chips.
 * @returns {Array<{type:'text',value:string}|{type:'flag',level:string}>}
 */
export function tokenizeBriefing(text) {
  const tokens = [];
  const re = /\[\[flag:(over|watch|ok)\]\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    tokens.push({ type: 'flag', level: m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}
