class Board {
    constructor() {
        this._partnerCard = "";
        this._talon = [];
        this._table = [];
        this._preverTalon = [];
        this._preverTalonStep = 0;
        this._prever = -1;
        this._playingPrever = false;
        this._povenost = -1;
        this._buc = false;
        this._leadPlayer = -1;
        this._nextStep = { player: 0, action: 'start', time: Date.now(), info: null };
        this._cutStyle = '';
        this._moneyCards = [[], [], [], []];
        this._valat = -1;
        this._iote = -1;
        this._contra = [-1, -1];
        this._firstContraPlayer = -1;
        this._gameNumber = 0;
        this._importantInfo = {};
    }

    resetForNextRound() {
        this.partnerCard = "";
        this.talon = [];
        this.table = [];
        this.preverTalon = [];
        this.preverTalonStep = 0;
        this.prever = -1;
        this.playingPrever = false;
        this.povenost = (this.povenost + 1) % 4;
        this.buc = false;
        this.leadPlayer = -1;
        this.valat = -1;
        this.iote = -1;
        this.cutStyle = '';
        this.moneyCards = [[], [], [], []];
        this.contra = [-1, -1];
        this.firstContraPlayer = -1;
        this.importantInfo = {};
    }

    //Setters
    set partnerCard(pc) {
        this._partnerCard = pc;
    }

    set talon(talon) {
        this._talon = talon;
    }

    set table(table) {
        this._table = table;
    }

    set preverTalon(preverTalon) {
        this._preverTalon = preverTalon;
    }

    set preverTalonStep(preverTalonStep) {
        this._preverTalonStep = preverTalonStep;
    }

    set prever(prever) {
        this._prever = prever;
    }

    set playingPrever(playingPrever) {
        this._playingPrever = playingPrever;
    }

    set povenost(povenost) {
        this._povenost = povenost;
    }

    set buc(buc) {
        this._buc = buc;
    }

    set leadPlayer(leadPlayer) {
        this._leadPlayer = leadPlayer;
    }

    set nextStep(nextStep) {
        this._nextStep = nextStep;
    }

    set cutStyle(cutStyle) {
        this._cutStyle = cutStyle;
    }

    set moneyCards(moneyCards) {
        this._moneyCards = moneyCards;
    }

    set valat(valat) {
        this._valat = valat;
    }

    set iote(iote) {
        this._iote = iote;
    }

    set contra(contra) {
        this._contra = contra;
    }

    set firstContraPlayer(firstContraPlayer) {
        this._firstContraPlayer = firstContraPlayer;
    }

    set gameNumber(gameNumber) {
        this._gameNumber = gameNumber;
    }

    set importantInfo(importantInfo) {
        this._importantInfo = importantInfo;
    }

    //Getters
    get partnerCard() {
        return this._partnerCard;
    }

    get talon() {
        return this._talon;
    }

    get table() {
        return this._table;
    }

    get preverTalon() {
        return this._preverTalon;
    }

    get preverTalonStep() {
        return this._preverTalonStep;
    }

    get prever() {
        return this._prever;
    }

    get playingPrever() {
        return this._playingPrever;
    }

    get povenost() {
        return this._povenost;
    }

    get buc() {
        return this._buc;
    }

    get leadPlayer() {
        return this._leadPlayer;
    }

    get nextStep() {
        return this._nextStep;
    }

    get cutStyle() {
        return this._cutStyle;
    }

    get moneyCards() {
        return this._moneyCards;
    }

    get valat() {
        return this._valat;
    }

    get iote() {
        return this._iote;
    }

    get contra() {
        return this._contra;
    }

    get firstContraPlayer() {
        return this._firstContraPlayer;
    }

    get gameNumber() {
        return this._gameNumber;
    }

    get importantInfo() {
        return this._importantInfo;
    }
}

module.exports = Board;