/* Shared, browser-independent rules for money, progress, and rewards. */
(() => {
  'use strict';
  const INITIAL_BALANCE = 100000;
  const MAX_CENTS = 100000000;
  const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const yesterdayKey = (date = new Date()) => { const previous = new Date(date); previous.setDate(previous.getDate() - 1); return dateKey(previous); };
  const integer = (value, fallback = 0, max = MAX_CENTS) => Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fallback;
  const cleanText = (value, limit = 60) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '';
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  const freshState = () => ({
    version: 2, balance: INITIAL_BALANCE, transactions: [], goalName: 'My savings goal', goalTarget: 30000,
    savings: 0, completed: [], bestQuiz: null, attempts: 0, xp: 0, awards: [], badges: [],
    gameBests: {sorter: 0, allowance: 0}, gamesPlayed: 0, investmentRuns: 0,
    daily: {date: '', read: false, budget: false, play: false, claimed: false},
    streak: 0, lastActive: '', history: []
  });
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return freshState();
    const result = freshState();
    const legacy = raw.version !== 2;
    const cents = value => legacy && Number.isFinite(value) ? Math.round(value * 100) : value;
    result.balance = integer(cents(raw.balance), INITIAL_BALANCE);
    result.savings = integer(cents(raw.savings));
    result.goalName = cleanText(raw.goalName) || result.goalName;
    result.goalTarget = integer(cents(raw.goalTarget), 30000) || 30000;
    result.completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < 7))] : [];
    result.bestQuiz = Number.isInteger(raw.bestQuiz) && raw.bestQuiz >= 0 && raw.bestQuiz <= 8 ? raw.bestQuiz : null;
    result.attempts = integer(raw.attempts);
    result.transactions = Array.isArray(raw.transactions) ? raw.transactions.filter(t => t && ['income', 'expense'].includes(t.type) && cleanText(t.name) && integer(cents(t.amount)) > 0).map(t => ({type: t.type, name: cleanText(t.name), amount: cents(t.amount), date: cleanText(t.date, 40)})) : [];
    if (legacy) {
      for (const n of result.completed) award(result, `lesson:${n}`, 50, 'Previous learning quest');
      if (result.bestQuiz !== null) award(result, 'legacy-quiz', result.bestQuiz * 10, 'Previous quiz progress');
      if (result.transactions.length) award(result, 'budget-first', 30, 'Previous budget practice');
      if (result.savings > 0) award(result, 'savings-first', 40, 'Previous savings progress');
      if (result.savings >= result.goalTarget) award(result, 'goal-hit', 100, 'Previous savings goal reached');
      return result;
    }
    result.xp = integer(raw.xp);
    result.awards = Array.isArray(raw.awards) ? [...new Set(raw.awards.filter(a => typeof a === 'string' && a.length <= 60))] : [];
    result.badges = Array.isArray(raw.badges) ? raw.badges.filter(a => typeof a === 'string' && a.length <= 30) : [];
    result.gameBests = {sorter: integer(raw.gameBests?.sorter, 0, 8), allowance: integer(raw.gameBests?.allowance, 0, 100)};
    result.gamesPlayed = integer(raw.gamesPlayed);
    result.investmentRuns = integer(raw.investmentRuns);
    result.streak = integer(raw.streak, 0, 100000);
    result.lastActive = validDate(raw.lastActive);
    if (raw.daily && typeof raw.daily === 'object') result.daily = {
      date: validDate(raw.daily.date), read: raw.daily.read === true, budget: raw.daily.budget === true,
      play: raw.daily.play === true, claimed: raw.daily.claimed === true
    };
    result.history = Array.isArray(raw.history) ? raw.history.filter(h => h && cleanText(h.label) && Number.isFinite(Date.parse(h.date))).slice(0, 30).map(h => ({label: cleanText(h.label, 100), xp: integer(h.xp), date: h.date})) : [];
    return result;
  }
  function amountToCents(value, minimum = 1) {
    const input = String(value).trim();
    if (!/^(?:\d+|\d*\.\d{1,2})$/.test(input)) return null;
    const cents = Math.round(Number(input) * 100);
    return Number.isSafeInteger(cents) && cents >= minimum && cents <= MAX_CENTS ? cents : null;
  }
  function award(state, id, xp, label, now = new Date()) {
    if (state.awards.includes(id) || !Number.isSafeInteger(xp) || xp < 0) return 0;
    state.awards.push(id);
    state.xp += xp;
    state.history.unshift({label, xp, date: now.toISOString()});
    state.history = state.history.slice(0, 30);
    return xp;
  }
  function daily(state, now = new Date()) {
    if (state.daily.date !== dateKey(now)) state.daily = {date: dateKey(now), read: false, budget: false, play: false, claimed: false};
    return state.daily;
  }
  function touch(state, kind, now = new Date()) {
    const today = dateKey(now);
    if (state.lastActive !== today) state.streak = state.lastActive === yesterdayKey(now) ? state.streak + 1 : 1;
    state.lastActive = today;
    if (['read', 'budget', 'play'].includes(kind)) daily(state, now)[kind] = true;
  }
  function currentStreak(state, now = new Date()) {
    return [dateKey(now), yesterdayKey(now)].includes(state.lastActive) ? state.streak : 0;
  }
  function claimDaily(state, now = new Date()) {
    const quests = daily(state, now);
    if (quests.claimed || !quests.read || !quests.budget || !quests.play) return 0;
    quests.claimed = true;
    touch(state, null, now);
    return award(state, `daily:${dateKey(now)}`, 75, 'Daily side quests completed', now);
  }
  function gameReward(state, game, score) {
    if (!['sorter', 'allowance'].includes(game)) return 0;
    const max = game === 'sorter' ? 8 : 100;
    if (!Number.isInteger(score) || score < 0 || score > max) return 0;
    const improvement = Math.max(0, score - state.gameBests[game]);
    state.gameBests[game] = Math.max(score, state.gameBests[game]);
    const reward = improvement * (game === 'sorter' ? 10 : 1);
    if (reward) award(state, `game:${game}:${score}`, reward, `${game === 'sorter' ? 'Need it or want it?' : 'Allowance adventure'} · new personal best`);
    return reward;
  }
  const level = xp => ({number: Math.floor(xp / 200) + 1, current: xp % 200, title: ['Money Rookie', 'Smart Spender', 'Savings Scout', 'Budget Boss', 'Money Maestro', 'Future Builder'][Math.min(5, Math.floor(xp / 200))]});
  const model = {INITIAL_BALANCE, MAX_CENTS, freshState, normalize, amountToCents, cleanText, dateKey, award, daily, touch, currentStreak, claimDaily, gameReward, level};
  globalThis.MoneyWiseModel = model;
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
})();
