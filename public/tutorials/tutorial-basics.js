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
    text: "It looks like player 4 is povinnost (They lead the first trick). Try following suit by playing a diamond.",
    board: false
  },
  {
    trainer: false,
    board: true,
    layout: () => {
      document.getElementById('ThreeDiamond').addEventListener('click', () => {
        // Ooh two layers of functional javascript. I'm sure this isn't confusing at all

        // Move the three of diamonds to the table, clear the grayed-out cards, and trigger the next dialog

        ungrayHand();

        putCardOnTable(1, DIAMONDS, 'Three');

        setCurrentPlayer(2);

        nextDialogue();
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
    board: true,
    layout: () => {
      putCardOnTable(2, DIAMONDS, 'Ace');
      setCurrentPlayer(3);
    }
  },
  {
    trainer: true,
    text: "Also, notice that you could only play the three of diamonds. That's because, in Taroky, you always have to follow suit - if you can.",
    board: true,
    layout: () => {
      putCardOnTable(3, DIAMONDS, 'Queen');
      setCurrentPlayer(4);
    }
  },
  {
    trainer: true,
    flip: true,
    text: "It looks like it's your turn again! This time, Povinnost lead a spade.",
    board: true,
    layout: () => {
      clearTable(4);
      putCardOnTable(4, SPADES, 'Seven');
      setCurrentPlayer(1);

      grayHand();

      let toPlay = document.getElementById('KingSpade');
      toPlay.classList.remove('grayed');
      toPlay.style.filter = 'grayscale(0)';

      toPlay.addEventListener('click', () => {
        ungrayHand();

        putCardOnTable(1, SPADES, 'King');

        setCurrentPlayer(2);

        nextDialogue();
      });
    }
  },
  {
    trainer: false,
    board: true,
    layout: () => {
      document.getElementById('reminder-text').innerHTML = "Click the king of spades to play it";
    }
  },
  {
    trainer: true,
    text: "Good move! You may even win this trick.",
    board: false
  },
  {
    trainer: true,
    flip: true,
    text: "The king is the highest value in each suit. If no trumps are played, the highest value of the lead suit wins.",
    board: false
  },
  {
    trainer: true,
    flip: true,
    text: "Uh oh! It looks like player 2 trumped your king!",
    board: true,
    layout: () => {
      putCardOnTable(2, TRUMP, 'III');
      setCurrentPlayer(3);
    }
  },
  {
    trainer: true,
    flip: true,
    text: "When a trump is played, it always wins the trick, unless an even higher trump beats it",
    board: true,
    layout: () => {
      putCardOnTable(3, SPADES, 'Eight');
      setCurrentPlayer(4);
    }
  },
  {
    trainer: true,
    text: "You can't play a trump unless you're 'void' in the lead suit - you don't have any left at all",
    board: true,
    layout: () => {
      clearTable(2)
      setCurrentPlayer(2);
    }
  },
  {
    trainer: true,
    text: "Since player 2 won the trick, he'll lead the next one. The winner always leads",
    board: true,
    layout: () => {
      putCardOnTable(2, CLUBS, 'King');
      setCurrentPlayer(3);
    }
  },
  {
    trainer: true,
    flip: true,
    text: "Player 2 lead the king of clubs, and player 3 is forced to follow suit",
    board: true,
    layout: () => {
      putCardOnTable(3, CLUBS, 'Queen');
      setCurrentPlayer(4);
    }
  },
  {
    trainer: true,
    text: "Player 4, however, is void in clubs and plays a trump. That's your partner!",
    board: true,
    layout: () => {
      putCardOnTable(4, TRUMP, 'IIII');
      grayHand();
      unGraySuit(CLUBS);
      setCurrentPlayer(1);
    }
  },
  {
    trainer: true,
    flip: true,
    text: "In Taroky, games usually are played in teams of 2. In this game, Povinnost is partnered with the XIX - which you have",
    board: false,
  },
  {
    trainer: true,
    text: "That means you will combine your points at the end of the game for your total score! Since your partner is in the lead, you want to play your card with the highest point value",
    board: false
  },
  {
    trainer: false,
    board: true,
    layout: () => {
      document.getElementById('JackClub').addEventListener('click', () => {

        ungrayHand();

        putCardOnTable(1, CLUBS, 'Jack');

        setCurrentPlayer(4);

        nextDialogue();
      });

      document.getElementById('reminder-text').innerHTML = "Click the jack of clubs to play it";
    }
  },
]
