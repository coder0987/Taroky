const { DIFFICULTY_TABLE, DIFFICULTY } = require('./enums');

class Settings {
    #lock;
    #timeout;
    #aceHigh;
    #difficulty;

    #notation;

    constructor (args = {}) {
        this.#lock = args.lock ?? args.locked ?? true;
        this.#timeout = args.timeout ?? 30000;
        this.#aceHigh = args.aceHigh ?? false;
        this.#difficulty = args.difficulty ?? DIFFICULTY.NORMAL;

        this.setSettingsNotation();
    }
    

    setSettingsNotation() {
        this.#notation = '';
        this.#notation += `lock=${this.#lock};`;
        this.#notation += `timeout=${this.#timeout};`;
        this.#notation += `aceHigh=${this.#aceHigh};`;
        this.#notation += `difficulty=${this.#difficulty}`; // Last one doesn't have ';'
    }

    changeDifficulty(difficulty) {
        if (!DIFFICULTY_TABLE[difficulty]) {
            return null;
        }

        this.#difficulty = +difficulty;
        this.setSettingsNotation();

        // TODO: switch bots to AI if difficulty is set to AI, and vice-versa

        return 'Difficulty updated to ' + DIFFICULTY_TABLE[difficulty];
    }

    changeTimeout(number) {
        number = Math.floor(Number(number));
        
        if (isNaN(number)) {
            return null;
        }

        if (number <= 0) {
            number = 0;
        } else if (number <= 20000) {
            number = 20000;
        } else if (number >= 3600000) {
            number = 3600000;
        }

        this.#timeout = number;

        this.setSettingsNotation();

        return 'Timeout updated to ' + (number/1000) + 's';
    }

    changeAceHigh(aceHigh) {
        let message;

        if (aceHigh) {
            this.#aceHigh = true;
            message = 'Ace is high';
        } else {
            this.#aceHigh = false;
            message = 'Ace is low';
        }

        this.setSettingsNotation();

        return message;
    }

    changeLock(lock) {
        let message;

        if (lock) {
            this.#lock = true;
            message = 'The room is now private';
        } else {
            this.#lock = false;
            message = 'The room is now public';
        }

        this.setSettingsNotation();

        return message;
    }

    get object() {
        return {
            lock: this.#lock,
            locked: this.#lock,
            timeout: this.#timeout,
            aceHigh: this.#aceHigh,
            difficulty: this.#difficulty,
        }
    }

    get lock() {
        return this.#lock;
    }

    get locked() {
        return this.#lock;
    }

    get timeout() {
        return this.#timeout;
    }

    get aceHigh() {
        return this.#aceHigh;
    }

    get difficulty() {
        return this.#difficulty;
    }
}

module.exports = Settings;