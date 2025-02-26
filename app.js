// Replace with your Heroku server URL:
const API_BASE = 'https://quiz-controller-api-f86ea1ce8663.herokuapp.com';

const screenName     = document.getElementById('screenName');
const screenQuestion = document.getElementById('screenQuestion');
const screenVoted    = document.getElementById('screenVoted');
const screenThanks   = document.getElementById('screenThanks');

const nameInput      = document.getElementById('nameInput');
const nameSubmitBtn  = document.getElementById('nameSubmitBtn');

const questionText   = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');

// We'll store the user's name in localStorage so we ask only once
let playerName = localStorage.getItem('playerName') || '';

// The currently active question record (from /active)
let activeQuestionId = null; // Airtable record ID
let activeQuestionText = null; // string
let answersMap = {}; // { '1': 'Answer text', '2': 'Answer text', ... }

// Show/hide screens
function showScreen(name) {
  screenName.classList.add('hidden');
  screenQuestion.classList.add('hidden');
  screenVoted.classList.add('hidden');
  screenThanks.classList.add('hidden');

  if (name === 'name')    screenName.classList.remove('hidden');
  if (name === 'question') screenQuestion.classList.remove('hidden');
  if (name === 'voted')   screenVoted.classList.remove('hidden');
  if (name === 'thanks')  screenThanks.classList.remove('hidden');
}

// 1) On load, check if we have a name
window.addEventListener('load', () => {
  if (!playerName) {
    showScreen('name');
  } else {
    // Jump straight into question polling
    startPolling();
  }
});

// 2) If user enters a name:
nameSubmitBtn.addEventListener('click', () => {
  const enteredName = nameInput.value.trim();
  if (!enteredName) {
    alert('Please enter a name!');
    return;
  }
  playerName = enteredName;
  localStorage.setItem('playerName', playerName);
  startPolling();
});

// 3) Start polling for active question
let pollInterval = null;
function startPolling() {
  showScreen('question'); // or a "loading question" screen
  pollInterval = setInterval(checkActiveQuestion, 3000);
  checkActiveQuestion();
}

// 4) Check /active to see if there's a question
async function checkActiveQuestion() {
  try {
    const res = await fetch(`${API_BASE}/active`);
    const data = await res.json();

    if (!data.active) {
      // No active question => quiz might be over
      showScreen('thanks');
      clearInterval(pollInterval);
      return;
    }

    // If we have a new question ID, or if it's changed, update UI
    if (data.questionId !== activeQuestionId) {
      activeQuestionId = data.questionId;
      loadQuestion(data.fields);
    }
  } catch (err) {
    console.error('Error polling active question:', err);
  }
}

// 5) Render question with answer buttons
function loadQuestion(fields) {
  // fields might include "Question", "Answer 1", "Answer 2"...
  activeQuestionText = fields['Question'];
  questionText.innerText = activeQuestionText || 'No question text';

  answersContainer.innerHTML = '';
  answersMap = {
    '1': fields['Answer 1'] || '',
    '2': fields['Answer 2'] || '',
    '3': fields['Answer 3'] || '',
    '4': fields['Answer 4'] || ''
  };

  for (let i = 1; i <= 4; i++) {
    const ansText = answersMap[i];
    if (!ansText) continue;
    const btn = document.createElement('button');
    btn.innerText = ansText;
    btn.onclick = () => castVote(i);
    answersContainer.appendChild(btn);
  }

  // Show question screen (in case we were in "voted" screen for prior question)
  showScreen('question');
}

// 6) Cast a vote => POST /vote
async function castVote(answerNumber) {
  // Immediately go to "voted" screen
  showScreen('voted');

  try {
    const body = {
      voterName: playerName,
      questionId: activeQuestionId,
      answerNumber: answerNumber
    };

    await fetch(`${API_BASE}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    // If successful, do nothing further—stay on "voted" screen
    // We'll come back to "question" screen only when /active changes to a new question
  } catch (err) {
    console.error('Error casting vote:', err);
    alert('Error submitting your vote. Please try again.');
  }
}
