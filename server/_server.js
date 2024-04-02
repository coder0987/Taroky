#!/usr/bin/env node


//COMMAND-LINE ARGUMENTS

//Used for non-"production" instances of the server
const DEBUG_MODE = process.argv[2] == 'debug' || process.argv[2] == 'train';
const LOG_LEVEL = process.argv[3] || (DEBUG_MODE ? 5 : 3);//Defaults to INFO level. No traces or debugs.
const TRAINING_MODE = process.argv[2] == 'train';

//imports
const SERVER = require('./logger.js');
SERVER.logLevel = LOG_LEVEL;
const Player = require('./player.js');
const Room = require('./room.js');
const Deck = require('./deck.js');
const AI = require('./AI.js');
const Robot = require('./robot.js');
const AdminPanel = require('./adminPanel.js');
const Database = require('./database.js');
const { Buffer } = require('node:buffer')
const { SUIT,
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
    ROOM_TYPE } = require('./enums.js');
const Challenge = require('./challenge.js');

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { diffieHellman } = require('crypto');
const math = require('mathjs');
const schedule = require('node-schedule');

const app = express();
const START_TIME = Date.now();

const BASE_FOLDER = __dirname.substring(0,__dirname.length - 6);

//Standard file-serving
app.use(express.static(BASE_FOLDER + 'public'));
const server = require('http').createServer(app);

//SOCKETS
const io = require('socket.io')(server);

SOCKET_LIST = {};
players = {};
rooms = {};

const returnToGame = {};

let simplifiedRooms = {};
let ticking = false;
let autoActionTimeout;
let numOnlinePlayers = 0;

let challenge = new Challenge();

schedule.scheduleJob('0 0 * * *', () => {
    challenge = new Challenge();
    for (let i in players) {
        players[i].socket.emit('challengeOver');
    }
    for (let i in rooms) {
        if (i.substring(0,9) == 'challenge') {
            clearTimeout(rooms[i].autoAction);
            SERVER.log('Game Ended. Closing the room.',i);
            delete rooms[i];
        }
    }
})

function notate(room, notation) {
    if (notation) {
        try {
            if (typeof notation !== "string") {
                SERVER.debug('Notation: not a string');
                return false;
            }
            room = room || new Room({'name':'temporary'});
            room.board.povinnost = 0;
            room.board.importantInfo.povinnost = (room.board.povinnost+1);
            //Return the room
            let values = notation.split('/');
            if (values.length > 20 || values.length < 10) {
                SERVER.debug('Notation: Illegal number of values');
                return false;
            }

            //Get the settings
            let theSettings = values[values.length - 1];
            notationToSettings(room, theSettings);

            let thePlayers = room.players;
            for (let i=0; i<4; i++) {
                if (isNaN(+values[i])) {
                    SERVER.debug('Notation: chips count is NaN');
                    return false;
                }
                thePlayers[i].chips = +values[i];
            }
            for (let i=0; i<4; i++) {
                let theHand = notationToCards(values[i+4],room.settings.aceHigh);
                if (theHand && theHand.length == 12) {
                    thePlayers[i].hand = theHand;
                } else {
                    SERVER.debug('Notation: hand is illegal');
                    return false;
                }
            }
            let theTalon = notationToCards(values[8],room.settings.aceHigh);
            if (theTalon && theTalon.length == 6) {
                room.board.talon = theTalon;
            } else {
                SERVER.debug('Notation: talon is illegal');
                return false;
            }
            let toCheck = theTalon.concat(thePlayers[0].hand).concat(thePlayers[1].hand).concat(thePlayers[2].hand).concat(thePlayers[3].hand);
            for (let i in baseDeck) {
                let found = false;
                for (let j in toCheck) {
                    if (baseDeck[i].suit == toCheck[j].suit &&
                        baseDeck[i].value == toCheck[j].value) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    SERVER.debug('Notation: Missing card');
                    return false;
                }
            }

            //This is the first point at which the game may reasonably be played from
            //So, encode the settings if they exist. Then, if no more is present, return the room
            let valuesWithoutSettings = values;
            delete valuesWithoutSettings[valuesWithoutSettings.length - 1];
            room.board.notation = (valuesWithoutSettings).join('/');
            room.board.hasTheI = findTheI(room.players);
            if (values.length === 10) {
                room.board.nextStep = { player: 0, action: 'prever', time: Date.now(), info: null };
                return room;
            }


            //TODO: finish notation decoding. Next is prever. See TarokyNotation.md


            room.board.nextStep = { player: 0, action: 'prever', time: Date.now(), info: null };
            return room;
        } catch (err) {
            SERVER.debug('Error in notate() ' + err);
            return false;
        }
    }
    SERVER.debug('Notation: No notation provided');
    return false;
}

function u(v) {
    if (typeof v === 'undefined') {
        return true;
    }
    return false;
}

function notationToCards(notatedCards, aceHigh) {
    try {
        let cards = [];
        const SUIT_NOTATION = {S:SUIT[0],C:SUIT[1],H:SUIT[2],D:SUIT[3],T:SUIT[4]};
        const VALUE_NOTATION = {'1':0,'2':1,'3':2,'4':3,'J':4,'R':5,'Q':6,'K':7};

        while (notatedCards.length >= 2) {
            let suit = SUIT_NOTATION[notatedCards.substring(0,1)];
            notatedCards = notatedCards.substring(1);
            if (u(suit)) {
                return false;
            }
            if (suit === SUIT[4]) {
                let value = TRUMP_VALUE[+notatedCards.substring(0,2)-1];
                notatedCards = notatedCards.substring(2);
                if (u(value)) {
                    return false;
                }
                cards.push({'value':value, 'suit': SUIT[4]});
            } else {
                let value = VALUE_NOTATION[notatedCards.substring(0,1)];
                notatedCards = notatedCards.substring(1);
                let redValueEnum = aceHigh ? RED_VALUE_ACE_HIGH : RED_VALUE;
                value = (suit === SUIT[0] || suit === SUIT[1]) ? BLACK_VALUE[value] : redValueEnum[value];
                if (u(value)) {
                    return false;
                }
                cards.push({ 'value': value, 'suit': suit });
            }
        }
        return cards;
    } catch (err) {
        SERVER.debug(err);
        return false;
    }
}
function cardsToNotation(cards) {
    let theNotation = '';
    const SUIT_TO_NOTATION = {'Spade': 'S', 'Club': 'C', 'Heart': 'H', 'Diamond': 'D', 'Trump': 'T'};
    try {
        for (let i in cards) {
            theNotation += SUIT_TO_NOTATION[cards[i].suit];
            if (cards[i].suit == SUIT[4]) {
                //Trump
                let temp = +VALUE_REVERSE[cards[i].value] + 1;
                if (temp < 10) {
                    temp = '0' + temp;
                }
                theNotation += temp;
            } else {
                switch (cards[i].value) {
                    case 'Ace':
                    case 'Seven':
                        theNotation += '1';
                        break;
                    case 'Two':
                    case 'Eight':
                        theNotation += '2';
                        break;
                    case 'Three':
                    case 'Nine':
                        theNotation += '3';
                        break;
                    case 'Four':
                    case 'Ten':
                        theNotation += '4';
                        break;
                    default:
                        theNotation += cards[i].value.substring(0,1);
                }
            }
        }
    } catch (err) {
        SERVER.error('Cards could not be notated: ' + JSON.stringify(cards) + '\n' + err);
    }
    return theNotation;
}
function setSettingNotation(room) {
    let settingNotation = '';
    for (let i in room.settings) {
        settingNotation += i + '=' + room.settings[i] + ';';
    }
    room.settingsNotation = settingNotation.substring(0,settingNotation.length - 1);
}
function notationToSettings(room,notation) {
    room.settingsNotation = notation;
    let theSettings = notation.split(';')
    for (let i in theSettings) {
        let [setting,rule] = theSettings[i].split('=');
        if (u(setting) || u(rule)) {
            SERVER.debug('Undefined setting or rule')
        } else {
            switch (setting) {
                case 'difficulty':
                    if (DIFFICULTY_TABLE[rule]) {
                        room.settings.difficulty = +rule;
                    }
                    break;
                case 'timeout':
                    rule = +rule;
                    if (!isNaN(rule)) {
                        if (rule <= 0) {
                            rule = 0;//No timeout for negatives
                        } else if (rule <= 20000) {
                            rule = 20000;//20 second min
                        } else if (rule >= 3600000) {
                            rule = 3600000;//One hour max
                        }
                       room.settings.timeout = rule;
                    }
                    break;
                case 'aceHigh':
                    if (rule != 'false') {
                        room.settings.aceHigh = true;
                    }
                case 'lock':
                case 'locked':
                    room.settings.lock = rule == 'true';
                    break;
                case 'pn':
                    //Handled later
                    break;
                default:
                    SERVER.warn('Unknown setting: ' + setting + '=' + rule);
            }
        }
    }
}
function notationToObject(notation) {
    if (!notation) {
        return null;
    }
    let settingsObject = {};
    let theSettings = notation.split(';')
    for (let i in theSettings) {
        let [setting,rule] = theSettings[i].split('=');
        if (u(setting) || u(rule)) {
            SERVER.debug('Undefined setting or rule')
        } else {
            switch (setting) {
                case 'difficulty':
                    if (DIFFICULTY_TABLE[rule]) {
                        settingsObject.difficulty = +rule;
                    }
                    break;
                case 'timeout':
                    rule = +rule;
                    if (!isNaN(rule)) {
                        if (rule <= 0) {
                            rule = 0;//No timeout for negatives
                        } else if (rule <= 20000) {
                            rule = 20000;//20 second min
                        } else if (rule >= 3600000) {
                            rule = 3600000;//One hour max
                        }
                       settingsObject.timeout = rule;
                    }
                    break;
                case 'lock':
                case 'locked':
                    settingsObject.lock = rule;
                    break;
                case 'aceHigh':
                    settingsObject.aceHigh = rule == 'true';
                    break;
                case 'pn':
                    //Handled later
                    break;
                default:
                    SERVER.warn('Unknown setting: ' + setting + '=' + rule);
            }
        }
    }
    return settingsObject;
}

let baseDeck = Deck.createDeck();

function findPovinnost(players) {
    let value = 1; //start with the 'II' and start incrementing to next Trump if no one has it until povinnost is found
    while (true) { //loop until we find povinnost
        for (let i = 0; i < 4; i++) {
            if (Deck.handContainsCard(players[i].hand, TRUMP_VALUE[value])) {
                return i; //found povinnost
            }
        }
        value++;
    }
}
function findTheI(players) {
   for (let i = 0; i < 4; i++) {
       if (Deck.handContainsCard(players[i].hand, TRUMP_VALUE[0])) {
           return i; //found the I
       }
   }
   SERVER.trace('ERROR: No one has the I');
   return -1;
}

function whoWon(table, leadPlayer, aceHigh) {
    //First card in the table belongs to the leadPlayer
    let trickLeadCard = table[0];
    let trickLeadSuit = trickLeadCard.suit;
    let highestTrump = -1;
    let currentWinner = 0;//LeadPlayer is assumed to be winning

    let reverseEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;

    for (let i=0; i<4; i++) {
        if (table[i].suit == 'Trump' && reverseEnum[table[i].value] > highestTrump) {
            highestTrump = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    if (highestTrump != -1) {
        //If a trump was played, then the highest trump wins
        return (leadPlayer+currentWinner)%4;
    }
    let highestOfLeadSuit = reverseEnum[trickLeadCard.value];
    for (let i=1; i<4; i++) {
        if (table[i].suit == trickLeadSuit && reverseEnum[table[i].value] > highestOfLeadSuit) {
            highestOfLeadSuit = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    //No trumps means that the winner is whoever played the card of the lead suit with the highest value
    return (leadPlayer+currentWinner)%4;
}

//SEE Card Locations in codeNotes
//SEE Action Flow in codeNotes

// @PARAM nextAction, room NOT ROOMID
function autoAction(action, room, pn) {
    //This function will complete ANY action that a player is otherwise expected to complete
    //When called, this function will complete the action regardless of whether a player should be tasked with completing it
    //This is useful for player TIMEOUT, or when a player takes too long to complete an action
    //This will also be used when less than 4 players are seated at a table, or when a player leaves after the game has begun
    //Note: the game will NEVER continue after all 4 players have left. There will always be at least 1 human player seated at the table.
    if (!room || !room.players) {
        return;//Room has been deleted
    }

    if (room.players[pn] && room.players[pn].type == PLAYER_TYPE.HUMAN) {
        //Let the player know that the action was completed automatically
        room.players[pn].consecutiveAutos++;
        if (room.players[pn].consecutiveAutos > 10) {
            //Player has disconnected or left
            SOCKET_LIST[room.players[pn].socket].disconnect();
            disconnectPlayerTimeout(room.players[pn].socket);
            return;
        } else {
            SERVER.debug('AutoAction: informed player ' + pn, room.name);
            SOCKET_LIST[room.players[pn].socket].emit('autoAction', action);
            action.info.auto = true;
        }
    } else {
        SERVER.log('AutoAction: player ' + pn + ' may have disconnected', room.name);
    }

    let hand = room['players'][pn].hand;
    let fakeMoneyCards = false;

    switch (action.action) {
        case 'start':
        case 'play':
        case 'shuffle':
            break;
        case 'cut':
            action.info.style = 'Cut';
            break;
        case 'deal':
            break;
        case '12choice':
            action.info.choice = Robot.robotChooseHand(room.board.hands);
            break;
        case 'prever':
            action.action = 'passPrever';
            break;
        case 'drawPreverTalon':
        case 'drawTalon':
            break;
        case 'discard':
            Deck.grayUndiscardables(hand);
            action.info.card = Robot.robotDiscard(hand, DIFFICULTY.EASY);
            break;
        case 'povinnostBidaUniChoice':
            fakeMoneyCards = true;
            action.action = 'moneyCards';
            room.board.buc = false;
        case 'moneyCards':
            break;
        case 'partner':
            //if povinnost choose partner
            if (room['board'].povinnost == pn) {
                action.info.partner = Robot.robotPartner(hand, DIFFICULTY.EASY);
            }
            break;
        case 'valat':
            action.info.valat = Robot.robotCall(hand, DIFFICULTY.EASY);
            break;
        case 'iote':
            action.info.iote = Robot.robotIOTE(hand, DIFFICULTY.EASY);
            SERVER.functionCall('autoAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
            actionCallback(action, room, pn);
            return;//Don't inform the players who has the I
        case 'contra':
        case 'preverContra':
        case 'preverValatContra':
        case 'valatContra':
            action.info.contra = Robot.robotContra(hand, DIFFICULTY.EASY);
            SERVER.functionCall('autoAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
            actionCallback(action, room, pn);
            return;
        case 'lead':
            Deck.unGrayCards(hand);
            action.info.card = Robot.robotLead(hand, DIFFICULTY.EASY, room);
            break;
        case 'follow':
            Deck.grayUnplayables(hand, room.board.leadCard);
            action.info.card = Robot.robotPlay(hand, DIFFICULTY.EASY, room);
            break;
        case 'winTrick':
            break;
        case 'countPoints':
            break;//Point counting will be added later
        case 'resetBoard':
            break;//Utilitarian, no input needed
        default:
            SERVER.warn('Unknown auto action: ' + action.action, room.name);
    }
    for (let i = 0; i < 4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            players[room['players'][i].socket].socket.emit('nextAction', action);
        }
    }
    for (let i in room.audience) {
        room.audience[i].messenger.emit('nextAction', action);
    }
    if (fakeMoneyCards) {
        action.action = 'povinnostBidaUniChoice';
    }
    SERVER.functionCall('autoAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
    actionCallback(action, room, pn);
}
function robotAction(action, room, pn) {

    let hand = room['players'][pn].hand;//linked. Changing one will change the other.
    let fakeMoneyCards = false;

    //Takes the action automatically IF and only IF the robot is supposed to
    if (action.player == pn) {
        switch (action.action) {
            case 'play':
            case 'shuffle':
                break;
            case 'cut':
                action.info.style = 'Cut';
                break;
            case 'deal':
                break;
            case '12choice':
                action.info.choice = Robot.robotChooseHand(room.board.hands);
                break;
            case 'prever':
                action.action = Robot.robotPrever(hand, room.settings.difficulty, room);
                break;
            case 'drawPreverTalon':
                action.info.accept = Robot.robotPreverTalon(hand, room.settings.difficulty, room.players[pn].tempHand, room);
                break;
            case 'drawTalon':
                break;
            case 'discard':
                Deck.grayUndiscardables(hand);
                action.info.card = Robot.robotDiscard(hand, room.settings.difficulty);
                break;
            case 'povinnostBidaUniChoice':
                fakeMoneyCards = true;
                action.action = 'moneyCards';
                room.board.buc = Robot.robotPovinnostBidaUniChoice(hand, room.settings.difficulty);
            case 'moneyCards':
                break;
            case 'partner':
                //if povinnost choose partner 
                if (room['board'].povinnost == pn) {
                    action.info.partner = Robot.robotPartner(hand, room.settings.difficulty);
                }
                break;
            case 'valat':
                action.info.valat = Robot.robotCall(hand, room.settings.difficulty);
                break;
            case 'iote':
                action.info.iote = Robot.robotIOTE(hand, room.settings.difficulty)
                SERVER.functionCall('robotAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
                actionCallback(action, room, pn);
                return;//Don't inform the players who has the I
            case 'contra':
            case 'preverContra':
            case 'preverValatContra':
            case 'valatContra':
                action.info.contra = Robot.robotContra(hand, room.settings.difficulty);
                SERVER.functionCall('robotAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
                actionCallback(action, room, pn);
                return;
            case 'lead':
                Deck.unGrayCards(hand);
                action.info.card = Robot.robotLead(hand, room.settings.difficulty,room);
                break;
            case 'follow':
                Deck.grayUnplayables(hand, room.board.leadCard);
                action.info.card = Robot.robotPlay(hand, room.settings.difficulty,room);
                break;
            case 'winTrick':
                break;
            case 'countPoints':
                break;//Point counting will be added later
            case 'resetBoard':
                break;//Utilitarian, no input needed
            default:
                SERVER.warn('Unknown robot action: ' + action.action,room.name);
        }
        for (let i = 0; i < 4; i++) {
            if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
        for (let i in room.audience) {
            room.audience[i].messenger.emit('nextAction', action);
        }
        if (fakeMoneyCards) {
            action.action = 'povinnostBidaUniChoice';
        }
        SERVER.functionCall('robotAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
        actionCallback(action, room, pn);
    }
}
function playerAction(action, room, pn) {
    //Prompts the player to take an action IF and only IF the player is supposed to
    //Works closely with action callbacks

    let hand = room['players'][pn].hand;//linked. Changing one will change the other.
    let returnHandState = -1;
    let fakeMoneyCards = false;

    switch (action.action) {
        case 'play':
            break;
        case 'shuffle':
        //Do nothing, because its all taken care of by the generic action sender/informer at the end
        case 'cut':
        case 'deal':
            break;
        case '12choice':
            let tempChoiceArray = {};
            for (let i in room.board.hands) {
                if (typeof room.board.hands[i] == 'undefined') {
                    delete tempChoiceArray[i];
                } else {
                    tempChoiceArray[i] = i;
                }
            }
            SOCKET_LIST[room.players[pn].socket].emit('12choice',tempChoiceArray);
            break;
        case 'prever':
        case 'callPrever':
        case 'passPrever':
        case 'drawPreverTalon':
        case 'drawTalon':
            break;
        case 'discard':
            Deck.grayUndiscardables(hand);
            returnHandState = 1;
            break;
        case 'povinnostBidaUniChoice':
        case 'moneyCards':
            break;
        case 'partner':
            //if povinnost choose partner 
            if (room['board'].povinnost == pn) {
                action.info.possiblePartners = Deck.possiblePartners(hand);
            }
            break;
        case 'valat':
            break;
        case 'contra':
        case 'preverContra':
        case 'preverValatContra':
        case 'valatContra':
        case 'iote':
            SERVER.functionCall('playerAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
            players[room['players'][pn].socket].socket.emit('nextAction', action);
            return;
        case 'lead':
            Deck.unGrayCards(hand);
            returnHandState = 0;
            break;
        case 'follow':
            Deck.grayUnplayables(hand, room.board.leadCard);
            returnHandState = 1;
            break;
        case 'winTrick':
            break;
        case 'countPoints':
            //TODO: show the player the discard pile so they can count on harder difficulties
            break;
        case 'resetBoard':
        case 'retry':
            break;
        default:
            SERVER.warn('Unknown action: ' + action.action);
            SERVER.trace();
    }
    if (returnHandState == 0) {
        players[room['players'][pn].socket].socket.emit('returnHand', Deck.sortCards(hand, room.settings.aceHigh), false);
    } else if (returnHandState == 1) {
        players[room['players'][pn].socket].socket.emit('returnHand', Deck.sortCards(hand, room.settings.aceHigh), true);
    }

    for (let i = 0; i < 4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            if (!SENSITIVE_ACTIONS[action.action] || pn == i) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
    }
    for (let i in room.audience) {
        if (!SENSITIVE_ACTIONS[action.action]) {
            room.audience[i].messenger.emit('nextAction', action);
        }
    }
    SERVER.functionCall('playerAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
}
function aiAction(action, room, pn) {
    //Uses the AI to take an action IF and only IF the AI is supposed to
    let hand = room['players'][pn].hand;
    let fakeMoneyCards = false;
    let actionNeedsAI = false;

    if (action.player == pn) {

        switch (action.action) {
                case 'play':
                case 'shuffle':
                    break;
                case 'cut':
                    action.info.style = 'Cut';//Since this has 0 effect on gameplay, no ai necessary
                    break;
                case 'deal':
                    break;
                case '12choice':
                    action.info.choice = robotChooseHand(room.board.hands);//Again, 0 effect on gameplay
                    break;
                case 'prever':
                    actionNeedsAI = true;
                    think(8,5,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'drawPreverTalon':
                    //todo give ai choice to keep or pass prever talon cards
                case 'drawTalon':
                    break;
                case 'discard':
                    {
                    Deck.grayUndiscardables(hand);
                    let choices = Deck.handWithoutGray(hand);
                    if (choices.length == 1) {
                        action.info.card = choices[0];
                        break;
                    }
                    actionNeedsAI = true;
                    let discardPromises = [];
                    for (let i in choices) {
                        discardPromises[i] = think(0,8,action,room,pn,fakeMoneyCards,choices[i]);
                    }
                    Promise.all(discardPromises).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    }
                    break;
                case 'povinnostBidaUniChoice':
                    actionNeedsAI = true;
                    think(11,9,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                case 'moneyCards':
                    break;
                case 'partner':
                    //if povinnost choose partner
                    actionNeedsAI = true;
                    let p1 = think(12,11,action,room,pn,fakeMoneyCards);
                    let p2 = think(13,11,action,room,pn,fakeMoneyCards);
                    Promise.all([p1, p2]).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'valat':
                    actionNeedsAI = true;
                    think(9,12,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'iote':
                    actionNeedsAI = true;
                    think(10,13,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'contra':
                case 'preverContra':
                case 'preverValatContra':
                case 'valatContra':
                    actionNeedsAI = true;
                    let myPromise;
                    if (room.board.contra == -1) {
                        //Regular contra
                        myPromise = think(5,17,action,room,pn,fakeMoneyCards);
                    } else if (room.board.rheaContra == -1) {
                        myPromise = think(6,17,action,room,pn,fakeMoneyCards);
                    } else {
                        myPromise = think(7,17,action,room,pn,fakeMoneyCards);
                    }
                    myPromise.then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'lead':
                    if (hand.length == 1) {
                        action.info.card = hand[0];
                        break;
                    }
                    {
                    actionNeedsAI = true;
                    let leadPromises = [];
                    Deck.unGrayCards(hand);
                    //Rank each card
                    //think(8,5,action,room,pn,fakeMoneyCards);

                    let choices = Deck.handWithoutGray(hand);
                    for (let i in choices) {
                        leadPromises[i] = think(1,18,action,room,pn,fakeMoneyCards,choices[i]);
                    }
                    Promise.all(leadPromises).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    }
                    break;
                case 'follow':
                    let choices = Deck.handWithoutGray(hand);
                    if (choices.length == 1) {
                        action.info.card = choices[0];
                        break;
                    }
                    {
                    actionNeedsAI = true;
                    let followPromises = [];
                    //Rank each card

                    let choices = Deck.handWithoutGray(hand);
                    for (let i in choices) {
                        followPromises[i] = think(1,19,action,room,pn,fakeMoneyCards,choices[i]);
                    }
                    Promise.all(followPromises).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    }
                    break;
                case 'winTrick':
                    break;
                case 'countPoints':
                    break;//Point counting will be added later
                case 'resetBoard':
                    break;//Utilitarian, no input needed
                default:
                    SERVER.warn('Unknown ai action: ' + action.action,room.name);
            }
    }
    if (action.action == 'iote' || 'contra' || 'preverContra' ||'preverValatContra' || 'valatContra') {
        //Don't inform players of private actions
        for (let i = 0; i < 4; i++) {
            if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
        for (let i in room.audience) {
            room.audience[i].messenger.emit('nextAction', action);
        }
        if (fakeMoneyCards) {
            action.action = 'povinnostBidaUniChoice';
        }
    }
    if (!actionNeedsAI) {
        aiActionComplete(action, room, pn, fakeMoneyCards);
    }
}
function think(outputNumber, actionNumber, action, room, pn, fakeMoneyCards, cardPrompt) {
    const myPromise = new Promise((resolve, reject) => {
        const dataToSend = AI.generateInputs(room,pn,actionNumber,cardPrompt);
        //dataToSend is already a binary buffer of 1s and 0s
        const options = {
            hostname: 'localhost',
            path: '/' + room['players'][pn].ai + '/',
            method: 'POST',
            protocol: 'http:',
            port: 8441,
            headers: {
                'output': outputNumber
            }
        };
        const req = http.request(options, (res) => {
            let postData = [];
            res.on('data', function(chunk) {
                postData.push(chunk);
                //CODE REACHES HERE
            });
            function complete() {
                //postData = Buffer.concat(postData).toString();
                let stringData = '';
                for (let i in postData) {
                    stringData += postData[i];
                }
                try {
                    postData = JSON.parse(stringData)
                } catch (e) {
                    SERVER.error('JSON error: ' + e)
                }
                resolve(postData.answer);
            }
            res.on('finish', complete);
            res.on('end', complete);
            res.on('close', complete);
            SERVER.debug('AI status: ' + res.statusCode);
            if (res.statusCode === 200) {
                //Action successfully completed
            } else {
                //Action failed
                reject('AI action failed');
            }
        }).on("error", (err) => {
            //TODO: there's a really weird error that I'm ignoring here
            //reject(err);
        });
        req.setTimeout(10000);//10 seconds max
        req.end(dataToSend);
    });
    return myPromise;
}
function aiActionCallback(action, room, pn, fakeMoneyCards, result) {
    //Generate possible choices
    //If only one choice, choose it
    //Otherwise, generate inputs
    //Give the inputs and each choice to the AI and note the number returned
    //Use the highest-ranked choice

    /*
    OUTPUTS (14 x 1)
    0. Discard this
    1. Play this
    2. Keep talon
    3. Keep talon bottom
    4. Keep talon top
    5. Contra
    6. Rhea-contra
    7. Supra-contra
    8. Prever
    9. Valat
    10. IOTE
    11. povinnost b/u choice
    12. Play alone (call XIX)
    13. Play together (call lowest)
    Total: 14
    */

    let hand = room['players'][pn].hand;

    switch (action.action) {
        case 'prever':
            action.action = 'passPrever';
            if (result > 0.5) {
                action.action = 'callPrever';
            }
            break;
        case 'discard':
            {
            Deck.grayUndiscardables(hand);
            let choices = Deck.handWithoutGray(hand);
            let highestRanking = 0;
            for (let i in choices) {
                if (result[i] > result[highestRanking]) {
                    highestRanking = i;
                }
            }
            action.info.card = choices[highestRanking];
            }
            break;
        case 'povinnostBidaUniChoice':
            fakeMoneyCards = true;
            action.action = 'moneyCards';
            room.board.buc = false;
            if (result > 0.5) {
                room.board.buc = true;
            }
            break;
        case 'partner':
            if (room['board'].povinnost == pn) {
                let goAloneRanking = result[0];
                let goPartnerRanking = result[1];
                if (goAloneRanking > goPartnerRanking) {
                    action.info.partner = {suit:'Trump',value:'XIX'};
                }  else {
                    //Rudimentary always plays with a partner
                    action.info.partner = robotPartner(hand, DIFFICULTY.BEGINNER);
                }
            }
            break;
        case 'valat':
            action.info.valat = false;
            if (result > 0.5) {
                action.info.valat = true;
            }
        case 'iote':
            action.info.iote = false;
            if (result > 0.5) {
                action.info.iote = true;
            }
            break;
        case 'contra':
        case 'preverContra':
        case 'preverValatContra':
        case 'valatContra':
            action.info.contra = result > 0.5;
            break;
        case 'lead':
            {
            Deck.unGrayCards(hand);
            //Rank each card
            let choices = Deck.handWithoutGray(hand);
            let highestRanking = 0;
            for (let i in choices) {
                if (result[i] > result[highestRanking]) {
                    highestRanking = i;
                }
            }
            action.info.card = choices[highestRanking];
            }
            break;
        case 'follow':
            {
            //Rank each card
            Deck.grayUnplayables(hand, room.board.leadCard);
            let choices = Deck.handWithoutGray(hand);
            let highestRanking = 0;
            for (let i in choices) {
                if (result[i] > result[highestRanking]) {
                    highestRanking = i;
                }
            }
            action.info.card = choices[highestRanking];
            }
            break;
    }
    try {
        aiActionComplete(action, room, pn, fakeMoneyCards);
    } catch (e) {
        SERVER.error(e);
    }
}
function aiActionComplete(action, room, pn, fakeMoneyCards) {
    //actionCallback() -> aiAction() -> aiActionCallback() -> ai server -> response -> aiActionComplete -> actionCallback
    //if no ai is needed: actionCallback() -> aiAction() -> robot action -> aiActionComplete() -> actionCallback()

    if (room.board.nextStep.action == action.action) {
        actionCallback(action, room, pn);
    } else {
        throw "Game moved on without me :(";
    }

}

function actionCallback(action, room, pn) {
    // an Action is {player_num,action_type,time,info}

    //This callback will transfer from one action to the next and inform the humans of the action to be taken
    //In the case that a robot or AI is the required player, this will directly call on the above action handlers
    //The action is presumed to be verified by its player takeAction function, not here

    /*TODO:
        This monster function needs to be split into several functions and placed in the room.js file.
        Essentially, it'll look like room.actionCallback(action, pn)
        this function will retain the switch statement, the starting bit, and the ending bit
        The switch will call different functions like room.shuffle(relevantInfo)
        This also allows the benefit of modularity, ex: from the admin panel using room.next() to force a game to the next step for debugging or testing
        just one action in different scenarios like room.shuffle({type: 'riffle', pn: 0}) to identify bugs easier.
        The final benefit is the ease of implementing additional actions and AI training more systematically, just by adding functions and a case to the switch
        (Also it'll be easier to Ctrl+F function declarations)
        */


    if (!room || !action) {
        SERVER.error('Illegal actionCallback: ' + JSON.stringify(room) + ' \n\n ' + JSON.stringify(action) + ' \n\n ' + pn);
        SERVER.errorTrace();
        return;
    }
    if (!action.info) {
        action.info = {};
    }
    if (!action.info.auto) {
        room.players[pn].consecutiveAutos = 0;
    }
    let currentHand = room['players'][pn].hand;//linked, not copied
    let playerType = room['players'][pn].type;
    let actionTaken = false;
    let style;
    let shouldReturnTable = false;
    let shouldTrainAI = room.players[pn].socket != -1 && players[room.players[pn].socket].username != 'Guest';

    SERVER.functionCall('actionCallback', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name}, {name:'info',value:JSON.stringify(action.info)});

    switch (action.action) {
        case 'start':
            room['board'].gameNumber = 1;
            SERVER.log('Game 1 is starting',room.name);
            action.action = 'shuffle';
            action.player = pn;//First game, host is assumed to shuffle
            for (let i = 0; i < 4; i++) {
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    //Starting the game is a special case. In all other cases, actions completed will inform the players through the take action methods
                    players[room['players'][i].socket].socket.emit('startingGame', room.host, i, room['board'].gameNumber, room.settings);//Inform the players of game beginning.
                }
            }
            room.board.importantInfo.chips = {
                '0': room.players[0].chips,
                '1': room.players[1].chips,
                '2': room.players[2].chips,
                '3': room.players[3].chips
            }
            actionTaken = true;
            break;
        case 'play':
            room['board'].gameNumber++;
            SERVER.log('Game ' + room['board'].gameNumber + ' is starting',room.name);
            action.action = 'shuffle';
            action.player = (room['board'].povinnost+3)%4;
            room.board.importantInfo.chips = {
                '0': room.players[0].chips,
                '1': room.players[1].chips,
                '2': room.players[2].chips,
                '3': room.players[3].chips
            }
            actionTaken = true;
            break;
        case 'shuffle':
            const type = action.info.type;
            const again = action.info.again;
            if (type > 0 && type < 4) {
                //1: cut, 2: riffle, 3: randomize
                room['deck'].shuffleDeck(type);
            }
            if (!again) {
                action.action = 'cut';
                action.player = (pn + 3) % 4;//The player before the dealer must cut, then the dealer must deal
                actionTaken = true;
            }
            break;
        case 'cut':
            style = action.info.style;
            if (style == 'Cut') room['deck'].shuffleDeck(1, action.info.location);
            action.action = 'deal';
            action.player = (pn + 1) % 4;//The player after the cutter must deal
            room['board']['cutStyle'] = style;//For the dealer
            actionTaken = true;
            break;
        case 'deal':
            style = room['board']['cutStyle'];
            if (!style) style = 'Cut';
            for (let i = 0; i < 6; i++) room['board'].talon[i] = room['deck'].splice(0, 1)[0];
            switch (style) {
                case '1':
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) { room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '2':
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) { for (let c = 0; c < 2; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '3':
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) { for (let c = 0; c < 3; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '4':
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) { for (let c = 0; c < 4; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '12':
                    room.board.hands = {1:[], 2:[], 3:[], 4:[]};
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) {
                        for (let c = 0; c < 12; c++) {
                            room.board.hands[i+1].push(room['deck'].splice(0, 1)[0]);
                        }
                    }
                    action.action = '12choice';
                    action.player = (action.player+1)%4;
                    actionTaken = true;
                    break;
                case '12 Straight':
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) { for (let c = 0; c < 12; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '345':
                    for (let t = 3; t < 6; t++) {
                        for (let i = 0; i < 4; i++) {
                            for (let c = 0; c < t; c++) room['players'][i].hand.push(room['deck'].splice(0, 1)[0]);
                        }
                    }
                    break;
                default:
                    //Cases 6, Cut, or any malformed cut style. Note the deck has already been cut
                    for (let i = 0; room['deck'].deck[0]; i = (i + 1) % 4) { for (let c = 0; c < 6; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
            }
            if (actionTaken) {
                //12 choice
                break;
            }
            if (room['board'].povinnost == -1) {
                //Povinnost first round chosen by cards
                room['board'].povinnost = findPovinnost(room['players'])
            }
            room.board.importantInfo.povinnost = (room.board.povinnost+1);
            room.board.notation = '' + room.players[room['board'].povinnost].chips + '/'
                                    + room.players[playerOffset(room['board'].povinnost,1)].chips + '/'
                                    + room.players[playerOffset(room['board'].povinnost,2)].chips + '/'
                                    + room.players[playerOffset(room['board'].povinnost,3)].chips + '/'
                                    + cardsToNotation(room.players[playerOffset(room['board'].povinnost,0)].hand) + '/'
                                    + cardsToNotation(room.players[playerOffset(room['board'].povinnost,1)].hand) + '/'
                                    + cardsToNotation(room.players[playerOffset(room['board'].povinnost,2)].hand) + '/'
                                    + cardsToNotation(room.players[playerOffset(room['board'].povinnost,3)].hand) + '/'
                                    + cardsToNotation(room.board.talon) + '/';
            setSettingNotation(room);
            //Povinnost rotation is handled by the board reset function
            SERVER.log(room.board.notation);//For debug when the server crashes

            for (let i in room.players) {
                if (room.players[i].socket != -1) {
                    returnToGame[room.players[i].socket] = {notation: room.board.notation + room.settingsNotation, povinnost: room.board.povinnost, pn: i};
                }
            }

            SERVER.debug('Povinnost is ' + room['board'].povinnost,room.name, room.name);
            room.informPlayers('is povinnost', MESSAGE_TYPE.POVINNOST,{'pn':room['board'].povinnost},room['board'].povinnost);
            action.action = 'prever';
            action.player = room['board'].povinnost;
            actionTaken = true;
            break;
        case '12choice':
            let chosenHand = room.board.hands[action.info.choice];
            if (!chosenHand) {
                SERVER.error('Chosen hand does not exist',room.name);
                break;
            }
            while (chosenHand[0]) {room.players[action.player].hand.push(chosenHand.splice(0,1)[0]);}
            delete room.board.hands[action.info.choice];
            if (room.board.hands[1] || room.board.hands[2] || room.board.hands[3] || room.board.hands[4]) {
                //At least 1 hand is left
                action.player = (action.player+1)%4;
                actionTaken = true;
            } else {
                if (room['board'].povinnost == -1) {
                    //Povinnost first round chosen by cards
                    room['board'].povinnost = findPovinnost(room['players'])
                }
                room.board.importantInfo.povinnost = (room.board.povinnost+1);
                //Povinnost rotation is handled by the board reset function
                SERVER.debug('Povinnost is ' + room['board'].povinnost,room.name);
                room.informPlayers('is povinnost', MESSAGE_TYPE.POVINNOST,{'pn':room['board'].povinnost},room['board'].povinnost);
                action.action = 'prever';
                action.player = room['board'].povinnost;
                actionTaken = true;
            }
            break;
        case 'prever':
            break;//ignore this, the callback is for the players
        case 'drawTalon':
            if (action.player == room['board'].povinnost) {
                room.informPlayer(pn, '', MESSAGE_TYPE.DRAW, {'cards':room.board.talon.slice(0,4)});
                //Note that SLICE not SPLICE is used for informPlayer, so the array is not modified yet
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                action.player = (action.player + 1) % 4;
            } else {
                room.informPlayer(pn, '', MESSAGE_TYPE.DRAW, {'cards':room.board.talon.slice(0,1)});
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                if (action.player == (room['board'].povinnost + 2) % 4) {
                    //Player +2 pov. has drawn the final card in the talon
                    action.player = room['board'].povinnost;
                    action.action = 'discard';
                } else if (action.player == (room['board'].povinnost + 3) % 4) {
                    //Player +3 pov. has drawn a rejected card from the talon
                    if (room['board'].talon.length == 0) {
                        //Player +2 pov. rejected the card
                        action.player = room['board'].povinnost;
                        action.action = 'discard';
                        //TODO: can both +1 and +2 reject the cards and +3 draw them both? I've never encountered this in a real game before
                    } else {
                        action.player = (room['board'].povinnost + 2) % 4;
                    }

                } else {
                    action.player = (action.player + 1) % 4;
                }
            }
            actionTaken = true;
            break;
        case 'passTalon':
            //2 cases
            if (action.player == (room['board'].povinnost + 3) % 4) {
                //Player 1 or 2 from pov. has passed the card and it has been rejected again
                if (room['board'].talon.length == 2) {
                    //Player +1 pov. passed the card
                    room.informPlayer((room['board'].povinnost + 1) % 4, '', MESSAGE_TYPE.DRAW, {'cards':room.board.talon.slice(0,1)});
                    room['players'][(room['board'].povinnost + 1) % 4].hand.push(room['board'].talon.splice(0, 1)[0]);
                }
                //Player +2 pov. gets the remaining card in every case
                room.informPlayer((room['board'].povinnost + 2) % 4, '', MESSAGE_TYPE.DRAW, {'cards':room.board.talon.slice(0,1)});
                room['players'][(room['board'].povinnost + 2) % 4].hand.push(room['board'].talon.splice(0, 1)[0]);

                action.player = room['board'].povinnost;
                action.action = 'discard';
                actionTaken = true;
            } else {
                //Player 1 or 2 from pov. would like to pass a card
                action.player = (room['board'].povinnost + 3) % 4;
                action.action = 'drawTalon';
                actionTaken = true;
            }
            break;
        case 'passPrever':
            if (shouldTrainAI) {
                room.players[pn].trainPersonalizedAI(room, pn, 5, 8, null, 0, true);
            }
            action.player = (action.player + 1) % 4;
            if (action.player == room['board'].povinnost) {
                if (room.board.prever != -1) {
                    action.action = 'drawPreverTalon';
                    action.player = room.board.prever;
                } else {
                    action.action = 'drawTalon';
                    actionTaken = true;
                    break;
                }
            } else {
                action.action = 'prever';
                actionTaken = true;
                break;
            }
        case 'callPrever':
            if (action.action == 'callPrever') {
                if (shouldTrainAI) {
                    room.players[pn].trainPersonalizedAI(room, pn, 5, 8, null, 1);
                }
                room['board'].playingPrever = true;
                room['board'].prever = pn;
                room['board'].preverTalonStep = 0;
                room.board.importantInfo.prever = (room.board.prever+1);
                action.action = 'prever';
            }
            if (room.board.povinnost == (pn+1)%4 || action.action == 'drawPreverTalon') {
            //Last player called prever.
                action.action = 'drawPreverTalon';
                if (room['board'].povinnost == action.player) {
                    for (let i=0; i<4; i++) {
                        room['players'][i].isTeamPovinnost = false;
                        room.players[i].publicTeam = -1;
                    }
                    room['players'][action.player].isTeamPovinnost = true;
                    room.players[action.player].publicTeam = 1;
                } else {
                    for (let i=0; i<4; i++) {
                        room['players'][i].isTeamPovinnost = true;
                        room.players[i].publicTeam = 1;
                    }
                    room['players'][action.player].isTeamPovinnost = false;
                    room.players[action.player].publicTeam = -1;
                }
            } else {
                action.player = (action.player + 1) % 4;
                actionTaken = true;
                break;
            }
            //Fallthrough to inform the player
        case 'drawPreverTalon':
            if (room['board'].preverTalonStep == 0) {
                room.board.preverMultiplier = 1;
                //Show the initial 3 cards to prever
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                Deck.sortCards(room['players'][action.player].tempHand, room.settings.aceHigh);

                //Inform player of cards
                if (room.players[action.player].type == PLAYER_TYPE.HUMAN) {
                    room.informPlayer(action.player, '', MESSAGE_TYPE.PREVER_TALON,{'cards':room['players'][action.player].tempHand,'step':0});
                }

                actionTaken = true;
                room['board'].preverTalonStep = 1;
            } else if (room['board'].preverTalonStep == 1) {
                if (action.info.accept) {
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    //Prever is keeping the initial three cards and will not look at the other three.
                    //The other three cards now go into Povinnost's discard pile, unless Prever is Povinnost, in which case the cards go into the next player's discard pile
                    //The game then continues with Prever discarding down to 12 and point cards as normal
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room.informPlayers('kept the first set of cards',MESSAGE_TYPE.PREVER_TALON,{'pn':pn,'step':3},pn);
                    actionTaken = true;
                    action.action = 'discard';
                } else {
                    //Prever has rejected the first three cards and will instead take the second three
                    //The original three return to the talon and the three from the talon enter the tempHand. Other players are allowed to view the talon now
                    //The Prever loss multiplier is doubled here. Prever has a third and final choice to make before we may continue
                    let temp = [];

                    //Show first set of cards to all players
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);

                    room.informPlayers('rejected the first set of cards',MESSAGE_TYPE.PREVER_TALON,{'cards':temp,'pn':pn,'step':1},pn);
                    room.board.publicPreverTalon[0] = {suit:temp[0].suit, value:temp[0].value};
                    room.board.publicPreverTalon[1] = {suit:temp[1].suit, value:temp[1].value};
                    room.board.publicPreverTalon[2] = {suit:temp[2].suit, value:temp[2].value};

                    //Show prever the second set of cards from the talon
                    room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);

                    //Return first set of cards to the talon
                    room['board'].talon.push(temp.splice(0,1)[0]);
                    room['board'].talon.push(temp.splice(0,1)[0]);
                    room['board'].talon.push(temp.splice(0,1)[0]);

                    //Inform prever of cards
                    if (room.players[pn].type == PLAYER_TYPE.HUMAN) {
                        room.informPlayer(pn, '', MESSAGE_TYPE.PREVER_TALON,{'cards':room['players'][action.player].tempHand,'step':1});
                    }

                    actionTaken = true;
                    room['board'].preverTalonStep = 2;
                    room['board'].preverMultiplier = 2;
                }
            } else if (room['board'].preverTalonStep == 2) {
                if (action.info.accept) {
                    //Prever has claimed the second set of cards and basically the same thing happens as if prever had accepted the first half, but the loss multiplier is doubled
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);

                    //Opposing team claims the first set of cards
                    room.board.cardsPlayed[Deck.cardId(room['board'].talon[0], room.settings.aceHigh)] = true;
                    room.board.cardsPlayed[Deck.cardId(room['board'].talon[1], room.settings.aceHigh)] = true;
                    room.board.cardsPlayed[Deck.cardId(room['board'].talon[2], room.settings.aceHigh)] = true;
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);

                    room.informPlayers('kept the second set of cards',MESSAGE_TYPE.PREVER_TALON,{'pn':pn,'step':3},pn);
                    action.action = 'discard';
                    actionTaken = true;
                } else {
                    //Prever rejected the second set and returned to the first set
                    //Prever swaps the three cards with the talon and the other players are again allowed to view which cards prever rejected
                    //Finally, the remaining cards in the talon are given to the other team, the loss multiplier is doubled again (now at 4x), and play moves on to discarding
                    let temp = [];
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);

                    room.informPlayers('rejected the second set of cards',MESSAGE_TYPE.PREVER_TALON,{'cards':temp,'pn':pn,'step':2},pn);
                    room.board.publicPreverTalon[3] = {suit:temp[0].suit, value:temp[0].value};
                    room.board.publicPreverTalon[4] = {suit:temp[1].suit, value:temp[1].value};
                    room.board.publicPreverTalon[5] = {suit:temp[2].suit, value:temp[2].value};

                    //Give prever the cards from the talon
                    room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);

                    //Give second set of cards to opposing team's discard
                    room.board.cardsPlayed[Deck.cardId(temp[0], room.settings.aceHigh)] = true;
                    room.board.cardsPlayed[Deck.cardId(temp[1], room.settings.aceHigh)] = true;
                    room.board.cardsPlayed[Deck.cardId(temp[2], room.settings.aceHigh)] = true;
                    room['players'][(action.player+1)%4].discard.push(temp.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(temp.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(temp.splice(0, 1)[0]);

                    room['board'].preverMultiplier = 4;
                    actionTaken = true;
                    action.action = 'discard';
                }
            }
            room.board.importantInfo.preverMultiplier = room.board.preverMultiplier;
            break;
        case 'discard':
            let card = action.info.card;
            let discarded = false;
            if (card && card.suit && card.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == card.suit && room['players'][pn].hand[i].value == card.value) {
                        room.players[pn].discard.push(room['players'][pn].hand.splice(i, 1)[0]);
                        discarded = true;
                        break;
                    }
                }
            }
            if (discarded) {
                if (shouldTrainAI) {
                    room.players[pn].trainPersonalizedAI(room, pn, 8, 0, card, 1);
                }
                actionTaken = true;
                //Announce discard Trump cards
                if (card.suit == 'Trump') {
                    room.informPlayers('discarded the ' + card.value, MESSAGE_TYPE.TRUMP_DISCARD, {pn: pn, card: card}, pn);
                    if (room.board.prever != -1) {
                        room.board.trumpDiscarded[0].push({suit:card.suit, value:card.value});
                    } else {
                        room.board.trumpDiscarded[((+room.board.povinnost - +pn) + 4)%4].push({suit:card.suit, value:card.value});
                    }
                    room.board.cardsPlayed[Deck.cardId(card, room.settings.aceHigh)] = true;
                }
                if (room['players'][action.player].hand.length == 12) {
                    action.player = (action.player + 1) % 4;
                    if (room['players'][action.player].hand.length == 12) {
                        action.player = (action.player + 1) % 4;
                        if (room['players'][action.player].hand.length == 12) {
                            action.player = (action.player + 1) % 4;
                            if (room['players'][action.player].hand.length == 12) {
                                action.player = room['board'].povinnost;
                                if (room['board'].playingPrever) {
                                    //A player is going prever. No partner cards
                                    action.action = 'moneyCards';
                                    //Note that prever is calling Bida or Uni no matter what
                                    //If prever has bida or uni, he calls bida or uni. No choice.
                                } else {
                                    //No player going prever. Povinnost will call a partner
                                    action.action = 'partner';
                                }
                            }
                        }
                    }
                }
            } else {
                if (players[room['players'][pn].socket]) {
                    players[room['players'][pn].socket].socket.emit('failedDiscard', card);
                }
                if (action.info.card) {
                    SERVER.warn('Player ' + pn + ' failed to discard the ' + action.info.card.value + ' of ' + action.info.card.suit,room.name);
                }
                SERVER.warn('Failed to discard. Cards in hand: ' + JSON.stringify(room['players'][pn].hand),room.name);
            }
            break;
        case 'povinnostBidaUniChoice':
            //player is assumed to be povinnost. This action is only taken if povinnost has bida or uni and no one is prever
            if (shouldTrainAI) {
                room.players[pn].trainPersonalizedAI(room, pn, 9, 11, null, action.info.choice ? 1 : 0);
            }
            room.board.buc = action.info.choice;
            action.action = 'moneyCards';//Fallthrough. Go directly to moneyCards
        case 'moneyCards':
            //Determines point which point cards the player has, starting with Povinnost and rotating around. Povinnost has the option to call Bida or Uni but others are called automatically
            let isPovinnost = room.board.povinnost == pn;
            //Needed info: trump count, 5-pointer count, trul detection
            let numTrumps = 0;
            let fiverCount = 0;
            let owedChips = 0;
            for (let i in currentHand) {
                if (currentHand[i].suit == "Trump") { numTrumps++; }
                if (currentHand[i].value == "King" || currentHand[i].value == "I" || currentHand[i].value == "XXI" || currentHand[i].value == "Skyz") { fiverCount++; }
            }
            if (numTrumps == 0) {
                if (!isPovinnost || room.board.buc || (room.board.prever != -1)) {
                    //Uni
                    owedChips += 4;
                    room['board'].moneyCards[pn].push("Uni");
                }
            } else if (numTrumps <= 2) {
                if (!isPovinnost || room.board.buc || (room.board.prever != -1)) {
                    //Bida
                    owedChips += 2;
                    room['board'].moneyCards[pn].push("Bida");
                }
            } else if (numTrumps >= 10) {
                //Taroky (big ones)
                owedChips += 4;
                room['board'].moneyCards[pn].push("Taroky");
            } else if (numTrumps >= 8) {
                //Tarocky (little ones)
                owedChips += 2;
                room['board'].moneyCards[pn].push("Tarocky");
            }
            if (fiverCount >= 3) {
                //Check for trul
                if (Deck.handContainsCard(currentHand, "I") && Deck.handContainsCard(currentHand, "XXI") && Deck.handContainsCard(currentHand, "Skyz")) {
                    //Trul
                    owedChips += 2;
                    room['board'].moneyCards[pn].push("Trul");
                }
                if (Deck.handContains(currentHand, "King", "Spade") && Deck.handContains(currentHand, "King", "Club") && Deck.handContains(currentHand, "King", "Heart") && Deck.handContains(currentHand, "King", "Diamond")) {
                    if (fiverCount > 4) {
                        //Rosa-Pane+
                        owedChips += 6;
                        room['board'].moneyCards[pn].push("Rosa-Pane+");
                    } else {
                        //Rosa-Pane
                        owedChips += 4;
                        room['board'].moneyCards[pn].push("Rosa-Pane");
                    }
                } else if (fiverCount >= 4) {
                    //Pane
                    owedChips += 2;
                    room['board'].moneyCards[pn].push("Pane");
                }
            }

            //Inform all players of current moneyCards
            let theMessage = 'is calling ';
            let yourMoneyCards = 'You are calling ';
            let numCalled = 0;
            for (let i in room['board'].moneyCards[pn]) {
                numCalled++;
                theMessage += ((numCalled>1 ? ', ' : '') + room['board'].moneyCards[pn][i]);
                yourMoneyCards += ((numCalled>1 ? ', ' : '') + room['board'].moneyCards[pn][i]);
            }
            if (numCalled == 0) {
                theMessage += 'nothing';
                yourMoneyCards += 'nothing';
            }
            room.informPlayers(theMessage, MESSAGE_TYPE.MONEY_CARDS, {youMessage: yourMoneyCards, pn: pn}, pn);
            for (let i in room['players']) {
                if (i == pn) {
                    room['players'][i].chips += 3 * owedChips;
                } else {
                    room['players'][i].chips -= owedChips;
                }
                room.board.importantInfo.chips = {
                    '0': room.players[0].chips,
                    '1': room.players[1].chips,
                    '2': room.players[2].chips,
                    '3': room.players[3].chips
                }
            }
            room.board.importantInfo.moneyCards = room.board.moneyCards;
            actionTaken = true;

            action.player = (pn + 1) % 4;
            if (action.player == room['board'].povinnost) {
                action.action = 'valat';
                room.board.hasTheI = findTheI(room.players);
            }
            break;
        case 'partner':
            let povinnostChoice = room['board'].partnerCard;
            if (!Deck.handContainsCard(currentHand, "XIX") || (Deck.handContainsCard(currentHand, "XIX") && povinnostChoice == 'XIX')) {
                room['board'].partnerCard = "XIX";
            } else if (!Deck.handContainsCard(currentHand, "XVIII")) {
                room['board'].partnerCard = "XVIII";
            } else if (!Deck.handContainsCard(currentHand, "XVII")) {
                room['board'].partnerCard = "XVII";
            } else if (!Deck.handContainsCard(currentHand, "XVI")) {
                room['board'].partnerCard = "XVI";
            } else if (!Deck.handContainsCard(currentHand, "XV")) {
                room['board'].partnerCard = "XV";
            } else {
                room['board'].partnerCard = "XIX";
            }

            if (shouldTrainAI) {
                if (Deck.handContainsCard(currentHand, 'XIX')) {
                    //Player had a choice
                    room.players[pn].trainPersonalizedAI(room, pn, 11, 12, null, room.board.partnerCard == 'XIX' ? 1 : 0);
                    room.players[pn].trainPersonalizedAI(room, pn, 11, 13, null, room.board.partnerCard == 'XIX' ? 0 : 1);
                }
            }


            for (let i=0; i<4; i++) {
                room['players'][i].isTeamPovinnost = Deck.handContainsCard(room['players'][i].hand, room['board'].partnerCard);
            }
            room['players'][room['board'].povinnost].isTeamPovinnost = true;
            room['players'][room['board'].povinnost].publicTeam = 1;

            let numTrumpsInHand = 0;
            for (let i in currentHand) {
                if (currentHand[i].suit == "Trump") { numTrumpsInHand++;}
            }
            if (numTrumpsInHand <= 2 && room.board.prever == -1) {
                action.action = 'povinnostBidaUniChoice';
            } else {
                action.action = 'moneyCards';
            }

            //Inform players what Povinnost called
            room.informPlayers('(Povinnost) is playing with the ' + room['board'].partnerCard, MESSAGE_TYPE.PARTNER, {youMessage: 'You are playing with the ' + room['board'].partnerCard, pn: pn},pn);
            room.board.importantInfo.partnerCard = room.board.partnerCard;
            actionTaken = true;
            break;
        case 'valat':
            if (shouldTrainAI) {
                room.players[pn].trainPersonalizedAI(room, pn, 12, 9, null, action.info.valat ? 1 : 0);
            }
            if (action.info.valat) {
                //Player called valat
                room['board'].valat = pn;
                room.informPlayers('called valat', MESSAGE_TYPE.VALAT, {pn: pn},pn);
                room.board.importantInfo.valat = pn+1;
                if (room.board.playingPrever) {
                    action.action = 'preverValatContra';
                    if (room.board.prever != pn) {
                        //Opposing team called valat. Prever may contra.
                        action.player = room.board.prever;
                    } else {
                        //Prever called valat. Non-prever team calls contra
                        action.player = (room.board.prever+1)%4;
                    }
                } else {
                    action.action = 'valatContra';
                    if (room.players[pn].isTeamPovinnost) {
                        //Povinnost team called valat. Non-povinnost team calls contra
                        action.player = (room['board'].povinnost+1)%4;
                        if (room.players[action.player].isTeamPovinnost) {
                            action.player = (action.player+1)%4;
                        }
                    } else {
                        //Non-povinnost team called valat. Povinnost team calls contra
                        action.player = room['board'].povinnost;
                    }
                }
                room.board.firstContraPlayer = action.player;
            } else {
                action.player = (pn + 1) % 4;
                if (action.player == room['board'].povinnost) {
                    action.player = findTheI(room.players);
                    action.action = 'iote';
                }
            }
            actionTaken = true;
            //Possible variations: IOTE may still be allowed in a valat game, contra may be disallowed
            break;
        case 'iote':
            if (shouldTrainAI) {
                room.players[pn].trainPersonalizedAI(room, pn, 13, 10, null, action.info.iote ? 1 : 0);
            }
            if (action.info.iote) {
                room.informPlayers('called the I on the end', MESSAGE_TYPE.IOTE, {pn: pn},pn);
                room.board.iote = pn;
                room.board.importantInfo.iote = pn+1;
            }
            actionTaken = true;
            if (room.board.playingPrever) {
                //Non-prever team calls contra
                action.action = 'preverContra'
                action.player = (room.board.prever+1)%4;
            } else {
                //Non-povinnost team calls contra
                action.action = 'contra';
                action.player = (room['board'].povinnost+1)%4;
                if (room.players[action.player].isTeamPovinnost) {
                    action.player = (action.player+1)%4;
                }
            }
            room.board.firstContraPlayer = action.player;
            break;
        case 'preverContra':
            /* TODO:
                input: 17. output: 5, rhea 6, supra 7
                AI should be trained to both call and avoid calling contra in all cases
                if (shouldTrainAI) {
                    room.players[pn].trainPersonalizedAI(room, pn, actionNumber, outputNumber, cardPrompt, value);
                }
            */
            let preverIsPovinnost = room.board.prever == room.board.povinnost;
            //If preverIsPovinnost, then isTeamPovinnost is isTeamPrever and no changes must be made
            //If !preverIsPovinnost, then isTeamPovinnost is prever and the roles must be reversed
            //(isTeamPovinnost == preverIsPovinnost): isTeamPrever
            //Note that contra[0] will be opposing team, not necessarily non-povinnost team. Opposing team will be non-prever team in this case
            if (action.info.contra) {
                if (room.players[pn].isTeamPovinnost == preverIsPovinnost) {
                    //Povinnost's team called rhea-contra
                    room['board'].contra[1] = 1;
                    room.board.rheaContra = pn;

                    //Swap play to opposing team
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovinnost == preverIsPovinnost);
                    room.board.firstContraPlayer = action.player;
                } else {
                    //Not-povinnost's team called either contra or supra-contra
                    if (room.board.contra[0] == -1) {
                        //Regular contra
                        room.board.contra[0] = 1;
                        room.board.calledContra = pn;

                        //Swap play to opposing team
                        do {
                            action.player = (action.player+1)%4;
                        } while (!(room.players[action.player].isTeamPovinnost == preverIsPovinnost));
                        room.board.firstContraPlayer = action.player;
                    } else {
                        //Supra-contra. No more contras can be called
                        room.board.contra[0] = 2;
                        room.board.supraContra = pn;
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                }
                room.informPlayers('called contra', MESSAGE_TYPE.CONTRA, {pn: pn}, pn);
            } else {
                if (room.players[pn].isTeamPovinnost == preverIsPovinnost) {
                    //Chance to call rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (!(room.players[action.player].isTeamPovinnost == preverIsPovinnost));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                } else {
                    //Either no one has called contra or prever's team has called rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while ((room.players[action.player].isTeamPovinnost == preverIsPovinnost));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                }
            }
            actionTaken = true;
            break;
        case 'valatContra':
            //Fallthrough because, strangely enough, valatContra and preverValatContra have the same logic
            //This is because preverValatContra does not care who prever is, only who povinnost's team is and which team called valat
        case 'preverValatContra':
            //Because why shouldn't prever call valat and then the opponents call contra?
            let povinnostIsValat = room.players[room.board.valat].isTeamPovinnost;
            //Note that prever would be allowed to call contra first if the opposing team for some reason called valat
            //If prever called valat, then the opposing team is allowed to call contra
            //isTeamThatDidn'tCallValat = povinnostIsValat == isTeamContra
            if (action.info.contra) {
                if (room.players[pn].isTeamPovinnost == povinnostIsValat) {
                    //Povinnost's team called rhea-contra
                    room['board'].contra[1] = 1;
                    room.board.rheaContra = pn;
                    room.players[pn].publicTeam = 1;

                    //Swap play to opposing team
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovinnost == povinnostIsValat);
                    room.board.firstContraPlayer = action.player;
                } else {
                    //Not-povinnost's team called either contra or supra-contra
                    if (room.board.contra[0] == -1) {
                        //Regular contra
                        room.board.contra[0] = 1;
                        room.board.calledContra = pn;
                        room.players[pn].publicTeam = -1;

                        //Swap play to opposing team
                        do {
                            action.player = (action.player+1)%4;
                        } while (!(room.players[action.player].isTeamPovinnost == povinnostIsValat));
                        room.board.firstContraPlayer = action.player;
                    } else {
                        //Supra-contra. No more contras can be called
                        room.board.contra[0] = 2;
                        room.board.supraContra = pn;
                        room.players[pn].publicTeam = -1;
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                }
                room.informPlayers('called contra', MESSAGE_TYPE.CONTRA, {pn: pn},pn);
            } else {
                if (room.players[pn].isTeamPovinnost == povinnostIsValat) {
                    //Chance to call rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (!(room.players[action.player].isTeamPovinnost == povinnostIsValat));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                } else {
                    //Either no one has called contra or prever's team has called rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while ((room.players[action.player].isTeamPovinnost == povinnostIsValat));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                }
            }
            actionTaken = true;
            break;
        case 'contra':
            if (action.info.contra) {
                if (room.players[pn].isTeamPovinnost) {
                    //Povinnost's team called rhea-contra
                    room['board'].contra[1] = 1;
                    room.board.rheaContra = pn;
                    room.players[pn].publicTeam = 1;

                    //Swap play to opposing team
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovinnost);
                    room.board.firstContraPlayer = action.player;
                } else {
                    //Not-povinnost's team called either contra or supra-contra
                    if (room.board.contra[0] == -1) {
                        //Regular contra
                        room.board.contra[0] = 1;
                        room.board.calledContra = pn;
                        room.players[pn].publicTeam = -1;

                        //Swap play to opposing team
                        do {
                            action.player = (action.player+1)%4;
                        } while (!room.players[action.player].isTeamPovinnost);
                        room.board.firstContraPlayer = action.player;
                    } else {
                        //Supra-contra. No more contras can be called
                        room.board.contra[0] = 2;
                        room.board.supraContra = pn;
                        room.players[pn].publicTeam = -1;
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                }
                room.informPlayers('called contra', MESSAGE_TYPE.CONTRA, {pn: pn},pn);
            } else {
                if (room.players[pn].isTeamPovinnost) {
                    //Chance to call rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (!room.players[action.player].isTeamPovinnost);
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                } else {
                    //Either no one has called contra or povinnost's team has called rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovinnost);
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povinnost;
                        room.board.leadPlayer = room['board'].povinnost;
                    }
                }
            }
            actionTaken = true;
            break;
        case 'lead':
            room.board.importantInfo.contra = Math.pow(2,
                ~room.board.contra[0] ? room.board.contra[0] +
                (~room.board.contra[1] ? room.board.contra[1] : 0) : 0);
            let cardToLead = action.info.card;
            let lead = false;
            if (cardToLead && cardToLead.suit && cardToLead.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == cardToLead.suit && room['players'][pn].hand[i].value == cardToLead.value) {
                        lead = room['players'][pn].hand.splice(i, 1)[0];
                        break;
                    }
                }
            }
            if (lead) {
                if (shouldTrainAI) {
                    for (let i in room.players[pn].hand) {
                        room.players[pn].trainPersonalizedAI(room, pn, 18, 1, room.players[pn].hand[i], 0);
                    }
                    room.players[pn].trainPersonalizedAI(room, pn, 18, 1, lead, 1);
                }
                actionTaken = true;
                shouldReturnTable = true;
                action.action = 'follow';
                action.player = (action.player + 1) % 4;
                room['board'].table.push({'card':lead,'pn':pn,'lead':true});
                room['board'].leadCard = lead;
                room.board.cardsPlayed[Deck.cardId(lead, room.settings.aceHigh)] = true;
                room.informPlayers('lead the ' + lead.value + ' of ' + lead.suit, MESSAGE_TYPE.LEAD, {pn: pn, card: lead},pn);
                if (lead.value == room.board.partnerCard) {
                    room.players[pn].publicTeam = 1;
                    for (let i in room.players) {
                        if (room.players[i].publicTeam == 0) {
                            room.players[i].publicTeam = -1;
                        }
                    }
                }
            } else {
                if (room['players'][pn].type == PLAYER_TYPE.HUMAN) {
                    SOCKET_LIST[room['players'][pn].socket].emit('failedLeadCard', cardToLead);
                }
                if (cardToLead && cardToLead.suit && cardToLead.value) {
                    SERVER.warn('Player ' + pn + ' failed to lead the ' + action.info.card.value + ' of ' + action.info.card.suit,room.name);
                }
                SERVER.warn('Failed to lead. Cards in hand: ' + JSON.stringify(room['players'][pn].hand),room.name);
            }
            break;
        case 'follow':
            //Note that the card was verified playable by the socket.on function
            let cardToPlay = action.info.card;
            let played = false;
            if (cardToPlay && cardToPlay.suit && cardToPlay.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == cardToPlay.suit && room['players'][pn].hand[i].value == cardToPlay.value) {
                        played = room['players'][pn].hand.splice(i, 1)[0];
                        break;
                    }
                }
            }
            if (played) {
                if (shouldTrainAI) {
                    for (let i in room.players[pn].hand) {
                        room.players[pn].trainPersonalizedAI(room, pn, 19, 1, room['players'][pn].hand[i], 0);
                    }
                    room.players[pn].trainPersonalizedAI(room, pn, 19, 1, played, 1);
                }
                actionTaken = true;
                shouldReturnTable = true;
                room['board'].table.push({'card':played,'pn':pn,'lead':false});
                action.player = (action.player + 1) % 4;
                room.board.cardsPlayed[Deck.cardId(played, room.settings.aceHigh)] = true;
                room.informPlayers('played the ' + played.value + ' of ' + played.suit, MESSAGE_TYPE.PLAY, {pn: pn, card: played}, pn);
                if (played.value == room.board.partnerCard) {
                    room.players[pn].publicTeam = 1;
                    for (let i in room.players) {
                        if (room.players[i].publicTeam == 0) {
                            room.players[i].publicTeam = -1;
                        }
                    }
                }
                //If all players have played a card, determine who won the trick
                if (action.player == room.board.leadPlayer) {
                    action.action = 'winTrick';
                    let trickCards = [];
                    for (let i in room.board.table) {
                        trickCards.push(room.board.table[i].card);
                    }
                    let trickWinner = whoWon(trickCards, room.board.leadPlayer, room.settings.aceHigh);
                    action.player = trickWinner;
                    room.informPlayers( 'won the trick', MESSAGE_TYPE.WINNER, {pn: trickWinner},trickWinner);
                }
            } else {
                if (players[pn].type != PLAYER_TYPE.HUMAN) {
                    SERVER.errorTrace('Robot attempted to play illegal card',room.name);
                    SERVER.error(JSON.stringify(cardToPlay),room.name);
                    SERVER.error('Cards in hand: ' + JSON.stringify(room['players'][pn].hand),room.name);
                    break;
                }
                players[room['players'][pn].socket].socket.emit('failedPlayCard', cardToPlay);
                if (cardToPlay && cardToPlay.suit && cardToPlay.value) {
                    SERVER.warn('Player ' + pn + ' failed to play the ' + action.info.card.value + ' of ' + action.info.card.suit,room.name);
                }
                SERVER.warn(JSON.stringify(cardToPlay),room.name);
                SERVER.warn('Failed to follow. Cards in hand: ' + JSON.stringify(room['players'][pn].hand),room.name);
            }
            break;
        case 'winTrick':
            //Separated so the table would return separately
            actionTaken = true;
            shouldReturnTable = true;

            if (room.players[pn].hand.length == 0 || (room.board.trickWinCount[0] + room.board.trickWinCount[1] == 11)) {
                SERVER.debug('Last trick');
                //Last trick. Check if the I is present
                let I = false;
                let otherTrump = false;
                for (let i in room.board.table) {
                    if (room.board.table[i].card.value == 'I') {
                        //IOTE
                        I = true;
                    } else if (room.board.table[i].card.suit == 'Trump') {
                        //I has been captured
                        otherTrump = true;
                    }
                }
                if (I) {
                    //Positive = povinnost's team, negative = opposing
                    if (room.players[room.board.hasTheI].isTeamPovinnost) {
                        //Povinnost's team played the I
                        if (otherTrump) {
                            room.board.ioteWin = -1;
                        } else {
                            room.board.ioteWin = 1;
                        }
                    } else {
                        //Opposing team played the I
                        if (otherTrump) {
                            room.board.ioteWin = 1;
                        } else {
                            room.board.ioteWin = -1;
                        }
                    }
                }
            }

            room.board.trickHistory.push(
                {
                    leadPlayer: room.board.leadPlayer,
                    winner: pn,
                    cards: [
                        {suit:room.board.table[0].suit, value:room.board.table[0].value},
                        {suit:room.board.table[1].suit, value:room.board.table[1].value},
                        {suit:room.board.table[2].suit, value:room.board.table[2].value},
                        {suit:room.board.table[3].suit, value:room.board.table[3].value}
                    ]
                }
            );

            //Transfer the table to the winner's discard
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.board.table = [];

            if (room.players[pn].isTeamPovinnost) {
                room.board.trickWinCount[0]++;
            } else {
                room.board.trickWinCount[1]++;
            }
            room.board.leadPlayer = pn;
            action.action = 'lead';

            //If players have no more cards in hand, count points
            if (room.players[action.player].hand.length == 0) {
                action.action = 'countPoints';
                action.player = room.board.povinnost;
            }
            break;
        case 'countPoints':
            let pointCountMessageTable = [];
            let chipsOwed = 0;
            //Called valat
            if (room.board.valat != -1) {
                //Possible settings: room.settings.valat * 2

                if (room.players[room.board.valat].isTeamPovinnost) {
                    //Povinnost's team called valat
                    if (room.board.trickWinCount[1] > 0) {
                        //Opposing team won a trick
                        chipsOwed = -40;
                        if (room.board.prever != -1) {
                            chipsOwed = -60;
                        }
                        pointCountMessageTable.push({'name':'Failed a Called Valat', 'value':Math.abs(chipsOwed)});
                    } else {
                        chipsOwed = 40;
                        if (room.board.prever != -1) {
                            chipsOwed = 60;
                        }
                        pointCountMessageTable.push({'name':'Won a Called Valat', 'value':chipsOwed});
                    }
                } else {
                    //Opposing team called valat
                    if (room.board.trickWinCount[0] > 0) {
                        //Povinnost team won a trick
                        chipsOwed = 40;
                        if (room.board.prever != -1) {
                            chipsOwed = 60;
                        }
                        pointCountMessageTable.push({'name':'Failed a Called Valat', 'value':chipsOwed});
                    } else {
                        chipsOwed = -40;
                        if (room.board.prever != -1) {
                            chipsOwed = -60;
                        }
                        pointCountMessageTable.push({'name':'Won a Called Valat', 'value':Math.abs(chipsOwed)});
                    }
                }

            } else {
                //No valat called

                //Combine discard piles
                let povinnostTeamDiscard = [];
                let opposingTeamDiscard = [];
                for (let i in room.players) {
                    if (room.players[i].isTeamPovinnost) {
                        for (let j = room.players[i].discard.length-1; j >= 0; j--) {
                            povinnostTeamDiscard.push(room.players[i].discard.splice(0,1)[0]);
                        }
                    } else {
                        for (let j = room.players[i].discard.length-1; j >= 0; j--) {
                            opposingTeamDiscard.push(room.players[i].discard.splice(0,1)[0]);
                        }
                    }
                }
                if (room.board.trickWinCount[0] == 0 || room.board.trickWinCount[1] == 0) {
                    //Uncalled valat
                    //Possible settings: room.settings.valat
                    if (room.board.trickWinCount[1] == 0) {
                        //Povinnost's team valat'd
                        chipsOwed = 20;
                        if (room.board.prever != -1) {
                            chipsOwed = 30;
                        }
                        pointCountMessageTable.push({'name':'Valat', 'value':chipsOwed});
                    } else {
                        //Opposing team valat'd
                        chipsOwed = -20;
                        if (room.board.prever != -1) {
                            chipsOwed = -30;
                        }
                        pointCountMessageTable.push({'name':'Valat', 'value':Math.abs(chipsOwed)});
                    }

                } else {
                    //No valat
                    let povinnostTeamPoints = 0;
                    let opposingTeamPoints = 0;
                    for (let i in povinnostTeamDiscard) {
                        povinnostTeamPoints += Deck.pointValue(povinnostTeamDiscard[i]);
                    }
                    for (let i in opposingTeamDiscard) {
                        opposingTeamPoints += Deck.pointValue(opposingTeamDiscard[i]);
                    }
                    pointCountMessageTable.push({'name':'Povinnost Team Points', 'value':povinnostTeamPoints});
                    pointCountMessageTable.push({'name':'Opposing Team Points', 'value':opposingTeamPoints});

                    //Sanity check
                    if (povinnostTeamPoints + opposingTeamPoints != 106) {
                        SERVER.debug('-------------------------',room.name)
                        SERVER.error('Error: incorrect number of points\nPovinnost team: ' + povinnostTeamPoints + '\nOpposing team: ' + opposingTeamPoints,room.name);
                        SERVER.debug(JSON.stringify(povinnostTeamDiscard),room.name);
                        SERVER.debug(JSON.stringify(opposingTeamDiscard),room.name);
                        //Time to search anywhere and everywhere for the missing cards
                        SERVER.debug('Hands: ',room.name)
                        for (let i in room.players) {
                            SERVER.debug(JSON.stringify(room.players[i].hand),room.name)
                        }
                        SERVER.debug('Discard: ',room.name)
                        for (let i in room.players) {
                            SERVER.debug(JSON.stringify(room.players[i].discard),room.name)
                        }
                        SERVER.debug('TempHands: ',room.name)
                        for (let i in room.players) {
                            SERVER.debug(JSON.stringify(room.players[i].tempHand),room.name)
                        }
                        SERVER.debug('Talon: ',room.name);
                        SERVER.debug(JSON.stringify(room.board.talon),room.name);
                        SERVER.debug('Prever talon:',room.name);
                        SERVER.debug(JSON.stringify(room.board.preverTalon),room.name);
                        SERVER.debug('Table: ',room.name);
                        SERVER.debug(JSON.stringify(room.board.table),room.name);
                        SERVER.debug('Deck: ',room.name);
                        SERVER.debug(JSON.stringify(room.deck) + '\n',room.name);
                        //Check which cards are missing from the team point piles
                        let combinedPointPile = [];
                        for (let c in povinnostTeamDiscard) {
                            combinedPointPile.push(povinnostTeamDiscard[c]);
                        }
                        for (let c in opposingTeamDiscard) {
                            combinedPointPile.push(opposingTeamDiscard[c]);
                        }
                        for (let i in baseDeck) {
                            let found = false;
                            //Find the matching card in combinedPointPile
                            for (let j in combinedPointPile) {
                                if (baseDeck[i].suit == combinedPointPile[j].suit &&
                                    baseDeck[i].value == combinedPointPile[j].value) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                SERVER.debug('Card ' + baseDeck[i].value + ' of ' + baseDeck[i].suit + ' was not found',room.name);
                                SERVER.debug('Point value: ' + Deck.pointValue(baseDeck[i]),room.name);
                            }
                        }
                        SERVER.debug('-------------------------',room.name)
                    }

                    chipsOwed = 53 - opposingTeamPoints;//Positive: opposing team pays. Negative: povinnost team pays
                    pointCountMessageTable.push({'name':'Distance from 53', 'value':Math.abs(chipsOwed)});
                    if (chipsOwed > 0) {
                        chipsOwed += 10;
                    } else {
                        chipsOwed -= 10;
                    }
                    pointCountMessageTable.push({'name':'Add Ten', 'value':Math.abs(chipsOwed)});
                    if (room.board.playingPrever) {
                        //Multiply by 3 instead of 2
                        chipsOwed *= 3;
                        pointCountMessageTable.push({'name':'Triple It', 'value':Math.abs(chipsOwed)});
                    } else {
                        chipsOwed *= 2;
                        pointCountMessageTable.push({'name':'Double It', 'value':Math.abs(chipsOwed)});
                    }
                    chipsOwed /= 10;
                    chipsOwed = (chipsOwed < 0) ? -Math.round(Math.abs(chipsOwed)) : Math.round(chipsOwed);
                    pointCountMessageTable.push({'name':'Round to Nearest Ten', 'value':Math.abs(chipsOwed)});

                    if (room.board.playingPrever && room.players[room.board.prever].isTeamPovinnost == (chipsOwed < 0)) {
                        //Prever lost
                        chipsOwed *= room.board.preverMultiplier;//*2 for swapping down, *4 for going back up
                        pointCountMessageTable.push({'name':'Double It For Each Prever-Talon Swap', 'value':Math.abs(chipsOwed)});
                    }

                    if (room.board.contra[0] != -1) {
                        //*2 for one contra, *4 for two
                        chipsOwed *= Math.pow(2,room.board.contra[0]);
                        pointCountMessageTable.push({'name':'Contra', 'value':Math.abs(chipsOwed)});
                    }
                    if (room.board.contra[1] != -1) {
                        chipsOwed *= Math.pow(2,room.board.contra[1]);
                        pointCountMessageTable.push({'name':'Contra again', 'value':Math.abs(chipsOwed)});
                    }

                    if (room.board.iote != -1 || room.board.ioteWin != 0) {
                        //IOTE payout
                        if (room.board.iote != -1) {
                            //I was called
                            if (room.board.ioteWin == 1) {
                                //Povinnost team called and won the IOTE
                                chipsOwed += 4;
                            } else if (room.board.ioteWin == -1) {
                                chipsOwed -= 4;
                            } else {
                                //Nobody played the I but it was called
                                chipsOwed += 4 * (room.players[room.board.iote].isTeamPovinnost ? -1 : 1);
                            }
                        } else {
                            //Not called but played on the last trick
                            if (room.board.ioteWin == -1) {
                                chipsOwed -= 2;
                            } else {
                                chipsOwed += 2;
                            }
                        }
                        pointCountMessageTable.push({'name':'I on the End', 'value':Math.abs(chipsOwed)});
                    }
                }
                //Possible setting: IOTE and VALAT in the same game
            }
            let team1Players = [];
            let team2Players = [];
            for (let i in room.players) {
                if (room.players[i].isTeamPovinnost) {
                    team1Players.push(room.players[i]);
                    team1Players[team1Players.length - 1].pn = i;
                } else {
                    team2Players.push(room.players[i]);
                    team2Players[team2Players.length - 1].pn = i;
                }
            }
            for (let i in team1Players) {
                let tempChipsOwed = chipsOwed;
                if (team1Players.length == 1) {tempChipsOwed*=3;}
                team1Players[i].chips += tempChipsOwed;
            }
            for (let i in team2Players) {
                let tempChipsOwed = chipsOwed;
                if (team2Players.length == 1) {tempChipsOwed*=3;}
                team2Players[i].chips -= tempChipsOwed;
            }
            if (room.players[0].chips + room.players[1].chips + room.players[2].chips + room.players[3].chips != 400) {
                SERVER.error('Incorrect chip count! Total count: ' + (room.players[0].chips + room.players[1].chips + room.players[2].chips + room.players[3].chips),room.name)
                SERVER.debug( 'Player 1: ' + room.players[0].chips,room.name)
                SERVER.debug( 'Player 2: ' + room.players[1].chips,room.name)
                SERVER.debug( 'Player 3: ' + room.players[2].chips,room.name)
                SERVER.debug( 'Player 4: ' + room.players[3].chips,room.name)
            }

            for (let i in team1Players) {
                let tempChipsOwed = chipsOwed;
                if (team1Players.length == 1) { tempChipsOwed *= 3; }
                if (tempChipsOwed < 0) {
                    room.informPlayer(team1Players[i].pn, 'Your team lost ' + (-tempChipsOwed) + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
                } else {
                    room.informPlayer(team1Players[i].pn, 'Your team won ' + tempChipsOwed + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
                }
            }

            for (let i in team2Players) {
                let tempChipsOwed = chipsOwed;
                if (team2Players.length == 1) { tempChipsOwed *= 3; }
                if (tempChipsOwed < 0) {
                    room.informPlayer(team2Players[i].pn, 'Your team won ' + (-tempChipsOwed) + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
                } else {
                    room.informPlayer(team2Players[i].pn, 'Your team lost ' + tempChipsOwed + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
                }
            }


            for (let i in room['players']) {
                room.board.importantInfo.chips = {
                    '0': room.players[0].chips,
                    '1': room.players[1].chips,
                    '2': room.players[2].chips,
                    '3': room.players[3].chips
                }
            }

            room.informPlayers(room.board.notation + room.settingsNotation, MESSAGE_TYPE.NOTATION, {povinnost: room.board.povinnost});
            for (let i in players) {
                if (players[i].socket != -1) {
                    returnToGame[players[i].socket] = false;
                }
            }

            actionTaken = true;

            if (room.type == ROOM_TYPE.CHALLENGE) {
                let humanPN = 0;
                for (let i in room.players) {
                    if (room.players[i].type == PLAYER_TYPE.HUMAN) {
                        humanPN = i;
                        break;
                    }
                }
                SOCKET_LIST[room.players[humanPN].socket].emit('challengeComplete',room.players[humanPN].chips - 100);
                challenge.complete(players[room.players[humanPN].socket].username, room.players[humanPN].chips - 100);
                for (let i in SOCKET_LIST) {
                    SOCKET_LIST[i].emit('returnPlayerCount', numOnlinePlayers, challenge.leaderboard, challenge.retryLeaderboard);
                }
                action.action = 'retry';
                action.player = humanPN;
            } else {
                action.action = 'resetBoard';
            }

            break;
        case 'resetBoard':
            //Reset everything for between matches. The board's properties, the players' hands, povinnost alliances, moneyCards, etc.
            //Also, iterate povinnost by 1
            if (room.players[pn].type == PLAYER_TYPE.HUMAN) {
                if (SOCKET_LIST[room.players[pn].socket] && room.players[pn].savePoints > 0) {
                    SOCKET_LIST[room.players[pn].socket].emit('returnSavePoints',room.players[pn].savePoints,playerPerspective(room.board.povinnost,pn));
                    room.players[pn].savePoints = [];
                }
            }
            action.player = (action.player+1)%4;
            if (action.player == room.board.povinnost) {
                room.resetForNextRound()
                action.player = room['board'].povinnost;//already iterated
                action.action = 'play';
            }
            actionTaken = true;
            break;
        case 'retry':
            //haha do nothing
            break;
        default:
            SERVER.warn('Unrecognized actionCallback: ' + action.action,room.name);
            SERVER.trace('',room.name);
    }
    action.info = {};

    if (shouldReturnTable) {
        for (let i=0; i<4; i++) {
            if (room.players[i].type == PLAYER_TYPE.HUMAN) {
                SOCKET_LIST[room['players'][i].socket].emit('returnTable', room.board.table);
            }
        }
        for (let i in room.audience) {
            if (room.audience[i].messenger) {
                room.audience[i].messenger.emit('returnTable', room.board.table);
            }
        }
    }

    if (actionTaken) {

        //Sanity Check
        if (!room['players'][action.player]) { SERVER.error('There is no player. PN: ' + action.player,room.name); }
        if (action.player > 3 || action.player < 0) {SERVER.error('Illegal player number: ' + action.player + ' during action ' + action.action,room.name); action.player+=4;action.player %= 4; }

        action.time = Date.now();
        playerType = room['players'][action.player].type;

        //Prepare for auto-action if no response is given
        if (autoActionTimeout) {
            clearTimeout(autoActionTimeout);
        }
        if (room.settings.timeout > 0) {
            autoActionTimeout = setTimeout(autoAction, room.settings.timeout, action, room, action.player);
            room.autoAction = autoActionTimeout;
        }


        room.board.importantInfo.usernames = {'0':null, '1':null, '2':null, '3':null};
        for (let i in room.players) {
            if (room.players[i].socket != -1 && players[room.players[i].socket].username != 'Guest') {
                room.board.importantInfo.usernames[i] = players[room.players[i].socket].username;
            }
        }

        for (let i in room.players) {
            if (room['players'][i].type == PLAYER_TYPE.HUMAN && SOCKET_LIST[room['players'][i].socket]) {
                //Return hands
                SOCKET_LIST[room['players'][i].socket].emit('returnHand', Deck.sortCards(room['players'][i].hand, room.settings.aceHigh), false);
                //Return important info
                room.board.importantInfo.pn = (+i+1);
                SOCKET_LIST[room['players'][i].socket].emit('returnRoundInfo',room.board.importantInfo);
                room.board.importantInfo.pn = null;
            }
        }
        for (let i in room.audience) {
            if (room.audience[i].messenger) {
                room.audience[i].messenger.emit('returnRoundInfo',room.board.importantInfo);
            }
        }

        //Prompt the next action
        if (playerType == PLAYER_TYPE.HUMAN) {
            playerAction(action, room, action.player);
        } else if (playerType == PLAYER_TYPE.ROBOT) {
            robotAction(action, room, action.player);
        } else if (playerType == PLAYER_TYPE.AI) {
            aiAction(action, room, action.player);
        }
    }
}

function broadcast(message) {
    for (let i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('broadcast', message);
    }
}//Debug function

function disconnectPlayerTimeout(socketId) {
    if (players[socketId] && players[socketId].tempDisconnect) {
        if (!players[socketId]) { return; }
        SERVER.log('Player ' + socketId + ' disconnected');
        if (~players[socketId].room) {
            if (rooms[players[socketId].room].audience[socketId]) {
                rooms[players[socketId].room].audience[socketId] = null;
                delete rooms[players[socketId].room].audience[socketId];
                rooms[players[socketId].room].audienceCount--;
            } else {
                rooms[players[socketId].room]['players'][players[socketId].pn].type = PLAYER_TYPE.ROBOT;
                rooms[players[socketId].room]['players'][players[socketId].pn].socket = -1;
                rooms[players[socketId].room]['players'][players[socketId].pn].pid = -1;
                rooms[players[socketId].room]['playerCount'] = rooms[players[socketId].room]['playerCount'] - 1;
                if (rooms[players[socketId].room]['playerCount'] > 0 && rooms[players[socketId].room]['host'] == socketId) {
                    for (let i in rooms[players[socketId].room]['players']) {
                        if (rooms[players[socketId].room]['players'][i].pn == PLAYER_TYPE.HUMAN) {
                            rooms[players[socketId].room]['host'] = rooms[players[socketId].room]['players'][i].socket;
                            players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost'); break;
                        }
                    }
                }
                if (rooms[players[socketId].room]['playerCount'] == 0) {
                    //Delete the room
                    rooms[players[socketId].room].ejectAudience();
                    clearTimeout(rooms[players[socketId].room].autoAction);
                    SERVER.log('Game Ended. Closing the room.',players[socketId].room);
                    delete rooms[players[socketId].room];
                } else {
                    rooms[players[socketId].room].informPlayers('disconnected',MESSAGE_TYPE.DISCONNECT,{},players[socketId].pn);
                    if (rooms[players[socketId].room].board.nextStep.player == players[socketId].pn) {
                        //Player was supposed to take an action
                        autoAction(rooms[players[socketId].room].board.nextStep, rooms[players[socketId].room], players[socketId].pn)
                    }
                }
            }
        }
        try {
            SOCKET_LIST[socketId].disconnect();
        } catch (ignore) {}
        numOnlinePlayers--;
        delete players[socketId];
        delete SOCKET_LIST[socketId];

    } else {
        SERVER.debug('Player ' + socketId + ' didn\'t disconnect after all');
    }
}

function autoReconnect(socketId) {
    let reconnectInfo = {};
    reconnectInfo.playerCount = numOnlinePlayers;
    if (rooms[players[socketId].room]) {
        if (rooms[players[socketId].room].audience[socketId]) {
            //Player is in the audience for the room
            reconnectInfo.audienceConnected = players[socketId].room;
            reconnectInfo.roundInfo = rooms[players[socketId].room]['board'].importantInfo;
        } else {
            //Player is playing in the room
            reconnectInfo.roomConnected = players[socketId].room;
            reconnectInfo.pn = players[socketId].pn;
            reconnectInfo.host = {number: players[rooms[players[socketId].room].host].pn, name: rooms[players[socketId].room].name, joinCode: rooms[players[socketId].room].joinCode};
            if (rooms[players[socketId].room]['board']['nextStep'].action == 'discard') {
                Deck.grayUndiscardables(rooms[players[socketId].room].players[players[socketId].pn].hand);
                reconnectInfo.hand = [...Deck.sortCards(rooms[players[socketId].room].players[players[socketId].pn].hand, rooms[players[socketId].room].settings.aceHigh)];
                reconnectInfo.withGray = true;
            } else if (rooms[players[socketId].room]['board']['nextStep'].action == 'follow') {
                Deck.grayUnplayables(rooms[players[socketId].room].players[players[socketId].pn].hand, rooms[players[socketId].room].board.leadCard);
                reconnectInfo.hand = [...Deck.sortCards(rooms[players[socketId].room].players[players[socketId].pn].hand, rooms[players[socketId].room].settings.aceHigh)];
                reconnectInfo.withGray = true;
            } else {
                Deck.unGrayCards(rooms[players[socketId].room].players[players[socketId].pn].hand);
                reconnectInfo.hand = [...Deck.sortCards(rooms[players[socketId].room].players[players[socketId].pn].hand, rooms[players[socketId].room].settings.aceHigh)];
                reconnectInfo.withGray = false;
            }
            rooms[players[socketId].room]['board'].importantInfo.pn = (+players[socketId].pn+1);
            reconnectInfo.roundInfo = structuredClone(rooms[players[socketId].room]['board'].importantInfo);
            rooms[players[socketId].room]['board'].importantInfo.pn = null;
            if (!isNaN(rooms[players[socketId].room].povinnost)) {
                rooms[players[socketId].room].informPlayer(players[socketId].pn, 'Player ' + (rooms[players[socketId].room].povinnost+1) + ' is povinnost', MESSAGE_TYPE.POVINNOST,{'pn':rooms[players[socketId].room].povinnost});
            }
        }
        reconnectInfo.settings = rooms[players[socketId].room].settings;
        if (rooms[players[socketId].room].board.nextStep.action != 'shuffle') {
            reconnectInfo.table = rooms[players[socketId].room].board.table;
        }
        if (!SENSITIVE_ACTIONS[rooms[players[socketId].room]['board']['nextStep'].action]) {
            reconnectInfo.nextAction = rooms[players[socketId].room]['board']['nextStep'];
        }
        reconnectInfo.playersInGame = rooms[players[socketId].room].playersInGame;
        reconnectInfo.povinnost = rooms[players[socketId].room].board.povinnost;
    }
    if (players[socketId].username != 'Guest') {
        reconnectInfo.username = players[socketId].username;
        reconnectInfo.dailyChallengeScore = challenge.getUserScore(players[socketId].username);
        if (players[socketId].userInfo) {
            reconnectInfo.elo = players[socketId].userInfo.elo;
            reconnectInfo.admin = players[socketId].userInfo.admin;
            reconnectInfo.defaultSettings = notationToObject(players[socketId].userInfo.settings);
        }
    }
    reconnectInfo.leaderboard = challenge.leaderboard;
    reconnectInfo.retryLeaderboard = challenge.retryLeaderboard;
    SOCKET_LIST[socketId].emit('autoReconnect', reconnectInfo);
}

function playerCanSendMessage(player) {
    const n = 1; //Can adjust rate limit server side here
    return ((Date.now() - player.timeLastMessageSent) > n * 1000);
}

io.sockets.on('connection', function (socket) {
    let socketId = socket.handshake.auth.token;
    if (socketId === undefined || isNaN(socketId) || socketId == 0 || socketId == null) {
        socket.disconnect();//Illegal socket
        return;
    }
    if (!SOCKET_LIST[socketId]) {
        SOCKET_LIST[socketId] = socket;

        players[socketId] = { 'id': socketId, 'pid': -1, 'room': -1, 'pn': -1, 'socket': socket, 'roomsSeen': {}, tempDisconnect: false, username: 'Guest', token: -1, userInfo: null, timeLastMessageSent: 0 };

        if (socket.handshake.auth.username && socket.handshake.auth.signInToken) {
            attemptSignIn(socket.handshake.auth.username, socket.handshake.auth.signInToken, socket, socketId)
        }

        SERVER.log('Player joined with socketID ' + socketId);
        SERVER.debug('Join time: ' + Date.now());
        numOnlinePlayers++;
        for (let i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('returnPlayerCount',numOnlinePlayers, challenge.leaderboard, challenge.retryLeaderboard);
        }
        if (returnToGame[socketId]) {
            SOCKET_LIST[socketId].emit('returnToGame');
        }
    }
    if (players[socketId] && players[socketId].tempDisconnect) {
        SOCKET_LIST[socketId] = socket;
        players[socketId].socket = socket;
        SERVER.debug('Player ' + socketId + ' auto-reconnected');
        players[socketId].tempDisconnect = false;
        socket.emit('message','You have been automatically reconnected');//debug
        autoReconnect(socketId);
    }

    socket.on('reconnect', function() {
        if (players[socketId]) {
            SOCKET_LIST[socketId] = socket;
            players[socketId].socket = socket;
            players[socketId].tempDisconnect = false;
            autoReconnect(socketId);
        }
    });

    socket.on('disconnect', function() {
        if (players[socketId] && !players[socketId].tempDisconnect) {
            players[socketId].tempDisconnect = true;
            players[socketId].roomsSeen = {};
            SERVER.debug('Player ' + socketId + ' may have disconnected');
            setTimeout(disconnectPlayerTimeout, DISCONNECT_TIMEOUT, socketId);
        }
    });

    socket.on('exitRoom', function() {
        if (players[socketId]) {
            if (~players[socketId].room) {
                if (rooms[players[socketId].room].audience[socketId]) {
                    rooms[players[socketId].room].audience[socketId] = null;
                    delete rooms[players[socketId].room].audience[socketId];
                    rooms[players[socketId].room].audienceCount--;
                } else {
                    SERVER.log('Player ' + socketId + ' left the room',players[socketId].room);
                    rooms[players[socketId].room]['players'][players[socketId].pn].type = rooms[players[socketId].room].settings.difficulty != DIFFICULTY.AI ? PLAYER_TYPE.ROBOT : PLAYER_TYPE.AI;
                    rooms[players[socketId].room]['players'][players[socketId].pn].socket = -1;
                    rooms[players[socketId].room]['players'][players[socketId].pn].pid = -1;
                    rooms[players[socketId].room]['playerCount'] = rooms[players[socketId].room]['playerCount'] - 1;
                    if (rooms[players[socketId].room]['playerCount'] > 0 && rooms[players[socketId].room]['host'] == socketId) {
                        for (let i in rooms[players[socketId].room]['players']) {
                            if (rooms[players[socketId].room]['players'][i].pn == PLAYER_TYPE.HUMAN) {
                                rooms[players[socketId].room]['host'] = rooms[players[socketId].room]['players'][i].socket;
                                players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost'); break;
                            }
                        }
                    }
                    if (rooms[players[socketId].room]['playerCount'] == 0) {
                        //Delete the room if no one is left in it
                        rooms[players[socketId].room].ejectAudience();
                        clearTimeout(rooms[players[socketId].room].autoAction);
                        delete rooms[players[socketId].room];
                        SERVER.log('Stopped empty game',players[socketId].room);
                    } else {
                        rooms[players[socketId].room].informPlayers('left the room',MESSAGE_TYPE.DISCONNECT,{},players[socketId].pn);
                        for (let i in rooms[players[socketId].room].players) {
                            if (rooms[players[socketId].room].players[i].messenger) {
                                rooms[players[socketId].room].players[i].messenger.emit('returnPlayersInGame', rooms[players[socketId].room].playersInGame);
                            }
                        }
                        if (rooms[players[socketId].room].board.nextStep.player == players[socketId].pn) {
                            //Player was supposed to take an action
                            autoAction(rooms[players[socketId].room].board.nextStep, rooms[players[socketId].room], players[socketId].pn)
                        }
                    }
                }
            }
            SOCKET_LIST[socketId].emit('returnRoomInfo',{});
            players[socketId]['room'] = -1;
            players[socketId]['pn'] = -1;
            players[socketId]['roomsSeen'] = {};
        }
    });

    socket.on('alive', function(callback) {
        if (players[socketId]) {
            callback(!players[socketId].tempDisconnect);//true for connected, false for disconnected
        }
    });
    socket.on('joinAudience', function(roomID) {
        let connected = false;
        if (players[socketId] && rooms[roomID] && rooms[roomID].playerCount != 0 && !rooms[roomID].settings.locked && players[socketId] && players[socketId].room == -1) {
            rooms[roomID].audience[socketId] = {messenger: socket};
            rooms[roomID].audienceCount++;
            socket.emit('audienceConnected', roomID);
            connected = true;
            autoReconnect(socketId);
        }
        if (!connected) socket.emit('audienceNotConnected', roomID);
    });
    socket.on('roomConnect', function (roomID, idIsCode) {
        let connected = false;
        if (idIsCode) {
            let codeWorked = false;
            SERVER.log('Joining by room code ' + roomID);
            roomID = roomID.toUpperCase();
            for (let i in rooms) {
                if (rooms[i].joinCode == roomID) {
                    roomID = i;
                    codeWorked = true;
                    break;
                }
            }
            if (!codeWorked) {
                SERVER.debug('This room does not exist',roomID);
                socket.emit('roomNotConnected', roomID);
                return;
            }
        }
        if (players[socketId] && rooms[roomID] && rooms[roomID]['playerCount'] < 4 && (!rooms[roomID].settings.locked || idIsCode) && players[socketId] && players[socketId].room == -1) {
            for (let i = 0; i < 4; i++) {
                if (rooms[roomID]['players'][i].type == PLAYER_TYPE.ROBOT || rooms[roomID]['players'][i].type == PLAYER_TYPE.AI) {
                    rooms[roomID]['players'][i].type = PLAYER_TYPE.HUMAN;
                    rooms[roomID]['players'][i].socket = socketId;
                    rooms[roomID]['players'][i].messenger = socket;
                    rooms[roomID]['players'][i].pid = players[socketId].pid;
                    rooms[roomID]['playerCount'] = rooms[roomID]['playerCount'] + 1;
                    socket.emit('roomConnected', roomID);
                    connected = true;
                    players[socketId]['room'] = roomID;
                    players[socketId]['pn'] = i;
                    rooms[roomID].informPlayers('joined the game', MESSAGE_TYPE.CONNECT, {}, players[socketId].pn);
                    autoReconnect(socketId);
                    if (rooms[roomID].debug) {
                        socket.emit('debugRoomJoin');
                    }
                    socket.emit('timeSync', Date.now());
                    for (let i in rooms[roomID].players) {
                        if (rooms[roomID].players[i].messenger) {
                            rooms[roomID].players[i].messenger.emit('returnPlayersInGame', rooms[roomID].playersInGame);
                        }
                    }
                    break;
                }
            }
        } else {
            SERVER.warn('Invalid attempt to connect to room',roomID);
            autoReconnect(socketId);
            if (rooms[roomID]) {
                SERVER.debug('Room contains ' + rooms[roomID]['playerCount'] + ' players',roomID);
                if (rooms[roomID].locked) {
                    SERVER.debug('Room is locked',roomID);
                }
            } else {
                SERVER.debug('This room does not exist',roomID);
            }
            if (players[socketId]) {
                SERVER.debug('Player is in room ' + players[socketId].room,roomID);
            } else {
                SERVER.debug('Player ' + socketId + ' does not exist',roomID);
            }
        }
        if (!connected) socket.emit('roomNotConnected', roomID);
    });
    socket.on('dailyChallenge', function() {
        let connected = false;
        if (players[socketId] && players[socketId].room == -1 && players[socketId].username != 'Guest') {
            let theRoom;
            {
                let i = 1;
                for (; rooms['challenge'+i]; i++) { }
                rooms['challenge'+i] = new Room({'name': 'challenge'+i, 'roomType': ROOM_TYPE.CHALLENGE});
                theRoom = rooms['challenge'+i];
            }
            let tarokyNotation = challenge.notation;
            if (notate(theRoom,tarokyNotation)) {
                let values = tarokyNotation.split('/');
                let theSettings = values[values.length - 1].split(';');
                let [setting,pn] = theSettings[theSettings.length - 1].split('=');
                if (u(setting) || u(pn) || setting != 'pn' || isNaN(pn) || pn < 0 || pn > 4) {
                    SERVER.debug('Player number not declared')
                    pn = 0;
                }
                let roomID = theRoom.name;
                rooms[roomID]['players'][pn].type = PLAYER_TYPE.HUMAN;
                rooms[roomID]['players'][pn].socket = socketId;
                rooms[roomID]['players'][pn].messenger = socket;
                rooms[roomID]['players'][pn].pid = players[socketId].pid;
                rooms[roomID]['playerCount'] = rooms[roomID]['playerCount'] + 1;
                rooms[roomID].settings = challenge.settings;
                rooms[roomID].setSettingsNotation();
                socket.emit('roomConnected', roomID);
                connected = true;
                players[socketId]['room'] = roomID;
                players[socketId]['pn'] = pn;
                rooms[roomID]['host'] = socketId;
                autoReconnect(socketId);
                socket.emit('timeSync', Date.now());

                for (let i in rooms[roomID].players) {
                    if (rooms[roomID].players[i].messenger) {
                        rooms[roomID].players[i].messenger.emit('returnPlayersInGame', rooms[roomID].playersInGame);
                    }
                }

                connected = true;

                let playerType = rooms[roomID].players[0].type;
                let action = rooms[roomID].board.nextStep;
                if (playerType == PLAYER_TYPE.HUMAN) {
                    playerAction(action, rooms[roomID], action.player);
                } else if (playerType == PLAYER_TYPE.ROBOT) {
                    robotAction(action, rooms[roomID], action.player);
                } else if (playerType == PLAYER_TYPE.AI) {
                    aiAction(action, rooms[roomID], action.player);
                }
            } else {
                SERVER.debug('Notation error');
            }
        }
        if (!connected) socket.emit('challengeNotConnected');
    });
    socket.on('newRoom', function() {
        if (players[socketId] && players[socketId].room == -1) {
            let theSettings;
            if (players[socketId].userInfo && players[socketId].userInfo.settings) {
                theSettings = notationToObject(players[socketId].userInfo.settings);
            }
            let theRoom;
            {
                let i = 1;
                for (; rooms[i]; i++) { }
                rooms[i] = new Room({'name': i, 'settings': theSettings});
                theRoom = rooms[i];
            }
            let pn = 0;
            theRoom['players'][pn].type = PLAYER_TYPE.HUMAN;
            theRoom['players'][pn].socket = socketId;
            theRoom['players'][pn].messenger = socket;
            theRoom['players'][pn].pid = players[socketId].pid;
            theRoom['playerCount'] = 1;
            socket.emit('roomConnected', theRoom.name);
            players[socketId]['room'] = theRoom.name;
            players[socketId]['pn'] = pn;
            theRoom['host'] = socketId;
            socket.emit('roomHost');
            socket.emit('youStart', theRoom.name, theRoom.joinCode);
            socket.emit('timeSync', Date.now());
            for (let i in theRoom.players) {
                if (theRoom.players[i].messenger) {
                    theRoom.players[i].messenger.emit('returnPlayersInGame', theRoom.playersInGame);
                }
            }
        }
    });
    socket.on('customRoom', function (tarokyNotation) {
        let connected = false;
        try {
            if (players[socketId] && players[socketId].room == -1) {
                let tempRoom = new Room({'name':'temporary'});
                //Decode TarokyNotation into the room
                if (notate(tempRoom,tarokyNotation)) {
                    let values = tarokyNotation.split('/');
                    let theSettings = values[values.length - 1].split(';');
                    let [setting,pn] = theSettings[theSettings.length - 1].split('=');
                    if (u(setting) || u(pn) || setting != 'pn' || isNaN(pn) || pn < 0 || pn > 4) {
                        SERVER.debug('Player number not declared')
                        pn = 0;
                    }
                    let i = 1;
                    for (; rooms['Custom ' + i]; i++) { }
                    let roomID = 'Custom ' + i;
                    tempRoom.name = roomID;
                    rooms[roomID] = tempRoom;
                    rooms[roomID]['players'][pn].type = PLAYER_TYPE.HUMAN;
                    rooms[roomID]['players'][pn].socket = socketId;
                    rooms[roomID]['players'][pn].messenger = socket;
                    rooms[roomID]['players'][pn].pid = players[socketId].pid;
                    rooms[roomID]['playerCount'] = rooms[roomID]['playerCount'] + 1;
                    socket.emit('roomConnected', roomID);
                    connected = true;
                    players[socketId]['room'] = roomID;
                    players[socketId]['pn'] = pn;
                    rooms[roomID]['host'] = socketId;
                    autoReconnect(socketId);
                    socket.emit('timeSync', Date.now());

                    for (let i in rooms[roomID].players) {
                        if (rooms[roomID].players[i].messenger) {
                            rooms[roomID].players[i].messenger.emit('returnPlayersInGame', rooms[roomID].playersInGame);
                        }
                    }

                    let playerType = rooms[roomID].players[0].type;
                    let action = rooms[roomID].board.nextStep;
                    if (playerType == PLAYER_TYPE.HUMAN) {
                        playerAction(action, rooms[roomID], action.player);
                    } else if (playerType == PLAYER_TYPE.ROBOT) {
                        robotAction(action, rooms[roomID], action.player);
                    } else if (playerType == PLAYER_TYPE.AI) {
                        aiAction(action, rooms[roomID], action.player);
                    }
                } else {
                    SERVER.debug('Notation error');
                }
            }
        } catch (err) {SERVER.debug('Notation error: ' + err);}
        if (!connected) socket.emit('roomNotConnected', 'Custom');
    });

    socket.on('returnToGame', function() {
        let connected = false;
        try {
            if (players[socketId] && players[socketId].room == -1 && returnToGame[socketId]) {
                let tempNotation = returnToGame[socketId].notation;
                let tarokyNotation = returnToGame[socketId].notation + ';pn=' + playerPerspective(returnToGame[socketId].pn, returnToGame[socketId].povinnost)
                returnToGame[socketId] = false;
                let tempRoom = new Room({'name':'temporary'});
                //Decode TarokyNotation into the room
                if (notate(tempRoom,tarokyNotation)) {
                    let values = tarokyNotation.split('/');
                    let theSettings = values[values.length - 1].split(';');
                    let [setting,pn] = theSettings[theSettings.length - 1].split('=');
                    if (u(setting) || u(pn) || setting != 'pn' || isNaN(pn) || pn < 0 || pn > 4) {
                        SERVER.debug('Player number not declared')
                        pn = 0;
                    }
                    let i = 1;
                    for (; rooms[i]; i++) { }
                    let roomID = i;
                    tempRoom.name = roomID;
                    rooms[roomID] = tempRoom;
                    rooms[roomID]['players'][pn].type = PLAYER_TYPE.HUMAN;
                    rooms[roomID]['players'][pn].socket = socketId;
                    rooms[roomID]['players'][pn].messenger = socket;
                    rooms[roomID]['players'][pn].pid = players[socketId].pid;
                    rooms[roomID]['playerCount'] = rooms[roomID]['playerCount'] + 1;
                    rooms[roomID].board.notation = tempNotation;//Contains both game and settings notation, whereas board.notation normally only contains game notation
                    socket.emit('roomConnected', roomID);
                    connected = true;
                    players[socketId]['room'] = roomID;
                    players[socketId]['pn'] = pn;
                    rooms[roomID]['host'] = socketId;
                    autoReconnect(socketId);
                    socket.emit('timeSync', Date.now());

                    let playerType = rooms[roomID].players[0].type;
                    let action = rooms[roomID].board.nextStep;
                    if (playerType == PLAYER_TYPE.HUMAN) {
                        playerAction(action, rooms[roomID], action.player);
                    } else if (playerType == PLAYER_TYPE.ROBOT) {
                        robotAction(action, rooms[roomID], action.player);
                    } else if (playerType == PLAYER_TYPE.AI) {
                        aiAction(action, rooms[roomID], action.player);
                    }
                } else {
                    SERVER.debug('Notation error');
                }
            } else {
                SERVER.warn('Invalid attempt to connect to room',roomID);
                if (rooms[roomID]) {
                    SERVER.debug('Room contains ' + rooms[roomID]['playerCount'] + ' players',roomID);
                    if (rooms[roomID].locked) {
                        SERVER.debug('Room is locked',roomID);
                    }
                } else {
                    SERVER.debug('This room does not exist',roomID);
                }
                if (players[socketId]) {
                    SERVER.debug('Player is in room ' + players[socketId].room,roomID);
                } else {
                    SERVER.debug('Player ' + socketId + ' does not exist',roomID);
                }
            }
        } catch (err) {SERVER.debug('Notation error: ' + err);}
        if (!connected) socket.emit('roomNotConnected', 'Return To Game');
    });

    socket.on('requestTimeSync', function() {
        if (socket) {
            socket.emit('timeSync', Date.now());
        }
    });
    socket.on('currentAction', function () {
        if (players[socketId] && rooms[players[socketId].room]) {
            SERVER.debug('Player ' + socketId + ' sent a ping');
            autoReconnect(socketId);
        }
    });
    socket.on('getRooms', function () {
        if (socket) {
            socket.emit('returnRooms', simplifiedRooms);
        }
    });
    socket.on('settings', function (setting, rule) {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['host'] == socketId && rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
            //Update the game rules
            switch (setting) {
                case 'difficulty':
                    if (DIFFICULTY_TABLE[rule]) {
                        rooms[players[socketId].room].settings.difficulty = +rule;
                        setSettingNotation(rooms[players[socketId].room]);
                        SERVER.debug('Difficulty is set to ' + DIFFICULTY_TABLE[rule],players[socketId].room);
                        rooms[players[socketId].room].informPlayers('Setting ' + setting + ' updated to ' + DIFFICULTY_TABLE[rule], MESSAGE_TYPE.SETTING);

                        if (rule == DIFFICULTY.AI) {
                            //Replace bots with AI
                            for (let i in rooms[players[socketId].room].players) {
                                if (rooms[players[socketId].room].players[i].type == PLAYER_TYPE.ROBOT) {
                                    rooms[players[socketId].room].players[i] = new Player(PLAYER_TYPE.AI, 'standard');
                                }
                            }
                        } else {
                            //Replace AI with bots
                            for (let i in rooms[players[socketId].room].players) {
                                if (rooms[players[socketId].room].players[i].type == PLAYER_TYPE.AI) {
                                    rooms[players[socketId].room].players[i] = new Player(PLAYER_TYPE.ROBOT);
                                }
                            }
                        }
                        for (let i in rooms[players[socketId].room].players) {
                            if (rooms[players[socketId].room].players[i].messenger) {
                                rooms[players[socketId].room].players[i].messenger.emit('returnPlayersInGame', rooms[players[socketId].room].playersInGame);
                            }
                        }
                    }
                    break;
                case 'timeout':
                    if (!isNaN(rule)) {
                        if (rule <= 0) {
                            rule = 0;//No timeout for negatives
                        } else if (rule <= 20000) {
                            rule = 20000;//20 second min
                        } else if (rule >= 3600000) {
                            rule = 3600000;//One hour max
                        }
                        rooms[players[socketId].room].settings.timeout = rule;
                        setSettingNotation(rooms[players[socketId].room]);
                        SERVER.debug('Timeout is set to ' + (rule/1000) + 's',players[socketId].room);
                        rooms[players[socketId].room].informPlayers('Setting ' + setting + ' updated to ' + (rule/1000) + 's', MESSAGE_TYPE.SETTING);
                    }
                    break;
                case 'lock':
                    //Room may be locked or unlocked
                    rooms[players[socketId].room].settings.locked = !(!rule);
                    setSettingNotation(rooms[players[socketId].room]);
                    let toSend = rooms[players[socketId].room].settings.locked ? 'This room is now private' : 'This room is now public';
                    SERVER.log(toSend, players[socketId].room);
                    rooms[players[socketId].room].informPlayers(toSend, MESSAGE_TYPE.SETTING);
                    break;
                case 'aceHigh':
                    if (rule) {
                        rooms[players[socketId].room].settings.aceHigh = true;
                        rooms[players[socketId].room].informPlayers('Ace is high', MESSAGE_TYPE.SETTING);
                    } else {
                        rooms[players[socketId].room].settings.aceHigh = false;
                        rooms[players[socketId].room].informPlayers('Ace is low', MESSAGE_TYPE.SETTING);
                    }
                    setSettingNotation(rooms[players[socketId].room]);
                    break;
            }
            for (let i in rooms[players[socketId].room].players) {
                if (rooms[players[socketId].room].players[i].messenger) {
                    rooms[players[socketId].room].players[i].messenger.emit('returnSettings', rooms[players[socketId].room].settings);
                }
            }
        }
    });
    socket.on('getPlayerList', function() {
        let playerListToSend = [];
        for (let i in players) {
            if (i != socketId && players[i].room != players[socketId].room) {
                playerListToSend.push({
                    username: players[i].username,
                    status: (players[i].disconnecting ? 'Idle' : players[i].room == -1 ? 'Online' : 'In Game'),
                    socket: i
                });
            }
        }
        socket.emit('returnPlayerList', playerListToSend);
    });
    socket.on('invite', function(toInvite) {
        SERVER.log(socketId + ' sent an invite to ' + toInvite);
        if (players[socketId].room != -1 && rooms[players[socketId].room] && rooms[players[socketId].room].board.nextStep.action == 'start') {
            if (players[toInvite]) {
                SERVER.debug('Invite was sent');
                players[toInvite].socket.emit('invite', players[socketId].room, rooms[players[socketId].room].joinCode, players[socketId].username);
            }
        }
    });
    socket.on('startGame', function () {
        if (!players[socketId]) {return;}
        if (!rooms[players[socketId].room]) { SERVER.debug('Player is starting a game while not in a room ' + socketId); return; }
        if (rooms[players[socketId].room]['host'] == socketId && rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], players[socketId].pn);
        } else {
            SERVER.warn('Failed attempt to start the game by player ' + socketId,players[socketId].room);
            if (rooms[players[socketId].room]['host'] == socketId) {
                //Player is host but game was already started
                SERVER.debug('Player is host but the game was already started. Informing host of the next step',players[socketId].room);
                socket.emit('nextAction', rooms[players[socketId].room]['board']['nextStep']);
            } else {
                SERVER.debug('Player is not the host. The host is ' + rooms[players[socketId].room]['host']);
            }
        }
    });
    socket.on('play', function () {
        if (!players[socketId] || !rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action === 'play' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        } else {
            SERVER.warn('Illegal game play attempt by player ' + socketId,players[socketId].room);
        }
    });
    socket.on('shuffle', function (type, again) {
        if (!players[socketId] || !rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action === 'shuffle' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info = { type: type, again: again };
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        } else {
            SERVER.debug('Illegal shuffle attempt by player ' + socketId,players[socketId].room);
        }
    });
    socket.on('cut', function (style, location) {
        if (!players[socketId] || !rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action == 'cut' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.style = style;
            if (location && !isNaN(location) && location > 7 && location < 47) {
                rooms[players[socketId].room]['board']['nextStep'].info.location = location;
            }
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('deal', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'deal' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('chooseHand', function(theChoice) {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == '12choice' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            if (isNaN(theChoice) || !rooms[players[socketId].room]['board'].hands[theChoice]) {
                return;
            }
            rooms[players[socketId].room]['board']['nextStep'].info.choice = theChoice;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goPrever', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'prever' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].action = 'callPrever';
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noPrever', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'prever' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].action = 'passPrever';
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goTalon', function () {
        if (players[socketId] && rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'drawTalon' || rooms[players[socketId].room]['board']['nextStep'].action == 'passTalon') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].action = 'drawTalon';
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noTalon', function () {
        if (players[socketId] && rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'drawTalon' || rooms[players[socketId].room]['board']['nextStep'].action == 'passTalon') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].action = 'passTalon';
            if (players[socketId]['pn'] == rooms[players[socketId].room].board.povinnost) {
                //Povinnost cannot pass the talon
                rooms[players[socketId].room]['board']['nextStep'].action = 'drawTalon';
            }
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('discard', function (toDiscard) {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'discard' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            let discarded = false;
            for (let i in rooms[players[socketId].room]['players'][players[socketId]['pn']].hand) {
                if (!rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].grayed && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].suit == toDiscard.suit && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].value == toDiscard.value) {
                    rooms[players[socketId].room]['board']['nextStep'].info.card = toDiscard;
                    discarded = true;
                    actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
                }
            }
            if (!discarded) {
                players[rooms[players[socketId].room]['players'][players[socketId]['pn']].socket].socket.emit('failedDiscard', toDiscard);
            }
        }
    });
    socket.on('goBida or Uni', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'povinnostBidaUniChoice' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.choice = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noBida or Uni', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'povinnostBidaUniChoice' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.choice = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('moneyCards', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'moneyCards' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('choosePartner', function (partner) {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'partner' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board'].partnerCard = partner;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goPrever Talon', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'drawPreverTalon' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.accept = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noPrever Talon', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'drawPreverTalon' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.accept = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goValat', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'valat' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.valat = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noValat', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'valat' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.valat = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goContra', function () {
        if (players[socketId] && rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'contra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'valatContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverValatContra') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.contra = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noContra', function () {
        if (players[socketId] && rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'contra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'valatContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverValatContra') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.contra = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goIOTE', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'iote' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.iote = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noIOTE', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'iote' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.iote = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('lead', function (toPlay) {
        if (players[socketId] && rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'lead' || rooms[players[socketId].room]['board']['nextStep'].action == 'follow') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            let played = false;
            for (let i in rooms[players[socketId].room]['players'][players[socketId]['pn']].hand) {
                if (!rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].grayed && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].suit == toPlay.suit && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].value == toPlay.value) {
                    rooms[players[socketId].room]['board']['nextStep'].info.card = toPlay;
                    played = true;
                    actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
                    break;
                }
            }
            if (!played) {
                players[rooms[players[socketId].room]['players'][players[socketId]['pn']].socket].socket.emit('failedLead', toPlay);
                SERVER.warn('Player failed to play card: ' + JSON.stringify(toPlay),players[socketId].room);
            }
        } else {
            SERVER.warn('Illegal card play attempt',players[socketId].room);
        }
    });
    socket.on('winTrick', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'winTrick' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('countPoints', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'countPoints' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('resetBoard', function () {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'resetBoard' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('createSavePoint', function() {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room].board.notation.length > 0 && players[socketId].savePoints[players[socketId].savePoints.length - 1] != rooms[players[socketId].room].board.notation + rooms[players[socketId].room].settingsNotation) {
            players[socketId].savePoints.push(rooms[players[socketId].room].board.notation + room.settingsNotation);
        }
    });

    //User account tools
    socket.on('login', function(username, token) {
        if (typeof username == 'string' && typeof token == 'string' && players[socketId]) {
            try {
                const options = {
                    hostname: 'sso.smach.us',
                    path: '/verify',
                    method: 'POST',
                    protocol: 'https:',
                    headers: {
                        'Authorization': username.toLowerCase() + ':' + token
                    }
                };
                const req = https.request(options, (res) => {
                    SERVER.log('Player ' + socketId + ' sign in status: ' + res.statusCode);
                    if (res.statusCode === 200) {
                        players[socketId].username = username;
                        players[socketId].token = token;
                        socket.emit('loginSuccess', username);
                        SERVER.log('Player ' + socketId + ' has signed in as ' + username);

                        Database.promiseCreateOrRetrieveUser(username).then((info) => {
                            SERVER.log('Loaded settings for user ' + username + ': ' + info);
                            players[socketId].userInfo = info;
                            socket.emit('elo',info.elo);
                            socket.emit('admin',info.admin);
                            socket.emit('defaultSettings',notationToObject(info.settings));
                        }).catch((err) => {
                            SERVER.warn('Database error:' + err);
                        });
                    } else {
                        SERVER.log('Player ' + socketId + ' sent an invalid token or username');
                        socket.emit('loginFail');
                    }
                }).on("error", (err) => {
                    SERVER.error(err);
                    socket.emit('loginFail');
                }).end();
            } catch (err) {
                SERVER.error(err);
                socket.emit('loginFail');
            }
        }
    });
    socket.on('logout', function() {
        if (players[socketId]) {
            players[socketId].username = 'Guest';
            players[socketId].token = -1;
            players[socketId].userInfo = null;
            socket.emit('logout');
            SERVER.log('Player ' + socketId + ' has signed out');
        }
    });
    socket.on('saveSettings', function() {
        if (players[socketId] && rooms[players[socketId].room] && players[socketId].username != 'Guest') {
            Database.saveSettings(players[socketId].username, rooms[players[socketId].room].settingsNotation);
            players[socketId].userInfo.settings = rooms[players[socketId].room].settingsNotation;
            socket.emit('defaultSettings',notationToObject(rooms[players[socketId].room].settingsNotation));
            SERVER.log('Default settings saved for user ' + players[socketId].username + ': ' + rooms[players[socketId].room].settingsNotation);
        }
    });

    //Admin tools
    socket.on('restartServer', function(immediately) {
        if (players[socketId] && players[socketId].userInfo && players[socketId].userInfo.admin) {
            SERVER.log('Admin ' + players[socketId].username + ' restarted the server');
            AdminPanel.shouldRestartServer = true;
            if (immediately) {
                shutDown();
            }
        }
    });
    socket.on('reloadClients', function() {
        if (players[socketId] && players[socketId].userInfo && players[socketId].userInfo.admin) {
            SERVER.log('Admin ' + players[socketId].username + ' reloaded the clients');
            AdminPanel.reloadClients();
        }
    });
    socket.on('printPlayerList', function() {
        if (players[socketId] && players[socketId].userInfo && players[socketId].userInfo.admin) {
            SERVER.log('Admin ' + players[socketId].username + ' printed the player list');
            socket.emit('playerList',AdminPanel.printPlayerList());
        }
    });
    socket.on('printRoomList', function() {
        if (players[socketId] && players[socketId].userInfo && players[socketId].userInfo.admin) {
            SERVER.log('Admin ' + players[socketId].username + ' printed the room list');
            try {
                socket.emit('roomList',AdminPanel.printRoomsList());
            } catch (maximumcallstacksize) {
                //too much info for one socket message
                SERVER.error('tmi');
                AdminPanel.printRoomsList(true);
            }
        }
    });
    socket.on('adminMessage', function(id, message) {
        if (players[socketId] && players[socketId].userInfo && players[socketId].userInfo.admin) {
            SERVER.log('Admin ' + players[socketId].username + ' sent ' + id + ' the message ' + message);
            players[id].socket.emit('broadcast',message);
        }
    });
    socket.on('adminSignIn', function(username) {
        //debug function
        if (DEBUG_MODE && players[socketId]) {
            players[socketId].username = username;
            players[socketId].userInfo = {admin:true,elo:2000};
            socket.emit('loginSuccess', username);
            socket.emit('admin',true);
        }
    });
    socket.on('removeRoom', function(id) {
        if (players[socketId] && players[socketId].userInfo && players[socketId].userInfo.admin && rooms[id]) {
            SERVER.log('Admin ' + players[socketId].username + ' removed room ' + id);
            clearTimeout(rooms[id].autoAction);
            rooms[id].ejectAudience();
            rooms[id].ejectPlayers();
            delete rooms[id];
        }
    });
    socket.on('broadcastMessage', function (playerName, messageText) {
        let player = players[socketId];
        let room = player.room;

        playerName = player.username;
        if (playerName == 'Guest') {
            return;
        }
        if (playerCanSendMessage(player)) {
            if (rooms[room]) {
                for (playerToReceive in rooms[room].players) {
                    if (rooms[room].players[playerToReceive].type == PLAYER_TYPE.HUMAN && rooms[room].players[playerToReceive].socket != socketId && rooms[room].players[playerToReceive].socket != -1) {
                        SERVER.log(playerToReceive);
                        SOCKET_LIST[rooms[room].players[playerToReceive].socket].emit('chatMessage', playerName, messageText);
                    }
                }
                for (member in rooms[room].audience) {
                    if (rooms[room].audience[member].socketId != socketId) {
                        rooms[room].audience[member].messenger.emit('chatMessage', playerName, messageText);
                    }

                }
            } else {
                for (playerToReceive in players) {
                    if (players[playerToReceive].room == -1 && playerToReceive != socketId && SOCKET_LIST[playerToReceive]) {
                        SERVER.log(playerToReceive);
                        SOCKET_LIST[playerToReceive].emit('chatMessage', playerName, messageText);
                    }
                }
            }
            player.timeLastMessageSent = Date.now();
            SERVER.log('Player ' + playerName + ' sent a chat message: ' + messageText);
        }
        
        
    })
});

function numEmptyRooms() { let emptyRoomCount = 0; for (let i in rooms) { if (rooms[i].playerCount == 0 && !rooms[i].debug) emptyRoomCount++; } return emptyRoomCount; }
function checkRoomsEquality(a, b) {
    if (Object.keys(a).length != Object.keys(b).length) { return false; }
    for (let i in a) {
        if (!b[i] || a[i].count != b[i].count) {
            return false;
        }
    }
    return true;
}

function tick() {
    if (!ticking) {
        ticking = true;
        for (let i in rooms) {
            //Operations
            if (rooms[i] && rooms[i].playerCount == 0) {
                clearTimeout(rooms[i].autoAction);
                rooms[i].ejectAudience();
                delete rooms[i];
                SERVER.log('Stopped empty game',i);
            }
        }

        simplifiedRooms = {};
        for (let i in rooms) {
            if (rooms[i] && !rooms[i].settings.locked && rooms[i].type != ROOM_TYPE.CHALLENGE) {
                let theUsernames = [];
                for (let p in rooms[i].players) {
                    if (rooms[i].players[p].type == PLAYER_TYPE.HUMAN && players[rooms[i].players[p].socket]) {
                        theUsernames.push(players[rooms[i].players[p].socket].username);
                    }
                }
                simplifiedRooms[i] = { 'count': rooms[i].playerCount, 'usernames': theUsernames, 'audienceCount': rooms[i].audienceCount };
            } else {
                if (!rooms[i]) {
                    SERVER.warn('A room disappeared');
                } else {
                    //Locked or challenge
                }
            }
        }
        for (let i in players) {
            if (!~players[i]['room'] && !players[i].tempDisconnect && !checkRoomsEquality(players[i].roomsSeen, simplifiedRooms)) {
                players[i]['socket'].emit('returnRooms', simplifiedRooms);
                players[i].roomsSeen = { ...simplifiedRooms };
            }
        }
        if (Object.keys(players).length == 0 && AdminPanel.shouldRestartServer) {
            shutDown();
        }
        ticking = false;
    }
}

const signInCache = {};
function attemptSignIn(username, token, socket, socketId) {
    if (typeof username === 'string' && typeof token === 'string') {
        if (signInCache[username.toLowerCase()] == token) {
            players[socketId].username = username;
            players[socketId].token = token;
            socket.emit('loginSuccess', username);
            loadDatabaseInfo(username, socketId, socket);
            socket.emit('dailyChallengeScore', challenge.getUserScore(username));
            SERVER.log('User ' + socketId + ' did auto sign-in (cache) ' + socket.handshake.auth.username);
            return;
        }
        try {
            const options = {
                hostname: 'sso.smach.us',
                path: '/verify',
                method: 'POST',
                protocol: 'https:',
                headers: {
                    'Authorization': username.toLowerCase() + ':' + token
                }
            };
            https.request(options, (res) => {
                if (res.statusCode === 200) {
                    signInCache[username.toLowerCase()] = true;
                    players[socketId].username = username;
                    players[socketId].token = token;
                    socket.emit('loginSuccess', username);
                    loadDatabaseInfo(username, socketId, socket);
                    socket.emit('dailyChallengeScore', challenge.getUserScore(username));
                    SERVER.log('User ' + socketId + ' did auto sign-in ' + socket.handshake.auth.username);
                } else {
                    SERVER.log(username + ' failed to sign in with status code ' + res.statusCode);
                }
            }).on("error", (err) => {
            }).end();
        } catch (err) {
        }
    }
}


function loadDatabaseInfo(username, socketId, socket) {
    Database.promiseCreateOrRetrieveUser(username).then((info) => {
        SERVER.log('Loaded settings for user ' + username + ': ' + info);
        players[socketId].userInfo = info;
        socket.emit('elo',info.elo);
        socket.emit('admin',info.admin);
        socket.emit('defaultSettings',notationToObject(info.settings));
    }).catch((err) => {
        SERVER.warn('Database error:' + err);
    });
}

function checkAllUsers() {
    for (let i in players) {
        if (players[i].username != 'Guest' && SOCKET_LIST[players[i].socket]) {
            try {
                const options = {
                    hostname: 'sso.smach.us',
                    path: '/verify',
                    method: 'POST',
                    protocol: 'https:',
                    headers: {
                        'Authorization': players[i].username.toLowerCase() + ':' + players[i].token
                    }
                };
                const req = https.request(options, (res) => {
                    if (res.statusCode !== 200) {
                        players[i].username = 'Guest';
                        players[i].token = -1;
                        SOCKET_LIST[players[i].socket].emit('loginExpired');
                    }
                }).on("error", (err) => {
                    console.log("Error: ", err)
                    players[i].username = 'Guest';
                    players[i].token = -1;
                    SOCKET_LIST[players[i].socket].emit('loginExpired');
                }).end();
            } catch (err) {
                SERVER.error(err);
                if (players[i].socket != -1) {
                    SOCKET_LIST[players[i].socket].emit('loginExpired');
                }
                players[i].username = 'Guest';
                players[i].token = -1;
            }
        }
    }
}

function playerOffset(startingPlayer, offset) {
    return (+startingPlayer + +offset)%4;
}

function playerPerspective(originalPlace, viewpoint) {
    //Ex. if player 0 is povinnost and player 1 is AI, then from AI's view player 3 is povinnost
    return ((+originalPlace - +viewpoint) + 4)%4;
}

let interval;
let verifyUsers;
if (!TRAINING_MODE) {
    //AI in training won't use normal room operations
    interval = setInterval(tick, 1000 / 60.0);//60 FPS
    verifyUsers = setInterval(checkAllUsers, 5*60*1000);
}

AdminPanel.reloadClients = () => {
    for (let i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('reload');
    }
}
AdminPanel.printPlayerList = (printToConsole) => {
    const playerListObject = [];
    for (let i in players) {
        if (printToConsole) {console.log('Player ' + i + ':');}
        playerListObject.push({});
        for (let p in players[i]) {
            if (p != 'socket' && p != 'token') {
                playerListObject[playerListObject.length - 1][p] = players[i][p];
                if (printToConsole) {
                    console.log('\t' + p + ': ' + players[i][p]);
                }
            }
        }
        //players[socketId] = { 'id': socketId, 'pid': -1, 'room': -1, 'pn': -1, 'socket': socket, 'roomsSeen': {}, tempDisconnect: false, username: 'Guest', token: -1 }
    }
    return playerListObject;
}
AdminPanel.printRoomsList = (printToConsole) => {
    const roomListObject = [];
    for (let i in rooms) {
        if (printToConsole) {console.log('Room ' + i + ':');}
        roomListObject.push({});
        for (let r in rooms[i]) {
            if (r != '_deck' && r != '_playerList' && r != '_players' && r != '_trainingGoal'
                    && r != '_settings' && r != '_audience' && r != '_board') {
                //todo: players, audience, and board have useful information that needs to be extracted and sent
                roomListObject[roomListObject.length - 1][r] = rooms[i][r];
                if (printToConsole) {
                    console.log('\t' + r + ': ' + rooms[i][r]);
                }
            }
        }
    }
    return roomListObject;
}

//Begin listening
if (DEBUG_MODE) {
    console.log("DEBUG MODE ACTIVATED");
    console.log("Listening on port 8448 (Accessible at http://localhost:8448/ )")
    server.listen(8448);
} else {
    console.log("Server running in production mode. For debug mode, run \nnode _server.js debug")
    console.log("Listening on port 8442 (Accessible at http://localhost:8442/ )");
    server.listen(8442);
}
console.log("Log level: " + LOG_LEVEL);

function shutDown() {
    //First, save any information
    /*
        - Error logs
        - Debug info
        - Player stats
    */
    //Then, close all open things
    /*
        - H5 files
        - Database connections
    */
    //Finally, shut down the server
    throw 'Shutting down...';
}
