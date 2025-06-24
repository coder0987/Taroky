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
    text: "It looks like player 4 is povinnost (They lead the first trick). Try following suit by playing a diamond.",
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
