import * as plugin from './lib/index.js';

/** Hard validation the dsh core applies to provider candidates (issue #3). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

const providers = [];
plugin.apply({
  skills: { registerProvider: (fn) => providers.push(fn) },
});
check('provider factory registered', providers.length === 1);

const provider = providers[0]();
check('provider exposes a string name (issue #3)', typeof provider.name === 'string' && provider.name.length > 0, String(provider.name));

const list = await provider.list();
const unique = new Set(list.map((c) => c.name)).size;
console.log('candidates:', list.length, '| unique:', unique);
check('skills discovered', list.length > 0);
check('no duplicate skill names', unique === list.length);

// dsh 侧 validateCandidate 的两条硬校验：provider 必须是字符串，且等于 provider.name。
const badProvider = list.filter(
  (c) => typeof c.provider !== 'string' || c.provider !== provider.name,
);
check(
  'every candidate.provider is a string equal to provider.name (issue #3)',
  badProvider.length === 0,
  badProvider.length ? badProvider.map((c) => c.name).join(', ') : `${list.length} checked`,
);

const badNames = list.filter((c) => !SKILL_NAME.test(c.name));
check(
  `every candidate name matches ${SKILL_NAME}`,
  badNames.length === 0,
  badNames.length ? badNames.map((c) => c.name).join(', ') : `${list.length} checked`,
);

const got = await provider.get(list[0]);
console.log('get() body chars:', got.content.length);
check('get() returns non-empty body', typeof got.content === 'string' && got.content.length >= 10);

console.log(failures === 0 ? 'OK' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
