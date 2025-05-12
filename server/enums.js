const SUIT = { 0: 'Spade', 1: 'Club', 2: 'Heart', 3: 'Diamond', 4: 'Trump' };

const SUIT_REVERSE = { Spade: 0, Club: 1, Heart: 2, Diamond: 3, Trump: 4 };

const RED_VALUE = { 0: 'Ace', 1: 'Two', 2: 'Three', 3: 'Four', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const RED_VALUE_ACE_HIGH = { 0: 'Two', 1: 'Three', 2: 'Four', 3: 'Ace', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const BLACK_VALUE = { 0: 'Seven', 1: 'Eight', 2: 'Nine', 3: 'Ten', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const TRUMP_VALUE = { 0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz' };

const VALUE_REVERSE = {
    Ace: 0, Two: 1, Three: 2, Four: 3, Jack: 4, Rider: 5, Queen: 6, King: 7,
    Seven: 0, Eight: 1, Nine: 2, Ten: 3,
    I: 0, II: 1, III: 2, IIII: 3, V: 4, VI: 5, VII: 6, VIII: 7, IX: 8, X: 9, XI: 10, XII: 11, XIII: 12,
    XIV: 13, XV: 14, XVI: 15, XVII: 16, XVIII: 17, XIX: 18, XX: 19, XXI: 20, Skyz: 21
};

const VALUE_REVERSE_ACE_HIGH = {
    Two: 0, Three: 1, Four: 2, Ace: 3, Jack: 4, Rider: 5, Queen: 6, King: 7,
    Seven: 0, Eight: 1, Nine: 2, Ten: 3,
    I: 0, II: 1, III: 2, IIII: 3, V: 4, VI: 5, VII: 6, VIII: 7, IX: 8, X: 9, XI: 10, XII: 11, XIII: 12,
    XIV: 13, XV: 14, XVI: 15, XVII: 16, XVIII: 17, XIX: 18, XX: 19, XXI: 20, Skyz: 21
};


const DIFFICULTY = { BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5 };
const DIFFICULTY_TABLE = {0: 'Beginner', 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Ruthless', 5: 'AI'};

const MESSAGE_TYPE = {POVINNOST: 0, MONEY_CARDS: 1, PARTNER: 2, VALAT: 3, CONTRA: 4, IOTE: 5, LEAD: 6, PLAY: 7, WINNER: 8, PREVER_TALON: 9, PAY: 10, CONNECT: 11, DISCONNECT: 12, SETTING: 13, TRUMP_DISCARD: 14, NOTATION: 15, DRAW: 16};

const PLAYER_TYPE = { HUMAN: 0, ROBOT: 1, AI: 2, H: 0, R: 1 };

const DISCONNECT_TIMEOUT = 20 * 1000; //Number of milliseconds after disconnect before player info is deleted
const SENSITIVE_ACTIONS = {'povinnostBidaUniChoice': true,'contra': true, 'preverContra': true, 'preverValatContra': true, 'valatContra': true, 'iote': true};

const ROOM_TYPE = {STANDARD: 0, DEBUG: 1, TRAINING: 2, CHALLENGE: 3, TEST: 4};

const NUM_AVATARS = 58;

const ACTION = {
    START: 'start',
    PLAY: 'play',
    SHUFFLE: 'shuffle',
    CUT: 'cut',
    DEAL: 'deal',
    CHOICE: '12choice',
    PREVER: 'prever',
    DRAW_TALON: 'drawTalon',
    PASS_TALON: 'passTalon',
    PASS_PREVER: 'passPrever',
    CALL_PREVER: 'callPrever',
    DISCARD: 'discard',
    DRAW_PREVER_TALON: 'drawPreverTalon',
}

const SHUFFLE_TYPE = {
    CUT: 1,
    RIFFLE: 2,
    RANDOM: 3
}

const CUT_TYPE = {
    CUT: 'Cut',
    ONES: '1',
    TWOS: '2',
    THREES: '3',
    FOURS: '4',
    TWELVES: '12',
    TWELVE_STRAIGHT: '12 Straight',
    THREE_FOUR_FIVE: '345',
}

module.exports = {
    SUIT,
    SUIT_REVERSE,
    RED_VALUE,
    RED_VALUE_ACE_HIGH,
    BLACK_VALUE,
    TRUMP_VALUE,
    VALUE_REVERSE,
    VALUE_REVERSE_ACE_HIGH,
    DIFFICULTY,
    DIFFICULTY_TABLE,
    MESSAGE_TYPE,
    PLAYER_TYPE,
    DISCONNECT_TIMEOUT,
    SENSITIVE_ACTIONS,
    ROOM_TYPE,
    NUM_AVATARS,
    ACTION,
    SHUFFLE_TYPE,
    CUT_TYPE
}