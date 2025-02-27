// Replace with your Heroku server URL:
const API_BASE = 'https://quiz-controller-api-f86ea1ce8663.herokuapp.com';

const screenSession  = document.getElementById('screenSession');
const screenWaiting  = document.getElementById('screenWaiting');
const screenQuestion = document.getElementById('screenQuestion');
const screenVoted    = document.getElementById('screenVoted');
const screenThanks   = document.getElementById('screenThanks');

const sessionInput      = document.getElementById('sessionInput');
const playerNameInput   = document.getElementById('playerNameInput');
const joinBtn           = document.getElementById('joinBtn');

const questionText      = document.getElementById('questionText');
const answersContainer  = document.getElementById('answersContainer');

// We'll store sessionName/playerName in localStorage so we skip the prompt next time
let sessionName = localStorage.getItem('sessionName') || '';
let playerName  = localStorage.getItem('playerName') || '';

// Track if we've ever seen a question => if we see no question again, it means end
let hasSeenAQuestion = false;
let pollInterval = null;
let currentQuestionNumber = null;

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

// On load, check if we already have session/player info
window.addEventListener('DOMContentLoaded', () => {
  if (!sessionName || !playerName) {
    showScreen('session');
  } else {
    startPolling();
  }
});

// Join button => store session & name, start polling
joinBtn.addEventListener('click', () => {
  const s = sessionInput.value.trim();
  const p = playerNameInput.value.trim();
  if (!s || !p) {
    alert('Please enter both session and your name.');
    return;
  }
  sessionName = s;
  playerName  = p;
  localStorage.setItem('sessionName', sessionName);
  localStorage.setItem('playerName', playerName);

  startPolling();
});

// Start polling /active?session=... every few seconds
function startPolling() {
  showScreen('waiting');
  pollInterval = setInterval(checkActiveQuestion, 3000);
  checkActiveQuestion();
}

// checkActiveQuestion => GET /active?session=SessionName
async function checkActiveQuestion() {
  try {
    const url = `${API_BASE}/active?session=${encodeURIComponent(sessionName)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.error === 'Session not found') {
      // We have an invalid session => show session screen again
      alert('Session not found. Please re-enter.');
      clearInterval(pollInterval);
      localStorage.removeItem('sessionName');
      showScreen('session');
      return;
    }

    if (data.waiting) {
      // Session is found, but Current Question=0 => waiting
      if (!hasSeenAQuestion) {
        showScreen('waiting');
      } else {
        // If we had seen a question, but now waiting => means quiz might have restarted
        // but let's just stay on waiting.
        showScreen('waiting');
      }
      return;
    }

    if (data.end) {
      // Means the quiz has moved beyond last question
      showScreen('thanks');
      clearInterval(pollInterval);
      return;
    }

    // Otherwise we have an active question
    hasSeenAQuestion = true;

    // data.questionId, data.fields
    // We'll track the question number from the fields
    currentQuestionNumber = data.fields['Question Number'];

    loadQuestion(data.fields);
  } catch (err) {
    console.error('Error polling active question:', err);
    // Could show an error or do nothing
  }
}

// loadQuestion => display question text & answers
function loadQuestion(fields) {
  questionText.innerText = fields['Question'] || 'Untitled question';
  answersContainer.innerHTML = '';

  for (let i = 1; i <= 4; i++) {
    const ansText = fields[`Answer ${i}`] || '';
    if (!ansText) continue;
    const btn = document.createElement('button');
    btn.innerText = ansText;
    btn.onclick = () => castVote(i);
    answersContainer.appendChild(btn);
  }

  showScreen('question');
}

// castVote => POST /vote
async function castVote(answerNumber) {
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
    // Once done, we stay on \"voted\" until the next question is loaded by the poll
  } catch (err) {
    console.error('Error casting vote:', err);
    alert('Failed to submit vote.');
  }
}
