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
        this._deck = new DeckRenderer();
    }
    clearScreen() {
        this._hand.clear();
        this._table.clear();
    }
    renderAll() {
        this._hand.render();
        this._table.render();
    }
    get deck() {
        return this._deck;
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
        this._profile = document.getElementById('profile-a');
        this._avatar = document.getElementById('profile-img');
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
    updateAvatar() {
        if (!this._profile) {this._profile = document.getElementById("profile-a")}
        if (!this._avatar ) {this._avatar  = document.getElementById("profile-img")}
        if (renderer.gamestate.signedIn) {
            this._profile.classList.remove('no-click');
            this._profile.href = '/userpreferences.html';
            this._avatar.src = '/assets/profile-pictures/profile-' + renderer.gamestate.avatar + '.png';
        } else {
            this._profile.classList.add('no-click');
            this._profile.href = '';
            this._avatar.src = '/assets/profile-pictures/profile-0.png';
        }
    }
    renderSignIn(href) {
        if (!this._accountHandler) {this._accountHandler = document.getElementById("accountHandler")}
        this._accountHandler.innerHTML = 'Sign In';
        this._accountHandler.href = href;
        return this._accountHandler;
    }
    renderSignOut(href, name) {
        if (!this._accountHandler) {this._accountHandler = document.getElementById("accountHandler")}
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
           clearTimeout(cardRemoveTimeout);
           joinFromInvite(roomCode);
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

const notices = [
    { title: "Sign in to Play the Daily Challenge!", message: "Compete with other MachTarok players online to see who can get the best score for the same hand.", link: "https://sso.smach.us/?redirect=https://machtarok.com/", target: 'target="_blank"' },
    { title: "Read Our Free Articles Today!", message: "Check out the 'Learn' page to read Taroky strategy articles.", link: "/learn.html", target: '' },
    { title: "Sign in to Save Your Preferred Settings!", message: "From user avatars and deck customizations to bot play time, sign in to play Taroky your way!", link: "https://sso.smach.us/?redirect=https://machtarok.com/", target: 'target="_blank"' },
    { title: "When Should You Call Contra?", message: "Read the new article now", link: "/articles/contra.html", target: '' },
];

class RoomsRenderer {
    constructor() {
        this._rooms = document.getElementById('rooms');
        this._leaderboard = document.getElementById('leaderboard');
        this._noticeElement = document.getElementById("notice");
        this._drawnRooms = [];
    }

    render() {
        if (!renderer.gamestate.inGame) {
            console.log('Drawing rooms ' + JSON.stringify(availableRooms));
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
            if (activeUsername != '') {
                this.createChallengeRoomCard();
            }
            this.createTutorialRoomCard();
            this.drawLeaderboards();

            this.drawNotice();
        }
    }
    clear() {
        this._drawnRooms = [];
        this._rooms.innerHTML = '';
        this._leaderboard.innerHTML = '';

        const wrapper = document.getElementById('leaderboard-wrapper');
        wrapper?.classList.add('d-none');

        const leftCol = document.getElementById('central-wrapper');
        leftCol?.classList.remove('col-lg-8');
        leftCol?.classList.add('col-lg-12');
    }

    static styleRoom(room) {
        room.classList.add('roomcard');
        room.classList.add('col-md-4');
        room.classList.add('col-12');
        room.classList.add('white');
    }

    createRoomCard(simplifiedRoom, roomId) {
        const bDiv = document.createElement('div');
        RoomsRenderer.styleRoom(bDiv);
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
    createTutorialRoomCard() {
        const anchor = document.createElement('a');
        anchor.href = '/tutorials/tutorial-basics.html';
        RoomsRenderer.styleRoom(anchor);
        anchor.classList.add('room-card-link');

        const bDiv = document.createElement('div');
        anchor.classList.add('roomcard');
        anchor.classList.add('white');
        bDiv.id = 'roomCardTutorial';
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('roomnum');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = 'Tutorial';
        numberDiv.id = 'roomNumTutorial';
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        for (let i=0; i<4; i++) {
            playerCountSpan.innerHTML += '&#x25CB; ';
        }
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
        anchor.appendChild(bDiv);

        this._rooms.appendChild(anchor);
    }
    createReturnToGameRoomCard() {
        const bDiv = document.createElement('div');
        RoomsRenderer.styleRoom(bDiv);
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
        RoomsRenderer.styleRoom(bDiv);
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
        RoomsRenderer.styleRoom(bDiv);

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

    createChallengeRoomCard() {
        const bDiv = document.createElement('div');
        RoomsRenderer.styleRoom(bDiv);

        bDiv.id = 'roomCardChallenge';
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('roomnum');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = 'Daily';
        numberDiv.id = 'roomNumChallenge';
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        for (let i=0; i<4; i++) {
            playerCountSpan.innerHTML += '&#x25CB; ';
        }
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
        bDiv.addEventListener('click', challengeRoomClick);
        this._rooms.appendChild(bDiv);
    }
    drawLeaderboards() {
        const leaderboardData = renderer.gamestate.leaderboard;
        const showscores = typeof renderer.gamestate.dailyChallengeScore !== 'undefined' && renderer.gamestate.dailyChallengeScore !== null;
        const leaderboardEl = this._leaderboard;

        /*example leaderboard data
        const leaderboardData = [
            { avatar: 5, 'name': 'First', score: 60, wins: [5,3,2] },
            { avatar: 5, 'name': 'Second', score: 60, wins: [0,0,0] },
            { avatar: 5, 'name': 'Third', score: 60, wins: [0,0,0] },
        ]*/

        if (!leaderboardData || leaderboardData.length === 0) {
            leaderboardEl.setAttribute('hidden', '');
            document.getElementById('leaderboard-wrapper').classList.add('d-none');
            const leftCol = document.getElementById('central-wrapper');
            leftCol.classList.remove('col-lg-8');
            leftCol.classList.add('col-lg-12');
            return;
        }

        document.getElementById('leaderboard-wrapper')?.classList.remove('d-none');
        const leftCol = document.getElementById('central-wrapper');
        leftCol?.classList.remove('col-lg-12');
        leftCol?.classList.add('col-lg-8');

        // Clear previous content
        leaderboardEl.innerHTML = '';

        // Header
        const header = document.createElement('h1');
        header.classList.add('col-12');
        header.textContent = 'Leaderboard';
        leaderboardEl.appendChild(header);

        // Date (you could replace with dynamic date)
        const dateP = document.createElement('p');
        dateP.classList.add('justify-content-start');
        dateP.classList.add('col-12');
        dateP.classList.add('d-flex');
        dateP.textContent = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        leaderboardEl.appendChild(dateP);

        // Table
        const table = document.createElement('table');
        table.id = 'leaderboard-table';
        table.classList.add('table', 'table-hover', 'table-borderless');

        // Table Head
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th scope="col" class="leaderboard-header">Place</th>
                <th scope="col" class="leaderboard-header">User</th>
                ${showscores ? `<th scope="col" class="leaderboard-header">Today's Score</th>` : ''}
                <th scope="col" class="leaderboard-header"></th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        leaderboardData.forEach((entry, i) => {
            const tr = document.createElement('tr');

            // Place column
            const thPlace = document.createElement('th');
            thPlace.setAttribute('scope', 'row');
            thPlace.classList.add('leaderboard-data');

            if (i < 3) {
                const chipColors = ['blue', 'red', 'white'];
                const img = document.createElement('img');
                img.classList.add('lead');
                img.src = `/assets/gameplay/chip-${chipColors[i]}.png`;
                img.alt = `#${i+1} ${chipColors[i]} chip`;
                thPlace.appendChild(img);
            } else {
                thPlace.textContent = `${i + 1}`;
            }

            tr.appendChild(thPlace);

            // User column
            const tdUser = document.createElement('td');
            tdUser.classList.add('leaderboard-data');
            const userDiv = document.createElement('div');
            userDiv.classList.add('user-sm');

            const avatarImg = document.createElement('img');
            avatarImg.classList.add('profile-sm', `lead-${i+1}`);
            avatarImg.src = `/assets/profile-pictures/profile-${entry.avatar}.png`;
            userDiv.appendChild(avatarImg);

            userDiv.appendChild(document.createTextNode(` ${entry.name} `));

            // Previous wins
            if (entry.wins && Array.isArray(entry.wins)) {
                entry.wins.forEach((count, index) => {
                    if (count > 0) { // only show non-zero awards
                        const span = document.createElement('span');
                        span.classList.add('leaderboard-win');
                        span.classList.add(`prev-${index + 1}`);
                        span.textContent = count.toString().padStart(2, '0');
                        userDiv.appendChild(span);
                    }
                });
            }

            tdUser.appendChild(userDiv);
            tr.appendChild(tdUser);

            // Score column
            if (showscores) {
                const tdScore = document.createElement('td');
                tdScore.classList.add('leaderboard-data');
                tdScore.textContent = entry.score.toString();
                tr.appendChild(tdScore);                
            }        

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        leaderboardEl.appendChild(table);
        leaderboardEl.removeAttribute('hidden');
    }
    drawNotice() {
        const noticeIndex = Math.floor(Math.random() * notices.length);
        const notice = notices[noticeIndex];
        
        const bDiv = document.createElement('a');
        bDiv.href = notice.link;
        bDiv.target = notice.target ? '_blank' : '_self';
        bDiv.rel = notice.target ? 'opener' : 'noopener noreferrer';
        RoomsRenderer.styleRoom(bDiv);
        bDiv.classList.add('room-card-link');
        bDiv.id = 'roomCardNotice';
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('notice-title');
        numberDiv.classList.add('d-flex');
        numberDiv.classList.add('justify-content-center');
        numberDiv.innerHTML = notice.title;
        numberDiv.id = 'roomNumNotice';
        bDiv.appendChild(numberDiv);
        const playerCountSpan = document.createElement('span');
        playerCountSpan.innerHTML = notice.message;
        bDiv.appendChild(playerCountSpan);
        //Make it clickable
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

class DeckRenderer {
    constructor() {
        this._deck = document.getElementById('deck');
        this.generateBaseDeck();
        this.generateDeck();
    }
    generateBaseDeck() {
        this._baseDeck = [];
        for (let s=0;s<4;s++)
            for (let v=0;v<8;v++)
                this._baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
        for (let v=0;v<22;v++)
            this._baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});
    }
    generateDeck() {
        //TODO relies on getCookie and a couple of enums from machtaroky.js
        let deck = getCookie('deck');
        let deck_ending = '.jpg';
        if (!deck || deck == 'mach-deck-thumb') {
            deck = 'mach-deck-thumb';
            deck_ending = '-t.png';
        }

        for (let i in this._baseDeck) {
            let card;
            if (document.getElementById(this._baseDeck[i].value + this._baseDeck[i].suit)) {
                card = document.getElementById(this._baseDeck[i].value + this._baseDeck[i].suit);
            } else {
                card = document.createElement('img');
                card.id = this._baseDeck[i].value + this._baseDeck[i].suit;
                card.alt = this._baseDeck[i].value + ' of ' + this._baseDeck[i].suit;
                card.hidden = true;
                this._deck.appendChild(card);
            }
            card.src = '/assets/' + deck + '/' + this._baseDeck[i].suit.toLowerCase() + '-' + this._baseDeck[i].value.toLowerCase() + deck_ending;
        }
        this.generateCardBack(true);
    }
    generateCardBack(a) {
        let deck = getCookie('deck');
        let deck_ending = '.jpg';
        if (!deck || deck == 'mach-deck-thumb') {
            deck = 'mach-deck-thumb';
            deck_ending = '-t.png';
        }
        if (document.getElementById('cardBack')) {
            if (!a) {this.clearCardBack();}
            document.getElementById('cardBack').src = '/assets/' + deck + '/card-back' + deck_ending;
        } else {
            let card = document.createElement('img');
            card.hidden = true;
            card.id = 'cardBack';
            card.src = '/assets/' + deck + '/card-back' + deck_ending;
            card.alt = 'The back of a card';
            this._deck.appendChild(card);
        }
        this._cardBack = document.getElementById('cardBack');
    }
    clearCardBack() {
        this._cardBack.setAttribute('hidden','hidden');
        this._deck.appendChild(document.getElementById('cardBack'));
    }
    render() {}
    clear() {
        for (let i in this._baseDeck) {
            let child = document.getElementById(this._baseDeck[i].value + this._baseDeck[i].suit );
            child.classList.remove('drew');
            child.classList.remove('col-md-1');
            child.classList.remove('col-xs-3');
            child.hidden = true;
            child.removeEventListener('mouseenter',enter);
            child.removeEventListener('mouseleave',exit);
            child.removeEventListener('click',clickCard);
            child.removeEventListener('click',discardClickListener);
            child.removeEventListener('click',swapCardsClickListener);
            child.title='';
            child.classList.remove('image-hover-highlight');
            child.classList.remove('selected');
            child.classList.remove('grayed');
            this._deck.appendChild(child);
        }
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


/**load button */
function loadButton() {
    renderer.hud.nav = new NavBarRenderer(true);
};

/** navbar */
function includeHTML() {
    let z, i, elmnt, file, xhttp;
    /* Loop through a collection of all HTML elements: */
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        /*search for elements with a certain atrribute:*/
        file = elmnt.getAttribute("w3-include-html");
        if (file) {
            /* Make an HTTP request using the attribute value as the file name: */
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {elmnt.innerHTML = this.responseText;}
                    if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
                    /* Remove the attribute, and call this function once more: */
                    elmnt.removeAttribute("w3-include-html");
                    includeHTML();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            /* Exit the function: */
            return;
        }
    }
}
