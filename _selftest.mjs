import * as plugin from './lib/index.js';

const providers = [];
plugin.apply({ skills: { registerProvider: (fn) => providers.push(fn) } });
const list = await providers[0]().list();
const unique = new Set(list.map((c) => c.name)).size;
console.log('candidates:', list.length, '| unique:', unique);
if (list.length === 0) { console.error('FAIL: no skills discovered'); process.exit(1); }
if (unique !== list.length) console.error('WARN: duplicate skill names detected (dedup kept shortest path)');
const got = await providers[0]().get(list[0]);
console.log('get() body chars:', got.content.length);
if (!got.content || got.content.length < 10) { console.error('FAIL: get() returned empty body'); process.exit(1); }
console.log('OK');
