const { SUIT, TRUMP_VALUE, RED_VALUE, RED_VALUE_ACE_HIGH, BLACK_VALUE, VALUE_REVERSE, DIFFICULTY_TABLE } = require('./enums');
const SERVER = require('./logger.js');

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
                    break;
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

module.exports = {
    notationToCards,
    cardsToNotation,
    notationToSettings,
    notationToObject
}