let hand = [ 
    { suit: HEARTS, value: 'Ace' }, 
    { suit: CLUBS, value: 'Eight' },
    { suit: CLUBS, value: 'Queen' },
    { suit: DIAMONDS, value: 'Three' },
    { suit: DIAMONDS, value: 'Four' },
    { suit: DIAMONDS, value: 'Jack' },
    { suit: SPADES, value: 'King' },
    { suit: TRUMP, value: 'I' },
    { suit: TRUMP, value: 'II' },
    { suit: TRUMP, value: 'VII' },
    { suit: TRUMP, value: 'IX' },
    { suit: TRUMP, value: 'XX' },
];

let secondHandHigh = [
    { suit: CLUBS, value: 'Eight' },
    { suit: DIAMONDS, value: 'Jack' },
    { suit: SPADES, value: 'King' },
    { suit: TRUMP, value: 'I' },
    { suit: TRUMP, value: 'III' },
    { suit: TRUMP, value: 'VII' },
    { suit: TRUMP, value: 'XII' },
    { suit: TRUMP, value: 'XV' },
    { suit: TRUMP, value: 'XVII' },
    { suit: TRUMP, value: 'XIX' },
    { suit: TRUMP, value: 'XX' },
    { suit: TRUMP, value: 'XXI' },
]

const scenes = [
  {
    trainer: true,
    text: "What do you play when trumps are lead?",
    board: false,
  },
  {
    trainer: true,
    text: "One common tactic is known as Second Hand Low.",
    board: false,
  },
  {
    trainer: true,
    text: "Second hand Low is a term borrowed from the game of Bridge and refers to a player who is uncertain, usually very early in the hand, and often on the first lead of the hand.",
    board: false,
  },
  {
    trainer: true,
    text: "Notice that, in your hand, you don't have the XIX and you only have a few trumps.",
    flip: true,
    board: false,
  },
  {
    trainer: true,
    text: "You aren't sure who your partner is - you are uncertain.",
    board: false,
  },
  {
    trainer: true,
    flip: true,
    text: "When you are uncertain, and the player to your left leads a trump, what is the best move?",
    board: false,
  },
  {
    trainer: true,
    text: "According to Second hand Low, you should play a low trump!",
    board: false,
  },
  {
    trainer: false,
    board: true,
    layout: () => {
        grayHand();
        unGraySuit(TRUMP);

        document.getElementById("IITrump").addEventListener("click", () => {
            ungrayHand();

            putCardOnTable(1, TRUMP, "II");

            setCurrentPlayer(2);

            nextDialogue();
        });

        document.getElementById("reminder-text").innerHTML = "Click the II to play it";
    },
  },
  {
    trainer: true,
    text: "Playing Second Hand Low preserves your higher trumps and allows your partner an opportunity to take the trick.",
    board: true,
    layout: () => {
      document.getElementById('reminder-text').innerHTML = "";
    }
  },
  {
    trainer: true,
    flip: true,
    text: "Notice that the third player, if he has the XIX, will play it regardless of what you play. A higher trump would have been wasted needlessly.",
    board: true,
    layout: () => {
      putCardOnTable(2, TRUMP, "XIX");
      setCurrentPlayer(3);
    },
  },
  {
    trainer: true,
    text: "More often than not, this will favor the second player (you), the uncertain player, by preserving a high trump.",
    board: true,
    layout: () => {
      putCardOnTable(3, TRUMP, "Skyz");
      setCurrentPlayer(4);
    },
  },
  {
    trainer: true,
    flip: true,
    text: "Plus, sometimes your partner may still catch the trick!",
    board: false,
  },
  {
    trainer: true,
    text: "But what if, instead of being uncertain, you have a strong hand?",
    board: true,
    layout: () => {
        clearTable(4);
        putCardOnTable(4, TRUMP, "II");
        setCurrentPlayer(1);

        hand = secondHandHigh;
        renderHand();

        grayHand();
        unGraySuit(TRUMP);
    },
  },
  {
    trainer: true,
    text: "Notice now, your partner has played a low trump.",
    board: false,
  },
  {
    trainer: true,
    text: "That's your queue to play Second Hand High!",
    board: false,
  },
  {
    trainer: false,
    board: true,
    layout: () => {
        document.getElementById('reminder-text').innerHTML = "Click the XIX to play it";

        let toPlay = document.getElementById("XIXTrump");

        toPlay.addEventListener("click", () => {
            ungrayHand();

            putCardOnTable(1, TRUMP, "XIX");

            setCurrentPlayer(2);

            nextDialogue();
        });
    }
  },
  {
    trainer: true,
    flip: true,
    text: "You play a high trump in order to weaken the hands of players 3 and 4.",
    board: true,
    layout: () => {
      putCardOnTable(2, TRUMP, 'Skyz');
      setCurrentPlayer(3);

      document.getElementById('reminder-text').innerHTML = "";
    }
  },
  {
    trainer: true,
    text: "By weakening your own and (and those of players 3 and 4) your partner's hand becomes much stronger.",
    board: true,
    layout: () => {
      putCardOnTable(3, TRUMP, 'IIII');
      setCurrentPlayer(4);
    }
  },
  {
    trainer: true,
    text: "It is beneficial to strengthen your partner's hand at the expense of your own hand.",
    board: false,
  },
  {
    trainer: true,
    flip: true,
    text: "Remember: \"What's mine is yours and what's yours is mine!\"",
    board: false,
  },
  {
    trainer: true,
    text: "As with all 'General Guidelines' in Taroky, there are times and circumstances where it might not work out, but this is a good general rule in the face of uncertainty.",
    board: false,
  },
  {
    trainer: true,
    text: "Want to learn more? Head back to the learn page, or try out a game against the bots.",
    board: true,
    layout: () => {
      board.innerHTML = '<a href="/learn.html" class="small-link">Learn</a><br><a href="/" class="small-link">Play</a><p>This tutorial was written by James L. Brezina Jr.</p><p>Edited and adapted for use on MachTarok.com by Samuel Mach</p>';
    }
  },
]
