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
    }
    renderAll() {
        this._nav.render();
        this._rooms.render();
        this._settings.render();
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