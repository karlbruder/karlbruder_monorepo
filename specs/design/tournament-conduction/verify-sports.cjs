const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const demo = require('./scenarios.js');
const sport = require('./sports-demo.js');
const now = 100000;
function playing(key = 'combat') {
  const state = demo.createScenario(key);
  const match = state.matches.find(item => item.id === state.selectedMatchId);
  sport.start(state,match.id,now);
  return {state,match};
}
function attack(state,match,type = 'LIMBS_POINT',side = 'A',warning = 'NONE',at = 0) {
  const bound = sport.record(state,match.id,{type,side,warning,at},now);
  sport.accept(state,match.id,bound.id,now);
  return bound;
}
function end(state,match) { sport.elapse(state,match.id,180,now); sport.confirm(state,match.id); }
function value(state,match) { return sport.derived(state).matches[match.id]; }
function row(state,id,phase = 'qualification') { return sport.ranking(state,phase).find(item => item.id === id); }

test('MONO-007: 1/3/3 attacks, zero-score valid bounds and inconclusive records have distinct totals', () => {
  const {state,match} = playing();
  attack(state,match); attack(state,match,'TARGET_POINT','B'); attack(state,match,'CONTROL_POINT','A');
  attack(state,match,'NO_SCORE','NONE'); attack(state,match,'INCONCLUSIVE','NONE');
  assert.deepEqual(value(state,match).score,{A:4,B:3});
  assert.equal(value(state,match).valid,4); assert.equal(value(state,match).accepted,5);
  assert.equal(value(state,match).firstBlood,'A'); assert.deepEqual(value(state,match).threes,{A:1,B:1});
  assert.throws(() => attack(state,match,'TARGET_POINT','NONE'),/lado A ou B/);
  assert.throws(() => attack(state,match,'NO_SCORE','A'),/nenhum lado/);
});
test('TC-015/RES-005: draft and failed sends never affect the spectator, score or official ranking', () => {
  const {state,match} = playing('save-error');
  const bound = sport.record(state,match.id,{type:'TARGET_POINT',side:'A',warning:'NONE',at:0},now);
  assert.equal(value(state,match).score.A,0);
  assert.equal(sport.projection(state).matches[0].bounds.length,0);
  assert.equal(row(state,match.athleteA).units,0);
  sport.accept(state,match.id,bound.id,now);
  const consulted = sport.projection(state,'member').matches[0];
  assert.equal(consulted.score.A,3); assert.equal(consulted.bounds.length,1); assert.equal(consulted.arenaId,match.arenaId);
  assert.equal(row(state,match.athleteA).units,0);
});
test('MONO-008: the seventh valid bound ends combat and an eighth valid bound is rejected', () => {
  const {state,match} = playing();
  for (let index=0;index<7;index++) attack(state,match,'NO_SCORE','NONE');
  assert.equal(match.status,'AWAITING_CONFIRMATION'); assert.equal(value(state,match).valid,7);
  const draft = sport.record(state,match.id,{type:'LIMBS_POINT',side:'A',warning:'NONE',at:0},now);
  assert.throws(() => sport.accept(state,match.id,draft.id,now),/terminou|oitavo/);
  assert.throws(() => sport.confirm(state,match.id),/rascunhos/);
  sport.edit(state,match.id,draft.id,{status:'VOIDED'},'Registro indevido'); sport.confirm(state,match.id);
  assert.equal(row(state,match.athleteA).units,21);
});
test('MONO-008/TC-014: elapsed combat time survives serialization and pause excludes wall time', () => {
  const {state,match} = playing();
  assert.equal(sport.clock(match,now+30000),30);
  sport.pause(state,match.id,now+30000);
  assert.equal(sport.clock(match,now+130000),30);
  const restored = JSON.parse(JSON.stringify(state)); const resumed = restored.matches[0];
  sport.start(restored,resumed.id,now+130000);
  sport.refresh(restored,now+280000);
  assert.equal(resumed.elapsed,180); assert.equal(resumed.status,'AWAITING_CONFIRMATION');
  assert.equal(value(restored,resumed).winner,null);
});
test('MONO-008: recording a bound does not pause or restart the running clock', () => {
  const {state,match} = playing(); attack(state,match);
  assert.equal(match.status,'RUNNING'); assert.equal(match.anchor,now); assert.equal(sport.clock(match,now+15000),15);
  assert.throws(() => sport.record(state,match.id,{type:'LIMBS_POINT',side:'A',warning:'NONE',at:181},now+181000),/tempo de combate/);
  const fresh = playing();
  assert.throws(() => sport.record(fresh.state,fresh.match.id,{type:'LIMBS_POINT',side:'A',warning:'NONE',at:100},now),/tempo já combatido/);
});
test('MONO-013: a 7 × 4 victory uses exact 9/7 credit and confirmation is idempotent', () => {
  const {state,match} = playing();
  for (const [type,side] of [['TARGET_POINT','A'],['CONTROL_POINT','A'],['LIMBS_POINT','A'],['TARGET_POINT','B'],['LIMBS_POINT','B']]) attack(state,match,type,side);
  end(state,match); assert.deepEqual(value(state,match).score,{A:7,B:4});
  assert.equal(row(state,match.athleteA).units,54); assert.equal(row(state,match.athleteB).units,0);
  const before = sport.ranking(state); sport.confirm(state,match.id); assert.deepEqual(sport.ranking(state),before);
});
test('MONO-013/014: a 5 × 5 draw credits 0.5 each and retains first blood', () => {
  const {state,match} = playing();
  for (const side of ['A','B']) for (const type of ['TARGET_POINT','LIMBS_POINT','LIMBS_POINT']) attack(state,match,type,side);
  end(state,match); assert.equal(row(state,match.athleteA).units,21); assert.equal(row(state,match.athleteB).units,21);
  assert.equal(row(state,match.athleteA).firstBlood,1); assert.equal(row(state,match.athleteA).threes,1);
});
test('MONO-010/011: two verbals in one match create one yellow, permit negative scores and no first blood', () => {
  const {state,match} = playing();
  attack(state,match,'INCONCLUSIVE','NONE','A'); attack(state,match,'INCONCLUSIVE','NONE','A');
  assert.deepEqual(value(state,match).score,{A:-1,B:0}); assert.equal(value(state,match).firstBlood,null);
  end(state,match); assert.equal(row(state,match.athleteB).units,46); assert.equal(row(state,match.athleteA).units,0);
});
test('MONO-010: one verbal in each of two matches never promotes to yellow', () => {
  const {state,match} = playing(); attack(state,match,'INCONCLUSIVE','NONE','A'); end(state,match);
  const next = {...structuredClone(match),id:'second',round:2,status:'CALLED',bounds:[],elapsed:0,anchor:null,ending:null,confirmed:false}; state.matches.push(next);
  state.currentRound = 2;
  sport.start(state,next.id,now); attack(state,next,'INCONCLUSIVE','NONE','A');
  assert.equal(sport.derived(state).cards[match.athleteA].yellow,0);
});
test('MONO-011/015: yellows across matches generate a red WO with phase-local −1 and fixed opponent credit', () => {
  const {state,match} = playing('discipline');
  attack(state,match,'TARGET_POINT','A');
  attack(state,match,'INCONCLUSIVE','NONE','A'); attack(state,match,'INCONCLUSIVE','NONE','A');
  assert.equal(value(state,match).ending,'RED'); assert.equal(value(state,match).winner,'B');
  assert.equal(value(state,match).score.A,2);
  sport.confirm(state,match.id);
  assert.equal(row(state,match.athleteB).units,42);
  assert.equal(row(state,match.athleteA).credits.find(item => item.matchId === match.id).penalty,42);
  assert.equal(row(state,match.athleteA).firstBlood,1);
});
test('MONO-012: the second red expels and published future opponents receive WO without repeating sanctions', () => {
  const {state,match} = playing();
  for (let index=0;index<4;index++) attack(state,match,'INCONCLUSIVE','NONE','A'); sport.confirm(state,match.id);
  const next = {...structuredClone(match),id:'second-red',round:2,status:'CALLED',bounds:[],elapsed:0,anchor:null,ending:null,confirmed:false}; state.matches.push(next);
  state.currentRound = 2;
  sport.start(state,next.id,now); for (let index=0;index<4;index++) attack(state,next,'INCONCLUSIVE','NONE','A'); sport.confirm(state,next.id);
  const later = {...structuredClone(next),id:'future',round:3,status:'SCHEDULED',bounds:[],elapsed:0,anchor:null,ending:null,confirmed:false}; state.matches.push(later);
  sport.refresh(state,now); assert.equal(later.status,'AWAITING_CONFIRMATION'); sport.confirm(state,later.id);
  assert.equal(row(state,match.athleteA).eligible,false); assert.equal(row(state,match.athleteA).units,-84);
  assert.equal(row(state,match.athleteB).units,126); assert.equal(value(state,later).reds.A,0);
});
test('MONO-015: WO retains actual partial attacks, first blood and 3-point bounds without margin bonus', () => {
  const {state,match} = playing(); attack(state,match,'TARGET_POINT','A');
  sport.declareWO(state,match.id,['A'],'Impossibilidade fictícia',now); sport.confirm(state,match.id);
  assert.deepEqual(value(state,match).score,{A:3,B:0}); assert.equal(row(state,match.athleteB).units,42);
  assert.equal(row(state,match.athleteA).firstBlood,1); assert.equal(row(state,match.athleteA).threes,1);
});
test('MONO-022: double WO and simultaneous reds stay pending without an invented winner', () => {
  const first = playing(); sport.declareWO(first.state,first.match.id,['A','B'],'Ambos impossibilitados',now);
  assert.equal(value(first.state,first.match).pending,true); assert.throws(() => sport.confirm(first.state,first.match.id),/organização pendente/);
  const second = playing(); for (let index=0;index<4;index++) attack(second.state,second.match,'INCONCLUSIVE','NONE','BOTH');
  assert.equal(value(second.state,second.match).pending,true); assert.equal(value(second.state,second.match).winner,null);
  assert.equal(sport.derived(second.state).cards[second.match.athleteA].red,1);
  assert.throws(() => sport.confirm(second.state,second.match.id),/organização pendente/);
});
test('MONO-015: closing a bye round credits once without creating a match, attack or win', () => {
  const state = demo.createScenario('odd'); demo.allocateMatches(state); demo.publishRound(state);
  sport.completeFixtureRound(state); sport.closeRound(state); sport.closeRound(state);
  const bye = row(state,state.byeId); assert.equal(bye.units,42); assert.equal(bye.wins,0); assert.equal(bye.firstBlood,0); assert.equal(bye.threes,0);
  assert.equal(state.matches.length,4);
});
test('MONO-020: correction and voiding recompute first blood, warnings, score and valid count', () => {
  const {state,match} = playing();
  const first = attack(state,match,'LIMBS_POINT','A','A'); attack(state,match,'TARGET_POINT','B','A');
  sport.edit(state,match.id,first.id,{type:'INCONCLUSIVE',side:'NONE'},'Revisão do ataque');
  assert.equal(value(state,match).firstBlood,'B'); assert.equal(value(state,match).yellows.A,1);
  sport.edit(state,match.id,first.id,{status:'VOIDED'},'Ataque anulado');
  assert.equal(value(state,match).yellows.A,0); assert.equal(value(state,match).valid,1);
});
test('MONO-020/TC-019: removing the seventh bound requires explicit return to paused and separate resume', () => {
  const {state,match} = playing();
  for (let index=0;index<7;index++) attack(state,match,'NO_SCORE','NONE');
  sport.edit(state,match.id,'b7',{status:'VOIDED'},'Sétimo registro anulado');
  assert.equal(match.status,'AWAITING_CONFIRMATION'); assert.throws(() => sport.start(state,match.id,now),/Chame/);
  sport.returnPaused(state,match.id,'Retomar tempo restante'); assert.equal(match.status,'PAUSED');
  match.confirmed = true; state.phase = 'final';
  sport.start(state,match.id,now); assert.equal(match.status,'RUNNING');
});
test('MONO-018/019: duels allow scoreless bounds beyond seven and end on the first scoring attack', () => {
  const state = demo.createScenario('cut-tie'); sport.setupTie(state);
  const match = state.matches.at(-1); match.status = 'CALLED'; sport.start(state,match.id,now);
  const before = sport.ranking(state);
  for (let index=0;index<9;index++) attack(state,match,'NO_SCORE','NONE');
  sport.elapse(state,match.id,240,now); assert.equal(match.status,'RUNNING');
  attack(state,match,'LIMBS_POINT','B'); assert.equal(value(state,match).winner,'B'); sport.confirm(state,match.id);
  assert.deepEqual(sport.ranking(state),before.map(row => ({...row,credits:row.credits.concat([match.athleteA,match.athleteB].includes(row.id) ? [{matchId:match.id,credit:0,penalty:0,duel:true}] : [])})));
  sport.resolveTie(state); assert.equal(sport.tieGroup(state,'qualification').length,0);
  sport.qualify(state); assert.equal(state.qualifierIds[3],match.athleteB);
});
test('MONO-018: a scoring attack wins a duel even when its net score stays negative', () => {
  const state = demo.createScenario('cut-tie'); sport.setupTie(state); const match = state.matches.at(-1); match.status = 'CALLED'; sport.start(state,match.id,now);
  attack(state,match,'INCONCLUSIVE','NONE','A'); attack(state,match,'INCONCLUSIVE','NONE','A');
  attack(state,match,'LIMBS_POINT','A'); assert.equal(value(state,match).winner,'A'); assert.equal(value(state,match).score.A,0);
});
function cycle(key) {
  const state = demo.createScenario(key); sport.setupTie(state);
  const duels = state.matches.filter(match => match.duel);
  for (let index=0;index<duels.length;index++) { const match = duels[index]; match.status = 'CALLED'; sport.start(state,match.id,now); attack(state,match,'LIMBS_POINT',index === 1 ? 'B' : 'A'); sport.confirm(state,match.id); }
  return state;
}
test('MONO-018: a cyclic minigroup uses verified age, with no regular phase credit', () => {
  const state = cycle('minigroup'); sport.resolveTie(state); sport.qualify(state); assert.equal(state.qualifierIds[3],'p4');
});
test('MONO-022: equal or missing birth dates block the age decision', () => {
  const state = cycle('equal-age'); assert.throws(() => sport.resolveTie(state),/exatamente iguais/);
  delete state.participants.find(person => person.id === 'p4').birthDate;
  assert.throws(() => sport.resolveTie(state),/Idade pendente/); assert.equal(state.qualifierIds.length,0);
});
test('MONO-017/021: confirmed qualifiers create exactly six distinct final pairs and reset phase statistics', () => {
  const state = demo.createScenario('final-ready'); assert.equal(state.qualifierIds.length,4);
  const final = state.matches.filter(match => match.phase === 'final'); assert.equal(final.length,6);
  assert.equal(new Set(final.map(match => [match.athleteA,match.athleteB].sort().join(','))).size,6);
  assert.deepEqual(final.map(match => [state.qualifierIds.indexOf(match.athleteA),state.qualifierIds.indexOf(match.athleteB)]),[[0,3],[1,2],[0,2],[3,1],[0,1],[2,3]]);
  assert.ok(sport.ranking(state,'final').every(row => row.units === 0 && row.firstBlood === 0 && row.threes === 0));
  assert.throws(() => sport.publish(state),/Conclua a final/);
  for (let round=1;round<=3;round++) { state.currentRound = round; sport.completeFixtureRound(state); }
  sport.publish(state); assert.equal(state.published,true);
});
test('TC-020/RES-009: reopening requires a reason, preserves final pairings and blocks dependent publication', () => {
  const state = demo.createScenario('correction'); const match = state.matches[0];
  const pairs = state.matches.filter(match => match.phase === 'final').map(match => [match.athleteA,match.athleteB]);
  assert.throws(() => sport.reopen(state,match.id,''),/motivo/);
  sport.reopen(state,match.id,'Conferência do registro',now);
  assert.equal(state.published,false); assert.ok(state.needsReview.includes('podium')); assert.ok(state.needsReview.includes('qualifiers'));
  assert.throws(() => sport.publish(state),/revisões/);
  assert.deepEqual(state.matches.filter(match => match.phase === 'final').map(match => [match.athleteA,match.athleteB]),pairs);
  assert.ok(state.audit[0].before); assert.ok(state.audit[0].after); assert.equal(state.audit[0].who,'Equipe demo');
  assert.throws(() => sport.reconcile(state,'Conferido'),/confirme/);
  sport.confirm(state,match.id);
  while (sport.tieGroup(state,'qualification').length) sport.resolveTie(state,'qualification');
  sport.reconcile(state,'Todos os impactos conferidos'); assert.equal(state.needsReview.length,0);
  assert.equal(sport.lastClosed(state,'qualification'),7); sport.publish(state); assert.equal(state.published,true);
});
test('MONO-020: correcting a warning removes the subsequent red without duplicate deductions', () => {
  const {state,match} = playing('discipline');
  attack(state,match,'INCONCLUSIVE','NONE','A'); const bound = attack(state,match,'INCONCLUSIVE','NONE','A');
  assert.equal(sport.derived(state).cards[match.athleteA].red,1);
  sport.edit(state,match.id,bound.id,{warning:'NONE'},'Advertência indevida');
  assert.equal(sport.derived(state).cards[match.athleteA].red,0); assert.equal(value(state,match).score.A,0);
  assert.equal(value(state,match).ending,null);
});
test('RES-004/010: public projections allow visitor/member/admin sports and deny guests of internal events', () => {
  const state = demo.createScenario('internal');
  assert.deepEqual(sport.projection(state,'visitor'),{restricted:true});
  state.participants[0].privateNote = 'PRIVATE_SENTINEL'; state.audit.push({reason:'PRIVATE_SENTINEL'});
  for (const audience of ['member','admin']) {
    const projection = sport.projection(state,audience); const text = JSON.stringify(projection);
    assert.equal(projection.restricted,false);
    assert.doesNotMatch(text,/PRIVATE_SENTINEL|birthDate|registrationStatus|origin|audit|guardianCheckPending|present/);
    assert.deepEqual(Object.keys(projection.participants[0]),['id','name','expelled']);
  }
  state.visibility = 'public'; assert.equal(sport.projection(state,'visitor').restricted,false);
});
test('RES-005/010: shared read-only composition hides editor forms, drafts, private reasons and audit', () => {
  const state = demo.createScenario('combat'); const match = state.matches[0];
  sport.start(state,match.id,now); sport.record(state,match.id,{type:'TARGET_POINT',side:'A',warning:'NONE',at:0},now);
  state.audit.push({reason:'PRIVATE_SENTINEL'});
  const window = {ConductionSports:sport}; vm.runInNewContext(fs.readFileSync(`${__dirname}/sports-views.js`,'utf8'),{window,setTimeout});
  const view = window.createConductionViews({state:() => state,escape:String,badge:text => text,route:id => id,notify:() => {},render:() => {},audience:() => 'visitor',drafts:() => ({})});
  const html = view.view('COND-WF-09');
  assert.doesNotMatch(html,/bound-form|data-sport=|PRIVATE_SENTINEL|Rascunho|sport-reason|birthDate/);
  assert.match(html,/Nenhum bound aceito/);
  assert.throws(() => view.handle('confirm',{}),/não permite editar/);
});
test('MONO-016: the seven-round prepared walkthrough never repeats a regular opponent pair', () => {
  const state = demo.createScenario('called');
  for (let round=1;round<=7;round++) { sport.completeFixtureRound(state); if (round<7) sport.nextFixtureRound(state); }
  assert.equal(state.matches.length,56); assert.equal(sport.lastClosed(state,'qualification'),7);
  assert.equal(new Set(state.matches.map(match => [match.athleteA,match.athleteB].sort().join(','))).size,56);
  for (let index=0;index<state.matches.length;index++) assert.equal(state.matches[index].arenaId,state.arenas[index%3].id);
});

test('TC-013: a future regular match cannot start before the current round is closed', () => {
  const state = demo.createScenario('final-ready');
  const match = state.matches.find(item => item.phase === 'final' && item.round === 2); match.status = 'CALLED';
  assert.throws(() => sport.start(state,match.id,now),/outra rodada/);
});
test('TC-022: fixture completion rejects an unresolved interactive match before modifying other results', () => {
  const state = demo.createScenario('combat'); const match = state.matches.at(-1); match.status = 'CALLED';
  sport.start(state,match.id,now); attack(state,match);
  const before = structuredClone(state);
  assert.throws(() => sport.completeFixtureRound(state),/Confirme a luta interativa/);
  assert.deepEqual(state,before);
});
test('MONO-012: expulsion fixture makes the published future match an opponent WO without a repeated red', () => {
  const {state,match} = playing('expulsion');
  assert.equal(sport.derived(state).cards[match.athleteA].red,1);
  attack(state,match,'INCONCLUSIVE','NONE','A'); attack(state,match,'INCONCLUSIVE','NONE','A'); sport.confirm(state,match.id);
  sport.refresh(state,now); const future = state.matches.find(item => item.fixtureFuture);
  assert.equal(future.status,'AWAITING_CONFIRMATION'); assert.equal(value(state,future).winner,'B');
  assert.equal(value(state,future).reds.A,0); assert.equal(row(state,match.athleteA).eligible,false);
});
test('MONO-017/019: cards cross phases while old deductions stay in their original phase', () => {
  const state = demo.createScenario('discipline');
  const match = state.matches.find(item => item.id === state.selectedMatchId);
  match.phase = 'final'; match.round = 1; state.phase = 'final'; state.currentRound = 1;
  state.qualifierIds = [match.athleteA,match.athleteB,'p3','p4'];
  const qualificationBefore = sport.ranking(state,'qualification');
  sport.start(state,match.id,now); attack(state,match,'INCONCLUSIVE','NONE','A'); attack(state,match,'INCONCLUSIVE','NONE','A'); sport.confirm(state,match.id);
  assert.equal(sport.derived(state).cards[match.athleteA].red,1);
  assert.deepEqual(sport.ranking(state,'qualification'),qualificationBefore);
  assert.equal(row(state,match.athleteA,'final').units,-42); assert.equal(row(state,match.athleteB,'final').units,42);
});
test('MONO-019: a red in a duel deducts phase ranking, awards no sporting credit and flags the tied group', () => {
  const state = demo.createScenario('cut-tie'); sport.setupTie(state);
  const match = state.matches.at(-1); match.status = 'CALLED'; const before = row(state,match.athleteA).units;
  sport.start(state,match.id,now); for (let index=0;index<4;index++) attack(state,match,'INCONCLUSIVE','NONE','A'); sport.confirm(state,match.id);
  assert.equal(row(state,match.athleteA).units,before-42);
  assert.equal(row(state,match.athleteB).credits.at(-1).credit,0);
  assert.ok(state.needsReview.includes('tie-group')); assert.throws(() => sport.qualify(state),/revisões/);
});
test('MONO-014: tied official rows share a position until the sporting tie-break resolves them', () => {
  const state = demo.createScenario('cut-tie');
  const window = {ConductionSports:sport}; vm.runInNewContext(fs.readFileSync(`${__dirname}/sports-views.js`,'utf8'),{window,setTimeout});
  const view = window.createConductionViews({state:() => state,escape:String,badge:text => text,route:id => id,notify:() => {},render:() => {},audience:() => 'visitor',drafts:() => ({})});
  const html = view.view('COND-WF-06');
  assert.match(html,/<td>4 · empate · corte<\/td><td>Davi Exemplo/);
  assert.match(html,/<td>4 · empate · corte<\/td><td>Eva Exemplo/);
});
