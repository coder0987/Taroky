const GameManager = require('../GameManager');
const gm = new GameManager(); // Typically done by _server.js
const Room = require('../room');
const GamePlay = require('../GamePlay');
const { ACTION, SUIT, VALUE, MONEY_CARDS } = require('../enums');

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
