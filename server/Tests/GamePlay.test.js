const GameManager = require('../GameManager');
const gm = new GameManager(); // Typically done by _server.js
const Room = require('../room');
const GamePlay = require('../GamePlay');
const { ACTION, SUIT, VALUE, MONEY_CARDS, PLAYER_TYPE } = require('../enums');
const Deck = require('../deck');

// Mock the logger to suppress output during tests
jest.mock('../logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn()
}));

describe('GamePlay.start', () => {
  let room;
  let gameplay;

  beforeEach(() => {
    room = new Room('test-room-id');
    gameplay = room.gameplay;

    // Spy on the room's notify and update methods
    jest.spyOn(room, 'notifyStartGame').mockImplementation(() => {});
    jest.spyOn(room, 'updateImportantInfo').mockImplementation(() => {});
  });

  test('should start the game properly', () => {
    const result = gameplay.start();

    expect(gameplay.board.gameNumber).toBe(1);
    expect(gameplay.action).toBe(ACTION.SHUFFLE);
    expect(room.notifyStartGame).toHaveBeenCalled();
    expect(room.updateImportantInfo).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});

describe('GamePlay.moneyCards', () => {
    let room;
    let gameplay;

    beforeEach(() => {
        room = new Room({name: 'test'});
        gameplay = room.gameplay;

        room.board.nextStep.player = 0;

        jest.spyOn(room, 'informMoneyCards').mockImplementation(() => {});
        jest.spyOn(room, 'payMoneyCards').mockImplementation(() => {});
        jest.spyOn(room, 'updateImportantMoneyCardsInfo').mockImplementation(() => {});
    });

    test.each([
        // Hand 1: No trump cards, no Trul, Rosa Pane, or 5-count, should owe 4 chips (UNI)
        [
            [
                { suit: SUIT.HEART, value: VALUE.KING },
                { suit: SUIT.DIAMOND, value: VALUE.ACE },
                { suit: SUIT.CLUB, value: VALUE.QUEEN },
                { suit: SUIT.SPADE, value: VALUE.SEVEN },
                { suit: SUIT.SPADE, value: VALUE.EIGHT },
                { suit: SUIT.SPADE, value: VALUE.NINE },
                { suit: SUIT.SPADE, value: VALUE.TEN },
                { suit: SUIT.SPADE, value: VALUE.JACK },
                { suit: SUIT.SPADE, value: VALUE.RIDER },
                { suit: SUIT.SPADE, value: VALUE.QUEEN },
                { suit: SUIT.SPADE, value: VALUE.KING },
                { suit: SUIT.HEART, value: VALUE.ACE },
            ],
            [MONEY_CARDS.UNI],
            4
        ],
        // Hand 2: TAROKY (10 trump)
        [
            [
                { suit: SUIT.TRUMP, value: VALUE.I },
                { suit: SUIT.TRUMP, value: VALUE.II },
                { suit: SUIT.TRUMP, value: VALUE.III },
                { suit: SUIT.TRUMP, value: VALUE.IIII },
                { suit: SUIT.TRUMP, value: VALUE.V },
                { suit: SUIT.TRUMP, value: VALUE.VI },
                { suit: SUIT.TRUMP, value: VALUE.VII },
                { suit: SUIT.TRUMP, value: VALUE.VIII },
                { suit: SUIT.TRUMP, value: VALUE.IX },
                { suit: SUIT.TRUMP, value: VALUE.X },
                { suit: SUIT.SPADE, value: VALUE.KING },
                { suit: SUIT.SPADE, value: VALUE.QUEEN }
            ],
            [MONEY_CARDS.TAROKY],
            4
        ],
        // Hand 3: Tarocky
        [
            [
                { suit: SUIT.TRUMP, value: VALUE.I },
                { suit: SUIT.TRUMP, value: VALUE.II },
                { suit: SUIT.TRUMP, value: VALUE.III },
                { suit: SUIT.TRUMP, value: VALUE.IIII },
                { suit: SUIT.TRUMP, value: VALUE.V },
                { suit: SUIT.TRUMP, value: VALUE.VI },
                { suit: SUIT.TRUMP, value: VALUE.VII },
                { suit: SUIT.TRUMP, value: VALUE.VIII },
                { suit: SUIT.TRUMP, value: VALUE.IX },
                { suit: SUIT.HEART, value: VALUE.KING },
                { suit: SUIT.HEART, value: VALUE.QUEEN },
                { suit: SUIT.HEART, value: VALUE.RIDER }
            ],
            [MONEY_CARDS.TAROCKY],
            2
        ],
        // Hand 4: Trul Pane
        [
            [
                { suit: SUIT.TRUMP, value: VALUE.I },
                { suit: SUIT.TRUMP, value: VALUE.XXI },
                { suit: SUIT.TRUMP, value: VALUE.SKYZ },
                { suit: SUIT.SPADE, value: VALUE.KING },
                { suit: SUIT.SPADE, value: VALUE.SEVEN },
                { suit: SUIT.SPADE, value: VALUE.EIGHT },
                { suit: SUIT.SPADE, value: VALUE.NINE },
                { suit: SUIT.SPADE, value: VALUE.TEN },
                { suit: SUIT.SPADE, value: VALUE.JACK },
                { suit: SUIT.SPADE, value: VALUE.RIDER },
                { suit: SUIT.HEART, value: VALUE.RIDER },
                { suit: SUIT.HEART, value: VALUE.QUEEN }
            ],
            [MONEY_CARDS.TRUL, MONEY_CARDS.PANE],
            4
        ]
    ])('should correctly calculate chips owed for hand', (hand, moneyCards, oracleChips) => {
        // Reset the current hand before each iteration
        room.board.nextStep.player = 0;
        gameplay.currentPlayer.hand = hand;
        
        // Call moneyCards to trigger logic
        gameplay.moneyCards();

        // Check if the correct number of chips were owed
        expect(room.payMoneyCards).toHaveBeenCalledWith(0, oracleChips);
        
        // Check if the correct money cards were informed to the room
        expect(room.informMoneyCards).toHaveBeenCalledWith(0, moneyCards);
        
        // Ensure the important money cards info was updated
        expect(room.updateImportantMoneyCardsInfo).toHaveBeenCalled();
    });
});

describe('Gameplay.countPoints()', () => {
    let room;
    let deck;

    beforeEach(() => {
        // Create a new room and full deck
        room = new Room('testRoom');
        deck = Deck.createDeck();;

        // Assume the room initializes 4 players (0-3)
        room.players = Array.from({ length: 4 }, (_, i) => ({
            discard: [],
            isTeamPovinnost: i % 2 === 0, // 0 & 2 are Povinnost, 1 & 3 are opposing
            type: PLAYER_TYPE.HUMAN,
            messenger: { emit: jest.fn() }, // Stub messenger
        }));

        // Distribute cards evenly (13 per player + 2 get 14 from full 54-card deck)
        for (let i = 0; deck[0]; i++) {
            room.players[i % 4].discard.push(deck.splice(0,1)[0]);
        }

        // Set up minimal board state
        room.board.valat = -1;
        room.board.trickWinCount = [6, 6];
        room.board.prever = -1;
        room.board.preverMultiplier = 1;
        room.board.contra = [-1, -1];
        room.board.iote = -1;
        room.board.ioteWin = 0;

        jest.spyOn(room.gameplay, 'payChips');
    });

    test('counts total points correctly from discard piles', () => {
        const expectedChipsOwed = -2;

        const result = room.gameplay.countPoints();

        expect(result).toBe(true);
        expect(room.gameplay.payChips).toHaveBeenCalled();

        // Extract actual arguments from call
        const [messageTable, chipsOwed] = room.gameplay.payChips.mock.calls[0];

        expect(Array.isArray(messageTable)).toBe(true);
        expect(typeof chipsOwed).toBe('number');
        expect(chipsOwed).toBe(expectedChipsOwed);
    });
});
