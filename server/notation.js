const { SUIT, TRUMP_VALUE, RED_VALUE, RED_VALUE_ACE_HIGH, BLACK_VALUE, VALUE_REVERSE, DIFFICULTY_TABLE } = require('./enums');
const SERVER = require('./logger.js');
const GameManager = require('./GameManager.js');
const { u, findTheI } = require('./utils');
const Settings = require('./Settings.js');

let baseDeck = GameManager.INSTANCE.baseDeck.deck;

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
        throw new Error("oopsie daisy");
    }
    return theNotation;
}
function notationToSettings(room,notation) {
    room.settings = new Settings();
    
    let theSettings = notation.split(';')
    for (let i in theSettings) {
        let [setting,rule] = theSettings[i].split('=');
        if (u(setting) || u(rule)) {
            SERVER.debug('Undefined setting or rule')
        } else {
            switch (setting) {
                case 'difficulty':
                    room.settings.changeDifficulty(rule);
                    break;
                case 'timeout':
                    room.settings.changeTimeout(rule);
                    break;
                case 'aceHigh':
                    room.settingss.changeAceHigh(rule);
                    break;
                case 'lock':
                case 'locked':
                    room.settings.changeLock(rule);
                    break;
                case 'botPlayTime':
                    room.settings.changeBotPlayTime(rule);
                    break;
                case 'botThinkTime':
                    room.settings.changeBotThinkTime(rule);
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
        return new Settings();
    }
    let settingsObject = new Settings();
    let theSettings = notation.split(';')
    for (let i in theSettings) {
        let [setting,rule] = theSettings[i].split('=');
        if (u(setting) || u(rule)) {
            SERVER.debug('Undefined setting or rule')
        } else {
            switch (setting) {
                case 'difficulty':
                    settingsObject.changeDifficulty(rule);
                    break;
                case 'timeout':
                    settingsObject.changeTimeout(rule);
                    break;
                case 'lock':
                case 'locked':
                    settingsObject.changeLock(rule);
                    break;
                case 'aceHigh':
                    settingsObject.changeAceHigh(rule);
                    break;
                case 'botPlayTime':
                    settingsObject.changeBotPlayTime(rule);
                    break;
                case 'botThinkTime':
                    settingsObject.changeBotThinkTime(rule);
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

function notate(room, notation) {
    if (notation) {
        SERVER.debug(`Creating room from notation ${notation}`, room.name);

        try {
            if (typeof notation !== "string") {
                SERVER.debug('Notation: not a string');
                return false;
            }
            if (!room) {
                throw new Error("A valid room must be passed in");
            }
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
                    SERVER.debug(JSON.stringify(baseDeck[i]));
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

function getPNFromNotation(notation) {
    const values = notation.split('/');
    const theSettings = values[values.length - 1].split(';');
    const [setting,pn] = theSettings[theSettings.length - 1].split('=');
    if (u(setting) || u(pn) || setting != 'pn' || isNaN(pn) || pn < 0 || pn > 4) {
        SERVER.debug('Player number not declared')
        pn = 0;
    }
    return pn;
}

module.exports = {
    notationToCards,
    cardsToNotation,
    notationToSettings,
    notationToObject,
    notate,
    getPNFromNotation
}