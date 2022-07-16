const PLAYER_TYPE = {
    HUMAN: 0,
    ROBOT: 1,
    AI: 2,
    H: 0,
    R: 1
};
const SUIT = {
    0: 'Spades',
    1: 'Clubs',
    2: 'Hears',
    3: 'Diamonds',
    4: 'Trump'
};
const RED_VALUE = {
    0: 'Ace',
    1: 'Two',
    2: 'Three',
    3: 'Four',
    4: 'Jack',
    5: 'Rider',
    6: 'Queen',
    7: 'King'
};
const BLACK_VALUE = {
    0: 'Seven',
    1: 'Eight',
    2: 'Nine',
    3: 'Ten',
    4: 'Jack',
    5: 'Rider',
    6: 'Queen',
    7: 'King'
};
const TRUMP_VALUE = {
    0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'
};
const refRes = {width: 1000, height: 1000};
const WIDTH = 1000;
const HEIGHT = 1000;
let ticker;
let ctx;
let players;
let deck;
let canvas;
let scale;
let origin;
let baseDeck = [];
for (let s=0;s<4;s++)
    for (let v=0;v<8;v++)
        baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
for (let v=0;v<22;v++)
    baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});

function Player(position, type) {
    this.position = position;
    this.type = type;
    this.hand = [];
    this.chips = 100;
}

function startGame() {
    players = [];
    players[0] = new Player(0,PLAYER_TYPE.H);
    players[1] = new Player(1,PLAYER_TYPE.R);
    players[2] = new Player(2,PLAYER_TYPE.R);
    players[3] = new Player(3,PLAYER_TYPE.R);
    deck = [...baseDeck];
}

window.onload = () => {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    startGame();
    ticker = setInterval(tick(), 1000/30.0);//30 FPS
}

function drawBoard() {
    ctx.fillStyle = 'rgb(163,123,91)';
    ctx.fillRect(0,0, WIDTH, HEIGHT);

}

function tick() {
    scale = Math.min(canvas.width / refRes.width, canvas.height / refRes.height);
    origin = {
        x: (canvas.width - refRes.width * scale) / 2,
        y: (canvas.height - refRes.height * scale) / 2
    };
    ctx.setTransform(scale, 0, 0, scale, origin.x, origin.y);
    drawBoard();
}