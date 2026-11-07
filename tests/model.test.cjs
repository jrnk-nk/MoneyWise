const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');

test('money input uses exact cents and rejects invalid precision, zero, and overflow', () => {
  for (const [input, expected] of [['0.01', 1], ['.50', 50], ['10.10', 1010], ['1000000', 100000000]]) assert.equal(M.amountToCents(input), expected);
  for (const input of ['0', '-1', '0.001', '1e4', 'NaN', 'Infinity', '', '1000000.01']) assert.equal(M.amountToCents(input), null, input);
  assert.equal(M.amountToCents('0.99', 100), null);
});

test('old MoneyWise progress migrates to cents with deduplicated quest rewards', () => {
  const state = M.normalize({balance: 725.10, savings: 300, goalTarget: 300, goalName: 'Bicycle', completed: [0, 1, 1, 8], bestQuiz: 6, attempts: 2, transactions: [{type: 'income', name: 'Allowance', amount: 25.1, date: '11/7/2026'}]});
  assert.equal(state.balance, 72510);
  assert.equal(state.savings, 30000);
  assert.equal(state.transactions[0].amount, 2510);
  assert.deepEqual(state.completed, [0, 1]);
  assert.equal(state.bestQuiz, 6);
  assert.equal(state.xp, 330);
  assert.equal(M.award(state, 'lesson:0', 50, 'Repeat'), 0);
  assert.deepEqual(M.normalize(state), state, 'v2 loads do not migrate or reward again');
});

test('corrupted or hostile saved state falls back to valid values', () => {
  for (const raw of [null, false, 'text', []]) assert.deepEqual(M.normalize(raw), M.freshState());
  const state = M.normalize({version: 2, balance: Infinity, savings: -10, completed: [0, 0, '1', null, 99], goalTarget: 0, bestQuiz: 9, gameBests: {sorter: 100, allowance: -1}, daily: null, transactions: [{type: '<script>', amount: 100, name: 'bad'}], history: [{label: 'bad', date: 'not a date'}]});
  assert.equal(state.balance, 100000);
  assert.equal(state.savings, 0);
  assert.equal(state.goalTarget, 30000);
  assert.equal(state.bestQuiz, null);
  assert.deepEqual(state.completed, [0]);
  assert.deepEqual(state.transactions, []);
  assert.deepEqual(state.history, []);
  assert.deepEqual(state.gameBests, {sorter: 0, allowance: 0});
});

test('one-time rewards cannot be farmed', () => {
  const state = M.freshState();
  assert.equal(M.award(state, 'budget-first', 30, 'First budget move'), 30);
  assert.equal(M.award(state, 'budget-first', 30, 'Repeat'), 0);
  assert.equal(state.xp, 30);
  assert.equal(state.history.length, 1);
});

test('arcade XP rewards only improvement, up to each game maximum', () => {
  const state = M.freshState();
  assert.equal(M.gameReward(state, 'sorter', 3), 30);
  assert.equal(M.gameReward(state, 'sorter', 3), 0);
  assert.equal(M.gameReward(state, 'sorter', 1), 0);
  assert.equal(M.gameReward(state, 'sorter', 8), 50);
  assert.equal(M.gameReward(state, 'sorter', 9), 0);
  assert.equal(M.gameReward(state, 'allowance', 60), 60);
  assert.equal(M.gameReward(state, 'allowance', 100), 40);
  assert.equal(M.gameReward(state, 'allowance', 100), 0);
  assert.equal(state.xp, 180);
});

test('daily bonus requires all three activities and pays once per calendar day', () => {
  const state = M.freshState();
  const now = new Date(2026, 10, 7, 12);
  assert.equal(M.claimDaily(state, now), 0);
  M.touch(state, 'read', now); M.touch(state, 'budget', now);
  assert.equal(M.claimDaily(state, now), 0);
  M.touch(state, 'play', now);
  assert.equal(M.claimDaily(state, now), 75);
  assert.equal(M.claimDaily(state, now), 0);
  assert.equal(M.claimDaily(M.normalize(state), now), 0);
  const tomorrow = new Date(2026, 10, 8, 12);
  assert.equal(M.daily(state, tomorrow).read, false);
  for (const activity of ['read', 'budget', 'play']) M.touch(state, activity, tomorrow);
  assert.equal(M.claimDaily(state, tomorrow), 75);
  assert.equal(state.xp, 150);
});

test('streak increments on activity, survives yesterday, and restarts after a missed day', () => {
  const state = M.freshState();
  const day = n => new Date(2026, 10, n, 12);
  M.touch(state, 'read', day(7)); M.touch(state, 'play', day(7));
  assert.equal(state.streak, 1);
  assert.equal(M.currentStreak(state, day(8)), 1);
  M.touch(state, 'budget', day(8));
  assert.equal(state.streak, 2);
  assert.equal(M.currentStreak(state, day(10)), 0);
  M.touch(state, 'read', day(10));
  assert.equal(state.streak, 1);
});

test('streak calendar arithmetic crosses month and year boundaries', () => {
  const state = M.freshState();
  M.touch(state, 'read', new Date(2026, 11, 31, 22));
  M.touch(state, 'read', new Date(2027, 0, 1, 1));
  assert.equal(state.streak, 2);
});

test('levels progress every 200 XP and continue beyond the last title', () => {
  assert.deepEqual(M.level(0), {number: 1, current: 0, title: 'Money Rookie'});
  assert.equal(M.level(199).number, 1);
  assert.deepEqual(M.level(200), {number: 2, current: 0, title: 'Smart Spender'});
  assert.equal(M.level(1240).current, 40);
  assert.equal(M.level(1240).number, 7);
});
