const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const demo = require('./scenarios.js');
const directory = __dirname;
const read = file => fs.readFileSync(path.join(directory, file), 'utf8');

test('TC-AC-003: marking presence preserves registration, eligibility and match outcomes', () => {
  const state = demo.createScenario('review');
  const previous = structuredClone(state);
  demo.setPresence(state, 'p1', true);
  previous.participants[0].present = true;
  assert.deepEqual(state, previous);
  demo.setPresence(state, 'p1', false);
  assert.equal(state.participants[0].present, false);
});

test('TC-AC-018: presence never settles a pending minor verification', () => {
  const state = demo.createScenario('minor');
  demo.setPresence(state, 'p1', true);
  assert.equal(state.participants[0].guardianCheckPending, true);
  assert.equal(state.participants[0].registrationStatus, 'confirmed');
});

test('TC-AC-004: Arena number is required and its name is optional', () => {
  const state = demo.createScenario('no-arenas');
  assert.throws(() => demo.addArena(state, '', 'Nome'), /número inteiro/);
  assert.throws(() => demo.addArena(state, '1.5', ''), /número inteiro/);
  assert.throws(() => demo.addArena(state, '-1', ''), /número inteiro/);
  const arena = demo.addArena(state, '1', '');
  assert.equal(arena.number, 1);
  assert.equal(arena.name, '');
  assert.throws(() => demo.addArena(state, '1', 'Outra'), /Já existe/);
});

test('TC-AC-005: eight matches use Arena sequence 1,2,3,1,2,3,1,2', () => {
  const state = demo.createScenario('review');
  assert.equal(demo.allocateMatches(state), 8);
  assert.deepEqual(state.matches.map(match => match.arenaId), ['a1','a2','a3','a1','a2','a3','a1','a2']);
  assert.deepEqual(state.arenas.map(arena => state.matches.filter(match => match.arenaId === arena.id).length), [3,3,2]);
});

test('TC-AC-005: two batches of four continue the same cycle without duplicate allocations', () => {
  const batched = demo.createScenario('review');
  const all = demo.createScenario('review');
  demo.allocateMatches(batched, 4);
  assert.equal(batched.matches[4].arenaId, null);
  demo.allocateMatches(batched, 4);
  demo.allocateMatches(all);
  assert.deepEqual(batched.matches, all.matches);
  const before = structuredClone(batched);
  assert.equal(demo.allocateMatches(batched), 0);
  assert.deepEqual(batched, before);
});

test('TC-AC-006: one Arena receives all matches and extra Arenas do not create matches', () => {
  const single = demo.createScenario('review');
  single.arenas = single.arenas.slice(0, 1);
  demo.allocateMatches(single);
  assert.ok(single.matches.every(match => match.arenaId === 'a1'));
  const extra = demo.createScenario('no-arenas');
  for (let number = 1; number <= 10; number++) demo.addArena(extra, number, '');
  demo.allocateMatches(extra);
  assert.equal(extra.matches.length, 8);
  assert.equal(new Set(extra.matches.map(match => match.id)).size, 8);
  assert.equal(new Set(extra.matches.map(match => match.arenaId)).size, 8);
});

test('TC-AC-004: missing Arenas block allocation and publication without losing preparation', () => {
  const state = demo.createScenario('no-arenas');
  const before = structuredClone(state);
  assert.throws(() => demo.allocateMatches(state), /ao menos uma Arena/);
  assert.throws(() => demo.publishRound(state), /Distribua todas/);
  assert.deepEqual(state, before);
});

test('TC-AC-008: invalid opponents, other phases and simultaneous bye/match cannot be published', () => {
  for (const mutate of [
    state => { state.matches[0].athleteB = state.matches[0].athleteA; },
    state => { state.matches[0].athleteB = 'other-event-entry'; },
    state => { state.matches[0].phase = 'final'; },
    state => { state.byeId = state.matches[0].athleteA; },
  ]) {
    const state = demo.createScenario('review');
    mutate(state);
    assert.ok(demo.pairingErrors(state).length > 0);
    assert.throws(() => demo.allocateMatches(state));
    assert.throws(() => demo.publishRound(state));
    assert.equal(state.roundStatus, 'DRAFT');
  }
});

test('MONO-AC-013: an odd field has one separate eligible bye without a fictional match', () => {
  const state = demo.createScenario('odd');
  assert.equal(state.participants.length, 9);
  assert.equal(state.matches.length, 4);
  assert.equal(state.byeId, 'p9');
  assert.ok(state.matches.every(match => match.athleteA !== state.byeId && match.athleteB !== state.byeId));
  assert.deepEqual(demo.pairingErrors(state), []);
  demo.allocateMatches(state);
  demo.publishRound(state);
  assert.equal(state.roundStatus, 'PUBLISHED');
  assert.ok(!Object.hasOwn(state, 'rankingCredit'));
});

test('TC-AC-007: publishing precedes calls and calling changes no athlete result or presence', () => {
  const state = demo.createScenario('review');
  assert.throws(() => demo.callNext(state, 'a1'), /Publique/);
  demo.allocateMatches(state);
  demo.publishRound(state);
  const people = structuredClone(state.participants);
  const match = demo.callNext(state, 'a1');
  assert.equal(match.id, 'm1');
  assert.equal(match.status, 'CALLED');
  assert.ok(!Object.hasOwn(match, 'outcome'));
  assert.deepEqual(state.participants, people);
  assert.throws(() => demo.callNext(state, 'a1'), /já tem atletas chamados/);
  assert.equal(demo.callNext(state, 'a2').id, 'm2');
  assert.deepEqual(state.matches.filter(item => item.arenaId === 'a1').map(item => item.order), [1,4,7]);
});

test('TC-012/013: published participants and Arena assignments are not silently regenerated', () => {
  const state = demo.createScenario('published');
  const before = structuredClone(state);
  assert.throws(() => demo.prepareRound(state), /já está publicada/);
  assert.throws(() => demo.allocateMatches(state), /já está publicada/);
  assert.throws(() => demo.addArena(state, '4', ''), /já está publicada/);
  assert.deepEqual(state, before);
  demo.setPresence(state, 'p1', false);
  assert.equal(state.matches[0].athleteA, 'p1');
});

test('TC-AC-017: quick entry permits homonyms and batch preview preserves separate people', () => {
  const state = demo.createScenario('empty');
  demo.addParticipants(state, ['Ana Exemplo']);
  const preview = demo.previewNames(' Ana Exemplo\n\nBia Exemplo\nAna Exemplo ', state.participants.map(person => person.name));
  assert.deepEqual(preview.values, ['Ana Exemplo','Bia Exemplo','Ana Exemplo']);
  assert.deepEqual(preview.duplicates, ['Ana Exemplo','Ana Exemplo']);
  demo.addParticipants(state, preview.values);
  assert.equal(state.participants.length, 4);
  assert.equal(new Set(state.participants.map(person => person.id)).size, 4);
  assert.ok(state.participants.every(person => person.origin === 'MANUAL'));
  assert.throws(() => demo.addParticipants(state, ['  ']), /ao menos um nome/);
});

test('empty preparation never claims to have created opponents with fewer than two players', () => {
  const state = demo.createScenario('empty');
  assert.throws(() => demo.prepareRound(state), /ao menos dois jogadores/);
  demo.addParticipants(state, ['Ana Exemplo']);
  assert.throws(() => demo.prepareRound(state), /ao menos dois jogadores/);
  assert.equal(state.matches.length, 0);
  demo.addParticipants(state, ['Bia Exemplo']);
  demo.prepareRound(state);
  assert.equal(state.matches.length, 1);
});

test('TC-AC-001: scenario instances and tournament preparation are isolated', () => {
  const first = demo.createScenario('preparation', 'first');
  const second = demo.createScenario('preparation', 'second');
  demo.setPresence(first, 'p1', true);
  demo.addArena(first, '4', 'Outra');
  assert.equal(second.participants[0].present, false);
  assert.equal(second.arenas.length, 3);
  assert.equal(second.event.id, 'second');
});

test('all named review scenarios have valid fixture references except the intentional conflict', () => {
  for (const key of Object.keys(demo.scenarioLabels)) {
    const state = demo.createScenario(key);
    assert.equal(new Set(state.participants.map(person => person.id)).size, state.participants.length);
    assert.equal(new Set(state.arenas.map(arena => arena.id)).size, state.arenas.length);
    if (key === 'conflict') assert.ok(demo.pairingErrors(state).length);
    else assert.deepEqual(demo.pairingErrors(state), []);
  }
  assert.throws(() => demo.createScenario('unknown'), /desconhecido/);
});

test('all screen rules and acceptance references resolve to repository specifications', () => {
  const specs = Object.values(demo.sources).map(file => read(file)).join('\n');
  const definitions = [...specs.matchAll(/^- \*\*([A-Z]+-(?:AC-)?\d+):\*\*/gm)].map(match => match[1]);
  for (const screen of demo.screens) {
    assert.match(screen.id, /^COND-WF-0[1-4]$/);
    for (const id of [...screen.rules,...screen.acceptance]) assert.ok(definitions.includes(id), `${screen.id}: ${id}`);
  }
  assert.equal(new Set(demo.screens.map(screen => screen.id)).size, 4);
});

function fragmentExists(filename, fragment) {
  if (!fragment) return true;
  if (filename.endsWith('.html')) {
    const [screen, scenario] = fragment.split('/');
    if (path.dirname(filename) !== directory) {
      const source = fs.readFileSync(path.join(path.dirname(filename), 'wireframes.js'), 'utf8');
      return source.includes(screen) && new RegExp(`\\b${scenario}\\s*:`).test(source);
    }
    return demo.screens.some(item => item.id === screen) && Object.hasOwn(demo.scenarioLabels, scenario);
  }
  const text = fs.readFileSync(filename, 'utf8');
  return [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].some(match => match[1].trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-') === fragment);
}

test('offline entry, styles, documentation and font references use available local assets', () => {
  for (const file of ['index.html','prototype.css','README.md']) {
    const text = read(file);
    const links = file.endsWith('.html') ? [...text.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
      : file.endsWith('.css') ? [...text.matchAll(/url\("([^"]+)"\)/g)].map(match => match[1])
      : [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
    for (const link of links) {
      if (/^(?:data:|https?:)/.test(link)) continue;
      const [target, fragment] = link.split('#');
      if (!target && file.endsWith('.html')) continue;
      const filename = path.resolve(directory, target || file);
      assert.ok(fs.existsSync(filename), `${file}: ${link}`);
      if (fragment) assert.ok(fragmentExists(filename, fragment), `${file}: #${fragment}`);
    }
  }
  for (const file of ['source-sans-3-OFL.txt','grenze-gotisch-OFL.txt','roboto-slab-LICENSE.txt']) assert.ok(fs.existsSync(path.resolve(directory, '../app-wireframes/fonts', file)));
});
