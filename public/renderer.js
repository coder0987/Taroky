/*
Taroky Game renderer

Receives all rendering messages from machTaroky.js and only sends back renderingStatus messages
*/

class NavBarRenderer {
    constructor() {
        this._navbar = document.getElementById("navbar");
        this._accountHandler = document.getElementById("accountHandler");
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
}

class GameRenderer {}

class HandRenderer {}

class TableRenderer {}