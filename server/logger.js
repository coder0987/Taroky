const fs = require('fs');

const SERVER = {
    /*
    Why use this instead of console.log()? For future additions. Eventually I want to write console logs to a file for debugging
    This system should make that easier
    Separating by room should also help because it will make individual "room history" logs
    */
    logLevel: 3,
    error: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 1) {
            console.warn('ERROR IN ROOM ' + rn + ': ' + info);
        } else if (this.logLevel >= 1) {
            console.warn('SERVER ERROR: ' + info);
        }
    },
    errorTrace: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 1) {
            console.trace('ERROR - STACK TRACE FOR ROOM ' + rn + ': ' + info);
        } else if (this.logLevel >= 1) {
            console.trace('ERROR - SERVER STACK TRACE: ' + info);
        }
    },
    warn: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 2) {
            console.trace('Warning - Room ' + rn + ': ' + info);
        } else if (this.logLevel >= 2) {
            console.trace('Warning - Server: ' + info);
        }
    },
    log: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 3) {
            console.log('Room ' + rn + ': ' + info);
        } else if (this.logLevel >= 3) {
            console.log('Server: ' + info);
        }
    },
    debug: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 4) {
            console.log('(Debug) Room ' + rn + ': ' + info);
        } else if (this.logLevel >= 4) {
            console.warn('(Debug) Server: ' + info);
        }
    },
    trace: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 5) {
            console.trace('Trace - Room ' + rn + ': ' + info);
        } else if (this.logLevel >= 5) {
            console.trace('Trace - Server: ' + info);
        }
    },
    functionCall: (name, ...parameters) => {
        if (this.logLevel >= 4) {
            let paramString = '';
            parameters.map(p => {
                if (p) {paramString += ' ' + p.name + ': ' + p.value;}
            });
            console.log(name + '() called | ' + paramString);
        }
    }
};

module.exports = SERVER;