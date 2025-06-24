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
    trainer: true,
    flip: true,
    text: "Grandpa needs your help! He's off to refill his pepsi, and he needs someone to take his place.",
    board: false
  },
  {
    trainer: true,
    text: "It looks like player 4 is povinnost (They're in the lead). Try following suit by playing a diamond.",
    board: false
  },
  {
    trainer: false,
    board: true,
    layout: () => {
      document.getElementById('ThreeDiamond').addEventListener('click', () => {
        // Ooh two layers of functional javascript. I'm sure this isn't confusing at all

        // Move the three of diamonds to the table, clear the grayed-out cards, and trigger the next dialog
      });

      document.getElementById('reminder-text').innerHTML = "Click the three of diamonds to play it";
    }
  },
  {
    trainer: true,
    text: "Nice one! Now, players 2 & 3 will also follow suit.",
    board: false
  },
  {
    trainer: true,
    flip: true,
    text: "Notice the game is played turn-by-turn. Each player makes a move, then lets the next player go.",
    board: false
  },
  {
    trainer: true,
    text: "Also, notice that you could only play the three of diamonds. That's because, in Taroky, you always have to follow suit - if you can.",
    board: false
  },
  {
    trainer: true,
    flip: true,
    text: "It looks like it's your turn again! This time, Povinnost lead a spade.",
    board: true,
    layout: () => {
      document.getElementById('reminder-text').innerHTML = "Click the king of spades to play it";
    }
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

    if (scenes[currentTextIndex].flip) {
      rotateSkyz();
    }

    if (scenes[currentTextIndex].trainer) {
      overlay.removeAttribute('hidden');
      typeText(scenes[currentTextIndex].text);
    } else {
      overlay.setAttribute('hidden','hidden');
    }

    if (scenes[currentTextIndex].board) {
      // Do something
      scenes[currentTextIndex].layout();
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
