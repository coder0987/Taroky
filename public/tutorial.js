const texts = [
  "Welcome to the world of MachTarok!",
  "Here, you’ll learn to play the ancient card game of strategy and wit.",
  "Let me show you how it works."
];

let currentTextIndex = 0;
let typingInterval;
let isTyping = false;

const speechText = document.getElementById('speechText');
const nextBtn = document.getElementById('nextBtn');
const overlay = document.getElementById('trainerOverlay');

function typeText(text, speed = 30) {
  let index = 0;
  isTyping = true;
  speechText.innerHTML = '';
  nextBtn.style.display = 'none';

  typingInterval = setInterval(() => {
    if (index < text.length) {
      speechText.innerHTML += text[index];
      index++;
    } else {
      clearInterval(typingInterval);
      isTyping = false;
      nextBtn.style.display = 'inline-block';
    }
  }, speed);
}

function skipTyping() {
  clearInterval(typingInterval);
  speechText.innerHTML = texts[currentTextIndex];
  isTyping = false;
  nextBtn.style.display = 'inline-block';
}

function nextDialogue() {
  currentTextIndex++;
  if (currentTextIndex < texts.length) {
    typeText(texts[currentTextIndex]);
  } else {
    overlay.style.display = 'none'; // hide overlay
  }
}

// Initial call
typeText(texts[currentTextIndex]);

// Event listeners
overlay.addEventListener('click', () => {
  if (isTyping) {
    skipTyping();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (isTyping) {
      skipTyping();
    }
  }
});

nextBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // prevent overlay click
  nextDialogue();
});
