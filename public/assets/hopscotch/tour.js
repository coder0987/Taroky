function initialize() {
    clearScreen();
    availableRooms = {
        '1': {
            audienceCount: 0,
            count: 1
        }
    };
    inTour = true;
    drawRooms();
}
function step2() {}
function step3() {}
function step4() {}
function step5() {}
function step6() {
    clearScreen();
    hostRoom(null, "I", "OWGVN");
}
function step6Back() {
    step6();
    invite();
}
function step7() {
    closeInvite();
    clearScreen();
    if (cardBackLoaded) {
        document.getElementById('center').appendChild(document.getElementById('cardBack'));
        document.getElementById('cardBack').hidden = false;
    }
    let shuffleButton;
    try {
        shuffleButton = document.getElementById('shuffleButton');
    } catch (ignore) {}
    if (!shuffleButton) {
        shuffleButton = document.createElement('button');
        shuffleButton.id = 'shuffleButton';
        shuffleButton.classList.add('choice-button');
        shuffleButton.innerHTML = 'Shuffle';
        document.getElementById('center').appendChild(document.createElement('br'));
        document.getElementById('center').appendChild(shuffleButton);
    } else {
        shuffleButton.removeAttribute('hidden');
    }
}
function step8() {
    clearScreen();
    displayRoundInfo({'povinnost':1,'chips':[100,100,100,100]});
    document.getElementById('currentAction').innerHTML = ACTION_TABLE['lead'];
    document.getElementById('currentPlayer').innerHTML = 'Player 2';
    document.getElementById('timer').innerHTML = 15;
    document.getElementById('timer').hidden = false;
    document.getElementById('timer').removeAttribute('hidden');
    document.getElementById('roundInfo').removeAttribute('hidden');
    hand = [{"value":"Nine","suit":"Spade","grayed":false},{"value":"Jack","suit":"Heart","grayed":false},{"value":"Queen","suit":"Heart","grayed":false},{"value":"Jack","suit":"Club","grayed":false},{"value":"Rider","suit":"Club","grayed":false},{"value":"Ace","suit":"Diamond","grayed":false},{"value":"King","suit":"Diamond","grayed":true},{"value":"I","suit":"Trump","grayed":true},{"value":"II","suit":"Trump","grayed":true},{"value":"III","suit":"Trump","grayed":true},{"value":"V","suit":"Trump","grayed":true},{"value":"VI","suit":"Trump","grayed":true},{"value":"VII","suit":"Trump","grayed":true},{"value":"XIV","suit":"Trump","grayed":true},{"value":"XX","suit":"Trump","grayed":true},{"value":"XXI","suit":"Trump","grayed":true}];
    drawHand(true);
    numCardsSelected = 0;
    createConfirmButton();
}
function step9() {}
function step10() {}
function step11() {}
function step12() {
    clearScreen();
}
function step13() {}
function step14() {}


let tour = {
  id: "main",
  steps: [
    {
      title: "Welcome to Mach Tarok",
      content: "Start the tour anytime by clicking on 'Tour' here.",
      target: "tour",
      placement: "bottom",
      onShow: initialize,
      onNext: step2
    },
    {
      title: "Start a New Game",
      content: "You can start a new game anytime by clicking on New. Other players can then join you, or you can play alone.",
      target: "roomCardNew",
      placement: "bottom",
      onNext: step3
    },
    {
      title: "Joining a Room",
      content: "You can join other players by clicking on a titled room. Each black dot represents a player.",
      target: "roomCard1",
      placement: "bottom",
      onNext: step4
    },
    {
      title: "Joining the Audience",
      content: "You can watch a game by right-clicking on a titled room.",
      target: "roomCard1",
      placement: "bottom",
      onNext: step5
    },
    {
      title: "Using a Room Code",
      content: "After each game, a room code is printed. Click on Custom and paste the room code to re-play the game.",
      target: "roomCardCustom",
      placement: "bottom",
      onNext: step6
    },
    {
      title: "Hosting a Room",
      content: "After clicking 'New' you can adjust the room settings and wait for other players to join.",
      target: "outer",
      placement: "bottom",
      onPrev: initialize
    },
    {
        title: "Sharing a Join Code",
        content: "Share the join code with whoever you wish to play with for them to join your game.",
        target: "settingsRoomName",
        placement: "bottom",
        onNext: invite
    },
    {
        title: "Invite",
        content: "Click Invite to open the invite screen, where you can send invitations to anyone online.",
        target: "settingsRoomName",
        placement: "bottom",
        onNext: step7,
        onPrev: closeInvite
    },
    {
      title: "Shuffling the Deck",
      content: "To shuffle the deck, you can either shake your cursor over the deck or press on the 'Shuffle' button.",
      target: "outer",
      placement: "bottom",
      onNext: step8,
      onPrev: step6Back
    },
    {
      title: "Checking the Round Info",
      content: "Information about the current game is shown here, including who Povinnost is, any money card, who called prever, and more.",
      target: "roundInfo",
      placement: "bottom",
      onNext: step9,
      onPrev: step7
    },
    {
      title: "Checking the Action Info",
      content: "Who's turn it is, what they're supposed to be doing, and how long they have left to do it are all displayed up top.",
      target: "currentPlayer",
      placement: "bottom",
      onNext: step10,
      onPrev: step8
    },
    {
      title: "Discarding",
      content: "To discard, click on each card you'd like to discard and then press 'Confirm'",
      target: "hand",
      placement: "bottom",
      onNext: step11,
      onPrev: step8
    },
    {
      title: "Playing a Card",
      content: "To play a card, click on whichever card you want to play. Note that cards which cannot be played are grayed out.",
      target: "hand",
      placement: "bottom",
      onNext: step12,
      onPrev: step8
    },
    {
      title: "Leaving the Room",
      content: "Done playing? Double-click on Leave Room to return to the main menu.",
      target: "refresh",
      placement: "bottom",
      onNext: step13,
      onPrev: step8
    },
    {
      title: "Accounts",
      content: "Enjoy more features like Chat, User Preferences and Room Settings Saves by creating a free account and signing in.",
      target: "accountHandler",
      placement: "bottom",
      onNext: step14,
      onPrev: step12
    },
    {
      title: "Having Fun?",
      content: "Leave us a tip by heading over to the donations page.",
      target: "footer",
      placement: "top",
      onPrev: step13
    }
  ],
  onEnd: () => {exitCurrentRoom(true); inTour=false;},
  onClose: () => {exitCurrentRoom(true); inTour=false;}
};

let tourError = {
    id: "error",
    steps: [
        {
            title: "Cannot Start Tour",
            content: "Please leave the room before starting a tour.",
            target: "tour",
            placement: "bottom"
        }
    ]
}

function startTour() {
    if (inGame || connectingToRoom) {
        hopscotch.startTour(tourError);
        return;
    }
    connectingToRoom = true; // Prevents player from attempting to join a room while the tour is running
    hopscotch.startTour(tour);
}