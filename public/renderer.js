/*
Taroky Game renderer

Receives all rendering messages from machTaroky.js and only sends back renderingStatus messages
*/

let renderer;

class Renderer {
    constructor(gamestate) {
        this._game = new GameRenderer();
        this._hud = new HUDRenderer();
        this._gamestate = gamestate;
        renderer = this;
    }
    renderAll() {
        this._game.renderAll();
        this._hud.renderAll();
    }
    clearScreen() {
        this._game.clearScreen();
        this._hud.clearScreen();
    }

    set gamestate(gs) {
        this._gamestate = gs;
        renderAll();
    }
    get gamestate() {
        return this._gamestate;
    }
    get hud() {
        return this._hud;
    }
    get gamestate() {
        return this._gamestate;
    }
}

//Game covers everything once the game begins
class GameRenderer {
    constructor() {
        this._hand = new HandRenderer();
        this._table = new TableRenderer();
    }
    clearScreen() {
        this._hand.clear();
        this._table.clear();
    }
    renderAll() {
        this._hand.render();
        this._table.render();
    }
    get hand() {
        return this._hand;
    }
    get table() {
        return this._table;
    }
}

//HUD covers the Navbar and other components outside of the game logic
class HUDRenderer {
    constructor() {
        this._nav = new NavBarRenderer();
        this._rooms = new RoomsRenderer();
        this._settings = new SettingsRenderer();
        this._invite = new InviteRenderer();
    }
    renderAll() {
        this._nav.render();
        this._rooms.render();
        this._settings.render();
    }
    clearScreen() {
        this._nav.clear();
        this._rooms.clear();
        this._settings.clear();
    }
    get nav() {
        return this._nav;
    }
    get rooms() {
        return this._rooms;
    }
    get settings() {
        return this._settings;
    }
    get invite() {
        return this._invite;
    }
}

class NavBarRenderer {
    constructor() {
        this._navbar = document.getElementById("navbar");
        this._accountHandler = document.getElementById("accountHandler");
    }
    render() {}
    renderSignIn(href) {
        this._accountHandler.innerHTML = 'Sign In';
        this._accountHandler.href = href;
        return this._accountHandler;
    }
    renderSignOut(href, name) {
        if (!name) {
            this._accountHandler.innerHTML = 'Sign Out';
        } else {
            this._accountHandler.innerHTML = 'Sign Out (' + name + ')';
        }
        this._accountHandler.href = href;
        return this._accountHandler;
    }

    get accountHandler() {
        return this._accountHandler;
    }
}

class InviteRenderer {
    constructor() {
        this._inviteScreen = document.getElementById('inviteScreen');
        this._inviteCode = document.getElementById('inviteJoinCode');
        this._inviteCopied = document.getElementById('copied');
    }
    createCard(roomName, roomCode, username) {
        let card = document.createElement('div');
        card.classList.add('invite-card');
        let cardRemoveTimeout = setTimeout(() => {document.body.removeChild(card)},10000);

        let nameElem = document.createElement('h3');
        nameElem.classList.add('invite-card-header');
        nameElem.innerHTML = 'New Invite From ' + username + ' to Room ' + roomName + '!';
        card.appendChild(nameElem);

        let joinButton = document.createElement('a');
        joinButton.classList.add('invite-card-button');
        joinButton.innerHTML = 'Join';
        joinButton.addEventListener('click', () => {
            exitCurrentRoom(true);
           document.body.removeChild(card);
           clearTimeout(cardRemoveTimeout);joinFromInvite(roomCode)
        }, {once:true});
        card.appendChild(joinButton);

        let spacerSpan = document.createElement('span');
        spacerSpan.classList.add('invite-card-spacer');
        spacerSpan.innerHTML = '-';
        card.appendChild(spacerSpan);

        let ignoreButton = document.createElement('a');
        ignoreButton.classList.add('invite-card-button');
        ignoreButton.innerHTML = 'Ignore';
        ignoreButton.addEventListener('click', () => {document.body.removeChild(card); clearTimeout(cardRemoveTimeout)}, {once:true});
        card.appendChild(ignoreButton);

        document.body.appendChild(card);
    }
    renderInviteScreen() {
        this._inviteCode.href = 'https://machtarok.com/?join=' + roomCode;
        this._inviteCode.innerHTML = 'https://machtarok.com/?join=' + roomCode;
        this._inviteScreen.removeAttribute('hidden');
    }
    clear() {
        this._inviteScreen.setAttribute('hidden','hidden');
        this._inviteCopied.setAttribute('hidden','hidden');
    }
}

class RoomsRenderer {
    render() {}
}

class SettingsRenderer {
    render() {}
}

class HandRenderer {
    render() {}
}

class TableRenderer {
    render() {}
}