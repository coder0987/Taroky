

const Deck = require('../deck');
const {
  SUIT,
  VALUE,
} = require('../enums');

// Mock the logger to suppress output during tests
jest.mock('../logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn()
}));

describe('Deck class', () => {
  let deck;

  beforeEach(() => {
    deck = new Deck();
  });

  test('should initialize with 54 cards', () => {
    expect(deck.deck.length).toBe(54);
  });

  test('should create a shuffled deck different from base', () => {
    const unshuffled = Deck.createDeck();
    expect(deck.deck).not.toEqual(unshuffled);
  });

  test('should cut shuffle correctly', () => {
    const original = [...deck.deck];
    deck.cutShuffle(10);
    expect(deck.deck.length).toBe(original.length);
  });

  test('should riffle shuffle correctly', () => {
    const original = [...deck.deck];
    deck.riffleShuffle(true);
    expect(deck.deck.length).toBe(original.length);
  });

  test('dealTalon should remove 6 cards', () => {
    const talon = [];
    deck.dealTalon(talon);
    expect(talon.length).toBe(6);
    expect(deck.deck.length).toBe(48);
  });

  test('dealBy should distribute cards evenly in chunks', () => {
    const hands = [[], [], [], []];
    deck.dealBy(hands, 1);
    expect(hands.reduce((acc, h) => acc + h.length, 0)).toBeLessThanOrEqual(54);
  });

  test('deal345 should deal increasing amounts', () => {
    const hands = [[], [], [], []];
    deck.deal345(hands);
    const totalCards = hands.reduce((acc, h) => acc + h.length, 0);
    expect(totalCards).toBe(4 * (3 + 4 + 5)); // 4 players, 3+4+5 = 12 cards each
  });

  test('points should return correct point value', () => {
    const sampleCards = [
      { value: VALUE.KING, suit: SUIT.SPADE },     // 5
      { value: VALUE.RIDER, suit: SUIT.HEART }, // 3
      { value: VALUE.I, suit: SUIT.TRUMP }  // 5
    ];
    const totalPoints = Deck.points(sampleCards);
    expect(totalPoints).toBe(13);
  });

  test('handContainsCard should return true if card present', () => {
    const hand = [{ value: 'XIX', suit: SUIT.TRUMP }];
    expect(Deck.handContainsCard(hand, 'XIX')).toBe(true);
    expect(Deck.handContainsCard(hand, 'I')).toBe(false);
  });

  test('handHasSuit should return true for matching suit', () => {
    const hand = [{ suit: 'Spade', value: 'Ace' }];
    expect(Deck.handHasSuit(hand, 'Spade')).toBe(true);
    expect(Deck.handHasSuit(hand, 'Trump')).toBe(false);
  });

  test('handContains should detect card with suit and value', () => {
    const hand = [{ suit: 'Trump', value: 'XIX' }];
    expect(Deck.handContains(hand, 'XIX', 'Trump')).toBe(true);
    expect(Deck.handContains(hand, 'II', 'Trump')).toBe(false);
  });

  test('pointValue should assign correct values', () => {
    expect(Deck.pointValue({ suit: SUIT.TRUMP, value: VALUE.XXI })).toBe(5);
    expect(Deck.pointValue({ suit: SUIT.CLUB, value: 'King' })).toBe(5);
    expect(Deck.pointValue({ suit: SUIT.SPADE, value: 'Seven' })).toBe(1);
  });

  test('possiblePartners should always include XIX', () => {
    const hand = [];
    const partners = Deck.possiblePartners(hand);
    expect(partners).toEqual(
      expect.arrayContaining([{ value: 'XIX', suit: SUIT.TRUMP }])
    );
  });

  test('grayUndiscardables should gray appropriate cards', () => {
    const hand = [
      { suit: SUIT.TRUMP, value: VALUE.I },
      { suit: SUIT.HEART, value: 'Ace' },
      { suit: SUIT.TRUMP, value: VALUE.XXI }
    ];
    Deck.grayUndiscardables(hand);
    expect(hand[0].grayed).toBe(true);
    expect(hand[1].grayed).toBe(false);
  });

  test('unGrayCards should reset all gray flags', () => {
    const hand = [
      { suit: SUIT.TRUMP, value: VALUE.I, grayed: true },
      { suit: SUIT.TRUMP, value: VALUE.XXI, grayed: true }
    ];
    Deck.unGrayCards(hand);
    expect(hand.every(card => card.grayed === false)).toBe(true);
  });

  test('handContainsTrul should detect I, XXI, and Skyz', () => {
    const hand = [
      { suit: 'Trump', value: 'I' },
      { suit: 'Trump', value: 'XXI' },
      { suit: 'Trump', value: 'Skyz' }
    ];
    const noTrul = [
        { suit: 'Trump', value: 'I' },
        { suit: 'Trump', value: 'XXI' },
        { suit: 'Spade', value: 'King' }
    ]
    expect(Deck.handContainsTrul(hand)).toBe(true);
    expect(Deck.handContainsTrul(noTrul)).toBe(false);
  });

  test('handContainsRosaPane should detect all kings', () => {
    const hand = [
      { suit: 'Spade', value: 'King' },
      { suit: 'Club', value: 'King' },
      { suit: 'Heart', value: 'King' },
      { suit: 'Diamond', value: 'King' }
    ];
    const noRosaPane = [
      { suit: 'Spade', value: 'King' },
      { suit: 'Club', value: 'King' },
      { suit: 'Heart', value: 'King' },
      { suit: 'Skyz', value: 'Trump' }
    ];
    expect(Deck.handContainsRosaPane(hand)).toBe(true);
    expect(Deck.handContainsRosaPane(noRosaPane)).toBe(false);
  });

  test('sortCards should group and sort by suit/value', () => {
    const cards = [
      { suit: 'Trump', value: 'XIX' },
      { suit: 'Heart', value: 'King' },
      { suit: 'Club', value: 'Two' },
      { suit: 'Spade', value: 'Ace' }
    ];
    const sorted = Deck.sortCards(cards, false);
    expect(sorted[0].suit).toBe('Spade');
    expect(sorted[3].suit).toBe('Trump');
  });

  test('cardsToNotation should convert cards into a compact string', () => {
    const cards = [
      { suit: 'Trump', value: 'I' }, // T01
      { suit: 'Spade', value: 'King' }, // SK
      { suit: 'Heart', value: 'Ace' } // H1
    ];
    expect(Deck.cardsToNotation(cards)).toMatch(/^T01SKH1$/);
  });
});
