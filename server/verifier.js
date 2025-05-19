/*
    Verifier is here to verify that actions taken by players are legal
*/

const Deck = require('./deck');
const { ACTION, SHUFFLE_TYPE, CUT_TYPE } = require('./enums');
const GameManager = require('./GameManager');
const SERVER = require('./logger');
const gm = GameManager.INSTANCE;

const { u } = require('./utils');

function isNumericalType(arg) {
    return !u(arg) && !isNaN(+arg);
}

function clientAvailableForGame(client) {
    return !u(client) && client && !client.inGame && !client.inAudience;
}

function clientIsHost(client) {
    return !u(client) && client && client.inGame && client.room && ~client.room.host && client.room.host === client.socketId;
}

function clientIsPovinnost(client) {
    return !u(client) && client && client.inGame && client.room && client.room.board && client.room.board.povinnost && client.room.board.povinnost === client.pn;
}

function roomNextStep(client, action) {
    return !u(client) && client && client.inGame && client.room && client.room.board && client.room.board.nextStep && client.room.board.nextStep.action === action;
}

function clientIsCurrentPlayer(client) {
    return !u(client) && client && client.inGame && client.room && client.room.board && client.room.board.nextStep && Number(client.room.board.nextStep.player) === Number(client.pn);
}

function notNegativeOne(number) {
    return !u(number) && !isNaN(+number) && ~(+number);
}

function isString(string) {
    return typeof string === 'string';
}

function verifyIsAdmin(client) {
    return !u(client) && client && client.username && client.username !== 'Guest' && client.userInfo && client.userInfo.admin;
}

function verifyCardStructure(card) {
    return !u(card) && card && card.suit && card.value && typeof card.suit === 'string' && typeof card.value === 'string';
}

function verifyCanJoinAudience(client, roomID) {
    const clientIsValid = clientAvailableForGame(client);

    const roomIDIsValid = isNumericalType(roomID) && ~roomID && gm.rooms[roomID] && !gm.rooms[roomID].settings.locked;

    return clientIsValid && roomIDIsValid;
}

function verifyCanJoinRoom(client, roomID, isCode) {
    const clientIsValid = clientAvailableForGame(client);

    const roomIDIsValid = isNumericalType(roomID) && ~roomID && gm.rooms[roomID] && (!gm.rooms[roomID].settings.locked || isCode) && gm.rooms[roomID].playerCount < 4;

    return clientIsValid && roomIDIsValid;
}

function verifyCanPlayDailyChallenge(client) {
    const clientIsValid = clientAvailableForGame(client);

    return clientIsValid && client.username !== 'Guest';
}

function verifyCanMakeRoom(client) {
    return clientAvailableForGame(client);
}

function verifyCanReturnToGame(client) {
    const clientIsValid = clientAvailableForGame(client);

    return gm.returnToGame[client.socketId] && clientIsValid;
}

function verifyPlayerCanChangeSettings(client, setting, rule) {
    const clientIsValid = clientIsHost(client);
    const roomIsValid = roomNextStep(client, ACTION.START);

    // Setting and rule verified in room

    return clientIsValid && roomIsValid;
}

function verifyCanSendInvite(client, socketId) {
    const clientIsValid = roomNextStep(client, ACTION.START);
    const socketIsValid = notNegativeOne(socketId) && gm.players[socketId];

    return clientIsValid && socketIsValid;
}

function verifyCanStartGame(client) {
    const clientIsValid = roomNextStep(client, ACTION.START) && clientIsHost(client);

    return clientIsValid;
}

function verifyPlayerCanTakeAction(client, action) {
    const clientIsValid = roomNextStep(client, action);
    const clientIsPlayer = clientIsCurrentPlayer(client);

    return clientIsValid && clientIsPlayer;
}

function verifyCanDiscard(client, card) {
    return verifyCardStructure(card) && Deck.handContainsNonGray(client.hand, card.value, card.suit);
}

function verifyPlayerCanPlayCard(client, card) {
    return verifyCanDiscard(client, card); // Same logic
}

function verifyPartnerChoice(client, partner) {
    const partnerChoices = Deck.possiblePartners(client.hand);

    return isString(partner) && partnerChoices.some(p => p.value === partner);
}

function verifyPlayerCanTakeContraAction(client) {
    const clientIsValid = roomNextStep(client, ACTION.CONTRA)
        || roomNextStep(client, ACTION.PREVER_CONTRA)
        || roomNextStep(client, ACTION.VALAT_CONTRA)
        || roomNextStep(client, ACTION.PREVER_VALAT_CONTRA);
    const clientIsPlayer = clientIsCurrentPlayer(client);

    return clientIsValid && clientIsPlayer;
}

function verifyCredentials(username, token) {
    // Not meant to verify that they go together, but that they are the right structure

    const usernameIsValid = !u(username) && typeof username === 'string';
    const tokenIsValid = !u(token) && typeof token === 'string';

    return usernameIsValid && tokenIsValid;
}

function verifyCanSendMessageTo(id) {
    return notNegativeOne(id) && gm.players[id];
}

function verifyRoomExists(id) {
    return notNegativeOne(id) && gm.rooms[id];
}

function verifyCanSendMessage(client) {
    return !u(client) && client.username && client.username !== 'Guest' && client.canSendMessage();
}

function verifyCanSaveSettings(client) {
    const isValid = !u(client) && client.username && client.username !== 'Guest'
        && client.inGame && client.room && client.room.settingsNotation;

    return isValid;
}

function sanitizeShuffleType(type) {
    if (u(type) || !type || isNaN(Number(type)) || Number(type) == SHUFFLE_TYPE.CUT) {
        return SHUFFLE_TYPE.CUT;
    }

    if (Number(type) == SHUFFLE_TYPE.RIFFLE) {
        return SHUFFLE_TYPE.RIFFLE;
    }

    return SHUFFLE_TYPE.RANDOM;
}

function sanitizeCutStyle(style) {
    if (u(style) || !style || style == CUT_TYPE.CUT) {
        return CUT_TYPE.CUT;
    }

    switch (style) {
        case CUT_TYPE.ONES:             return CUT_TYPE.ONES;
        case CUT_TYPE.TWOS:             return CUT_TYPE.TWOS;
        case CUT_TYPE.THREES:           return CUT_TYPE.THREES;
        case CUT_TYPE.FOURS:            return CUT_TYPE.FOURS;
        case CUT_TYPE.SIXES:            return CUT_TYPE.SIXES;
        case CUT_TYPE.TWELVES:          return CUT_TYPE.TWELVES;
        case CUT_TYPE.TWELVE_STRAIGHT:  return CUT_TYPE.TWELVE_STRAIGHT;
        case CUT_TYPE.THREE_FOUR_FIVE:  return CUT_TYPE.THREE_FOUR_FIVE;
        default: return CUT_TYPE.CUT;
    }
}

function sanitizeCutLocation(location) {
    if (u(location) || isNaN(Number(location))) {
        return 32;
    }

    location = Number(location);

    if (location <= 7) {
        return 7;
    }

    if (location >= 47) {
        return 47;
    }

    return location;
}

function sanitizeHandChoice(client, choice) {
    if (client.room.board.hands[choice]) {
        return choice;
    }

    for (let i in client.room.board.hands) {
        if (client.room.board.hands[i]) {
            return i;
        }
    }

    return -1;
}

function sanitizeDrawTalonChoice(client, choice) {
    if (clientIsPovinnost(client)) {
        return true;
    }

    return choice;
}

function sanitizeBoolean(bool) {
    return !(!bool);
}

module.exports = {
    verifyCanJoinAudience, 
    verifyCanJoinRoom, 
    verifyCanPlayDailyChallenge, 
    verifyCanMakeRoom, 
    verifyCanReturnToGame, 
    verifyPlayerCanChangeSettings, 
    verifyCanSendInvite,
    verifyCanStartGame,
    verifyPlayerCanTakeAction,
    verifyCanDiscard,
    verifyPartnerChoice,
    verifyPlayerCanTakeContraAction,
    verifyPlayerCanPlayCard,
    verifyCredentials,
    verifyIsAdmin,
    verifyCanSendMessageTo,
    verifyRoomExists,
    verifyCanSendMessage,
    verifyCanSaveSettings,

    sanitizeShuffleType,
    sanitizeCutStyle,
    sanitizeCutLocation,
    sanitizeHandChoice,
    sanitizeDrawTalonChoice,
    sanitizeBoolean,
};