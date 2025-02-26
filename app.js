// Replace with your Heroku server URL:
const API_BASE = 'https://quiz-controller-api-f86ea1ce8663.herokuapp.com';

const screenName     = document.getElementById('screenName');
const screenWaiting  = document.getElementById('screenWaiting');
const screenQuestion = document.getElementById('screenQuestion');
const screenVoted    = document.getElementById('screenVoted');
const screenThanks   = document.getElementById('screenThanks');

const nameInput      = document.getElementById('nameInput');
const nameSubmitBtn  = document.getElementById('nameSubmitBtn');

const questionText   = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');

// We'll store the user's name in localStorage so we ask only once
let playerName = localStorage.getItem('playerName') || '';

// We track if we've ever seen an active question
// If not, we assume the game hasn't started yet (=> waiting screen).
// Once we've seen at least one active question, if we see no active question again, we assume the quiz ended.
let hasSeenAQuestion = false;

let pollInterval = null;
let activeQuestionId = null;

// Show/hide screens
function showScreen(name) {
  screenName.classList.add('hidden');
  screenWaiting.classList.add('hidden');
  screenQuestion.classList.add('hidden');
  screenVoted.classList.add('hidden');
  screenThanks.classList.add('hidden');

  if (name === 'name')     screenName.classList.remove('hidden');
  if (name === 'waiting')  screenWaiting.classList.remove('hidden');
  if (name === 'question') screenQuestion.classList.remove('hidden');
  if (name === 'voted')    screenVoted.classList.remove('hidden');
  if (name === 'thanks')   screenThanks.classList.remove('hidden');
}

// 1) On load, check if we already have a player name
window.addEventListener('load', () => {
  if (!playerName) {
    showScreen('name');
  } else {
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

// 3) Start polling /active every few seconds
function startPolling() {
  showScreen('waiting'); // Initially show waiting (in case there's no active question)
  pollInterval = setInterval(checkActiveQuestion, 3000);
  checkActiveQuestion();
}

// 4) Check which question is active
async function checkActiveQuestion() {
  try {
    const res = await fetch(`${API_BASE}/active`);
    const data = await res.json();

    if (!data.active) {
      // If there's NO active question:
      if (!hasSeenAQuestion) {
        // If we haven't seen a question yet => the quiz hasn't started
        showScreen('waiting');
      } else {
        // We previously saw a question => the quiz must be done
        showScreen('thanks');
        clearInterval(pollInterval);
      }
      return;
    }

    // If there's an active question:
    // Mark that we definitely saw a question
    hasSeenAQuestion = true;

    if (data.questionId !== activeQuestionId) {
      // new or changed question
      activeQuestionId = data.questionId;
      loadQuestion(data.fields);
    }
  } catch (err) {
    console.error('Error polling active question:', err);
    // Just ignore or show an error if you prefer
  }
}

// 5) Load question data into the UI
function loadQuestion(fields) {
  questionText.innerText = fields['Question'] || 'No question text';
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

// 6) Cast a vote => POST /vote
async function castVote(answerNumber) {
  showScreen('voted'); // Immediately show \"voted\" state

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
    // No further action needed; we remain on \"voted\" until the next active question
  } catch (err) {
    console.error('Error casting vote:', err);
    alert('Error submitting your vote. Please try again.');
  }
}
