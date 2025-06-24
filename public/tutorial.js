const scenes = [
  {
    trainer: true,
    text: "So you want to play Taroky?",
    board: false
  },
  {
    trainer: true,
    text: "At first glance, this game has a lot of rules.",
    board: false
  },
  {
    trainer: true,
    text: "Luckily, most of them are pretty intuitive.",
    board: false
  },
  {
    trainer: true,
    text: "Learning Taroky takes maybe half an hour.",
    board: false
  },
  {
    trainer: true,
    text: "Mastering Taroky takes maybe half a lifetime.",
    board: false
  },
  {
    trainer: false,
    board: true,
    layout: ""
  },
]

let currentTextIndex = 0;
let typingInterval;
let isTyping = false;

let speechText = document.getElementById('speechText');
let nextBtn    = document.getElementById('nextBtn');
let overlay    = document.getElementById('trainerOverlay');
let board      = document.getElementById('training-room');
let trainerImg = document.getElementById('trainer-img');

function typeText(text, speed = 30) {
  let index = 0;
  isTyping = true;
  speechText.innerHTML = "";
  nextBtn.style.display = "none";

  typingInterval = setInterval(() => {
    if (index < text.length) {
      speechText.innerHTML += text[index];
      index++;
    } else {
      clearInterval(typingInterval);
      isTyping = false;
      nextBtn.style.display = "inline-block";
    }
  }, speed);
}

function skipTyping() {
  clearInterval(typingInterval);
  speechText.innerHTML = scenes[currentTextIndex].text;
  isTyping = false;
  nextBtn.style.display = "inline-block";
}

function nextDialogue() {
  currentTextIndex++;
  if (currentTextIndex < scenes.length) {

    if (scenes[currentTextIndex].trainer) {
      overlay.removeAttribute('hidden');
      typeText(scenes[currentTextIndex].text);
    } else {
      overlay.setAttribute('hidden','hidden');
    }

    if (scenes[currentTextIndex].board) {
      // Do something
      
      board.innerHTML = scenes[currentTextIndex].layout;
    }

  } else {
    overlay.style.display = "none"; // hide overlay
  }
}

function rotateSkyz() {
  if (trainerImg) {
    trainerImg.classList.toggle("flipped");
  }
}

// Event listeners

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (isTyping) {
      skipTyping();
    }
  }
});

window.addEventListener("load", () => {
  console.log("Let's begin!");

  speechText = document.getElementById('speechText');
  nextBtn    = document.getElementById('nextBtn');
  overlay    = document.getElementById('trainerOverlay');
  board      = document.getElementById('training-room');
  trainerImg = document.getElementById('trainer-img');

  overlay.addEventListener("click", () => {
    if (isTyping) {
      skipTyping();
    }
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent overlay click
    nextDialogue();
  });

  if (trainerImg) {
    trainerImg.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent overlay click from triggering
      rotateSkyz();
    });
  }

  typeText(scenes[0].text);
});

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyR") {
    e.preventDefault();
    rotateSkyz();
  }
});
