const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..');
const prefix = 'moneywise:v2:';

function app(t, {local = {}, session = {}, storageBlocked = false} = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://moneywise.test/', runScripts: 'outside-only', virtualConsole: console,
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.matchMedia = () => ({matches: true});
  w.scrollTo = () => {};
  w.structuredClone = structuredClone;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  for (const [key, value] of Object.entries(local)) w.localStorage.setItem(key, JSON.stringify(value));
  for (const [key, value] of Object.entries(session)) w.sessionStorage.setItem(key, JSON.stringify(value));
  if (storageBlocked) Object.defineProperty(w, 'localStorage', {get() { throw new Error('Blocked'); }});
  for (const file of ['content.js', 'model.js', 'views.js', 'script.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  const $ = id => w.document.getElementById(id);
  const click = selector => {
    const element = w.document.querySelector(selector);
    assert.ok(element, `Missing control ${selector}`);
    assert.ok(!element.disabled, `Disabled control ${selector}`);
    element.click();
  };
  const fill = (id, value) => { $(id).value = value; $(id).dispatchEvent(new w.Event('change', {bubbles: true})); };
  const submit = id => $(id).dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true}));
  const createPlayer = name => { click('#newPlayerTab'); fill('playerName', name); submit('profileForm'); assert.equal($('appScreen').hidden, false); };
  const players = () => JSON.parse(w.localStorage.getItem(prefix + 'players'));
  const saved = (id = players()[0].id) => JSON.parse(w.localStorage.getItem(prefix + 'state:' + id));
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'No uncaught DOM errors'); });
  return {w, $, click, fill, submit, createPlayer, players, saved};
}

function finishSorter(a) {
  a.click('[data-start-game="sorter"]');
  const needs = ['School lunch', 'Safe drinking water', 'Prescribed medicine', 'Bus fare to school'];
  for (let i = 0; i < 8; i++) {
    const name = a.$('gameStage').querySelector('h2').textContent;
    a.click(`[data-sort="${needs.includes(name) ? 'need' : 'want'}"]`);
    a.click('[data-game-action="next"]');
  }
}
function finishQuiz(a, correct = true) {
  a.click('[data-quiz-action="start"]');
  for (let i = 0; i < 8; i++) {
    const title = a.$('quizStage').querySelector('legend').textContent;
    const question = a.w.MoneyWiseContent.questions.find(q => q.question === title);
    const answer = correct ? question.answer : (question.answer + 1) % 4;
    a.click(`#quizStage input[value="${answer}"]`);
    a.submit('quizAnswerForm');
    a.click('[data-quiz-action="next"]');
  }
}

test('login, all pages, labels, icons, and local assets load without a service', t => {
  const a = app(t);
  assert.equal(a.$('loginScreen').hidden, false);
  assert.equal(a.$('appScreen').hidden, true);
  assert.equal(a.w.MoneyWiseContent.lessons.length, 7);
  assert.equal(a.w.MoneyWiseContent.questions.length, 8);
  a.click('#guestLogin');
  assert.equal(a.$('appScreen').hidden, false);
  for (const id of ['home', 'learn', 'budget', 'savings', 'invest', 'games', 'quiz', 'progress']) {
    a.click(`.main-nav [data-page="${id}"]`);
    assert.equal(a.$(id).hidden, false);
    assert.equal(a.w.document.querySelectorAll('main > .page:not([hidden])').length, 1);
  }
  const ids = [...a.w.document.querySelectorAll('[id]')].map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const label of a.w.document.querySelectorAll('label[for]')) assert.ok(a.$(label.htmlFor), `Missing input ${label.htmlFor}`);
  for (const use of a.w.document.querySelectorAll('use')) assert.ok(a.$(use.getAttribute('href').slice(1)), `Missing icon ${use.getAttribute('href')}`);
  for (const element of a.w.document.querySelectorAll('script[src], link[href], img[src]')) {
    const file = element.getAttribute('src') ?? element.getAttribute('href');
    assert.ok(fs.existsSync(path.join(root, file)), `Missing asset ${file}`);
  }
});

test('players keep separate progress and can sign out and return', t => {
  const a = app(t);
  a.createPlayer('Ama');
  const first = a.players()[0].id;
  a.click('.main-nav [data-page="learn"]');
  a.click('#completeLesson');
  a.click('#completeLesson');
  assert.equal(a.saved(first).xp, 50);
  a.click('#logoutButton');
  a.createPlayer('Kofi');
  const second = a.players()[1].id;
  assert.equal(a.saved(second).xp, 0);
  assert.equal(a.saved(second).balance, 100000);
  a.click('#logoutButton');
  a.click(`[data-player-id="${first}"]`);
  assert.equal(a.$('greetingName').textContent, 'Ama');
  assert.equal(a.saved(first).xp, 50);
  assert.equal(a.saved(second).xp, 0);
});

test('the first player inherits original progress once, leaving the source data intact', t => {
  const legacy = {balance: 650.25, savings: 150, goalName: 'Bicycle', goalTarget: 300, completed: [0, 1], bestQuiz: 6, attempts: 2, transactions: []};
  const a = app(t, {local: {moneywiseState: legacy}});
  a.createPlayer('Returning learner');
  assert.equal(a.saved().balance, 65025);
  assert.equal(a.saved().savings, 15000);
  assert.equal(a.saved().bestQuiz, 6);
  assert.equal(a.saved().badges.includes('first'), true);
  assert.deepEqual(JSON.parse(a.w.localStorage.getItem('moneywiseState')), legacy);
  a.click('#logoutButton'); a.createPlayer('New learner');
  assert.equal(a.saved(a.players()[1].id).balance, 100000);
  assert.deepEqual(a.saved(a.players()[1].id).completed, []);
});

test('budget and savings preserve cents, block overdrafts, and render names as text', t => {
  const a = app(t); a.createPlayer('Money tester');
  a.fill('transactionName', '<img src=x onerror=alert(1)>');
  a.fill('transactionAmount', '0.10'); a.submit('transactionForm');
  assert.equal(a.saved().balance, 100010);
  assert.equal(a.$('transactionList').querySelector('img'), null);
  a.fill('transactionType', 'expense'); a.fill('transactionName', 'Lunch');
  a.fill('transactionAmount', '2000'); a.submit('transactionForm');
  assert.equal(a.saved().balance, 100010);
  assert.match(a.$('budgetMessage').textContent, /more than/);
  a.fill('transactionAmount', '0.11'); a.submit('transactionForm');
  assert.equal(a.saved().balance, 99999);
  a.fill('savingsAddAmount', '50.15'); a.submit('depositForm');
  assert.equal(a.saved().balance, 94984);
  assert.equal(a.saved().savings, 5015);
  a.fill('savingsAddAmount', '0.05'); a.click('#withdrawSavings');
  assert.equal(a.saved().balance, 94989);
  assert.equal(a.saved().savings, 5010);
  assert.equal(a.saved().balance + a.saved().savings, 99999);
  a.fill('savingsAddAmount', '100'); a.click('#withdrawSavings');
  assert.equal(a.saved().savings, 5010);
  a.fill('savingsName', '<img src=x>'); a.fill('savingsTarget', '50'); a.submit('goalForm');
  assert.equal(a.$('goalTitle').textContent, '<img src=x>');
  assert.equal(a.$('goalTitle').querySelector('img'), null);
  assert.equal(a.saved().badges.includes('goal'), true);
});

test('sorter, daily quests, and replay reward only actual progress', t => {
  const a = app(t); a.createPlayer('Quest tester');
  a.click('#completeLesson');
  a.fill('transactionName', 'Allowance'); a.fill('transactionAmount', '10'); a.submit('transactionForm');
  a.click('.main-nav [data-page="games"]'); finishSorter(a);
  assert.equal(a.saved().gameBests.sorter, 8);
  assert.equal(a.saved().gamesPlayed, 1);
  assert.equal(a.saved().xp, 160);
  a.click('#claimDaily');
  assert.equal(a.saved().xp, 235);
  assert.equal(a.$('claimDaily').disabled, true);
  a.click('[data-start-game="sorter"]');
  // Starting a new game does not yet count as a finish.
  assert.equal(a.saved().gamesPlayed, 1);
  const needs = ['School lunch', 'Safe drinking water', 'Prescribed medicine', 'Bus fare to school'];
  for (let i = 0; i < 8; i++) {
    a.click(`[data-sort="${needs.includes(a.$('gameStage').querySelector('h2').textContent) ? 'need' : 'want'}"]`);
    a.click('[data-game-action="next"]');
  }
  assert.equal(a.saved().xp, 235);
  assert.equal(a.saved().gamesPlayed, 2);
});

test('allowance adventure uses a separate wallet and awards a perfect plan once', t => {
  const a = app(t); a.createPlayer('Arcade tester');
  a.click('.main-nav [data-page="games"]');
  for (let attempt = 0; attempt < 2; attempt++) {
    a.click('[data-start-game="allowance"]');
    for (let i = 0; i < 5; i++) { a.click('[data-allowance-choice="0"]'); a.click('[data-game-action="next"]'); }
    assert.equal(a.saved().balance, 100000);
    assert.equal(a.saved().savings, 0);
    assert.equal(a.saved().gameBests.allowance, 100);
    assert.equal(a.saved().xp, 100);
    assert.match(a.$('gameStage').textContent, /GH₵ 50.00/);
  }
});

test('quiz gives feedback, records results once, and does not farm XP on replay', t => {
  const a = app(t); a.createPlayer('Quiz tester');
  a.click('.main-nav [data-page="quiz"]'); finishQuiz(a);
  assert.equal(a.saved().bestQuiz, 8);
  assert.equal(a.saved().attempts, 1);
  assert.equal(a.saved().xp, 100);
  assert.equal(a.saved().badges.includes('quiz'), true);
  finishQuiz(a, false);
  assert.equal(a.saved().bestQuiz, 8);
  assert.equal(a.saved().attempts, 2);
  assert.equal(a.saved().xp, 100);
});

test('investment gains and losses do not spend the practice wallet', t => {
  const a = app(t); a.createPlayer('Investor');
  a.fill('investmentAmount', '100'); a.fill('investmentScenario', '-25'); a.submit('investmentForm');
  assert.equal(a.$('investFinal').textContent, 'GH₵ 75.00');
  assert.equal(a.saved().balance, 100000);
  assert.equal(a.saved().xp, 40);
  a.fill('investmentScenario', '15'); a.submit('investmentForm');
  assert.equal(a.$('investFinal').textContent, 'GH₵ 115.00');
  assert.equal(a.saved().xp, 40);
});

test('reset confirmation preserves rewards for wallet reset and isolates full player reset', t => {
  const a = app(t); a.createPlayer('Reset tester');
  a.fill('savingsAddAmount', '100'); a.submit('depositForm');
  assert.equal(a.saved().xp, 40);
  a.click('#resetBudget');
  assert.equal(a.saved().balance, 90000, 'Opening a dialog does not reset anything');
  a.click('#dialogActions .danger');
  assert.equal(a.saved().balance, 100000);
  assert.equal(a.saved().savings, 0);
  assert.equal(a.saved().xp, 40);
  a.fill('savingsAddAmount', '100'); a.submit('depositForm');
  assert.equal(a.saved().xp, 40, 'Resetting the wallet cannot farm savings XP');
  a.click('#resetAll'); a.click('#dialogActions .danger');
  assert.equal(a.saved().xp, 0);
  assert.equal(a.saved().balance, 100000);
  assert.equal(a.players().length, 1);
});

test('guest progress converts into a saved player without losing earned XP', t => {
  const a = app(t); a.click('#guestLogin'); a.click('#completeLesson');
  assert.equal(a.w.localStorage.getItem(prefix + 'players'), null);
  assert.equal(JSON.parse(a.w.sessionStorage.getItem(prefix + 'guest')).xp, 50);
  a.click('#saveGuestButton'); a.createPlayer('Saved explorer');
  assert.equal(a.saved().xp, 50);
  assert.equal(a.saved().completed[0], 0);
  assert.equal(a.$('guestBanner').hidden, true);
  assert.equal(a.w.sessionStorage.getItem(prefix + 'guest'), null);
});

test('remembered sign-in restores the right player, and signing out clears both pointers', t => {
  const p = {id: 'test-player', name: 'Ama', avatar: 'fox'};
  const local = {[prefix + 'players']: [p], [prefix + 'session']: {id: p.id}, [prefix + 'state:' + p.id]: {version: 2, balance: 43210, xp: 50, completed: [0], awards: ['lesson:0']}};
  const a = app(t, {local});
  assert.equal(a.$('appScreen').hidden, false);
  assert.equal(a.$('greetingName').textContent, 'Ama');
  assert.equal(a.$('homeBalance').textContent, 'GH₵ 432.10');
  assert.equal(a.$('rememberPlayer').checked, true);
  a.click('#logoutButton');
  assert.equal(a.w.localStorage.getItem(prefix + 'session'), null);
  assert.equal(a.w.sessionStorage.getItem(prefix + 'session'), null);
  assert.equal(a.players().length, 1);
});

test('blocked local storage still allows guest play and reports persistence limits', t => {
  const a = app(t, {storageBlocked: true});
  a.fill('playerName', 'Unsaved'); a.submit('profileForm');
  assert.match(a.$('profileMessage').textContent, /cannot save/);
  a.click('#guestLogin');
  a.click('#completeLesson');
  assert.equal(a.$('appScreen').hidden, false);
  assert.match(a.$('homeXP').textContent, /50/);
});
