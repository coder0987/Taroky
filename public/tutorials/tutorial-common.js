const DIAMONDS = 'Diamond';
const HEARTS = 'Heart';
const SPADES = 'Spade';
const CLUBS = 'Club';
const TRUMP = 'Trump';

function setCurrentPlayer(player) {
  document.getElementById('currentPlayer').innerHTML = player === 1 ? 'Your Move' : `Player ${player}'s Move`;
  for (let i=1; i<=4; i++) {
    document.getElementById('roundInfo' + i).classList.toggle('active-player', player === i);
  }
}

function putCardOnTable(slot, suit, value) {
  const id = value + suit;
  
  let card = document.getElementById(id);

  if (!card) {
    card = document.createElement('img');
    card.src = `/assets/mach-deck-thumb/${suit.toLowerCase()}-${value.toLowerCase()}-t.png`;
    card.id = id;
    card.alt = `${value} of ${suit}`;
  }

  card.classList.remove('col-md');
  card.classList.remove('col-xs-3');
  card.classList.add('table-card');

  const place = document.getElementById(`p${slot}`);
  place.appendChild(card);
}

function clearTable(leader) {
  document.getElementById('table').innerHTML = '<div id="p1" class="col-3"><span id="p1leader" class="no-margin-below"><br></span></div><div id="p2" class="col-3"><span id="p2leader" class="no-margin-below"><br></span></div><div id="p3" class="col-3"><span id="p3leader" class="no-margin-below"><br></span></div><div id="p4" class="col-3"><span id="p4leader" class="no-margin-below"><br></span></div>';
  document.getElementById(`p${leader}leader`).innerHTML = 'Leader<br>';
}

function grayHand() {
  let hand = document.getElementById('hand');

  let cards = hand.children;

  for (let i = 0; i < hand.childElementCount; i++) {
    cards[i].classList.add('grayed');
    cards[i].style.filter = 'grayscale(1)';
  }
}

function ungrayHand() {
  let hand = document.getElementById('hand');

  let cards = hand.children;

  for (let i = 0; i < hand.childElementCount; i++) {
    cards[i].classList.remove('grayed');
    cards[i].style.filter = 'grayscale(0)';
  }
}

function unGraySuit(suit) {
  let hand = document.getElementById('hand');

  let cards = hand.children;

  for (let i = 0; i < hand.childElementCount; i++) {
    if (cards[i].id.includes(suit)) {
      cards[i].classList.remove('grayed');
      cards[i].style.filter = 'grayscale(0)';
    }
  }
}

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
