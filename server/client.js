/**
 * Client represents an ongoing connection
 * Someone, somewhere, is tied to each specific client
 */

class Client {
    #returnToGame;
    constructor() {

    }

    get returnToGame() {
        return this.#returnToGame;
    }

    set returnToGame(rtg) {
        this.#returnToGame = rtg;
    }
}