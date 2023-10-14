const fs = require('fs');
const path = require('path');

const BASE_FOLDER = __dirname.substring(0, __dirname.length - 6);
const LOGS_DIRECTORY = path.join(BASE_FOLDER, 'logs');
const LOG_FILE_NAME = path.join(LOGS_DIRECTORY, `${Date.now()}.log`);

console.log('new server');

const SERVER = {
    /*
    Why use SERVER instead of console.log()? For future additions. Eventually I want to write console logs to a file for debugging
    SERVER system should make that easier
    Separating by room should also help because it will make individual "room history" logs
    */
    logToFile: (info) => {
        fs.appendFile(LOG_FILE_NAME, info + '\n', (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    },

    initLogFile: () => {
        // Create the 'logs' directory if it doesn't exist
        fs.mkdir(LOGS_DIRECTORY, { recursive: true }, (dirErr) => {
            if (dirErr) {
                console.error('Error creating logs directory:', dirErr);
            } else {
                console.log('Logs directory created:', LOGS_DIRECTORY);

                // Now, create or append to the log file
                fs.writeFile(LOG_FILE_NAME, '', { flag: 'a+' }, (fileErr) => {
                    if (fileErr) {
                        console.error('Error creating log file:', fileErr);
                    } else {
                        console.log('Log file created:', LOG_FILE_NAME);
                    }
                });
            }
        });
    },
    logLevel: 3,
    error: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 1) {
            console.warn('ERROR IN ROOM ' + rn + ': ' + info);
            SERVER.logToFile(info);
        } else if (SERVER.logLevel >= 1) {
            console.warn('SERVER ERROR: ' + info);
            SERVER.logToFile(info);
        }
    },
    errorTrace: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 1) {
            console.trace('ERROR - STACK TRACE FOR ROOM ' + rn + ': ' + info);
            SERVER.logToFile(info);
        } else if (SERVER.logLevel >= 1) {
            console.trace('ERROR - SERVER STACK TRACE: ' + info);
            SERVER.logToFile(info);
        }
    },
    warn: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 2) {
            console.trace('Warning - Room ' + rn + ': ' + info);
            SERVER.logToFile(info);
        } else if (SERVER.logLevel >= 2) {
            console.trace('Warning - Server: ' + info);
            SERVER.logToFile(info);
        }
    },
    log: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 3) {
            console.log('Room ' + rn + ': ' + info);
            SERVER.logToFile(info);
        } else if (SERVER.logLevel >= 3) {
            console.log('Server: ' + info);
            SERVER.logToFile(info);
        }
    },
    debug: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 4) {
            console.log('(Debug) Room ' + rn + ': ' + info);
            SERVER.logToFile(info);
        } else if (SERVER.logLevel >= 4) {
            console.warn('(Debug) Server: ' + info);
            SERVER.logToFile(info);
        }
    },
    trace: (info, rn) => {
        if (typeof rn !== 'undefined' && rooms[rn] && rooms[rn].logLevel >= 5) {
            console.trace('Trace - Room ' + rn + ': ' + info);
            SERVER.logToFile(info);
        } else if (SERVER.logLevel >= 5) {
            console.trace('Trace - Server: ' + info);
            SERVER.logToFile(info);
        }
    },
    functionCall: (name, ...parameters) => {
        if (SERVER.logLevel >= 4) {
            let paramString = '';
            parameters.map(p => {
                if (p) {paramString += ' ' + p.name + ': ' + p.value;}
            });
            console.log(name + '() called | ' + paramString);
            SERVER.logToFile(name + '() called | ' + paramString);
        }
    }
};

SERVER.initLogFile();

module.exports = SERVER;