

const SUIT = { 0: 'Spade', 1: 'Club', 2: 'Heart', 3: 'Diamond', 4: 'Trump' };

const SUIT_REVERSE = { Spade: 0, Club: 1, Heart: 2, Diamond: 4, Trump: 4 };

const RED_VALUE = { 0: 'Ace', 1: 'Two', 2: 'Three', 3: 'Four', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const BLACK_VALUE = { 0: 'Seven', 1: 'Eight', 2: 'Nine', 3: 'Ten', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const TRUMP_VALUE = { 0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz' };

const VALUE_REVERSE = {
    Ace: 0, Two: 1, Three: 2, Four: 3, Jack: 4, Rider: 5, Queen: 6, King: 7,
    Seven: 0, Eight: 1, Nine: 2, Ten: 3,
    I: 0, II: 1, III: 2, IIII: 3, V: 4, VI: 5, VII: 6, VIII: 7, IX: 8, X: 9, XI: 10, XII: 11, XIII: 12,
    XIV: 13, XV: 14, XVI: 15, XVII: 16, XVIII: 17, XIX: 18, XX: 19, XXI: 20, Skyz: 21
};


const DIFFICULTY = { RUDIMENTARY: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5 };
const DIFFICULTY_TABLE = { 0: 'Rudimentary', 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Ruthless' };//TODO add ai

const MESSAGE_TYPE = { POVENOST: 0, MONEY_CARDS: 1, PARTNER: 2, VALAT: 3, CONTRA: 4, IOTE: 5, LEAD: 6, PLAY: 7, WINNER: 8, PREVER_TALON: 9, PAY: 10, CONNECT: 11, DISCONNECT: 12, SETTING: 13 };

const PLAYER_TYPE = { HUMAN: 0, ROBOT: 1, AI: 2, H: 0, R: 1 };




module.exports = {
    SUIT,
    SUIT_REVERSE,
    RED_VALUE,
    BLACK_VALUE,
    TRUMP_VALUE,
    VALUE_REVERSE,
    DIFFICULTY,
    DIFFICULTY_TABLE,
    MESSAGE_TYPE
}