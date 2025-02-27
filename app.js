// Replace with your Heroku server URL:
const API_BASE = 'https://quiz-controller-api-f86ea1ce8663.herokuapp.com';

// Footer for session name
const sessionFooter = document.getElementById('sessionFooter');

// Screens
const screenSession  = document.getElementById('screenSession');
const screenWaiting  = document.getElementById('screenWaiting');
const screenQuestion = document.getElementById('screenQuestion');
const screenVoted    = document.getElementById('screenVoted');
const screenThanks   = document.getElementById('screenThanks');

// Inputs/Buttons
const sessionInput     = document.getElementById('sessionInput');
const playerNameInput  = document.getElementById('playerNameInput');
const joinBtn          = document.getElementById('joinBtn');

const questionText     = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');

// Variables in memory
let sessionName = '';
let playerName  = '';
let currentQuestionNumber = null;
let hasSeenQuestion = false;
let pollInterval = null;

// Show/hide screens
function showScreen(name) {
  screenSession.classList.add('hidden');
  screenWaiting.classList.add('hidden');
  screenQuestion.classList.add('hidden');
  screenVoted.classList.add('hidden');
  screenThanks.classList.add('hidden');

  if (name === 'session')  screenSession.classList.remove('hidden');
  if (name === 'waiting')  screenWaiting.classList.remove('hidden');
  if (name === 'question') screenQuestion.classList.remove('hidden');
  if (name === 'voted')    screenVoted.classList.remove('hidden');
  if (name === 'thanks')   screenThanks.classList.remove('hidden');
}

// 1) On page load, show session/name prompt
window.addEventListener('DOMContentLoaded', () => {
  showScreen('session');
});

// 2) Join button => read session & name, start polling
joinBtn.addEventListener('click', () => {
  const s = sessionInput.value.trim();
  const p = playerNameInput.value.trim();
  if (!s || !p) {
    alert('Please enter both session and your name.');
    return;
  }
  sessionName = s;
  playerName  = p;

  // Show session in footer
  sessionFooter.textContent = `Session: ${sessionName}`;

  startPolling();
});

// 3) Start polling /active?session=... every few seconds
function startPolling() {
  showScreen('waiting');
  pollInterval = setInterval(checkActiveQuestion, 3000);
  checkActiveQuestion();
}

// 4) checkActiveQuestion => calls GET /active?session=...
async function checkActiveQuestion() {
  try {
    const url = `${API_BASE}/active?session=${encodeURIComponent(sessionName)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.error === 'Session not found') {
      // Invalid session => stop polling, show session screen
      alert('Session not found. Please re-enter.');
      clearInterval(pollInterval);
      showScreen('session');
      return;
    }

    // If waiting: currentQuestion=0 => show waiting
    if (data.waiting) {
      if (!hasSeenQuestion) {
        showScreen('waiting');
      } else {
        // if we've seen a question but it's back to waiting => maybe quiz restarted, but we'll do the same
        showScreen('waiting');
      }
      return;
    }

    // If end => quiz finished
    if (data.end) {
      showScreen('thanks');
      clearInterval(pollInterval);
      return;
    }

    // We have an active question
    const newQNum = data.fields['Question Number'];

    // If the question number hasn't changed since we voted, remain on 'voted'
    if (currentQuestionNumber && newQNum === currentQuestionNumber && hasSeenQuestion) {
      // do nothing (stay on voted)
      return;
    }

    hasSeenQuestion = true;
    currentQuestionNumber = newQNum;
    loadQuestion(data.fields);

  } catch (err) {
    console.error('Error polling active question:', err);
    // Could show an error or do nothing
  }
}

// 5) loadQuestion => show question text & answers
function loadQuestion(fields) {
  questionText.innerText = fields['Question'] || 'Untitled question';
  answersContainer.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const ansText = fields[`Answer ${i}`] || '';
    if (!ansText) continue;
    const div = document.createElement('div');
    div.className = 'answer-box';
    div.textContent = `${ansText}`;
    div.onclick = () => castVote(i);
    answersContainer.appendChild(div);
  }

  showScreen('question');
}

// 6) castVote => POST /vote
async function castVote(answerNumber) {
  // Immediately show 'voted'
  showScreen('voted');

  try {
    const body = {
      sessionName,
      questionNumber: currentQuestionNumber,
      voterName: playerName,
      answerNumber
    };
    await fetch(`${API_BASE}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    // Stay on 'voted' until controller increments question
  } catch (err) {
    console.error('Error casting vote:', err);
    alert('Failed to submit vote.');
  }
}
