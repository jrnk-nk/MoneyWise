(() => {
  'use strict';
  const M = window.MoneyWiseModel;
  const {lessons, questions} = window.MoneyWiseContent;
  const {icon} = window.MoneyWiseUI;
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const money = cents => `GH₵ ${(cents / 100).toLocaleString('en-GH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const avatars = {owl: '🦉', fox: '🦊', cat: '🐱', rocket: '🚀'};
  const pages = {home: 'Overview', learn: 'Learning quests', budget: 'Budget lab', savings: 'Savings goals', invest: 'Investment lab', games: 'Money arcade', quiz: 'Quiz arena', progress: 'Achievements'};
  const descriptions = [
    'Discover what really deserves a spot in your budget.', 'Give every cedi a purpose and make your plan work.',
    'Turn a future dream into a savings habit.', 'Find out when to keep money safe and when to explore growth.',
    'Learn why possible gains come with possible losses.', 'Meet the power of growth on top of growth.',
    'Understand why spreading your investments can help.'
  ];
  const PREFIX = 'moneywise:v2:';
  let state = M.freshState();
  let player = null;
  let currentLesson = 0;
  let currentPage = 'home';
  let quiz = null;
  let game = null;
  let pendingGuest = null;
  let renderedXP = 0;
  let toastTimer;
  let confettiTimer;
  function read(storage, key, fallback = null) {
    try { const text = storage.getItem(key); return text === null ? fallback : JSON.parse(text); } catch { return fallback; }
  }
  function write(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  function remove(storage, key) { try { storage.removeItem(key); } catch { /* Private mode may disable storage. */ } }
  // Accessing window.localStorage itself may throw in restricted browsers.
  const unavailableStorage = {getItem() { return null; }, setItem() { throw new Error('Storage unavailable'); }, removeItem() {}};
  let durableStorage, tabStorage;
  try { durableStorage = window.localStorage; } catch { durableStorage = unavailableStorage; }
  try { tabStorage = window.sessionStorage; } catch { tabStorage = unavailableStorage; }
  function profiles() {
    const saved = read(durableStorage, PREFIX + 'players', []);
    return Array.isArray(saved) ? saved.filter(p => p && typeof p.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(p.id) && M.cleanText(p.name, 24) && Object.hasOwn(avatars, p.avatar)).map(p => ({id: p.id, name: M.cleanText(p.name, 24), avatar: p.avatar})) : [];
  }
  const stateKey = p => PREFIX + 'state:' + p.id;
  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
  }
  function celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    clearTimeout(confettiTimer);
    $('confetti').innerHTML = Array.from({length: 26}, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${['#79e4c3', '#b5a4fa', '#f0cd88'][i % 3]};animation-delay:${(i % 6) * .07}s"></i>`).join('');
    confettiTimer = setTimeout(() => { $('confetti').replaceChildren(); }, 2400);
  }
  function formMessage(id, message, success = false) { $(id).textContent = message; $(id).classList.toggle('success', success); }
  function empty(emoji, text) { return `<div class="empty-state"><span aria-hidden="true">${emoji}</span>${text}</div>`; }
  function titleOf(index) { return lessons[index].title.replace(/^\d+\.\s*/, ''); }
  function levelText() { const level = M.level(state.xp); return `Level ${level.number} · ${level.title}`; }
  const badges = [
    {id: 'first', emoji: '✨', title: 'First smart move', desc: 'Earn your first XP.', test: s => s.xp > 0},
    {id: 'budget', emoji: '💳', title: 'Budget beginner', desc: 'Record your first transaction.', test: s => s.awards.includes('budget-first')},
    {id: 'saver', emoji: '🌱', title: 'Seed of savings', desc: 'Make your first savings deposit.', test: s => s.awards.includes('savings-first')},
    {id: 'goal', emoji: '🎯', title: 'Dream chaser', desc: 'Reach a savings goal.', test: s => s.awards.includes('goal-hit')},
    {id: 'scholar', emoji: '🎓', title: 'Money scholar', desc: 'Complete all seven learning quests.', test: s => s.completed.length === 7},
    {id: 'quiz', emoji: '⚡', title: 'Quiz whiz', desc: 'Answer all eight quiz questions correctly.', test: s => s.bestQuiz === 8},
    {id: 'arcade', emoji: '🎮', title: 'Arcade ace', desc: 'Get a perfect score in either arcade game.', test: s => s.gameBests.sorter === 8 || s.gameBests.allowance === 100},
    {id: 'streak', emoji: '🔥', title: 'On a roll', desc: 'Practise three days in a row.', test: s => s.streak >= 3}
  ];
  function saveState() {
    if (!player) return false;
    return player.id === 'guest' ? write(tabStorage, PREFIX + 'guest', state) : write(durableStorage, stateKey(player), state);
  }
  function commit(message = '') {
    for (const badge of badges) if (!state.badges.includes(badge.id) && badge.test(state)) state.badges.push(badge.id);
    const gained = state.xp - renderedXP;
    const saved = saveState();
    renderAll();
    if (!saved) toast('Browser storage is unavailable or full. Progress is kept in memory for this visit only.');
    else if (message) toast(message + (gained > 0 ? ` · +${gained} XP` : ''));
    if (gained > 0) celebrate();
  }

  // Device-only player profiles deliberately never request or store passwords.
  function authTab(returning, focus = false) {
    $('newPlayerPanel').hidden = returning;
    $('returningPlayerPanel').hidden = !returning;
    for (const [id, selected] of [['newPlayerTab', !returning], ['returningPlayerTab', returning]]) {
      $(id).setAttribute('aria-selected', String(selected));
      $(id).tabIndex = selected ? 0 : -1;
      if (selected && focus) $(id).focus();
    }
    if (returning) renderPlayers();
  }
  function renderPlayers() {
    const saved = profiles();
    $('savedPlayers').innerHTML = saved.length ? saved.map(p => {
      const progress = M.normalize(read(durableStorage, stateKey(p)));
      return `<button class="saved-player" data-player-id="${p.id}"><span class="player-avatar" aria-hidden="true">${avatars[p.avatar]}</span><div><strong>${escapeHTML(p.name)}</strong><small>${progress.xp} XP · Continue your adventure</small></div>${icon('arrow')}</button>`;
    }).join('') : empty('🧭', 'No players saved here yet. Choose New player to start your adventure.');
  }
  function showLogin(returning = false) {
    $('appScreen').hidden = true;
    $('loginScreen').hidden = false;
    $('toast').hidden = true;
    document.querySelector('.skip-link').href = '#playerName';
    authTab(returning);
    document.title = 'MoneyWise — Your money adventure';
    window.scrollTo(0, 0);
  }
  function startPlayer(nextPlayer, initialState, restorePage = false) {
    player = nextPlayer;
    state = M.normalize(initialState ?? read(durableStorage, stateKey(player)));
    for (const badge of badges) if (!state.badges.includes(badge.id) && badge.test(state)) state.badges.push(badge.id);
    renderedXP = state.xp;
    currentLesson = Math.max(0, lessons.findIndex((_, i) => !state.completed.includes(i)));
    quiz = null;
    game = null;
    pendingGuest = null;
    document.querySelectorAll('#mainContent form').forEach(form => form.reset());
    document.querySelectorAll('#mainContent .form-message').forEach(el => { el.textContent = ''; });
    $('savingsName').value = state.goalName === 'My savings goal' ? '' : state.goalName;
    $('savingsTarget').value = state.goalTarget / 100;
    resetInvestment();
    $('loginScreen').hidden = true;
    $('appScreen').hidden = false;
    document.querySelector('.skip-link').href = '#mainContent';
    const identity = {id: player.id};
    write(tabStorage, PREFIX + 'session', identity);
    if ($('rememberPlayer').checked && player.id !== 'guest') write(durableStorage, PREFIX + 'session', identity);
    else remove(durableStorage, PREFIX + 'session');
    renderAll();
    renderQuiz();
    leaveGame();
    showPage(restorePage && Object.hasOwn(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'home', false);
    saveState();
  }
  $('newPlayerTab').addEventListener('click', () => authTab(false));
  $('returningPlayerTab').addEventListener('click', () => authTab(true));
  document.querySelector('.auth-tabs').addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      authTab(event.key === 'End' || (event.key !== 'Home' && $('newPlayerTab').getAttribute('aria-selected') === 'true'), true);
    }
  });
  $('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = M.cleanText($('playerName').value.replace(/\s+/g, ' '), 24);
    if (name.length < 2) return formMessage('profileMessage', 'Choose a name with at least 2 characters.');
    const saved = profiles();
    if (saved.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return formMessage('profileMessage', 'That player already exists. Choose Welcome back to continue.');
    if (saved.length >= 20) return formMessage('profileMessage', 'This browser already has 20 players. Choose Welcome back to continue.');
    const newPlayer = {id: window.crypto?.randomUUID?.() ?? `player-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, avatar: $('profileForm').elements.avatar.value};
    const legacy = !saved.length && !read(durableStorage, PREFIX + 'migrated') ? read(durableStorage, 'moneywiseState') : null;
    const initial = pendingGuest ?? M.normalize(legacy);
    if (!write(durableStorage, stateKey(newPlayer), initial) || !write(durableStorage, PREFIX + 'players', [...saved, newPlayer])) {
      return formMessage('profileMessage', 'This browser cannot save a player. Free some storage or try guest mode.');
    }
    if (legacy) write(durableStorage, PREFIX + 'migrated', true);
    const convertedGuest = Boolean(pendingGuest);
    if (convertedGuest) remove(tabStorage, PREFIX + 'guest');
    startPlayer(newPlayer, initial);
    toast(convertedGuest ? 'Your guest progress is now saved to your player.' : legacy ? 'Welcome! Your previous MoneyWise progress has been carried over.' : 'Your adventure starts now. Make your first smart move!');
  });
  $('savedPlayers').addEventListener('click', event => {
    const button = event.target.closest('[data-player-id]');
    if (!button) return;
    const selected = profiles().find(p => p.id === button.dataset.playerId);
    if (selected) startPlayer(selected);
  });
  $('guestLogin').addEventListener('click', () => startPlayer({id: 'guest', name: 'Explorer', avatar: 'owl'}, read(tabStorage, PREFIX + 'guest') ?? M.freshState()));
  $('saveGuestButton').addEventListener('click', () => { pendingGuest = structuredClone(state); showLogin(); $('playerName').focus(); });
  $('logoutButton').addEventListener('click', () => {
    saveState();
    player = null;
    quiz = null;
    game = null;
    pendingGuest = null;
    remove(tabStorage, PREFIX + 'session');
    remove(durableStorage, PREFIX + 'session');
    $('profileForm').reset();
    formMessage('profileMessage', '');
    showLogin(profiles().length > 0);
    (profiles().length ? $('returningPlayerTab') : $('playerName')).focus();
  });

  function showPage(page, focus = true) {
    if (!player || !Object.hasOwn(pages, page)) return;
    currentPage = page;
    document.querySelectorAll('main > .page').forEach(section => { section.hidden = section.id !== page; });
    document.querySelectorAll('.main-nav [data-page]').forEach(button => {
      button.classList.toggle('active', button.dataset.page === page);
      if (button.dataset.page === page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('pageLabel').textContent = pages[page];
    document.title = `${pages[page]} · MoneyWise`;
    history.replaceState(null, '', '#' + page);
    if (page === 'quiz' && !quiz) renderQuiz();
    renderDaily();
    if (focus) { $('mainContent').focus({preventScroll: true}); window.scrollTo({top: 0, behavior: 'instant'}); }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (button) { event.preventDefault(); showPage(button.dataset.page); }
  });
  window.addEventListener('hashchange', () => { if (player) showPage(location.hash.slice(1)); });
  function nextQuest() {
    currentLesson = Math.max(0, lessons.findIndex((_, i) => !state.completed.includes(i)));
    renderLessons();
    showPage('learn');
  }
  $('nextQuestButton').addEventListener('click', nextQuest);
  $('continueLesson').addEventListener('click', nextQuest);

  function renderLessons() {
    $('lessonCount').textContent = `${state.completed.length} / ${lessons.length}`;
    $('lessonList').innerHTML = lessons.map((lesson, index) => {
      const completed = state.completed.includes(index);
      return `<button class="lesson ${index === currentLesson ? 'selected' : ''}" data-lesson="${index}" ${index === currentLesson ? 'aria-current="step"' : ''}><span class="lesson-number ${completed ? 'completed' : ''}">${completed ? '✓' : String(index + 1).padStart(2, '0')}</span><span>${escapeHTML(titleOf(index))}<small>${completed ? 'Quest complete · Review anytime' : '3 min · +50 XP'}</small></span></button>`;
    }).join('');
    const completed = state.completed.includes(currentLesson);
    $('lessonContent').innerHTML = `<span class="reward-chip">QUEST ${String(currentLesson + 1).padStart(2, '0')} / 07 ${completed ? '· COMPLETE ✓' : '· +50 XP'}</span><h2>${escapeHTML(titleOf(currentLesson))}</h2>${lessons[currentLesson].content}<div class="button-row"><button id="completeLesson" class="button primary">${completed ? 'Review complete' : 'Complete quest · +50 XP'} ${icon('check')}</button>${currentLesson < lessons.length - 1 ? '<button id="nextLesson" class="button outline">Next quest →</button>' : '<button class="button outline" data-page="quiz">Enter the quiz arena →</button>'}</div><p class="muted section-space">${completed ? 'Reviewing counts towards today’s reading quest. Lesson XP is earned once.' : 'Read the lesson, reflect on the example, then mark your quest complete.'}</p>`;
  }
  $('lessonList').addEventListener('click', event => {
    const button = event.target.closest('[data-lesson]');
    if (!button) return;
    currentLesson = Number(button.dataset.lesson);
    renderLessons();
    $('lessonContent').focus({preventScroll: true});
    if (window.innerWidth < 900) $('lessonContent').scrollIntoView({block: 'start', behavior: 'instant'});
  });
  $('lessonContent').addEventListener('click', event => {
    if (event.target.closest('#completeLesson')) {
      if (!state.completed.includes(currentLesson)) state.completed.push(currentLesson);
      M.touch(state, 'read');
      M.award(state, `lesson:${currentLesson}`, 50, `Quest complete · ${titleOf(currentLesson)}`);
      commit('A little wiser. Nice work!');
      ($('nextLesson') ?? $('completeLesson')).focus({preventScroll: true});
    } else if (event.target.closest('#nextLesson')) { currentLesson++; renderLessons(); $('lessonContent').focus(); }
  });

  function renderDaily() {
    if (!player) return;
    const daily = M.daily(state);
    const entries = [
      ['read', 'Read a learning quest', 'A fresh idea or a quick refresher.', 'learn'],
      ['budget', 'Make one budget move', 'Record income or an expense.', 'budget'],
      ['play', 'Finish an arcade game or quiz', 'Put your money skills into play.', 'games']
    ];
    $('dailyQuests').innerHTML = entries.map(([id, title, desc, page], i) => `<button class="daily-quest ${daily[id] ? 'done' : ''}" data-page="${page}"><span class="quest-check">${daily[id] ? icon('check') : '0' + (i + 1)}</span><div><strong>${title}${daily[id] ? '<span class="sr-only"> · Complete</span>' : ''}</strong><small>${desc}</small></div>${icon('arrow')}</button>`).join('');
    const count = entries.filter(([key]) => daily[key]).length;
    $('dailyProgress').textContent = `${count} of 3 complete`;
    $('claimDaily').disabled = count < 3 || daily.claimed;
    $('claimDaily').textContent = daily.claimed ? 'Reward claimed ✓' : count === 3 ? 'Claim +75 XP ✦' : 'Complete all 3 to claim';
  }
  $('claimDaily').addEventListener('click', () => { if (M.claimDaily(state)) commit('Daily side quests: completed. Future you: proud.'); });

  $('transactionForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = M.cleanText($('transactionName').value);
    const amount = M.amountToCents($('transactionAmount').value);
    const type = $('transactionType').value;
    if (!name || amount === null) return formMessage('budgetMessage', 'Enter a description and a positive amount with at most 2 decimal places.');
    if (!['income', 'expense'].includes(type)) return;
    if (type === 'expense' && amount > state.balance) return formMessage('budgetMessage', 'That’s more than your available virtual balance. Try a smaller expense.');
    if (type === 'income' && state.balance + state.savings + amount > M.MAX_CENTS) return formMessage('budgetMessage', 'Your total practice money cannot exceed GH₵ 1,000,000.');
    state.balance += type === 'income' ? amount : -amount;
    state.transactions.unshift({type, name, amount, date: new Date().toISOString()});
    M.touch(state, 'budget');
    M.award(state, 'budget-first', 30, 'First budget move');
    $('transactionName').value = '';
    $('transactionAmount').value = '';
    formMessage('budgetMessage', 'Smart move! Transaction recorded.', true);
    commit('Your money trail is looking good.');
    $('transactionName').focus();
  });
  function renderBudget() {
    $('budgetBalance').textContent = money(state.balance);
    for (const [id, type] of [['totalIncome', 'income'], ['totalExpenses', 'expense']]) $(id).textContent = money(state.transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0));
    $('transactionCount').textContent = `${state.transactions.length} transaction${state.transactions.length === 1 ? '' : 's'}`;
    $('transactionList').innerHTML = state.transactions.length ? `<table><caption class="sr-only">Practice transaction history</caption><thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Type</th><th scope="col">Amount</th></tr></thead><tbody>${state.transactions.map(t => `<tr><td>${escapeHTML(displayDate(t.date))}</td><td>${escapeHTML(t.name)}</td><td>${t.type === 'income' ? 'Income' : 'Expense'}</td><td class="${t.type === 'income' ? 'positive' : 'negative'}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}</td></tr>`).join('')}</tbody></table>` : empty('🧾', 'A clean slate. Add your first transaction to start your money trail.');
  }
  $('resetBudget').addEventListener('click', () => confirmAction('Reset your practice wallet?', 'This restores GH₵ 1,000, clears transactions, and resets saved money to GH₵ 0. Your savings goal, learning progress, XP, and badges stay. This cannot be undone.', () => {
    state.balance = M.INITIAL_BALANCE;
    state.savings = 0;
    state.transactions = [];
    formMessage('budgetMessage', 'Your practice wallet and savings have been reset.', true);
    commit('Fresh wallet. Same wise you.');
  }));

  $('goalForm').addEventListener('submit', event => {
    event.preventDefault();
    const target = M.amountToCents($('savingsTarget').value, 100);
    const name = M.cleanText($('savingsName').value);
    if (target === null || !name) return formMessage('goalMessage', 'Give your goal a name and a target between GH₵ 1 and GH₵ 1,000,000.');
    state.goalName = name;
    state.goalTarget = target;
    M.touch(state);
    checkSavingsGoal();
    formMessage('goalMessage', 'Your dream has a plan. Goal saved!', true);
    commit('Goal set. Let’s grow towards it.');
  });
  function checkSavingsGoal() { if (state.savings >= state.goalTarget) M.award(state, 'goal-hit', 100, 'Savings goal reached'); }
  function moveSavings(withdraw = false) {
    const amount = M.amountToCents($('savingsAddAmount').value);
    if (amount === null) return formMessage('savingsMessage', 'Enter a positive amount with at most 2 decimal places.');
    if (amount > (withdraw ? state.savings : state.balance)) return formMessage('savingsMessage', withdraw ? 'That’s more than you have in savings.' : 'Your wallet cannot cover this deposit. Try a smaller amount.');
    state.balance += withdraw ? amount : -amount;
    state.savings += withdraw ? -amount : amount;
    M.touch(state);
    if (!withdraw) { M.award(state, 'savings-first', 40, 'Planted your first savings seed'); checkSavingsGoal(); }
    $('savingsAddAmount').value = '';
    formMessage('savingsMessage', withdraw ? 'Money moved back to your wallet.' : 'A little closer to your dream. Savings added!', true);
    commit(withdraw ? 'Wallet and savings updated.' : 'Look at your savings grow!');
  }
  $('depositForm').addEventListener('submit', event => { event.preventDefault(); moveSavings(); });
  $('withdrawSavings').addEventListener('click', () => moveSavings(true));
  document.querySelectorAll('[data-amount]').forEach(button => button.addEventListener('click', () => { $('savingsAddAmount').value = button.dataset.amount; $('savingsAddAmount').focus(); }));
  function renderSavings() {
    const percentage = Math.min(100, Math.round(state.savings / state.goalTarget * 100));
    $('goalTitle').textContent = state.goalName;
    $('savingsAmount').textContent = money(state.savings);
    $('savingsTargetText').textContent = money(state.goalTarget);
    $('savingsBar').style.width = percentage + '%';
    $('savingsProgress').setAttribute('aria-valuenow', String(percentage));
    $('savingsPercent').textContent = state.savings >= state.goalTarget ? '100% · You made it! 🎉' : `${percentage}% of the way there`;
    $('savingsRemaining').textContent = state.savings >= state.goalTarget ? 'Dream unlocked' : `${money(state.goalTarget - state.savings)} to go`;
  }

  function chart(rate = 0) {
    const end = rate > 0 ? 35 : rate < 0 ? 140 : 90;
    const color = rate < 0 ? '#ff9caa' : '#79e4c3';
    $('investmentChart').innerHTML = `<svg viewBox="0 0 400 170" preserveAspectRatio="none"><path d="M10 90 C100 90 220 ${end + 10} 390 ${end} L390 165 L10 165Z" fill="${color}" opacity=".07"/><path d="M10 90 C100 90 220 ${end + 10} 390 ${end}" stroke="${color}" stroke-width="3" fill="none"/><circle cx="390" cy="${end}" r="4" fill="${color}"/></svg>`;
  }
  function resetInvestment() {
    $('investmentHeading').textContent = 'Let’s see what could happen.';
    $('investStart').textContent = money(10000);
    $('investChange').textContent = money(0);
    $('investFinal').textContent = money(10000);
    $('investChange').className = '';
    $('investFinal').className = '';
    $('investExplanation').textContent = 'Choose a scenario to explore a possible outcome.';
    chart();
  }
  $('investmentForm').addEventListener('submit', event => {
    event.preventDefault();
    const amount = M.amountToCents($('investmentAmount').value, 100);
    const rate = Number($('investmentScenario').value);
    if (amount === null || ![5, 15, -10, -25].includes(rate)) { $('investExplanation').textContent = 'Enter a valid amount between GH₵ 1 and GH₵ 1,000,000.'; return; }
    const change = Math.round(amount * rate / 100);
    $('investmentHeading').textContent = `What if the value ${rate > 0 ? 'grew' : 'fell'} by ${Math.abs(rate)}%?`;
    $('investStart').textContent = money(amount);
    $('investChange').textContent = `${change >= 0 ? '+' : '−'}${money(Math.abs(change))}`;
    $('investFinal').textContent = money(amount + change);
    $('investChange').className = $('investFinal').className = rate > 0 ? 'positive' : 'negative';
    $('investExplanation').textContent = `A hypothetical ${Math.abs(rate)}% ${rate > 0 ? 'gain adds' : 'loss removes'} ${money(Math.abs(change))}. Real returns vary. The curve illustrates only the selected start and end values.`;
    chart(rate);
    state.investmentRuns++;
    M.touch(state);
    M.award(state, 'invest-first', 40, 'Explored an investment scenario');
    commit('Experiment complete. Knowledge gained.');
  });

  function displayDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-GH', {day: 'numeric', month: 'short', year: 'numeric'}) : M.cleanText(value, 40);
  }
  function renderAll() {
    const level = M.level(state.xp);
    const streak = M.currentStreak(state);
    for (const id of ['greetingName', 'sidebarName']) $(id).textContent = player.name;
    for (const id of ['sidebarAvatar', 'headerAvatar']) $(id).textContent = avatars[player.avatar];
    $('profileStatus').textContent = player.id === 'guest' ? 'Guest · this tab only' : 'Saved in this browser';
    $('guestBanner').hidden = player.id !== 'guest';
    $('homeBalance').textContent = money(state.balance);
    $('homeXP').innerHTML = `${state.xp.toLocaleString()} <span>XP</span>`;
    $('homeLessons').innerHTML = `${state.completed.length} <span>/ ${lessons.length}</span>`;
    $('homeStreak').innerHTML = `${streak} <span>${streak === 1 ? 'day' : 'days'}</span>`;
    $('streakHint').textContent = streak > 0 ? 'Keep showing up for future you' : 'Make a move to get it going';
    $('homeLevel').textContent = $('sidebarLevel').textContent = $('progressLevel').textContent = levelText();
    $('headerStreak').textContent = `${streak} day streak`;
    $('headerXP').textContent = `${state.xp.toLocaleString()} XP`;
    $('navLessonCount').textContent = `${state.completed.length}/${lessons.length}`;
    $('sidebarXPText').textContent = `${level.current} / 200 XP to level ${level.number + 1}`;
    for (const id of ['sidebarXPBar', 'progressXPBar']) $(id).style.width = level.current / 2 + '%';
    $('todayLabel').textContent = new Date().toLocaleDateString('en-GH', {weekday: 'short', day: 'numeric', month: 'short'});
    const next = lessons.findIndex((_, i) => !state.completed.includes(i));
    $('nextLessonTitle').textContent = next === -1 ? 'Seven quests. All yours.' : titleOf(next);
    $('nextLessonDescription').textContent = next === -1 ? 'Review a favourite lesson or put your skills to the test in the quiz arena.' : descriptions[next];
    $('nextQuestButton').innerHTML = `${next === -1 ? 'Revisit your learning quests' : 'Start your next quest'} ${icon('arrow')}`;
    $('progressXP').textContent = `${state.xp.toLocaleString()} XP earned · ${200 - level.current} XP to your next level`;
    $('progressQuiz').textContent = `${state.bestQuiz ?? '—'} / ${questions.length}`;
    $('quizAttempts').textContent = `${state.attempts} attempt${state.attempts === 1 ? '' : 's'}`;
    $('badgeCount').textContent = `${badges.filter(b => state.badges.includes(b.id)).length} / ${badges.length} unlocked`;
    $('badgeGrid').innerHTML = badges.map(b => `<article class="badge-card ${state.badges.includes(b.id) ? '' : 'locked'}"><span class="badge-art" aria-hidden="true">${b.emoji}</span><h3>${b.title}</h3><p>${b.desc}</p><span class="badge-status">${state.badges.includes(b.id) ? '✓ Unlocked' : '○ Keep going'}</span></article>`).join('');
    $('activityHistory').innerHTML = state.history.length ? state.history.map(h => `<div class="history-item"><span class="history-dot">✦</span><div><strong>${escapeHTML(h.label)}</strong><small>${escapeHTML(displayDate(h.date))}</small></div><span>+${h.xp} XP</span></div>`).join('') : empty('✨', 'Your first win belongs here. Complete a quest or try a money move.');
    $('gameBests').innerHTML = `<div><small>🛍️ Need it or want it?</small><strong>${state.gameBests.sorter} / 8</strong></div><div><small>🎒 Allowance adventure</small><strong>${state.gameBests.allowance} / 100</strong></div><div><small>Games completed</small><strong>${state.gamesPlayed}</strong></div>`;
    renderLessons();
    renderBudget();
    renderSavings();
    renderDaily();
    renderedXP = state.xp;
  }

  function showDialog(title, body, confirm, confirmLabel = 'Yes, reset', cancelLabel = 'Keep my progress') {
    const dialog = $('appDialog');
    if (dialog.open) dialog.close();
    $('dialogTitle').textContent = title;
    $('dialogBody').innerHTML = body;
    $('dialogActions').replaceChildren();
    if (confirm) {
      const cancel = document.createElement('button');
      cancel.className = 'button outline'; cancel.textContent = cancelLabel;
      cancel.addEventListener('click', () => dialog.close());
      const yes = document.createElement('button');
      yes.className = 'button danger'; yes.textContent = confirmLabel;
      yes.addEventListener('click', () => { dialog.close(); confirm(); });
      $('dialogActions').append(cancel, yes);
    }
    dialog.showModal();
    $('closeDialog').focus();
  }
  function confirmAction(title, body, action) { showDialog(title, `<p>${escapeHTML(body)}</p>`, action); }
  $('closeDialog').addEventListener('click', () => $('appDialog').close());
  $('helpButton').addEventListener('click', () => showDialog('Small moves. Big futures.', '<p>Welcome to your MoneyWise playground. Here’s how to make it yours.</p><ol><li><b>Learn:</b> Complete seven learning quests for 50 XP each.</li><li><b>Practise:</b> Budget your GH₵ 1,000, save towards a goal, and explore hypothetical investments.</li><li><b>Play:</b> Sort needs and wants or navigate an allowance adventure. Improve your best scores to earn more XP.</li><li><b>Level up:</b> Earn 200 XP per level. Complete three daily side quests for a 75 XP bonus.</li><li><b>Come back:</b> Make a learning or practice move each day to build your streak.</li></ol><p>Everything uses virtual money. Profiles are stored in this browser and are accessible to anyone using it. Guest progress lasts for this tab.</p>'));
  $('resetAll').addEventListener('click', () => confirmAction('Start this player’s journey again?', 'This permanently clears this player’s XP, badges, streak, transactions, savings, lessons, quiz results, and arcade scores. Other players are unaffected.', () => {
    state = M.freshState(); currentLesson = 0; quiz = null; game = null; renderedXP = 0;
    document.querySelectorAll('#mainContent form').forEach(form => form.reset());
    document.querySelectorAll('#mainContent .form-message').forEach(el => { el.textContent = ''; });
    $('savingsName').value = ''; $('savingsTarget').value = '300';
    resetInvestment(); renderQuiz(); leaveGame(); commit('Your fresh start is ready.');
  }));

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  function focusStage(id) { $(id).focus({preventScroll: true}); $(id).scrollIntoView({block: 'start', behavior: 'instant'}); }

  // Quiz scores and rewards are saved only once, after the final answer.
  function startQuiz() {
    quiz = {index: 0, score: 0, selected: null, checked: false, done: false, answers: [],
      entries: shuffle(questions).map(question => ({...question, order: shuffle(question.options.map((_, i) => i))}))};
    renderQuiz(); focusStage('quizStage');
  }
  function renderQuiz() {
    const stage = $('quizStage');
    if (!quiz) {
      stage.innerHTML = `<div class="stage-center"><span class="game-emoji" aria-hidden="true">⚡</span><span class="eyebrow">8 QUESTIONS · NO TIMER · UP TO 100 XP</span><h2>Ready for your brain’s glow-up?</h2><p>You’ve completed ${state.completed.length} of ${lessons.length} learning quests. ${state.completed.length === lessons.length ? 'You’ve got the knowledge. Let’s put it to work.' : 'The quests are a great warm-up, but you can jump in whenever you’re ready.'}</p><p>Get feedback after every answer. Earn XP for your first finish and for improving your best score.</p><div class="button-row"><button class="button primary" data-quiz-action="start">Let’s do this ${icon('bolt')}</button><button class="button outline" data-page="learn">Warm up with a quest</button></div></div>`;
      return;
    }
    if (quiz.done) {
      stage.innerHTML = `<div class="stage-center"><span class="game-emoji" aria-hidden="true">${quiz.score === questions.length ? '🏆' : '🧠'}</span><span class="eyebrow">KNOWLEDGE LEVEL: UPGRADED</span><h2>${quiz.score === questions.length ? 'Perfect score. Big brain energy.' : 'Every answer makes you wiser.'}</h2><div class="score-display">${quiz.score}<small> / ${questions.length}</small></div><p>${quiz.reward > 0 ? `You earned ${quiz.reward} XP. ` : 'You matched or stayed below your best, so no extra XP this time. '}Your best: ${state.bestQuiz} / ${questions.length}. ${quiz.score < questions.length ? 'Review the explanations below, then take another shot.' : 'Your future self is doing a little victory dance.'}</p><div class="button-row"><button class="button primary" data-quiz-action="start">Play again ${icon('arrow')}</button><button class="button outline" data-page="progress">See my achievements</button></div></div><details class="review-list"><summary>Review all ${questions.length} answers</summary>${quiz.answers.map((a, i) => `<div class="review-item"><strong class="${a.correct ? 'positive' : 'negative'}">${a.correct ? '✓' : '○'} ${i + 1}. ${escapeHTML(a.question.question)}</strong><p>Correct answer: ${escapeHTML(a.question.options[a.question.answer])}. ${escapeHTML(a.question.explanation)}</p></div>`).join('')}</details>`;
      return;
    }
    const question = quiz.entries[quiz.index];
    stage.innerHTML = `<div class="stage-heading"><span class="eyebrow">QUIZ ARENA</span><span>Question ${quiz.index + 1} of ${questions.length} <span class="dot-divider">·</span> ${quiz.score} correct</span></div><div class="progress-track"><div class="progress-fill" style="width:${quiz.index / questions.length * 100}%"></div></div><form id="quizAnswerForm"><fieldset class="answer-fieldset"><legend>${escapeHTML(question.question)}</legend>${question.order.map((optionIndex, i) => `<label class="answer-option ${quiz.checked ? optionIndex === question.answer ? 'correct' : optionIndex === quiz.selected ? 'incorrect' : '' : ''}"><input type="radio" name="answer" value="${optionIndex}" ${quiz.selected === optionIndex ? 'checked' : ''} ${quiz.checked ? 'disabled' : ''} required><span>${String.fromCharCode(65 + i)}. ${escapeHTML(question.options[optionIndex])}</span>${quiz.checked && optionIndex === question.answer ? '<span class="sr-only">Correct answer</span>' : ''}</label>`).join('')}</fieldset>${quiz.checked ? `<div class="feedback ${quiz.selected === question.answer ? '' : 'incorrect'}" role="status"><strong>${quiz.selected === question.answer ? '✓ Nailed it. That’s a smart money brain.' : 'A useful lesson for your next move.'}</strong><p>${escapeHTML(question.explanation)}</p></div><button class="button primary full" type="button" data-quiz-action="next">${quiz.index === questions.length - 1 ? 'See my score' : 'Next question'} ${icon('arrow')}</button>` : '<button id="checkQuizAnswer" class="button primary full" type="submit" disabled>Check my answer</button>'}</form>`;
  }
  $('quizStage').addEventListener('change', event => {
    if (!quiz || quiz.checked || event.target.name !== 'answer') return;
    quiz.selected = Number(event.target.value);
    $('checkQuizAnswer').disabled = false;
  });
  $('quizStage').addEventListener('submit', event => {
    event.preventDefault();
    if (!quiz || quiz.checked || quiz.done || quiz.selected === null) return;
    const question = quiz.entries[quiz.index];
    const correct = quiz.selected === question.answer;
    quiz.checked = true;
    if (correct) quiz.score++;
    quiz.answers.push({question, correct, selected: quiz.selected});
    renderQuiz();
    $('quizStage').querySelector('[data-quiz-action="next"]').focus({preventScroll: true});
  });
  $('quizStage').addEventListener('click', event => {
    const action = event.target.closest('[data-quiz-action]')?.dataset.quizAction;
    if (action === 'start') return startQuiz();
    if (action !== 'next' || !quiz || !quiz.checked || quiz.done) return;
    quiz.index++;
    quiz.selected = null;
    quiz.checked = false;
    if (quiz.index === questions.length) {
      quiz.done = true;
      const previous = state.bestQuiz ?? 0;
      state.bestQuiz = Math.max(previous, quiz.score);
      state.attempts++;
      let reward = M.award(state, 'quiz-first', 20, 'First quiz arena finish');
      if (quiz.score > previous) reward += M.award(state, `quiz:${quiz.score}`, (quiz.score - previous) * 10, 'Quiz arena · new personal best');
      quiz.reward = reward;
      M.touch(state, 'play');
      commit('Quiz complete. Every answer is progress.');
    }
    renderQuiz(); focusStage('quizStage');
  });

  const sorterItems = [
    {emoji: '🥗', name: 'School lunch', context: 'You need a basic meal to get through your school day.', need: true, why: 'Basic food supports your health and learning. It’s an essential need.'},
    {emoji: '🎮', name: 'A new game skin', context: 'Your game works perfectly. This just changes how your character looks.', need: false, why: 'A cosmetic upgrade is fun, but optional. It’s a want you can plan for after essentials.'},
    {emoji: '💧', name: 'Safe drinking water', context: 'You need clean water to stay hydrated today.', need: true, why: 'Clean drinking water is essential for your health, so it comes before optional purchases.'},
    {emoji: '🎟️', name: 'A concert ticket', context: 'Your favourite artist is playing, and all your essentials are already covered.', need: false, why: 'Entertainment is a want. You can budget for it without treating it as an essential.'},
    {emoji: '💊', name: 'Prescribed medicine', context: 'Your clinician has prescribed medicine you need for your health.', need: true, why: 'Necessary healthcare is a need. Prioritise it before optional spending.'},
    {emoji: '👟', name: 'Designer trainers', context: 'You already have suitable shoes. You like the brand on this new pair.', need: false, why: 'Here, the new shoes are an optional upgrade. Context matters: basic shoes could be a need.'},
    {emoji: '🚌', name: 'Bus fare to school', context: 'The bus is your only practical, safe way to get to school today.', need: true, why: 'Necessary transport supports your education, making it a need in this situation.'},
    {emoji: '📺', name: 'An extra streaming subscription', context: 'You already have entertainment options. This would add another one.', need: false, why: 'An extra subscription is optional. Check your budget before committing to a recurring want.'}
  ];
  const allowanceRounds = [
    {emoji: '🥪', title: 'Monday: lunch, sorted?', text: 'Your allowance is GH₵ 200 for the week. You need lunch each day and want to save GH₵ 50 by Friday. What’s your move?', choices: [
      {text: 'Plan and pack lunches for the week', cost: 4000, points: 20, why: 'A plan covers your essential meals and leaves room for your goal. Great start.'},
      {text: 'Buy basic school lunches for the week', cost: 6000, points: 20, why: 'Your meals are covered. Keep an eye on the rest of the week so savings stay in the plan.'},
      {text: 'Skip lunch to keep all the money', cost: 0, points: 0, why: 'Saving shouldn’t mean skipping essential food. Cover needs before setting money aside.'}
    ]},
    {emoji: '🚌', title: 'Tuesday: getting there.', text: 'Your school is too far to walk safely. GH₵ 40 covers bus journeys for the week. How will you travel?', choices: [
      {text: 'Set aside the week’s bus fares', cost: 4000, points: 20, why: 'You’ve covered a necessary cost before optional spending. That’s a budget doing its job.'},
      {text: 'Pay extra for private rides', cost: 7000, points: 10, why: 'You’ve covered transport, but the extra cost makes your savings target harder to reach.'},
      {text: 'Skip school to avoid paying', cost: 0, points: 0, why: 'Avoiding an essential education expense isn’t a good savings shortcut. Budget for the bus instead.'}
    ]},
    {emoji: '✏️', title: 'Wednesday: a little surprise.', text: 'You need stationery for a class project. A teacher has offered a suitable spare kit you may borrow.', choices: [
      {text: 'Borrow the teacher’s spare kit', cost: 0, points: 20, why: 'Using an available resource covers the need without new spending. Remember to return the kit.'},
      {text: 'Buy a basic stationery kit', cost: 3000, points: 20, why: 'A basic kit meets the need. A budget can handle unexpected essentials when you leave some room.'},
      {text: 'Buy the premium branded set', cost: 8000, points: 0, why: 'The premium extras are a want. A basic or borrowed kit would meet the class requirement for less.'}
    ]},
    {emoji: '🎲', title: 'Thursday: the group chat calls.', text: 'Friends suggest a paid gaming night. There’s also a free games night at a friend’s home. Your essentials are still the priority.', choices: [
      {text: 'Join the free games night', cost: 0, points: 20, why: 'Good times don’t always need a price tag. You’ve kept space for your savings goal.'},
      {text: 'Join the free night and share a snack', cost: 1000, points: 15, why: 'A small planned treat can fit a budget. Check what remains before spending.'},
      {text: 'Pay for the gaming night', cost: 6000, points: 0, why: 'This optional expense makes your GH₵ 50 target harder to reach. Compare it with the free alternative first.'}
    ]},
    {emoji: '🌱', title: 'Friday: pay future you.', text: 'You made it to Friday. Your goal is to set aside GH₵ 50. How much will you move into your arcade savings?', choices: [
      {text: 'Save the planned GH₵ 50', cost: 5000, saved: 5000, points: 20, why: 'You kept your promise to future you. A clear goal turns small decisions into real progress.'},
      {text: 'Save GH₵ 20 for now', cost: 2000, saved: 2000, points: 10, why: 'A small deposit is progress. Review the week’s wants to see how you could reach GH₵ 50 next time.'},
      {text: 'Keep everything available to spend', cost: 0, saved: 0, points: 0, why: 'Without setting money aside, a savings goal stays a wish. Even a small planned deposit would help.'}
    ]}
  ];
  function startGame(kind) {
    if (!['sorter', 'allowance'].includes(kind)) return;
    game = {kind, index: 0, score: 0, checked: false, done: false, answers: [], choice: null,
      items: kind === 'sorter' ? shuffle(sorterItems) : allowanceRounds, wallet: 20000, saved: 0};
    $('arcadeLobby').hidden = true;
    $('gameStage').hidden = false;
    renderGame(); focusStage('gameStage');
  }
  function leaveGame() {
    game = null;
    $('arcadeLobby').hidden = false;
    $('gameStage').hidden = true;
    $('gameStage').replaceChildren();
  }
  function finishGame() {
    if (!game || game.done) return;
    game.done = true;
    game.reward = M.gameReward(state, game.kind, game.score);
    state.gamesPlayed++;
    M.touch(state, 'play');
    commit(game.reward > 0 ? 'New personal best. Smart looks good on you!' : 'Game complete. Keep practising your smart moves.');
  }
  function renderGame() {
    if (!game) return;
    const stage = $('gameStage');
    const sorter = game.kind === 'sorter';
    const max = sorter ? 8 : 100;
    const title = sorter ? 'Need it or want it?' : 'The allowance adventure';
    if (game.done) {
      stage.innerHTML = `<div class="stage-center"><span class="game-emoji" aria-hidden="true">${game.score === max ? '🏆' : '🎉'}</span><span class="eyebrow">${title.toUpperCase()} · COMPLETE</span><h2>${game.score === max ? 'You understood the assignment.' : 'Another round. A little wiser.'}</h2><div class="score-display">${game.score}<small> / ${max}</small></div><p>${game.reward > 0 ? `New best! You earned ${game.reward} XP.` : 'No new XP this time. Beat your personal best to earn more.'} ${sorter ? 'Needs come first; wants can have a place in a thoughtful budget.' : `You saved ${money(game.saved)} and kept ${money(game.wallet)} in your arcade wallet. These game amounts do not change your practice wallet.`}</p><div class="button-row"><button class="button primary" data-start-game="${game.kind}">Play again ${icon('arrow')}</button><button class="button outline" data-game-action="leave">Back to the arcade</button></div></div><details class="review-list"><summary>What your choices taught you</summary>${game.answers.map(a => `<div class="review-item"><strong>${escapeHTML(a.title)}</strong><p>${escapeHTML(a.why)}</p></div>`).join('')}</details>`;
      return;
    }
    const item = game.items[game.index];
    let content;
    if (sorter) {
      content = `<div class="stage-center"><span class="game-emoji" aria-hidden="true">${item.emoji}</span><h2>${item.name}</h2><p>${item.context}</p></div><div class="choice-grid"><button class="sort-choice" data-sort="need" ${game.checked ? 'disabled' : ''}><span aria-hidden="true">🌿</span>It’s a need</button><button class="sort-choice" data-sort="want" ${game.checked ? 'disabled' : ''}><span aria-hidden="true">✨</span>It’s a want</button></div>${game.checked ? `<div class="feedback ${game.correct ? '' : 'incorrect'}" role="status"><strong>${game.correct ? '✓ Smart sort! +1 point.' : `This one is a ${item.need ? 'need' : 'want'}. Let’s unpack it.`}</strong><p>${item.why}</p></div>` : ''}`;
    } else {
      content = `<div class="round-status"><span>Arcade wallet <strong>${money(game.wallet)}</strong></span><span>Saved <strong>${money(game.saved)} / 50.00</strong></span></div><div class="stage-center"><span class="game-emoji" aria-hidden="true">${item.emoji}</span><h2>${item.title}</h2><p>${item.text}</p></div><div class="allowance-choices">${item.choices.map((choice, i) => `<button class="allowance-choice" data-allowance-choice="${i}" ${game.checked || choice.cost > game.wallet ? 'disabled' : ''}><span>${choice.text}${choice.cost > game.wallet && !game.checked ? '<span class="sr-only"> · Not enough arcade money</span>' : ''}</span><small>${choice.cost > game.wallet && !game.checked ? 'Can’t cover this' : choice.cost ? money(choice.cost) : 'No cost'}</small></button>`).join('')}</div>${game.checked ? `<div class="feedback ${game.choice.points === 20 ? '' : 'incorrect'}" role="status"><strong>${game.choice.points === 20 ? '✓ A smart move for your week.' : 'A chance to rethink your plan.'} +${game.choice.points} points</strong><p>${game.choice.why}</p></div>` : ''}`;
    }
    stage.innerHTML = `<div class="stage-heading"><button class="text-button" data-game-action="leave">← Arcade</button><span>Round ${game.index + 1} / ${game.items.length} <span class="dot-divider">·</span> ${game.score} points</span></div><div class="progress-track"><div class="progress-fill" style="width:${game.index / game.items.length * 100}%"></div></div>${content}${game.checked ? `<button class="button primary full" data-game-action="next">${game.index === game.items.length - 1 ? 'See how I did' : 'Next round'} ${icon('arrow')}</button>` : ''}`;
  }
  document.addEventListener('click', event => {
    const start = event.target.closest('[data-start-game]');
    if (start && player) startGame(start.dataset.startGame);
  });
  $('gameStage').addEventListener('click', event => {
    if (!game) return;
    const action = event.target.closest('[data-game-action]')?.dataset.gameAction;
    if (action === 'leave') {
      if (game.done) { leaveGame(); $('arcadeLobby').querySelector('[data-start-game]').focus(); }
      else showDialog('Leave this game?', '<p>Your unfinished round won’t count towards XP or daily quests. Completed personal bests are already saved.</p>', () => { leaveGame(); $('arcadeLobby').querySelector('[data-start-game]').focus(); }, 'Leave game', 'Keep playing');
      return;
    }
    if (game.done) return;
    if (action === 'next' && game.checked) {
      game.index++;
      game.checked = false;
      game.choice = null;
      if (game.index === game.items.length) finishGame();
      renderGame(); focusStage('gameStage'); return;
    }
    if (game.checked) return;
    const sortChoice = event.target.closest('[data-sort]');
    const allowanceChoice = event.target.closest('[data-allowance-choice]');
    const item = game.items[game.index];
    if (sortChoice && game.kind === 'sorter') {
      game.correct = (sortChoice.dataset.sort === 'need') === item.need;
      if (game.correct) game.score++;
      game.answers.push({title: `${game.correct ? '✓' : '○'} ${item.name} · ${item.need ? 'Need' : 'Want'}`, why: item.why});
    } else if (allowanceChoice && game.kind === 'allowance') {
      const choice = item.choices[Number(allowanceChoice.dataset.allowanceChoice)];
      if (!choice || choice.cost > game.wallet) return;
      game.choice = choice;
      game.wallet -= choice.cost;
      game.saved += choice.saved ?? 0;
      game.score += choice.points;
      game.answers.push({title: item.title, why: choice.why});
    } else return;
    game.checked = true;
    renderGame();
    $('gameStage').querySelector('[data-game-action="next"]').focus({preventScroll: true});
  });

  // Update time-sensitive labels when returning to an open tab after midnight.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && player) renderAll(); });
  const remembered = read(durableStorage, PREFIX + 'session');
  const session = read(tabStorage, PREFIX + 'session') ?? remembered;
  if (session?.id === 'guest') startPlayer({id: 'guest', name: 'Explorer', avatar: 'owl'}, read(tabStorage, PREFIX + 'guest'), true);
  else {
    const previousPlayer = profiles().find(p => p.id === session?.id);
    if (previousPlayer) {
      $('rememberPlayer').checked = remembered?.id === previousPlayer.id;
      startPlayer(previousPlayer, undefined, true);
    } else showLogin(profiles().length > 0);
  }
})();
