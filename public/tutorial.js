const texts = [
  "So you want to play Taroky?",
  "At first glance, this game has a lot of rules",
  "Luckily, most of them are pretty intuitive",
  "Learning Taroky takes maybe half an hour",
  "Mastering Taroky takes maybe half a lifetime",
];

let currentTextIndex = 0;
let typingInterval;
let isTyping = false;

let speechText = document.getElementById("speechText");
let nextBtn = document.getElementById("nextBtn");
let overlay = document.getElementById("trainerOverlay");
let trainerImg = document.querySelector(".trainer-img");

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
  speechText.innerHTML = texts[currentTextIndex];
  isTyping = false;
  nextBtn.style.display = "inline-block";
}

function nextDialogue() {
  currentTextIndex++;
  if (currentTextIndex < texts.length) {
    typeText(texts[currentTextIndex]);
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
  trainerImg = document.querySelector(".trainer-img");

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

  typeText(texts[currentTextIndex]);
});

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyR") {
    e.preventDefault();
    rotateSkyz();
  }
});
