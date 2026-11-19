(function (root) {
  'use strict';
  const types = {LIMBS_POINT: ['Ponto Membros', 1], TARGET_POINT: ['Ponto Alvo', 3], CONTROL_POINT: ['Ponto Controle', 3], NO_SCORE: ['Sem Pontuação', 0], INCONCLUSIVE: ['Inconclusivo', 0]};
  const statusLabels = {SCHEDULED:'Agendada', CALLED:'Atletas chamados', RUNNING:'Em combate', PAUSED:'Pausada', AWAITING_CONFIRMATION:'Aguardando confirmação', FINALIZED:'Resultado oficial', NEEDS_REVIEW:'Revisão necessária'};
  const sideId = (match, side) => side === 'A' ? match.athleteA : match.athleteB;
  const same = (a, b) => a.units === b.units && a.firstBlood === b.firstBlood && a.threes === b.threes;
  const fail = message => { throw new Error(message); };
  const reasonRequired = reason => String(reason || '').trim() || fail('Informe o motivo desta ação.');

  function ensure(state) {
    state.phase ||= 'qualification';
    state.currentRound ||= 1;
    state.rounds ||= [];
    if (state.matches.length && !state.rounds.length) state.rounds.push({phase:'qualification',number:1,byeId:state.byeId,closed:false});
    state.qualifierIds ||= [];
    state.tieOrders ||= {};
    state.needsReview ||= [];
    state.audit ||= [];
    state.visibility ||= 'public';
    for (const match of state.matches) {
      match.bounds ||= [];
      match.elapsed ||= 0;
      match.anchor ??= null;
      match.wo ||= [];
    }
    state.selectedMatchId ||= state.matches[0]?.id;
    return state;
  }

  function clock(match, now = Date.now()) {
    return match.elapsed + (match.status === 'RUNNING' && match.anchor !== null ? Math.max(0, (now - match.anchor) / 1000) : 0);
  }

  function stop(match, now = Date.now()) {
    match.elapsed = match.duel ? clock(match, now) : Math.min(180, clock(match, now));
    match.anchor = null;
  }

  function refresh(state, now = Date.now()) {
    ensure(state);
    for (const match of state.matches) if (match.status === 'RUNNING' && !match.duel && clock(match, now) >= 180) {
      stop(match, now); match.status = 'AWAITING_CONFIRMATION'; match.ending = 'TIME';
    }
    const info = derived(state);
    for (const match of state.matches) if (['SCHEDULED','CALLED','RUNNING','PAUSED'].includes(match.status) && info.matches[match.id].ending === 'WO') {
      stop(match,now); match.status = 'AWAITING_CONFIRMATION';
    }
  }

  function derived(state) {
    const cards = Object.fromEntries(state.participants.map(person => [person.id, {yellow:0, red:0}]));
    const matches = {};
    for (const match of state.matches) {
      const value = {score:{A:0,B:0}, attacks:{A:0,B:0}, yellows:{A:0,B:0}, reds:{A:0,B:0}, verbals:{A:0,B:0}, valid:0, firstBlood:null, threes:{A:0,B:0}, accepted:0, winner:null, ending:null, pending:false, invalid:false};
      const priorExpelled = ['A','B'].filter(side => cards[sideId(match,side)]?.red >= 2);
      for (const bound of match.bounds || []) {
        if (bound.status !== 'CONFIRMED') continue;
        if (value.ending) value.invalid = true;
        value.accepted++;
        const points = types[bound.type][1];
        if (bound.type !== 'INCONCLUSIVE') value.valid++;
        if (points) {
          value.score[bound.side] += points; value.attacks[bound.side] += points;
          value.firstBlood ||= bound.side;
          if (points === 3) value.threes[bound.side]++;
        }
        for (const side of ['A','B']) if (bound.warning === side || bound.warning === 'BOTH') {
          value.verbals[side]++;
          if (value.verbals[side] % 2 === 0) {
            value.yellows[side]++; value.score[side]--;
            const card = cards[sideId(match, side)];
            card.yellow++;
            if (card.yellow % 2 === 0) { card.red++; value.reds[side]++; }
          }
        }
        if (value.reds.A || value.reds.B) value.ending = 'RED';
        else if (match.duel && points) { value.ending = 'DUEL'; value.winner = bound.side; }
        else if (!match.duel && value.valid >= 7) value.ending = 'LIMIT';
      }
      const losses = new Set([...(match.wo || []), ...priorExpelled, ...['A','B'].filter(side => value.reds[side])]);
      if (losses.size) {
        value.ending = value.reds.A || value.reds.B ? 'RED' : 'WO';
        value.pending = losses.size === 2;
        value.winner = value.pending ? null : losses.has('A') ? 'B' : 'A';
      } else if (!match.duel && (value.ending || match.ending === 'TIME')) {
        value.ending ||= match.ending;
        value.winner = value.score.A === value.score.B ? null : value.score.A > value.score.B ? 'A' : 'B';
      }
      if (value.valid > 7 && !match.duel) value.invalid = true;
      matches[match.id] = value;
    }
    return {matches, cards};
  }

  function matchById(state, id) { return state.matches.find(match => match.id === id) || fail('Luta não encontrada.'); }
  function writable(state, match) {
    if (match.status === 'FINALIZED') fail('Reabra o resultado com motivo antes de alterar a luta.');
    if (state.needsReview.includes(match.id)) fail('Reconcilie as dependências antes de operar esta luta.');
  }

  function start(state, id, now = Date.now()) {
    ensure(state); refresh(state, now);
    const match = matchById(state,id); writable(state,match);
    if (!match.duel && !match.confirmed && (match.phase !== state.phase || match.round !== state.currentRound)) fail('Esta luta pertence a outra rodada. Encerre a rodada atual antes de avançar.');
    if (!['CALLED','PAUSED'].includes(match.status)) fail('Chame os atletas ou pause a luta antes de iniciar.');
    if (derived(state).matches[id].ending || (!match.duel && clock(match,now) >= 180)) fail('A luta já atingiu uma condição de encerramento.');
    if (state.matches.some(item => item.id !== id && item.arenaId === match.arenaId && ['RUNNING','PAUSED','AWAITING_CONFIRMATION','CALLED'].includes(item.status))) fail('A Arena está ocupada por outra luta.');
    match.status = 'RUNNING'; match.anchor = now;
  }
  function pause(state,id,now = Date.now()) {
    const match = matchById(state,id); if (match.status !== 'RUNNING') fail('A luta não está em combate.');
    stop(match,now); match.status = !match.duel && match.elapsed >= 180 ? 'AWAITING_CONFIRMATION' : 'PAUSED';
    if (match.status === 'AWAITING_CONFIRMATION') match.ending = 'TIME';
  }
  function elapse(state,id,seconds,now = Date.now()) {
    const match = matchById(state,id); writable(state,match);
    if (match.status !== 'RUNNING') fail('Inicie o cronômetro antes de simular passagem de tempo.');
    match.elapsed = clock(match,now) + seconds; match.anchor = now; refresh(state,now);
  }

  function validateBound(match, bound) {
    if (!Object.hasOwn(types,bound.type)) fail('Selecione um resultado válido para o bound.');
    if (types[bound.type][1] ? !['A','B'].includes(bound.side) : bound.side !== 'NONE') fail('Pontos exigem lado A ou B. Resultados sem pontos exigem nenhum lado.');
    if (!['NONE','A','B','BOTH'].includes(bound.warning)) fail('Advertência inválida.');
    if (!Number.isFinite(bound.at) || bound.at < 0 || (!match.duel && bound.at > 180)) fail('O bound precisa ter ocorrido dentro do tempo de combate.');
  }
  function record(state,id,input,now = Date.now()) {
    ensure(state); refresh(state,now);
    const match = matchById(state,id); writable(state,match);
    if (!['RUNNING','PAUSED','AWAITING_CONFIRMATION'].includes(match.status)) fail('Inicie a luta antes de registrar bounds.');
    const bound = {...input, at:Number(input.at ?? Math.min(match.duel ? Infinity : 180,clock(match,now))), id:`b${(match.nextBound || match.bounds.length) + 1}`,status:'DRAFT'};
    validateBound(match,bound);
    if (bound.at > clock(match,now)) fail('O bound não pode ter ocorrido depois do tempo já combatido.');
    if (match.bounds.some(item => item.status !== 'VOIDED' && item.at > bound.at)) fail('O instante deve respeitar a ordem de combate. Revise o registro anterior.');
    match.nextBound = Number(bound.id.slice(1)); match.bounds.push(bound);
    return bound;
  }
  function accept(state,id,boundId,now = Date.now()) {
    const match = matchById(state,id); writable(state,match); refresh(state,now);
    const bound = match.bounds.find(item => item.id === boundId) || fail('Bound não encontrado.');
    if (bound.status !== 'DRAFT') fail('Este registro já foi tratado.');
    const before = derived(state).matches[id];
    if (before.ending && before.ending !== 'TIME') fail('O combate já terminou. Revise o rascunho pendente.');
    if (!match.duel && before.valid >= 7 && bound.type !== 'INCONCLUSIVE') fail('O oitavo bound válido não é permitido.');
    if (match.bounds.some(item => item.status === 'CONFIRMED' && match.bounds.indexOf(item) > match.bounds.indexOf(bound))) fail('Revise os bounds fora de ordem antes de aceitar este rascunho.');
    bound.status = 'CONFIRMED';
    const value = derived(state).matches[id];
    if (value.invalid) { bound.status = 'DRAFT'; fail('O bound excede o encerramento permitido.'); }
    if (value.ending) { stop(match,now); match.status = 'AWAITING_CONFIRMATION'; match.ending = value.ending; }
    state.published = false;
  }
  function declareWO(state,id,sides,reason,now = Date.now()) {
    const match = matchById(state,id); writable(state,match); const explanation = reasonRequired(reason);
    if (!sides.length || sides.some(side => !['A','B'].includes(side))) fail('Indique o atleta impossibilitado de continuar.');
    match.wo = [...new Set(sides)]; stop(match,now); match.status = 'AWAITING_CONFIRMATION';
    state.audit.push({action:'WO',match:id,who:'Equipe demo',when:new Date(now).toISOString(),reason:explanation});
    state.published = false;
  }
  function confirm(state,id) {
    const match = matchById(state,id);
    if (match.status === 'FINALIZED') return;
    writable(state,match);
    const value = derived(state).matches[id];
    if (match.status !== 'AWAITING_CONFIRMATION' || !value.ending) fail('Encerre o combate antes de confirmar o resultado.');
    if (match.bounds.some(bound => bound.status === 'DRAFT')) fail('Resolva ou anule todos os rascunhos antes de confirmar.');
    if (value.pending || value.invalid) fail('Decisão da organização pendente. Não há resultado automático.');
    match.status = 'FINALIZED'; match.confirmed = true;
    if (match.duel && (value.reds.A || value.reds.B)) {
      state.tieOrders = {};
      state.needsReview = [...new Set([...state.needsReview,'standings','tie-group'])];
    }
    state.published = false;
  }

  function ranking(state, phase = state.phase, official = true) {
    const info = derived(state);
    const ids = phase === 'final' ? state.qualifierIds : state.participants.map(person => person.id);
    const rows = ids.map(id => ({id,units:0,firstBlood:0,threes:0,wins:0,draws:0,losses:0,byes:0,red:0,credits:[]}));
    const byId = Object.fromEntries(rows.map(row => [row.id,row]));
    for (const match of state.matches.filter(item => item.phase === phase && (official ? item.status === 'FINALIZED' : ['FINALIZED','AWAITING_CONFIRMATION'].includes(item.status)))) {
      const value = info.matches[match.id];
      if (value.pending || value.invalid) continue;
      for (const side of ['A','B']) {
        const row = byId[sideId(match,side)]; if (!row) continue;
        let credit = 0;
        if (!match.duel) {
          const wo = ['WO','RED'].includes(value.ending);
          const win = value.winner === side;
          const draw = !value.winner && !wo;
          credit = win ? wo ? 42 : 42 + 4 * Math.abs(value.score.A - value.score.B) : draw ? 21 : 0;
          row.wins += Number(win); row.draws += Number(draw); row.losses += Number(!win && !draw);
          row.firstBlood += Number(value.firstBlood === side); row.threes += value.threes[side];
        }
        const penalty = value.reds[side] * 42;
        row.units += credit - penalty; row.red += value.reds[side];
        row.credits.push({matchId:match.id,credit,penalty,duel:Boolean(match.duel)});
      }
    }
    for (const round of state.rounds.filter(item => item.phase === phase && item.closed && item.byeId)) {
      const row = byId[round.byeId]; if (row) { row.units += 42; row.byes++; row.credits.push({bye:round.number,credit:42,penalty:0}); }
    }
    rows.forEach(row => { row.eligible = info.cards[row.id].red < 2 && state.participants.find(person => person.id === row.id)?.status === 'ACTIVE'; });
    rows.sort((a,b) => b.units-a.units || b.firstBlood-a.firstBlood || b.threes-a.threes || ids.indexOf(a.id)-ids.indexOf(b.id));
    return rows;
  }

  function tieKey(phase,ids) { return `${phase}:${[...ids].sort().join(',')}`; }
  function tieGroup(state,phase) {
    const rows = ranking(state,phase).filter(row => row.eligible);
    for (let start = 0; start < rows.length;) {
      let end = start + 1; while (end < rows.length && same(rows[start],rows[end])) end++;
      const relevant = phase === 'final' ? start < 3 : start < 4;
      if (relevant && end-start > 1) {
        const ids = rows.slice(start,end).map(row => row.id);
        if (!state.tieOrders[tieKey(phase,ids)]) return ids;
      }
      start = end;
    }
    return [];
  }
  function orderedRanking(state,phase) {
    const rows = ranking(state,phase);
    for (let start = 0; start < rows.length;) {
      let end = start+1; while (end < rows.length && same(rows[start],rows[end])) end++;
      const group = rows.slice(start,end); const order = state.tieOrders[tieKey(phase,group.filter(row => row.eligible).map(row => row.id))];
      if (order) rows.splice(start,end-start,...group.sort((a,b) => order.indexOf(a.id)-order.indexOf(b.id)));
      start = end;
    }
    return rows;
  }
  function closeRound(state) {
    const round = state.rounds.find(item => item.phase === state.phase && item.number === state.currentRound);
    if (!round) fail('Não há rodada publicada para encerrar.');
    const matches = state.matches.filter(match => !match.duel && match.phase === state.phase && match.round === state.currentRound);
    if (!matches.length || matches.some(match => match.status !== 'FINALIZED') || state.needsReview.length) fail('Confirme todas as lutas e reconcilie as dependências antes de encerrar.');
    round.closed = true;
  }
  function lastClosed(state,phase) { return state.rounds.filter(round => round.phase === phase && round.closed).length; }

  function makeMatch(state,a,b,phase,round,duel = false) {
    const match = {id:`${duel ? 'd' : phase === 'final' ? 'f' : 'q'}${round}-${state.matches.length+1}`,order:state.matches.length+1,phase,round,athleteA:a,athleteB:b,arenaId:state.arenas[state.nextArenaIndex++ % state.arenas.length]?.id,status:'SCHEDULED',bounds:[],elapsed:0,anchor:null,wo:[],duel};
    state.matches.push(match); return match;
  }
  function setupTie(state,phase = state.phase) {
    const ids = tieGroup(state,phase); if (!ids.length) fail('Não há empate relevante sem resolução.');
    const key = tieKey(phase,ids);
    if (state.matches.some(match => match.tieKey === key)) return;
    for (let a=0;a<ids.length;a++) for (let b=a+1;b<ids.length;b++) {
      const match = makeMatch(state,ids[a],ids[b],phase,phase === 'final' ? 4 : 8,true); match.tieKey = key;
    }
    state.selectedMatchId = state.matches.find(match => match.tieKey === key).id;
  }
  function resolveTie(state,phase = state.phase) {
    if (state.matches.some(match => match.confirmed && match.status !== 'FINALIZED') || Object.values(derived(state).matches).some(value => value.pending || value.invalid)) fail('Confirme a correção antes de revisar o empate.');
    const ids = tieGroup(state,phase); if (!ids.length) return;
    const key = tieKey(phase,ids); const matches = state.matches.filter(match => match.tieKey === key);
    if (matches.length !== ids.length*(ids.length-1)/2 || matches.some(match => match.status !== 'FINALIZED')) fail('Conclua os duelos do grupo antes de ordenar.');
    const info = derived(state); const wins = Object.fromEntries(ids.map(id => [id,0]));
    for (const match of matches) {
      if (info.matches[match.id].reds.A || info.matches[match.id].reds.B) fail('A sanção alterou o grupo original. Revise o empate.');
      wins[sideId(match,info.matches[match.id].winner)]++;
    }
    for (const a of ids) for (const b of ids) if (a !== b && wins[a] === wins[b]) {
      const first = state.participants.find(person => person.id === a)?.birthDate;
      const second = state.participants.find(person => person.id === b)?.birthDate;
      if (!first || !second) fail('Idade pendente. Confira a data completa em contexto privado da equipe.');
      if (first === second) fail('Datas exatamente iguais. Decisão da organização pendente.');
    }
    state.tieOrders[key] = [...ids].sort((a,b) => wins[b]-wins[a] || state.participants.find(person => person.id === a).birthDate.localeCompare(state.participants.find(person => person.id === b).birthDate));
  }
  function qualify(state) {
    if (lastClosed(state,'qualification') !== 7 || state.needsReview.length || tieGroup(state,'qualification').length) fail('Conclua sete rodadas, desempates e revisões antes de confirmar classificados.');
    if (state.qualifierIds.length) return;
    state.qualifierIds = orderedRanking(state,'qualification').filter(row => row.eligible).slice(0,4).map(row => row.id);
    if (state.qualifierIds.length !== 4) { state.qualifierIds = []; fail('São necessários quatro atletas elegíveis.'); }
    const [a,b,c,d] = state.qualifierIds;
    [[a,d],[b,c],[a,c],[d,b],[a,b],[c,d]].forEach(([first,second],index) => makeMatch(state,first,second,'final',Math.floor(index/2)+1));
    for (let number=1;number<=3;number++) state.rounds.push({phase:'final',number,closed:false});
    state.phase = 'final'; state.currentRound = 1; state.selectedMatchId = state.matches.find(match => match.phase === 'final').id; state.published = false;
  }
  function publish(state) {
    if (lastClosed(state,'final') !== 3 || state.needsReview.length || tieGroup(state,'final').length) fail('Conclua a final, os desempates e as revisões antes de publicar.');
    if (orderedRanking(state,'final').filter(row => row.eligible).length < 3) fail('Pódio pendente. Menos de três atletas elegíveis.');
    state.published = true;
  }

  function impact(state,id) {
    const index = state.matches.findIndex(match => match.id === id);
    const following = state.matches.slice(index+1).map(match => match.id);
    state.needsReview = [...new Set([...state.needsReview,...following,'standings',...(state.qualifierIds.length ? ['qualifiers','podium'] : [])])];
    state.tieOrders = {}; state.published = false;
    state.rounds.filter(round => round.phase === state.matches[index].phase && round.number >= state.matches[index].round).forEach(round => { round.reviewWasClosed ||= round.closed; round.closed = false; });
  }
  function reopen(state,id,reason,now = Date.now()) {
    const match = matchById(state,id); const explanation = reasonRequired(reason);
    if (match.status !== 'FINALIZED') fail('Apenas um resultado oficial pode ser reaberto.');
    const before = structuredClone(derived(state).matches[id]);
    impact(state,id); match.status = 'AWAITING_CONFIRMATION';
    state.audit.push({action:'REOPEN',match:id,who:'Equipe demo',when:new Date(now).toISOString(),reason:explanation,before,after:structuredClone(derived(state).matches[id])});
  }
  function edit(state,id,boundId,patch,reason,now = Date.now()) {
    const match = matchById(state,id); writable(state,match); const explanation = reasonRequired(reason);
    const bound = match.bounds.find(item => item.id === boundId) || fail('Bound não encontrado.');
    const before = structuredClone(bound); const beforeMatch = derived(state).matches[id];
    const updated = {...bound,...patch}; validateBound(match,updated);
    if (!['DRAFT','CONFIRMED','VOIDED'].includes(updated.status)) fail('Estado de bound inválido.');
    Object.assign(bound,updated);
    if (derived(state).matches[id].invalid) { Object.assign(bound,before); fail('A correção excede o limite ou mantém registros após o encerramento.'); }
    if (match.confirmed) impact(state,id);
    if (beforeMatch.ending && !derived(state).matches[id].ending && match.status !== 'RUNNING') match.status = 'AWAITING_CONFIRMATION';
    state.audit.push({action:'BOUND',match:id,who:'Equipe demo',when:new Date(now).toISOString(),reason:explanation,before,after:structuredClone(bound)});
    state.published = false;
  }
  function returnPaused(state,id,reason) {
    const match = matchById(state,id); writable(state,match); reasonRequired(reason);
    if (match.status !== 'AWAITING_CONFIRMATION' || derived(state).matches[id].ending || (!match.duel && match.elapsed >= 180)) fail('Não há tempo ou condição para retornar ao combate.');
    match.ending = null; match.status = 'PAUSED';
    state.audit.push({action:'RETURN_PAUSED',match:id,who:'Equipe demo',when:new Date().toISOString(),reason});
  }
  function reconcile(state,reason) {
    reasonRequired(reason);
    const info = derived(state);
    if (state.matches.some(match => match.confirmed && match.status !== 'FINALIZED') || Object.values(info.matches).some(value => value.pending || value.invalid)) fail('Resolva e confirme a luta corrigida antes da reconciliação.');
    if (state.qualifierIds.length) {
      if (tieGroup(state,'qualification').length) fail('A correção requer novo desempate antes de validar a final.');
      const next = orderedRanking(state,'qualification').filter(row => row.eligible).slice(0,4).map(row => row.id);
      if (JSON.stringify(next) !== JSON.stringify(state.qualifierIds)) fail('Classificados alterados. Final preservada para decisão da organização. Não há substituição automática nesta prévia.');
    }
    state.audit.push({action:'RECONCILE',who:'Equipe demo',when:new Date().toISOString(),reason,dependencies:[...state.needsReview]});
    for (const round of state.rounds.filter(item => item.reviewWasClosed)) {
      if (state.matches.filter(match => !match.duel && match.phase === round.phase && match.round === round.number).every(match => match.status === 'FINALIZED')) round.closed = true;
      delete round.reviewWasClosed;
    }
    state.needsReview = [];
  }

  function allowed(state,audience) { return state.visibility !== 'internal' || ['admin','member'].includes(audience); }
  function projection(state,audience = 'visitor') {
    if (!allowed(state,audience)) return {restricted:true};
    const info = derived(state);
    return {restricted:false,eventName:state.event.name,visibility:state.visibility,published:Boolean(state.published),review:state.needsReview.length > 0,
      participants:state.participants.map(person => ({id:person.id,name:person.name,expelled:info.cards[person.id].red >= 2})),
      arenas:state.arenas.map(arena => ({id:arena.id,number:arena.number,name:arena.name})),
      matches:state.roundStatus !== 'PUBLISHED' ? [] : state.matches.map(match => ({id:match.id,phase:match.phase,round:match.round,athleteA:match.athleteA,athleteB:match.athleteB,arenaId:match.arenaId,status:match.status,duel:Boolean(match.duel),
        score:{...info.matches[match.id].score},firstBlood:info.matches[match.id].firstBlood,valid:info.matches[match.id].valid,pending:info.matches[match.id].pending,
        bounds:match.bounds.filter(bound => bound.status === 'CONFIRMED').map(bound => ({id:bound.id,type:bound.type,side:bound.side,warning:bound.warning,at:bound.at}))})),
      qualification:orderedRanking(state,'qualification').map(({id,units,firstBlood,threes,eligible}) => ({id,units,firstBlood,threes,eligible})),
      final:orderedRanking(state,'final').map(({id,units,firstBlood,threes,eligible}) => ({id,units,firstBlood,threes,eligible}))};
  }

  // Reviewed fixtures accelerate the walkthrough. They are not a Swiss pairing engine.
  const rotationRounds = Array.from({length:15},(_,round) => {
    const ring = Array.from({length:15},(_,index) => index+2);
    for (let step=0;step<round;step++) ring.unshift(ring.pop());
    const entries = [1,...ring]; return Array.from({length:8},(_,index) => [`p${entries[index]}`,`p${entries[15-index]}`]);
  });
  function fixtureResult(state,match,winner = 'A') {
    match.bounds = [{id:'b1',type:'LIMBS_POINT',side:winner,warning:'NONE',at:8,status:'CONFIRMED'}];
    match.elapsed = 180; match.anchor = null; match.ending = 'TIME'; match.status = 'FINALIZED'; match.confirmed = true;
  }
  function nextFixtureRound(state) {
    ensure(state);
    if (state.phase !== 'qualification' || state.participants.length !== 16 || state.participants.some(person => derived(state).cards[person.id].red >= 2)) fail('As rodadas preparadas exigem os 16 atletas ativos do cenário. Outra situação fica para revisão da organização.');
    closeRound(state);
    if (state.currentRound >= 7) return;
    const played = new Set(state.matches.filter(match => !match.duel && match.phase === 'qualification').map(match => [match.athleteA,match.athleteB].sort().join(',')));
    const pairs = rotationRounds.find(candidate => candidate.every(pair => !played.has([...pair].sort().join(',')))) || fail('O roteiro preparado não cobre esses adversários. Revise os confrontos.');
    state.currentRound++;
    for (const [a,b] of pairs) makeMatch(state,a,b,'qualification',state.currentRound);
    state.rounds.push({phase:'qualification',number:state.currentRound,closed:false});
  }
  function completeFixtureRound(state) {
    if (state.needsReview.length) fail('Reconcilie as dependências antes de aplicar um roteiro preparado.');
    const info = derived(state);
    const pending = state.matches.filter(item => !item.duel && item.phase === state.phase && item.round === state.currentRound && item.status !== 'FINALIZED');
    for (const match of pending) {
      if (match.bounds.length || match.status === 'AWAITING_CONFIRMATION') fail('Confirme a luta interativa antes de completar as demais pelo roteiro.');
      if (info.cards[match.athleteA].red >= 2 || info.cards[match.athleteB].red >= 2) fail('O roteiro não substitui uma revisão de expulsão.');
    }
    for (const match of pending) {
      const winner = Number(match.athleteA.slice(1)) < Number(match.athleteB.slice(1)) ? 'A' : 'B';
      fixtureResult(state,match,winner);
    }
    closeRound(state);
  }
  function decorate(state,key) {
    ensure(state);
    if (!['combat','wo','discipline','expulsion','cut-tie','minigroup','equal-age','correction','final-ready','save-error','internal'].includes(key)) return state;
    state.participants.forEach((person,index) => { person.present = true; person.birthDate = `${1980+index}-01-01`; });
    state.matches = []; state.rounds = [];
    for (const [a,b] of rotationRounds[0]) makeMatch(state,a,b,'qualification',1);
    state.roundStatus = 'PUBLISHED'; state.rounds.push({phase:'qualification',number:1,closed:false});
    state.selectedMatchId = state.matches[0].id; state.matches[0].status = 'CALLED';
    if (key === 'internal') state.visibility = 'internal';
    if (key === 'save-error') state.simulateSaveError = true;
    if (key === 'discipline') {
      const prior = state.matches[1]; prior.athleteA = state.matches[0].athleteA;
      prior.bounds = Array.from({length:2},(_,index) => ({id:`b${index+1}`,type:'INCONCLUSIVE',side:'NONE',warning:'A',at:index,status:'CONFIRMED'}));
      prior.status = 'FINALIZED'; prior.confirmed = true; prior.ending = 'TIME'; prior.elapsed = 180;
      state.matches.splice(1,1); state.matches.forEach(match => { match.round = 2; });
      state.matches.unshift(prior); prior.phase = 'qualification'; prior.round = 1; prior.id = 'history-yellow';
      state.currentRound = 2; state.rounds = [{phase:'qualification',number:1,closed:true},{phase:'qualification',number:2,closed:false}];
    }
    if (key === 'expulsion') {
      const current = state.matches[0];
      const histories = [4,2].map((count,index) => ({...structuredClone(current),id:`history-${index+1}`,round:index+1,status:'FINALIZED',confirmed:true,elapsed:180,ending:'TIME',bounds:Array.from({length:count},(_,number) => ({id:`b${number+1}`,type:'INCONCLUSIVE',side:'NONE',warning:'A',at:number,status:'CONFIRMED'}))}));
      state.matches.forEach(match => { match.round = 3; });
      state.matches.unshift(...histories); state.currentRound = 3;
      state.rounds = [{phase:'qualification',number:1,closed:true},{phase:'qualification',number:2,closed:true},{phase:'qualification',number:3,closed:false}];
      const future = makeMatch(state,current.athleteA,'p2','qualification',4);
      future.fixtureFuture = true;
    }
    if (['cut-tie','minigroup','equal-age','correction','final-ready'].includes(key)) {
      state.matches = []; state.rounds = []; state.nextArenaIndex = 0;
      for (let round=1;round<=7;round++) {
        for (const [a,b] of rotationRounds[round-1]) {
          const match = makeMatch(state,a,b,'qualification',round);
          fixtureResult(state,match,Number(a.slice(1)) < Number(b.slice(1)) ? 'A' : 'B');
        }
        state.rounds.push({phase:'qualification',number:round,closed:true});
      }
      state.currentRound = 7; state.selectedMatchId = state.matches[0].id;
      if (['cut-tie','minigroup','equal-age'].includes(key)) {
        // Zero-score draws give an intentional, reproducible group at the cut.
        for (const match of state.matches) { match.bounds = []; match.ending = 'TIME'; }
        const leaders = ['p1','p2','p3'];
        const group = key === 'cut-tie' ? ['p4','p5'] : ['p4','p5','p6'];
        for (const match of state.matches) if (leaders.includes(match.athleteA) !== leaders.includes(match.athleteB) && !group.includes(match.athleteA) && !group.includes(match.athleteB)) fixtureResult(state,match,leaders.includes(match.athleteA) ? 'A' : 'B');
        state.participants.forEach(person => { if (!leaders.includes(person.id) && !group.includes(person.id)) person.status = 'WITHDRAWN'; });
        if (key === 'equal-age') group.forEach(id => { state.participants.find(person => person.id === id).birthDate = '1990-01-01'; });
        state.fixtureTieIds = group;
        const distinction = state.matches.find(match => match.bounds.length && (match.athleteA === 'p2' || match.athleteB === 'p2') && sideId(match,match.bounds[0].side) === 'p2');
        if (distinction) distinction.bounds[0].type = 'TARGET_POINT';
      }
      if (key === 'final-ready' || key === 'correction') {
        while (tieGroup(state,'qualification').length) {
          setupTie(state,'qualification');
          for (const match of state.matches.filter(item => item.duel && item.status !== 'FINALIZED')) fixtureResult(state,match,'A');
          resolveTie(state,'qualification');
        }
        qualify(state);
        if (key === 'correction') {
          for (let round=1;round<=3;round++) { state.currentRound = round; completeFixtureRound(state); }
          publish(state); state.selectedMatchId = state.matches[0].id;
        }
      }
    }
    return state;
  }
  const api = {types,statusLabels,ensure,clock,refresh,derived,start,pause,elapse,record,accept,declareWO,confirm,ranking,orderedRanking,tieGroup,setupTie,resolveTie,closeRound,qualify,publish,reopen,edit,returnPaused,reconcile,projection,allowed,completeFixtureRound,nextFixtureRound,decorate,lastClosed};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ConductionSports = api;
})(typeof globalThis === 'object' ? globalThis : this);
