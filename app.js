// Replace with your Heroku server URL:
const API_BASE = 'https://quiz-controller-api-f86ea1ce8663.herokuapp.com';

// Screens
const screenSession  = document.getElementById('screenSession');
const screenWaiting  = document.getElementById('screenWaiting');
const screenQuestion = document.getElementById('screenQuestion');
const screenVoted    = document.getElementById('screenVoted');
const screenThanks   = document.getElementById('screenThanks');

// Inputs/Buttons
const sessionInput      = document.getElementById('sessionInput');
const playerNameInput   = document.getElementById('playerNameInput');
const joinBtn           = document.getElementById('joinBtn');

const questionText      = document.getElementById('questionText');
const answersContainer  = document.getElementById('answersContainer');

// Footer
const sessionFooter     = document.getElementById('sessionFooter');

// Variables in memory (no localStorage)
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

// 1) On page load, show session prompt
window.addEventListener('DOMContentLoaded', () => {
  showScreen('session');
});

// 2) Join button => store session & name, start polling
joinBtn.addEventListener('click', () => {
  const s = sessionInput.value.trim();
  const p = playerNameInput.value.trim();
  if (!s || !p) {
    alert('Please enter both session and your name.');
    return;
  }
  sessionName = s;
  playerName  = p;
  sessionFooter.innerText = `Session: ${sessionName}`;

  startPolling();
});

// 3) Start polling /active?session=SessionName every few seconds
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

    if (data.waiting) {
      // Means currentQuestion=0 => quiz not started
      if (!hasSeenQuestion) {
        // We haven't seen a question => remain in waiting
        showScreen('waiting');
      } else {
        // If we had seen a question but now it's 0 => maybe the quiz restarted?
        showScreen('waiting');
      }
      return;
    }

    if (data.end) {
      // Means we've gone beyond last question => thanks
      showScreen('thanks');
      clearInterval(pollInterval);
      return;
    }

    // We have an active question
    const newQNum = data.fields['Question Number'];
    
    // If the question number hasn't changed since we voted, remain on 'voted' screen
    // This ensures we stay in 'voted' until the controller increments to the next question
    if (currentQuestionNumber && newQNum === currentQuestionNumber && hasSeenQuestion) {
      // No new question => do nothing (stay on voted)
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
  // If we were previously on 'voted', but the question changed => show question screen
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

// 6) castVote => POST /vote
async function castVote(answerNumber) {
  // Move to voted screen immediately
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
    // We remain on 'voted' until the controller increments to the next question
  } catch (err) {
    console.error('Error casting vote:', err);
    alert('Failed to submit vote.');
  }
}
