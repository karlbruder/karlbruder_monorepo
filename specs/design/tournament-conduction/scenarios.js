(function (root) {
  'use strict';
  const sports = typeof module === 'object' && module.exports ? require('./sports-demo.js') : root.ConductionSports;

  const names = ['Ana Exemplo', 'Bia Exemplo', 'Caio Exemplo', 'Davi Exemplo', 'Eva Exemplo', 'Fábio Exemplo', 'Gabi Exemplo', 'Hugo Exemplo', 'Íris Exemplo', 'João Exemplo', 'Lia Exemplo', 'Mauro Exemplo', 'Nina Exemplo', 'Otto Exemplo', 'Rita Exemplo', 'Theo Exemplo'];
  const scenarioLabels = {
    preparation: 'Preparação inicial', review: 'Rodada em revisão', odd: 'Número ímpar e folga',
    published: 'Rodada publicada', called: 'Atletas chamados', 'no-arenas': 'Sem Arenas',
    empty: 'Sem participantes', minor: 'Verificação presencial pendente',
    conflict: 'Confronto inválido', error: 'Falha de carregamento',
    combat: 'Luta interativa', wo: 'WO e duplo WO', discipline: 'Amarelo acumulado', expulsion:'Segundo vermelho e expulsão',
    'cut-tie':'Empate no corte', minigroup:'Minigrupo de desempate', 'equal-age':'Idades iguais',
    correction:'Correção após publicação', 'final-ready':'Classificados e final',
    'save-error':'Falha no envio do bound', internal:'Evento interno',
  };
  const sources = {
    conduction: '../../tournaments/conduction.md',
    event: '../../tournaments/events/monomachia-2027.md',
    access: '../../identity/authentication-and-access.md',
    privacy: '../../tournaments/consent-and-privacy.md',
    results: '../../tournaments/results.md',
  };
  const screens = [
    {id: 'COND-WF-01', title: 'Preparação', heading: 'Preparar torneio', rules: ['TC-001', 'TC-002', 'TC-008', 'TC-009'], acceptance: ['TC-AC-001', 'TC-AC-002', 'TC-AC-004'], note: 'Arenas são áreas numeradas com nome opcional. A preparação pertence à equipe com acesso admin existente.'},
    {id: 'COND-WF-02', title: 'Participantes', heading: 'Participantes e check-in', rules: ['TC-004', 'TC-006', 'TC-007', 'PRIV-010'], acceptance: ['TC-AC-003', 'TC-AC-017', 'TC-AC-018'], note: 'Marcar presença não altera inscrição, elegibilidade, confrontos ou resultado. Dados e requisitos de menores são fictícios nesta revisão.'},
    {id: 'COND-WF-03', title: 'Rodadas', heading: 'Rodadas e confrontos', rules: ['TC-009', 'TC-011', 'TC-012', 'TC-013', 'MONO-016'], acceptance: ['TC-AC-005', 'TC-AC-006', 'TC-AC-008'], note: 'Os confrontos desta primeira rodada usam a ordem inicial do cenário. A distribuição entre Arenas é cíclica e independente da formação de adversários.'},
    {id: 'COND-WF-04', title: 'Arenas e chamadas', heading: 'Arenas e chamadas', rules: ['TC-002', 'TC-009', 'TC-010', 'TC-013'], acceptance: ['TC-AC-002', 'TC-AC-005', 'TC-AC-007'], note: 'A fila mantém a ordem das lutas. A chamada é explícita e não gera WO por ausência. Qualquer admin pode operar qualquer Arena.'},
    {id:'COND-WF-05',title:'Luta e bounds',heading:'Conduzir luta',rules:['TC-014','TC-015','TC-016','TC-017','MONO-007','MONO-010','MONO-011'],acceptance:['TC-AC-009','TC-AC-010','TC-AC-011','MONO-AC-006','MONO-AC-009'],note:'O cronômetro continua durante o registro. Bounds aceitos aparecem na consulta antes da confirmação oficial da luta.'},
    {id:'COND-WF-06',title:'Classificação',heading:'Classificação da fase',rules:['TC-018','RES-006','MONO-013','MONO-014','MONO-015'],acceptance:['RES-AC-007','MONO-AC-011','MONO-AC-012'],note:'A classificação oficial considera resultados confirmados. Valores exatos decidem a ordem. WO e folga não recebem bônus de saldo.'},
    {id:'COND-WF-07',title:'Avanço e final',heading:'Classificados e final',rules:['TC-023','MONO-006','MONO-017','MONO-018','MONO-019','MONO-021','RES-009'],acceptance:['MONO-AC-005','MONO-AC-014','MONO-AC-015','RES-AC-008'],note:'Sete rodadas, desempate no corte, quatro classificados e seis confrontos únicos. Publicar o resultado final é uma ação própria.'},
    {id:'COND-WF-08',title:'Correções',heading:'Correções e dependências',rules:['TC-019','TC-020','MONO-020','MONO-022','RES-010'],acceptance:['TC-AC-014','TC-AC-015','MONO-AC-017','RES-AC-009'],note:'Reabertura e alteração exigem motivo. A história posterior fica preservada e exige revisão explícita antes de nova confirmação ou publicação.'},
    {id:'COND-WF-09',title:'Acompanhamento',heading:'Acompanhar torneio',rules:['TC-018','TC-021','RES-004','RES-005','RES-008','RES-011','RES-012','PRIV-006'],acceptance:['TC-AC-012','RES-AC-004','RES-AC-006','RES-AC-010','RES-AC-011','RES-AC-012'],note:'Mesma composição esportiva em modo de leitura. Evento interno admite somente membros e admins. Sem dados privados ou controles de edição.'},
  ];

  function sourceLink(id) {
    if (id.startsWith('RES-')) return sources.results + (id.includes('-AC-') ? '#acceptance-criteria' : '#confirmed-direction');
    if (id.startsWith('MONO-')) return sources.event + (id.includes('-AC-') ? '#acceptance-criteria' : '#conduction-rules');
    if (id.startsWith('PRIV-')) return sources.privacy + '#rules';
    return sources.conduction + (id.includes('-AC-') ? '#acceptance-criteria' : '#rules');
  }

  function participant(number, name, origin = 'TEST') {
    return {id: `p${number}`, name, origin, present: false, status: 'ACTIVE', registrationStatus: 'confirmed', guardianCheckPending: false};
  }

  function createScenario(key = 'preparation', eventId = 'monomachia-demo') {
    if (!Object.hasOwn(scenarioLabels, key)) throw new Error('Cenário desconhecido.');
    const state = {
      event: {id: eventId, name: 'Monomachia · demonstração', format: 'Swiss → Round robin'}, initialScenario: key,
      arenas: [{id: 'a1', number: 1, name: 'Arena bonita'}, {id: 'a2', number: 2, name: ''}, {id: 'a3', number: 3, name: 'Arena central'}],
      participants: names.slice(0, key === 'odd' ? 9 : 16).map((name, index) => participant(index + 1, name)),
      matches: [], byeId: null, roundStatus: 'DRAFT', nextArenaIndex: 0, serviceError: key === 'error',
    };
    if (key === 'empty') state.participants = [];
    if (key === 'no-arenas') state.arenas = [];
    if (key === 'minor') state.participants[0].guardianCheckPending = true;
    if (['review', 'odd', 'published', 'called', 'no-arenas', 'conflict'].includes(key)) prepareRound(state);
    if (key === 'conflict') state.matches[0].athleteB = state.matches[0].athleteA;
    if (['published', 'called'].includes(key)) {
      state.participants.forEach(person => { person.present = true; });
      allocateMatches(state);
      publishRound(state);
    }
    if (key === 'called') callNext(state, 'a1');
    return sports.decorate(state,key);
  }

  function ensureDraft(state) {
    if (state.roundStatus !== 'DRAFT') throw new Error('A rodada já está publicada. Reinicie o cenário para revisar outra preparação.');
  }

  function setPresence(state, id, present) {
    const person = state.participants.find(item => item.id === id);
    if (!person) throw new Error('Participante não encontrado.');
    person.present = Boolean(present);
  }

  function addParticipants(state, values, origin = 'MANUAL') {
    ensureDraft(state);
    if (state.matches.length) throw new Error('Adicione participantes antes de preparar os confrontos nesta prévia.');
    const clean = values.map(value => String(value).trim()).filter(Boolean);
    if (!clean.length) throw new Error('Informe ao menos um nome.');
    const added = clean.map(name => {
      const person = participant(state.participants.length + 1, name, origin);
      state.participants.push(person);
      return person;
    });
    return added;
  }

  function previewNames(text, existingNames = []) {
    const values = String(text).split(/\r?\n/).map(name => name.trim()).filter(Boolean);
    const seen = new Set(existingNames.map(name => name.toLocaleLowerCase('pt-BR')));
    const duplicates = [];
    for (const name of values) {
      const normalized = name.toLocaleLowerCase('pt-BR');
      if (seen.has(normalized)) duplicates.push(name);
      seen.add(normalized);
    }
    return {values, duplicates};
  }

  function addArena(state, number, name) {
    ensureDraft(state);
    if (number === '' || !Number.isInteger(Number(number)) || Number(number) < 0) throw new Error('Informe um número inteiro para a Arena.');
    if (state.arenas.some(arena => arena.number === Number(number))) throw new Error('Já existe uma Arena com esse número.');
    if (state.matches.some(match => match.arenaId)) throw new Error('Recrie a sugestão antes de mudar as Arenas nesta prévia.');
    const arena = {id: `a${Number(number)}`, number: Number(number), name: String(name).trim()};
    state.arenas.push(arena);
    return arena;
  }

  function prepareRound(state) {
    ensureDraft(state);
    const entries = state.participants.filter(person => person.status === 'ACTIVE');
    if (entries.length < 2) throw new Error('Adicione ao menos dois jogadores para preparar confrontos nesta prévia.');
    state.matches = [];
    state.byeId = entries.length % 2 ? entries[entries.length - 1].id : null;
    for (let index = 0; index + 1 < entries.length; index += 2) {
      const number = state.matches.length + 1;
      state.matches.push({id: `m${number}`, order: number, phase: 'qualification', round: 1, athleteA: entries[index].id, athleteB: entries[index + 1].id, arenaId: null, status: 'SCHEDULED'});
    }
    state.nextArenaIndex = 0;
  }

  function pairingErrors(state) {
    const errors = [];
    const used = new Set();
    for (const match of state.matches) {
      if (match.phase !== 'qualification' || match.round !== 1) errors.push('A luta deve pertencer à fase e rodada em revisão.');
      for (const id of [match.athleteA, match.athleteB]) {
        const person = state.participants.find(entry => entry.id === id);
        if (!person || person.status !== 'ACTIVE') errors.push('O confronto contém participante não elegível ou de outro torneio.');
        if (used.has(id)) errors.push('Um participante aparece mais de uma vez na rodada.');
        if (id === state.byeId) errors.push('Um participante não pode lutar e receber folga na mesma rodada.');
        used.add(id);
      }
      if (match.athleteA === match.athleteB) errors.push('Um atleta não pode enfrentar a si mesmo.');
    }
    if (state.byeId && !state.participants.some(person => person.id === state.byeId && person.status === 'ACTIVE')) errors.push('A folga exige um participante elegível desta fase.');
    return [...new Set(errors)];
  }

  function allocateMatches(state, count = Infinity) {
    ensureDraft(state);
    if (!state.arenas.length) throw new Error('Configure ao menos uma Arena para distribuir as lutas.');
    const errors = pairingErrors(state);
    if (errors.length) throw new Error(errors.join(' '));
    let assigned = 0;
    for (const match of state.matches) {
      if (match.arenaId || assigned >= count) continue;
      match.arenaId = state.arenas[state.nextArenaIndex % state.arenas.length].id;
      state.nextArenaIndex++;
      assigned++;
    }
    return assigned;
  }

  function publishRound(state) {
    ensureDraft(state);
    const errors = pairingErrors(state);
    if (errors.length) throw new Error(errors.join(' '));
    if (!state.matches.length) throw new Error('Prepare os confrontos antes de publicar a rodada.');
    if (!state.arenas.length || state.matches.some(match => !state.arenas.some(arena => arena.id === match.arenaId))) throw new Error('Distribua todas as lutas entre as Arenas antes de publicar.');
    state.roundStatus = 'PUBLISHED';
  }

  function callNext(state, arenaId) {
    if (state.roundStatus !== 'PUBLISHED') throw new Error('Publique a rodada antes de chamar os atletas.');
    if (!state.arenas.some(arena => arena.id === arenaId)) throw new Error('Arena não encontrada.');
    const queue = state.matches.filter(match => match.arenaId === arenaId && match.phase === (state.phase || 'qualification') && match.round === (state.currentRound || 1) && !match.duel);
    if (queue.some(match => ['CALLED','RUNNING','PAUSED','AWAITING_CONFIRMATION'].includes(match.status))) throw new Error('Esta Arena já tem atletas chamados ou uma luta em operação.');
    const match = queue.find(item => item.status === 'SCHEDULED');
    if (!match) throw new Error('Não há luta aguardando chamada nesta Arena.');
    match.status = 'CALLED';
    return match;
  }

  const demo = {scenarioLabels, screens, sources, sourceLink, createScenario, setPresence, addParticipants, previewNames, addArena, prepareRound, pairingErrors, allocateMatches, publishRound, callNext};
  if (typeof module === 'object' && module.exports) module.exports = demo;
  else root.ConductionDemo = demo;
})(typeof globalThis === 'object' ? globalThis : this);
