(function (root) {
  'use strict';

  const names = ['Ana Exemplo', 'Bia Exemplo', 'Caio Exemplo', 'Davi Exemplo', 'Eva Exemplo', 'Fábio Exemplo', 'Gabi Exemplo', 'Hugo Exemplo', 'Íris Exemplo', 'João Exemplo', 'Lia Exemplo', 'Mauro Exemplo', 'Nina Exemplo', 'Otto Exemplo', 'Rita Exemplo', 'Theo Exemplo'];
  const scenarioLabels = {
    preparation: 'Preparação inicial', review: 'Rodada em revisão', odd: 'Número ímpar e folga',
    published: 'Rodada publicada', called: 'Atletas chamados', 'no-arenas': 'Sem Arenas',
    empty: 'Sem participantes', minor: 'Verificação presencial pendente',
    conflict: 'Confronto inválido', error: 'Falha de carregamento',
  };
  const sources = {
    conduction: '../../tournaments/conduction.md',
    event: '../../tournaments/events/monomachia-2027.md',
    access: '../../identity/authentication-and-access.md',
    privacy: '../../tournaments/consent-and-privacy.md',
  };
  const screens = [
    {id: 'COND-WF-01', title: 'Preparação', heading: 'Preparar torneio', rules: ['TC-001', 'TC-002', 'TC-008', 'TC-009'], acceptance: ['TC-AC-001', 'TC-AC-002', 'TC-AC-004'], note: 'Arenas são áreas numeradas com nome opcional. A preparação pertence à equipe com acesso admin existente.'},
    {id: 'COND-WF-02', title: 'Participantes', heading: 'Participantes e check-in', rules: ['TC-004', 'TC-006', 'TC-007', 'PRIV-010'], acceptance: ['TC-AC-003', 'TC-AC-017', 'TC-AC-018'], note: 'Marcar presença não altera inscrição, elegibilidade, confrontos ou resultado. Dados e requisitos de menores são fictícios nesta revisão.'},
    {id: 'COND-WF-03', title: 'Rodadas', heading: 'Rodadas e confrontos', rules: ['TC-009', 'TC-011', 'TC-012', 'TC-013', 'MONO-016'], acceptance: ['TC-AC-005', 'TC-AC-006', 'TC-AC-008'], note: 'Os confrontos desta primeira rodada usam a ordem inicial do cenário. A distribuição entre Arenas é cíclica e independente da formação de adversários.'},
    {id: 'COND-WF-04', title: 'Arenas e chamadas', heading: 'Arenas e chamadas', rules: ['TC-002', 'TC-009', 'TC-010', 'TC-013'], acceptance: ['TC-AC-002', 'TC-AC-005', 'TC-AC-007'], note: 'A fila mantém a ordem das lutas. A chamada é explícita e não gera WO por ausência. Qualquer admin pode operar qualquer Arena.'},
  ];

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
    return state;
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
    const queue = state.matches.filter(match => match.arenaId === arenaId);
    if (queue.some(match => match.status === 'CALLED')) throw new Error('Esta Arena já tem atletas chamados. O início da luta pertence à próxima etapa da prévia.');
    const match = queue.find(item => item.status === 'SCHEDULED');
    if (!match) throw new Error('Não há luta aguardando chamada nesta Arena.');
    match.status = 'CALLED';
    return match;
  }

  const demo = {scenarioLabels, screens, sources, createScenario, setPresence, addParticipants, previewNames, addArena, prepareRound, pairingErrors, allocateMatches, publishRound, callNext};
  if (typeof module === 'object' && module.exports) module.exports = demo;
  else root.ConductionDemo = demo;
})(typeof globalThis === 'object' ? globalThis : this);
