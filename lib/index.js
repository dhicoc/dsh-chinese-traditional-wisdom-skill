import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILLS_ROOT = fileURLToPath(new URL('../skills', import.meta.url));

export const name = 'chinese-traditional-wisdom-skill';
export const inject = ['skills'];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'SKILL.md') out.push(p);
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---[\r\n]([\s\S]*?)[\r\n]---[\r\n]?/);
  const fm = {};
  if (!m) return fm;
  const lines = m[1].split(/[\r\n]/);
  let key = null, buf = [], block = false;
  const flush = () => {
    if (key !== null) {
      let val = buf.join(block ? '\n' : ' ').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      fm[key] = val;
    }
    key = null; buf = []; block = false;
  };
  for (const line of lines) {
    const km = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (km && !block) {
      flush();
      key = km[1];
      const v = km[2];
      if (v === '>' || v === '|' || v === '>-' || v === '|-' || v === '>+' || v === '|+') { block = true; buf = []; }
      else buf = [v];
    } else if (block) {
      if (/^\s+\S/.test(line)) buf.push(line.trim());
      else flush();
    }
  }
  flush();
  return fm;
}

const provider = {
  name: 'chinese-traditional-wisdom-skill',
  list() {
    const files = [];
    walk(SKILLS_ROOT, files);
    const byName = new Map();
    for (const f of files) {
      const raw = fs.readFileSync(f, 'utf8');
      const fm = parseFrontmatter(raw);
      let name = (fm.name || '').trim().replace(/^["']|["']$/g, '');
      const description = (fm.description || '').trim();
      const rel = path.relative(SKILLS_ROOT, f);
      const cand = {
        name: name || path.basename(path.dirname(f)),
        description,
        invocation: { modelInvocable: true, userInvocable: true },
        provider: provider.name,
        source: 'bundled',
        resourceBase: { kind: 'directory', path: path.dirname(f) },
        rank: 0,
        locator: pathToFileURL(f),
        metadata: fm,
      };
      const prev = byName.get(cand.name);
      if (!prev || rel.split(path.sep).length < prev._rel.split(path.sep).length) {
        cand._rel = rel;
        byName.set(cand.name, cand);
      }
    }
    const list = [];
    for (const c of byName.values()) { delete c._rel; list.push(c); }
    return Promise.resolve(list);
  },
  async get(candidate) {
    const p = fileURLToPath(candidate.locator);
    const raw = fs.readFileSync(p, 'utf8');
    const m = raw.match(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]?/);
    const content = m ? raw.slice(m[0].length) : raw;
    return Object.assign({}, candidate, { content });
  },
};

export function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}
