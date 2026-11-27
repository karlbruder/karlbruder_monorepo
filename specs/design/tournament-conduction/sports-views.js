(function (root) {
  'use strict';
  root.createConductionViews = function ({state,escape,badge,route,notify,render,audience,drafts}) {
    const sport = root.ConductionSports;
    const name = id => state().participants.find(person => person.id === id)?.name || '—';
    const admin = () => audience() === 'admin';
    const seconds = value => `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
    const points = units => (units/42).toLocaleString('pt-BR',{maximumFractionDigits:6});
    function position(rows,row,phase) {
      if (!row.eligible) return '—';
      const eligible = rows.filter(item => item.eligible);
      const tied = eligible.filter(item => item.units === row.units && item.firstBlood === row.firstBlood && item.threes === row.threes);
      const resolved = state().tieOrders[`${phase}:${tied.map(item => item.id).sort().join(',')}`];
      const ordinal = eligible.indexOf(tied.length > 1 && !resolved ? tied[0] : row)+1;
      return `${ordinal}${tied.length > 1 && !resolved ? ' · empate' : ''}${ordinal <= 4 && phase === 'qualification' ? ' · corte' : ''}`;
    }
    const button = (action,label,disabled = false,extra = '') => `<button type="button" data-sport="${action}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
    const reason = () => `<label for="sport-reason">Motivo (privado da equipe)<textarea id="sport-reason" data-draft>${escape(drafts()['sport-reason'] || '')}</textarea></label>`;
    const selected = () => state().matches.find(match => match.id === state().selectedMatchId) || state().matches[0];
    const matchLabel = match => `${match.duel ? 'Desempate' : match.phase === 'final' ? 'Final' : 'Classificatória'} · R${match.round} · ${name(match.athleteA)} × ${name(match.athleteB)}`;
    function picker() {
      return `<label for="match-picker">Luta em foco<select id="match-picker">${state().matches.map(match => `<option value="${match.id}" ${match.id === selected()?.id ? 'selected' : ''}>${escape(matchLabel(match))}</option>`).join('')}</select></label>`;
    }
    const empty = () => `<div class="empty"><h3>Nenhuma luta publicada</h3><p>Prepare e publique uma rodada para acompanhar os confrontos.</p>${admin() ? `<a href="${route('COND-WF-03')}">Revisar rodada →</a>` : ''}</div>`;
    const phasePicker = () => `<label for="phase-picker">Fase consultada<select id="phase-picker"><option value="qualification" ${(state().viewPhase || state().phase) === 'qualification' ? 'selected' : ''}>Classificatória</option><option value="final" ${(state().viewPhase || state().phase) === 'final' ? 'selected' : ''}>Final</option></select></label>`;
    function restricted() { return '<div class="empty"><h3>Acesso restrito</h3><p>Este evento interno está disponível apenas para membros e admins. Nenhum dado esportivo foi exibido.</p></div>'; }
    function impactBanner() {
      return state().needsReview.length ? '<div class="callout"><strong>Revisão necessária.</strong> Uma correção alterou informações usadas adiante. Classificação, classificados e pódio permanecem sob revisão. A publicação está bloqueada.</div>' : '';
    }
    function ledger(match,editable) {
      const bounds = editable ? match.bounds : match.bounds.filter(bound => bound.status === 'CONFIRMED');
      return `<section class="panel"><h3>Bounds da luta</h3><p class="small muted">Ordem de combate · pontos do ataque e advertências independentes</p>${bounds.length ? `<ol class="bound-list">${bounds.map((bound,index) => `<li><div><strong>${index+1}. ${sport.types[bound.type][0]}</strong><span class="subline">${bound.side === 'NONE' ? 'Sem lado pontuador' : `Lado ${bound.side}`} · ${seconds(bound.at)} · Advertência: ${bound.warning === 'NONE' ? 'nenhuma' : bound.warning === 'BOTH' ? 'ambos' : bound.warning}</span></div><div>${badge(bound.status === 'CONFIRMED' ? 'Aceito' : bound.status === 'VOIDED' ? 'Anulado' : 'Rascunho', bound.status === 'CONFIRMED' ? 'good' : '')}${editable && bound.status === 'DRAFT' ? button('send',`Enviar ${bound.id}`,Boolean(state().pendingBound),`data-bound="${bound.id}"`) + button('void',`Anular ${bound.id}`,false,`data-bound="${bound.id}"`) : ''}</div></li>`).join('')}</ol>` : '<p class="muted">Nenhum bound aceito até agora.</p>'}</section>`;
    }
    function sharedMatch(editable = false) {
      const current = state(); const match = selected();
      if (!match || current.roundStatus !== 'PUBLISHED') return empty();
      const info = sport.derived(current); const value = info.matches[match.id];
      const editableNow = editable && match.status !== 'FINALIZED' && !current.needsReview.includes(match.id);
      const elapsed = sport.clock(match); const remaining = Math.max(0,180-elapsed);
      return `${impactBanner()}${picker()}<section class="match-hero"><div class="match-context"><span>${escape(match.duel ? 'Duelo · primeiro ataque pontuador' : `${match.phase === 'final' ? 'Final' : 'Classificatória'} · Rodada ${match.round}`)}</span>${badge(sport.statusLabels[match.status],match.status === 'FINALIZED' ? 'good' : '')}<span>${escape(current.arenas.find(arena => arena.id === match.arenaId) ? `Arena ${current.arenas.find(arena => arena.id === match.arenaId).number}` : 'Sem Arena')}</span></div><div class="scoreboard"><div><span>Lado A</span><h3>${escape(name(match.athleteA))}</h3><strong>${value.score.A}</strong><p>Ataques ${value.attacks.A} · descontos ${value.yellows.A}</p></div><div class="score-clock"><span>${match.duel ? 'Tempo decorrido' : 'Tempo restante'}</span><strong id="match-clock">${seconds(match.duel ? elapsed : remaining)}</strong><span>${value.valid}${match.duel ? '' : ' / 7'} bounds válidos</span><span>${value.accepted} registros aceitos</span></div><div><span>Lado B</span><h3>${escape(name(match.athleteB))}</h3><strong>${value.score.B}</strong><p>Ataques ${value.attacks.B} · descontos ${value.yellows.B}</p></div></div><p class="match-summary">${value.pending ? 'Decisão da organização pendente · sem vencedor automático' : value.ending ? `${value.ending === 'WO' || value.ending === 'RED' ? 'WO' : value.ending === 'DUEL' ? 'Primeiro ataque pontuador' : value.ending === 'LIMIT' ? 'Limite de bounds' : 'Tempo encerrado'} · ${value.winner ? `vantagem de ${escape(name(value.winner === 'A' ? match.athleteA : match.athleteB))}` : 'empate'}` : 'Placar provisório · combate ainda sem resultado oficial'}</p></section>
      <dl class="stats"><div><dt>First blood</dt><dd class="stat-name">${escape(value.firstBlood ? name(value.firstBlood === 'A' ? match.athleteA : match.athleteB) : 'Nenhum')}</dd></div><div><dt>Bounds de 3 pontos · A / B</dt><dd>${value.threes.A} / ${value.threes.B}</dd></div><div><dt>Cartões no torneio · A / B</dt><dd class="stat-name">Amarelos ${info.cards[match.athleteA].yellow} / ${info.cards[match.athleteB].yellow}<br>Vermelhos ${info.cards[match.athleteA].red} / ${info.cards[match.athleteB].red}</dd></div></dl>
      <p class="helper">Advertências nesta luta: A ${value.verbals.A} (${value.verbals.A%2} sem par) · B ${value.verbals.B} (${value.verbals.B%2} sem par). Cada par gera amarelo e −1 no placar. Dois amarelos no torneio geram vermelho e WO.</p>
      ${editable ? `<section class="panel"><h3>Operar combate</h3><div class="actions">${button('start',match.status === 'PAUSED' ? 'Retomar combate' : 'Iniciar combate',!editableNow || !['CALLED','PAUSED'].includes(match.status))}${button('pause','Pausar combate',!editableNow || match.status !== 'RUNNING')}${button('confirm','Confirmar resultado oficial',!editableNow || match.status !== 'AWAITING_CONFIRMATION' || value.pending)}</div><p class="helper">O registro de bounds não pausa o cronômetro. Somente a confirmação do resultado afeta a classificação oficial.</p><details><summary>Controle de tempo da demonstração</summary><p>Adianta apenas o relógio fictício. O cronômetro também corre enquanto esta aba está aberta.</p>${button('time','Simular +30 segundos',match.status !== 'RUNNING')}${button('end-time','Simular fim do tempo',match.status !== 'RUNNING' || match.duel)}</details></section>` : ''}
      ${editableNow ? `<section class="panel"><h3>Registrar bound</h3><form id="bound-form" class="stack"><div class="form-row"><label for="bound-type">Resultado<select id="bound-type" data-draft>${Object.entries(sport.types).map(([key,[label]]) => `<option value="${key}" ${drafts()['bound-type'] === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label for="bound-side">Lado pontuador<select id="bound-side" data-draft>${[['A','Atleta A'],['B','Atleta B'],['NONE','Nenhum']].map(([key,label]) => `<option value="${key}" ${drafts()['bound-side'] === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label for="bound-warning">Advertência verbal<select id="bound-warning" data-draft>${[['NONE','Nenhuma'],['A','Atleta A'],['B','Atleta B'],['BOTH','Ambos']].map(([key,label]) => `<option value="${key}" ${drafts()['bound-warning'] === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><label for="bound-at">Instante do combate em segundos (opcional para registro tardio)<input id="bound-at" type="number" min="0" ${match.duel ? '' : 'max="180"'} step="0.1" data-draft value="${escape(drafts()['bound-at'] || '')}" placeholder="Tempo atual do combate"></label><button type="submit" ${!['RUNNING','PAUSED','AWAITING_CONFIRMATION'].includes(match.status) ? 'disabled' : ''}>Salvar rascunho de bound</button></form><p class="helper">Revise o rascunho e envie. A aceitação simulada atualiza imediatamente a consulta. Rascunhos e falhas ficam somente com a equipe.</p>${current.pendingBound ? '<p role="status">Enviando bound… aguardando aceitação simulada.</p>' : ''}</section>` : ''}
      ${ledger(match,editable)}
      ${editableNow ? `<section class="panel"><h3>Encerramento por WO</h3><p>Preserve o placar real. Não há bônus de saldo nem placar fictício 1 × 0.</p><label for="wo-side">Impossibilitado de continuar<select id="wo-side"><option value="A">Atleta A</option><option value="B">Atleta B</option><option value="BOTH">Ambos (decisão pendente)</option></select></label>${reason()}${button('wo','Declarar WO')}</section>` : ''}
      <div class="actions"><a href="${route(editable ? 'COND-WF-09' : 'COND-WF-06')}">${editable ? 'Consultar acompanhamento' : 'Ver classificação'} →</a>${editable ? `<a href="${route('COND-WF-08')}">Reabrir ou corrigir →</a>` : ''}</div>`;
    }
    function standings(phase = state().phase) {
      const rows = sport.orderedRanking(state(),phase);
      return `${impactBanner()}<section class="panel"><h3>${phase === 'final' ? 'Final' : 'Classificatória'} · classificação oficial</h3><p>Resultados confirmados · ${sport.lastClosed(state(),phase)} rodadas encerradas. As casas decimais são apenas apresentação. A comparação usa valores exatos.</p>${rows.length ? `<div class="table-region" role="region" tabindex="0" aria-label="Classificação, com rolagem horizontal"><table><caption>Pontos → first bloods → bounds de 3 pontos → desempate → idade</caption><thead><tr><th>Posição</th><th>Atleta</th><th>Pontos</th><th>First bloods</th><th>Bounds 3 pts</th><th>Situação</th></tr></thead><tbody>${rows.map(row => `<tr><td>${position(rows,row,phase)}</td><td>${escape(name(row.id))}</td><td>${points(row.units)}<span class="subline">${row.units}/42 exatos</span></td><td>${row.firstBlood}</td><td>${row.threes}</td><td>${badge(row.eligible ? 'Elegível' : 'Fora da classificação',row.eligible ? '' : 'warning')}</td></tr>`).join('')}</tbody></table></div>` : '<p>A fase ainda não tem classificados confirmados.</p>'}
      <p class="helper">Vitória: 1 + saldo líquido / 10,5. Empate: 0,5. Derrota: 0. WO ou folga: 1 fixo. Vermelho: −1 na fase de emissão. Saldo de derrotas não é descontado.</p>
      ${admin() ? `<details><summary>Créditos e descontos por atleta</summary>${rows.filter(row => row.credits.length).map(row => `<h4>${escape(name(row.id))}</h4><ul>${row.credits.map(item => `<li>${item.bye ? `Folga R${item.bye}` : escape(item.matchId)}: +${points(item.credit)}${item.penalty ? ` −${points(item.penalty)} por vermelho` : ''}${item.duel ? ' · duelo sem crédito esportivo' : ''}</li>`).join('')}</ul>`).join('') || '<p>Nenhum resultado oficial ainda.</p>'}</details>` : ''}</section>`;
    }
    function progression() {
      const current = state(); const phase = current.viewPhase || current.phase; const group = sport.tieGroup(current,phase);
      const duels = current.matches.filter(match => match.duel && match.phase === phase);
      const final = current.matches.filter(match => match.phase === 'final' && !match.duel);
      return `${impactBanner()}${phasePicker()}<section class="panel"><h3>Progresso da competição</h3><ol class="round-progress">${Array.from({length:7},(_,index) => `<li>Classificatória ${index+1} · ${current.rounds.some(round => round.phase === 'qualification' && round.number === index+1 && round.closed) ? 'encerrada' : current.rounds.some(round => round.phase === 'qualification' && round.number === index+1) ? 'publicada' : 'aguardando'}</li>`).join('')}</ol>${admin() ? `<details open><summary>Rodadas preparadas para revisão</summary><p>Este roteiro usa confrontos e resultados fictícios revisáveis. Não calcula o emparceiramento suíço de produção. Complete a luta interativa antes de aplicar o restante da rodada.</p><div class="actions">${button('fixture-complete','Completar demais lutas pelo roteiro')}${current.phase === 'qualification' ? button('fixture-next','Revisar próxima rodada preparada',current.currentRound >= 7) : button('final-next','Ir à próxima rodada da final',current.currentRound >= 3)}${button('close','Encerrar rodada atual')}</div></details>` : ''}</section>
      ${group.length ? `<section class="panel"><h3>Desempate necessário</h3><p>${escape(group.map(name).join(', '))}</p><p>${group.length === 2 ? 'Um duelo ao primeiro ataque pontuador.' : 'Minigrupo todos contra todos. Vitórias nos duelos, depois maior idade verificada.'} Não há pontos esportivos extras para a fase. Sem Pontuação e Inconclusivo não encerram um duelo.</p>${admin() ? `<div class="actions">${button('tie-setup','Preparar duelos do empate')}${button('tie-resolve','Aplicar ordem do desempate')}</div>` : '<p>Resolução aguardando a equipe.</p>'}</section>` : ''}
      ${duels.length ? `<section class="panel"><h3>Duelos do desempate</h3><ul class="list">${duels.map(match => `<li>${escape(matchLabel(match))} ${badge(sport.statusLabels[match.status])}${button('open',admin() ? 'Operar duelo' : 'Consultar duelo',false,`data-match="${match.id}"`)}</li>`).join('')}</ul></section>` : ''}
      <section class="panel"><h3>Quatro classificados</h3>${current.qualifierIds.length ? `<ol>${current.qualifierIds.map((id,index) => `<li>${'ABCD'[index]} · ${escape(name(id))}</li>`).join('')}</ol><p>Pontos, first bloods e bounds de 3 pontos da final começam em zero. Os cartões do torneio continuam.</p>` : `<p>Confirme depois das sete rodadas oficiais e do desempate no corte.</p>${admin() ? button('qualify','Confirmar classificados e preparar final') : ''}`}</section>
      ${final.length ? `<section class="panel"><h3>Final · seis confrontos</h3><ul class="list">${final.map(match => `<li><span>${escape(matchLabel(match))}<span class="subline">Arena ${current.arenas.find(arena => arena.id === match.arenaId)?.number} · ${sport.statusLabels[match.status]}</span></span>${button('open',admin() ? 'Operar luta' : 'Consultar luta',false,`data-match="${match.id}"`)}</li>`).join('')}</ul></section>${standings('final')}` : ''}
      <section class="panel"><h3>${current.published ? 'Resultado final publicado' : 'Publicação final'}</h3>${current.published ? `<ol class="podium">${sport.orderedRanking(current,'final').filter(row => row.eligible).slice(0,3).map(row => `<li>${escape(name(row.id))}</li>`).join('')}</ol><p>Consulta ${current.visibility === 'internal' ? 'restrita a membros e admins' : 'pública'} do resultado publicado.</p>` : `<p>O acompanhamento provisório já está disponível para a audiência permitida. O pódio será publicado após a confirmação da final.</p>${admin() ? button('publish-final','Publicar resultado final') : ''}`}</section>`;
    }
    function corrections() {
      if (!admin()) return restricted();
      const current = state(); const match = selected(); if (!match) return empty();
      return `${impactBanner()}${picker()}<section class="panel"><h3>Revisar resultado e bounds</h3><p>${escape(matchLabel(match))} · ${sport.statusLabels[match.status]}</p>${reason()}<div class="actions">${button('reopen','Reabrir resultado oficial',match.status !== 'FINALIZED')}${button('return','Retornar luta para pausada',match.status !== 'AWAITING_CONFIRMATION')}${button('open','Voltar à operação da luta',false,`data-match="${match.id}"`)}</div>${match.bounds.length ? `<form id="edit-bound-form" class="stack"><label for="edit-bound">Bound a corrigir<select id="edit-bound">${match.bounds.map(bound => `<option value="${bound.id}">${bound.id} · ${sport.types[bound.type][0]} · ${bound.status}</option>`).join('')}</select></label><div class="form-row"><label for="edit-type">Resultado corrigido<select id="edit-type">${Object.entries(sport.types).map(([key,[label]]) => `<option value="${key}">${label}</option>`).join('')}</select></label><label for="edit-side">Lado corrigido<select id="edit-side"><option value="A">Atleta A</option><option value="B">Atleta B</option><option value="NONE">Nenhum</option></select></label><label for="edit-warning">Advertência corrigida<select id="edit-warning"><option value="NONE">Nenhuma</option><option value="A">Atleta A</option><option value="B">Atleta B</option><option value="BOTH">Ambos</option></select></label></div><div class="actions"><button type="submit" ${match.status === 'FINALIZED' ? 'disabled' : ''}>Aplicar correção ao bound</button>${button('void-edit','Anular bound selecionado',match.status === 'FINALIZED')}</div></form>` : '<p>Nenhum bound nesta luta.</p>'}</section><section class="panel"><h3>Dependências preservadas</h3><p>Revisar placar, first blood, promoções disciplinares, ranking, confrontos posteriores, classificados e pódio. Nada é regenerado silenciosamente.</p>${current.needsReview.length ? `<ul>${current.needsReview.map(id => `<li>${escape(id === 'standings' ? 'Classificação da fase' : id === 'tie-group' ? 'Grupo de desempate' : id === 'qualifiers' ? 'Classificados' : id === 'podium' ? 'Pódio' : matchLabel(current.matches.find(match => match.id === id)))}</li>`).join('')}</ul>${button('reconcile','Confirmar revisão das dependências')}` : '<p>Nenhuma dependência aguardando revisão.</p>'}<p class="helper">Se os classificados mudarem, a final fica preservada para decisão da organização. Essa alternativa não recebe uma substituição automática nesta prévia.</p></section><section class="panel"><h3>Histórico privado da equipe</h3>${current.audit.length ? `<ol>${current.audit.map(item => `<li><strong>${escape(item.action)} · ${escape(item.who)}</strong><span class="subline">${escape(item.when)} · ${escape(item.reason)}</span>${item.before ? `<details><summary>Antes e depois</summary><pre>${escape(JSON.stringify({before:item.before,after:item.after},null,2))}</pre></details>` : ''}</li>`).join('')}</ol>` : '<p>Sem alterações registradas.</p>'}</section>`;
    }
    function schedule() {
      const matches = sport.projection(state(),audience()).matches;
      return matches.length ? `<section class="panel"><h3>Agenda de confrontos</h3><ul class="list">${matches.map(match => `<li><span>${escape(matchLabel(match))}<span class="subline">Arena ${state().arenas.find(arena => arena.id === match.arenaId)?.number} · ${sport.statusLabels[match.status]}</span></span>${button('open',admin() ? 'Operar luta' : 'Consultar luta',false,`data-match="${match.id}"`)}</li>`).join('')}</ul></section>` : empty();
    }
    function view(id) {
      if (!sport.allowed(state(),audience())) return restricted();
      if (!admin() && ['COND-WF-01','COND-WF-02','COND-WF-08'].includes(id)) return '<div class="empty"><h3>Área da equipe</h3><p>Use acompanhamento, agenda e classificação para consultar a competição.</p></div>';
      if (!admin() && ['COND-WF-03','COND-WF-04'].includes(id)) return schedule();
      if (id === 'COND-WF-03' && (state().currentRound > 1 || state().phase === 'final')) return schedule();
      if (id === 'COND-WF-05' || id === 'COND-WF-09') return sharedMatch(admin() && id === 'COND-WF-05');
      if (id === 'COND-WF-06') return `${phasePicker()}${standings(state().viewPhase || state().phase)}<a href="${route('COND-WF-07')}">Ver avanço e final →</a>`;
      if (id === 'COND-WF-07') return progression();
      if (id === 'COND-WF-08') return corrections();
      return null;
    }
    function reasonValue() { return document.getElementById('sport-reason')?.value || drafts()['sport-reason'] || ''; }
    function handle(action,buttonElement) {
      const current = state(); const match = selected();
      if (action === 'open') {
        current.selectedMatchId = buttonElement.dataset.match;
        const next = current.matches.find(item => item.id === current.selectedMatchId);
        if (admin() && next.status === 'SCHEDULED' && !current.needsReview.includes(next.id) && (next.duel || next.phase === current.phase && next.round === current.currentRound)) {
          if (current.matches.some(item => item.id !== next.id && item.arenaId === next.arenaId && ['RUNNING','PAUSED','AWAITING_CONFIRMATION','CALLED'].includes(item.status))) throw new Error('A Arena está ocupada. Termine a luta em andamento antes da próxima chamada.');
          next.status = 'CALLED';
        }
        location.hash = route(admin() ? 'COND-WF-05' : 'COND-WF-09'); return 'Luta selecionada.';
      }
      if (!admin()) throw new Error('A consulta não permite editar a competição.');
      switch (action) {
        case 'start': sport.start(current,match.id); break;
        case 'pause': sport.pause(current,match.id); break;
        case 'time': sport.elapse(current,match.id,30); break;
        case 'end-time': sport.elapse(current,match.id,180); break;
        case 'confirm': sport.confirm(current,match.id); return 'Resultado oficial confirmado. A classificação foi recalculada uma única vez.';
        case 'send': {
          const boundId = buttonElement.dataset.bound;
          current.pendingBound = boundId; render(); notify('Enviando… o bound ainda não está na consulta.');
          setTimeout(() => {
            delete current.pendingBound;
            try {
              if (current.simulateSaveError) { current.simulateSaveError = false; throw new Error('Falha simulada no envio. O rascunho foi preservado. Envie novamente para tentar outra vez.'); }
              sport.accept(current,match.id,boundId); render(); notify('Bound aceito. Placar provisório e acompanhamento atualizados.');
            } catch (error) { render(); notify(error.message,true); }
          },450);
          return '';
        }
        case 'void': sport.edit(current,match.id,buttonElement.dataset.bound,{status:'VOIDED'},'Rascunho descartado pela equipe'); break;
        case 'wo': { const side = document.getElementById('wo-side').value; sport.declareWO(current,match.id,side === 'BOTH' ? ['A','B'] : [side],reasonValue()); break; }
        case 'close': sport.closeRound(current); break;
        case 'fixture-complete': sport.completeFixtureRound(current); break;
        case 'fixture-next': sport.nextFixtureRound(current); break;
        case 'final-next': sport.closeRound(current); if (current.currentRound < 3) current.currentRound++; break;
        case 'tie-setup': sport.setupTie(current,current.viewPhase || current.phase); break;
        case 'tie-resolve': sport.resolveTie(current,current.viewPhase || current.phase); break;
        case 'qualify': sport.qualify(current); break;
        case 'publish-final': sport.publish(current); return 'Resultado final publicado para a audiência permitida do evento.';
        case 'reopen': sport.reopen(current,match.id,reasonValue()); break;
        case 'return': sport.returnPaused(current,match.id,reasonValue()); break;
        case 'void-edit': sport.edit(current,match.id,document.getElementById('edit-bound').value,{status:'VOIDED'},reasonValue()); break;
        case 'reconcile': sport.reconcile(current,reasonValue()); break;
      }
      return 'Ação registrada na demonstração.';
    }
    function submit(form) {
      if (!admin()) throw new Error('A consulta não permite editar a competição.');
      const match = selected(); const get = id => document.getElementById(id).value;
      if (form === 'bound-form') {
        const input = {type:get('bound-type'),side:get('bound-side'),warning:get('bound-warning')};
        if (get('bound-at') !== '') input.at = Number(get('bound-at'));
        sport.record(state(),match.id,input);
        return 'Rascunho preservado somente para a equipe. Revise e envie para aceitar.';
      }
      sport.edit(state(),match.id,get('edit-bound'),{type:get('edit-type'),side:get('edit-side'),warning:get('edit-warning')},reasonValue());
      return 'Bound corrigido. Confira os efeitos e as dependências.';
    }
    return {view,handle,submit,selected,seconds};
  };
})(window);
