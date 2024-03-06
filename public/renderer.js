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
        this._fullscreen = false;
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
    toggleFullscreen(state) {
        if (typeof state === 'undefined') {
            this._fullscreen = !this._fullscreen;
        } else {
            this._fullscreen = state;
        }

        if (!this._fullscreen) {
            //disable fullscreen
            if (document.fullscreenElement) {
                this.closeFullscreen();
            }
            this.hud.nav.render();
        } else {
            //enable fullscreen
            if (!document.fullscreenElement) {
                this.openFullscreen();
            }
            this.hud.nav.clear();
        }
    }
    openFullscreen() {
        try {
            if (document.body.requestFullscreen) {
              document.body.requestFullscreen();
            } else if (document.body.webkitRequestFullscreen) { /* Safari */
              document.body.webkitRequestFullscreen();
            } else if (document.body.msRequestFullscreen) { /* IE11 */
              document.body.msRequestFullscreen();
            }
        } catch (reqDenied) {
            this.toggleFullscreen(false);
        }
    }
    closeFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }
    fullscreenChangeEvent(e) {
        if (document.fullscreenElement) {
            //should be in fullscreen
            renderer.toggleFullscreen(true);
        } else {
            //shouldn't be in fullscreen
            renderer.toggleFullscreen(false);
        }
    }

    set gamestate(gs) {
        this._gamestate = gs;
        renderAll();
    }
    get game() {
        return this._game;
    }
    get hud() {
        return this._hud;
    }
    get gamestate() {
        return this._gamestate;
    }
    get fullscreen() {
        return this._fullscreen;
    }
}

//Game covers everything once the game begins
class GameRenderer {
    constructor() {
        this._hand = new HandRenderer();
        this._table = new TableRenderer();
        this._action = new ActionInfoRenderer();
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
    get actionInfo() {
        return this._action;
    }
}

//HUD covers the Navbar and other components outside of the game logic
class HUDRenderer {
    constructor() {
        this._nav = new NavBarRenderer();
        this._rooms = new RoomsRenderer();
        this._settings = new SettingsRenderer();
        this._invite = new InviteRenderer();
        this._lobby = new LobbyControlsRenderer();
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
    get lobby() {
        return this._lobby;
    }
}

class NavBarRenderer {
    constructor(loaded) {
        this._navbar = document.getElementById("navbar");
        this._accountHandler = document.getElementById("accountHandler");
        if (loaded) {
            $('body').addClass('loaded');
            this._navbar.classList.add("fixed-top");
        }
    }
    render() {
        this.nav.classList.remove('hidden');
    }
    clear() {
        this.nav.classList.add('hidden');
    }
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
    get nav() {
        if (this._navbar == null) {
            this._navbar = document.getElementById("navbar");
        }
        return this._navbar;
    }
}

class LobbyControlsRenderer {
    constructor() {
        this._lobbyControls = document.getElementById('lobby-controls');
    }
    render() {
        this._lobbyControls.removeAttribute('hidden');
    }
    clear() {
        this._lobbyControls.setAttribute('hidden','hidden');
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
    renderCopied() {
        this._inviteCopied.removeAttribute('hidden');
    }
    clear() {
        this._inviteScreen.setAttribute('hidden','hidden');
        this._inviteCopied.setAttribute('hidden','hidden');
    }
}

class RoomsRenderer {
    constructor() {
        this._rooms = document.getElementById('rooms');
        this._drawnRooms = [];
    }

    render() {
        if (!renderer.gamestate.inGame) {
            this.clear();
            this.createNewRoomCard();
            for (let i in availableRooms) {
                this.createRoomCard(availableRooms[i],i);
                this._drawnRooms.push(availableRooms[i]);
            }
            this.createCustomRoomCard();
            if (returnToGameAvailable) {
                this.createReturnToGameRoomCard();
            }
        }
    }
    clear() {
        this._drawnRooms = [];
        this._rooms.innerHTML = '';
    }
    createRoomCard(simplifiedRoom, roomId) {
        const bDiv = document.createElement('div');
        bDiv.classList.add('roomcard');
        bDiv.classList.add('col-md-3');
        bDiv.classList.add('col-xs-6');
        bDiv.classList.add('white');
        bDiv.id = 'roomCard' + roomId;
        let theTitle = '';
        for (let i in simplifiedRoom.usernames) {
            theTitle += simplifiedRoom.usernames[i] + '\n';
        }
        if (simplifiedRoom.audienceCount > 0) {
            theTitle += simplifiedRoom.audienceCount + ' Audience member' + (simplifiedRoom.audienceCount == 1 ? 's\n': '\n');
        }
        theTitle += 'Click to play\nRight click to join audience';
        bDiv.title = theTitle;
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('roomnum');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = romanize(roomId);
        numberDiv.id = 'roomNum' + roomId;
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        playerCountSpan.alt = simplifiedRoom.count + ' player' + (simplifiedRoom.count == 1 ? '' : 's');
        for (let i=0; i<4; i++) {
            if (i<simplifiedRoom.count) {
                playerCountSpan.innerHTML += '&#x25CF; ';
            } else {
                playerCountSpan.innerHTML += '&#x25CB; ';
            }
        }
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
        bDiv.roomID = roomId;
        if (simplifiedRoom.count > 0) {
            bDiv.addEventListener('contextmenu',joinAudience);
        }
        bDiv.addEventListener('click', buttonClick);
        this._rooms.appendChild(bDiv);
    }
    createReturnToGameRoomCard() {
        const bDiv = document.createElement('div');
        bDiv.classList.add('roomcard');
        bDiv.classList.add('col-md-3');
        bDiv.classList.add('col-xs-6');
        bDiv.classList.add('white');
        bDiv.id = 'roomCardReturnToGame';
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('roomnum');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = 'Continue';
        numberDiv.id = 'roomNumReturnToGame';
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        for (let i=0; i<4; i++) {
            playerCountSpan.innerHTML += '&#x25CB; ';
        }
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
        bDiv.addEventListener('click', returnToGameRoomClick);
        this._rooms.appendChild(bDiv);
    }

    createCustomRoomCard() {
        const bDiv = document.createElement('div');
        bDiv.classList.add('roomcard');
        bDiv.classList.add('col-md-3');
        bDiv.classList.add('col-xs-6');
        bDiv.classList.add('white');
        bDiv.id = 'roomCardCustom';
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('roomnum');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = 'Custom';
        numberDiv.id = 'roomNumCustom';
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        for (let i=0; i<4; i++) {
            playerCountSpan.innerHTML += '&#x25CB; ';
        }
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
        bDiv.addEventListener('click', customRoomClick);
        this._rooms.appendChild(bDiv);
    }

    createNewRoomCard() {
        const bDiv = document.createElement('div');
        bDiv.classList.add('roomcard');
        bDiv.classList.add('col-md-3');
        bDiv.classList.add('col-xs-6');
        bDiv.classList.add('white');
        bDiv.id = 'roomCardNew';
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('roomnum');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = 'New';
        numberDiv.id = 'roomNumNew';
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        for (let i=0; i<4; i++) {
            playerCountSpan.innerHTML += '&#x25CB; ';
        }
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
        bDiv.addEventListener('click', newRoomClick);
        this._rooms.appendChild(bDiv);
    }

}

class SettingsRenderer {
    render() {}
    clear() {}
}

class ActionInfoRenderer {
    constructor() {
        this._actionInfo = document.getElementById('actionInfo');
    }
    render() {
        this._actionInfo.removeAttribute('hidden');
    }
    clear() {
        this._actionInfo.setAttribute('hidden','hidden');
    }
}

class HandRenderer {
    render() {}
    clear() {}
}

class TableRenderer {
    render() {}
    clear() {}
}