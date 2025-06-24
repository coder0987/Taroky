const DIAMONDS = "Diamond";
const HEARTS = "Heart";
const SPADES = "Spade";
const CLUBS = "Club";
const TRUMP = "Trump";

const scenes = [
  {
    trainer: true,
    text: "So you want to play Taroky?",
    board: false,
  },
  {
    trainer: true,
    text: "At first glance, this game has a lot of rules.",
    board: false,
  },
  {
    trainer: true,
    text: "Luckily, most of them are pretty intuitive.",
    board: false,
  },
  {
    trainer: true,
    text: "Learning Taroky takes maybe half an hour.",
    board: false,
  },
  {
    trainer: true,
    text: "Mastering Taroky takes maybe half a lifetime.",
    board: false,
  },
  {
    trainer: true,
    flip: true,
    text: "Grandpa needs your help! He's off to refill his pepsi, and he needs someone to take his place.",
    board: false,
  },
  {
    trainer: true,
    text: "It looks like player 4 is povinnost (They're in the lead). Try following suit by playing a diamond.",
    board: false,
  },
  {
    trainer: false,
    board: true,
    layout: () => {
      document.getElementById("ThreeDiamond").addEventListener("click", () => {
        // Ooh two layers of functional javascript. I'm sure this isn't confusing at all

        // Move the three of diamonds to the table, clear the grayed-out cards, and trigger the next dialog

        ungrayHand();

        putCardOnTable(1, DIAMONDS, "Three");

        setCurrentPlayer(2);

        nextDialogue();
      });

      document.getElementById("reminder-text").innerHTML =
        "Click the three of diamonds to play it";
    },
  },
  {
    trainer: true,
    text: "Nice one! Now, players 2 & 3 will also follow suit.",
    board: false,
  },
  {
    trainer: true,
    flip: true,
    text: "Notice the game is played turn-by-turn. Each player makes a move, then lets the next player go.",
    board: true,
    layout: () => {
      putCardOnTable(2, DIAMONDS, "Ace");
      setCurrentPlayer(3);
    },
  },
  {
    trainer: true,
    text: "Also, notice that you could only play the three of diamonds. That's because, in Taroky, you always have to follow suit - if you can.",
    board: true,
    layout: () => {
      putCardOnTable(3, DIAMONDS, "Queen");
      setCurrentPlayer(4);
    },
  },
  {
    trainer: true,
    flip: true,
    text: "It looks like it's your turn again! This time, Povinnost lead a spade.",
    board: true,
    layout: () => {
      clearTable(4);
      putCardOnTable(4, SPADES, "Seven");
      setCurrentPlayer(1);

      grayHand();

      let toPlay = document.getElementById("KingSpade");
      toPlay.classList.remove("grayed");

      toPlay.addEventListener("click", () => {
        ungrayHand();

        putCardOnTable(1, SPADES, "King");

        setCurrentPlayer(2);

        nextDialogue();
      });
    },
  },
  {
    trainer: false,
    board: true,
    layout: () => {
      document.getElementById("reminder-text").innerHTML =
        "Click the king of spades to play it";
    },
  },
  {
    trainer: true,
    text: "Good move! You may even win this trick.",
    board: false,
  },
  {
    trainer: true,
    flip: true,
    text: "The king is the highest value in each suit. If no trumps are played, the highest value of the lead suit wins.",
    board: false,
  },
];

function setCurrentPlayer(player) {
  document.getElementById("currentPlayer").innerHTML =
    player === 1 ? "Your Move" : `Player ${player}'s Move`;
  for (let i = 1; i <= 4; i++) {
    document
      .getElementById("roundInfo" + i)
      .classList.toggle("active-player", player === i);
  }
}

function putCardOnTable(slot, suit, value) {
  const id = value + suit;

  let card = document.getElementById(id);

  if (!card) {
    card = document.createElement("img");
    card.src = `/assets/mach-deck-thumb/${suit.toLowerCase()}-${value.toLowerCase()}-t.png`;
    card.id = id;
    card.alt = `${value} of ${suit}`;
  }

  card.classList.remove("col-md");
  card.classList.remove("col-xs-3");
  card.classList.add("table-card");

  const place = document.getElementById(`p${slot}`);
  place.appendChild(card);
}

function clearTable(leader) {
  document.getElementById("table").innerHTML =
    '<div id="p1" class="col-3"><span id="p1leader" class="no-margin-below"><br></span></div><div id="p2" class="col-3"><span id="p2leader" class="no-margin-below"><br></span></div><div id="p3" class="col-3"><span id="p3leader" class="no-margin-below"><br></span></div><div id="p4" class="col-3"><span id="p4leader" class="no-margin-below"><br></span></div>';
  document.getElementById(`p${leader}leader`).innerHTML = "Leader<br>";
}

function grayHand() {
  let hand = document.getElementById("hand");

  let cards = hand.children;

  for (let i = 0; i < hand.childElementCount; i++) {
    cards[i].classList.add("grayed");
  }
}

function ungrayHand() {
  let hand = document.getElementById("hand");

  let cards = hand.children;

  for (let i = 0; i < hand.childElementCount; i++) {
    cards[i].classList.remove("grayed");
  }
}

let currentTextIndex = 0;
let typingInterval;
let isTyping = false;

let speechText = document.getElementById("speechText");
let nextBtn = document.getElementById("nextBtn");
let overlay = document.getElementById("trainerOverlay");
let board = document.getElementById("training-room");
let trainerImg = document.getElementById("trainer-img");

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
      overlay.removeAttribute("hidden");
      typeText(scenes[currentTextIndex].text);
    } else {
      overlay.setAttribute("hidden", "hidden");
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

  speechText = document.getElementById("speechText");
  nextBtn = document.getElementById("nextBtn");
  overlay = document.getElementById("trainerOverlay");
  board = document.getElementById("training-room");
  trainerImg = document.getElementById("trainer-img");

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
