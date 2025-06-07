const GameManager = require('./GameManager');
const gm = GameManager.INSTANCE;

const Room = require('./room');
const Database = require('./database');
const SERVER = require('./logger');

const { notationToObject } = require('./notation');

const https = require('https');

class Auth {
    static #signInCache = {}; // NOT CONSTANT. will be reset periodcally

    static signInSuccess(username, token, socket, socketId) {
        SERVER.log(`${username} signed in`);
        gm.players[socketId].username = username;
        gm.players[socketId].token = token;
        socket.emit('loginSuccess', username);
        Auth.loadDatabaseInfo(username, socketId, socket);
        socket.emit('dailyChallengeScore', gm.challenge.getUserScore(username));
    }

    static attemptSignIn(username, token, socket, socketId) {
        if (typeof username === 'string' && typeof token === 'string') {
            if (Auth.#signInCache[username.toLowerCase()] == token) {
                Auth.signInSuccess(username, token, socket, socketId);
                SERVER.log('User ' + socketId + ' did auto sign-in (cache) ' + socket.handshake.auth.username);
                return;
            }

            Auth.signIn(username, token, (err) => {
                SERVER.log(err);
                socket.emit('loginFail');
            }, () => {
                Auth.#signInCache[username.toLowerCase()] = token;
                Auth.signInSuccess(username, token, socket, socketId);
                SERVER.log('User ' + socketId + ' did auto sign-in ' + socket.handshake.auth.username);
            });
        }
    }

    static saveUserPreferencesConditional(username, token, preferences) {
        let avatar = +preferences.avatar;
        let chat = preferences.chat == 'on';
        let deck = preferences.deck;

        let settings = Room.settingsToNotation({
            'difficulty': +preferences.difficulty,
            'timeout': +preferences.timeout * 1000,
            'aceHigh': preferences.aceHighLow == 'on',
            'locked': preferences.locked == 'on',
            'botPlayTime': +preferences.botPlayTime * 1000,
            'botThinkTime': +preferences.botThinkTime * 1000,
        });

        if (Auth.#signInCache[username.toLowerCase()] == token) {
            Database.saveUserPreferences(username,settings,avatar,deck,chat);
            for (let i in gm.players) {
                if (gm.players[i].username == username) {
                    Auth.loadDatabaseInfo(username, i, gm.players[i].socket);
                }
            }
        }
        Auth.signIn(username, token, (err) => {
            SERVER.log(err);
        }, () => {
            Auth.#signInCache[username.toLowerCase()] = token;
            Database.saveUserPreferences(username,settings,avatar,deck,chat);
            for (let i in gm.players) {
                if (gm.players[i].username == username) {
                    Auth.loadDatabaseInfo(username, i, gm.players[i].socket);
                }
            }
        })
    }

    static sendUserInfoConditional(res, username, token, error, callback) {
        if (Auth.#signInCache[username.toLowerCase()] == token) {
            //Good to go
            Database.promiseCreateOrRetrieveUser(username).then((info) => {
                SERVER.log('Loaded settings for user ' + username + ': ' + info);
                callback(info);
            }).catch((err) => {
                error(err);
            });
            return;
        }

        Auth.signIn(username, token, (err) => {
            SERVER.log(err);
            error(err);
        }, () => {
            Auth.#signInCache[username.toLowerCase()] = token;
            Database.promiseCreateOrRetrieveUser(username).then((info) => {
                SERVER.log('Loaded settings for user ' + username + ': ' + info);
                callback(info);
            }).catch((err) => {
                SERVER.warn('Database error:' + err);
                error(err);
            });
        });
    }

    static loadDatabaseInfo(username, socketId, socket) {
        Database.promiseCreateOrRetrieveUser(username).then((info) => {
            SERVER.log('Loaded settings for user ' + username + ': ' + JSON.stringify(info));
            if (gm.players[socketId] != null) gm.players[socketId].userInfo = info;
            if (socket == null) {return;}
            socket.emit('elo',info.elo);
            socket.emit('admin',info.admin);
            socket.emit('defaultSettings', notationToObject(info.settings).object);
            socket.emit('chat',info.chat);
            socket.emit('avatar',info.avatar);
            socket.emit('deckChoice',info.deck);
        }).catch((err) => {
            SERVER.warn('Database error:' + err);
        });
    }

    static checkAllUsers() {
        Auth.#signInCache = {};
        for (let i in gm.players) {
            if (gm.players[i].username != 'Guest' && gm.SOCKET_LIST[i]) {
                Auth.signIn(gm.players[i].username, gm.players[i].token, (err) => {
                    SERVER.error(err);
                    gm.players[i].username = 'Guest';
                    gm.players[i].token = -1;
                    gm.SOCKET_LIST[i].emit('loginExpired');
                }, () => {
                    // yay
                    Auth.#signInCache[gm.players[i].username.toLowerCase()] = gm.players[i].token;
                })
            }
        }
    }

    static signIn(username, token, error, callback) {
        const options = {
            hostname: 'sso.smach.us',
            path: '/verify',
            method: 'POST',
            protocol: 'https:',
            headers: {
                'Authorization': username.toLowerCase() + ':' + token
            }
        };

        try {
            https.request(options, (res) => {
                if (res.statusCode === 200) {
                    callback();
                } else {
                    error(username + ' failed to sign in with status code ' + res.statusCode);
                }
            }).on("error", (err) => {
                error(err);
            }).end();
        } catch (err) {
            error(err);
        }
    }
}

module.exports = Auth;