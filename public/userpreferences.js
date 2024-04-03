let form;
let saveButton;
let chatSwitch;
let aceHighSwitch;
let timeoutInput;
const SHOW_TOUR = false;
let userNameToken = '';

window.addEventListener('load', function() {
    form = document.getElementById('form');
    saveButton = document.getElementById('saveUP');
    chatSwitch = document.getElementById('chatSwitch');
    aceHighSwitch = document.getElementById('aceHighLow');
    timeoutInput = document.getElementById('timeout');
    aceHighSwitch.addEventListener('click',aceHighClick);
    chatSwitch.addEventListener('click',chatClick);
    form.addEventListener('submit', send, true)
    load();

}, false);

async function load() {
    let username = getCookie('username');
    let token = getCookie('token');
    userNameToken = btoa(username + ':' + token);
    if (username && token) {
        const req = new XMLHttpRequest();
        req.addEventListener("load", getPreferencesCallback);
        req.open("GET", "/preferences", true);
        req.setRequestHeader("Authorization", 'Basic ' + userNameToken);
        req.send();
        req.responseType = "json";
    } else {
        location.replace('https://machtarok.com/');
    }
}

function aceHighClick(e) {
    if (aceHighSwitch.value == 'on') {
        aceHighSwitch.value = 'off';
    } else {
        aceHighSwitch.value = 'on';
    }
}

function chatClick(e) {
    if (chatSwitch.value == 'on') {
        chatSwitch.value = 'off';
    } else {
        chatSwitch.value = 'on';
    }
}

function preferencesCallback(event) {
    //console.log(event);
    console.log(this.status);
    if (this.status === 200) {
        console.log(this.responseText);
    } else {
        console.log('Error: ');
        console.log(this.response);
    }
}

function getPreferencesCallback(event) {
    //console.log(event);
    console.log(this.status);
    if (this.status === 200) {
        console.log(this);
        let pref = JSON.parse(this.response);
        let avatar = pref.avatar;
        let deck = pref.deck;
        let chat = pref.chat;
        notationToSettingsPreferences(pref.settings);

        document.getElementById('av0').removeAttribute('checked');
        document.getElementById('av' + avatar).setAttribute('checked','checked');

        document.getElementById('mach-deck-thumb').removeAttribute('checked');
        document.getElementById(deck).setAttribute('checked','checked');

        if (!chat) {
            chatSwitch.click();
        }
    } else {
        console.log('Error: ');
        console.log(this.response);
    }
}

function send(e) {
    let formData = Object.fromEntries(new FormData(form).entries())

    console.log(formData);

    if (formData.deck) {
        document.cookie = 'deck=' + formData.deck;
        console.log('Deck set to ' + formData.deck);
    }

    const req = new XMLHttpRequest();
    req.addEventListener("load", preferencesCallback);
    req.open("POST", "/preferences", true);

    req.setRequestHeader("Authorization", 'Basic ' + userNameToken);
    req.send(new URLSearchParams(new FormData(form).entries()));
    e.preventDefault();
}
function notationToSettingsPreferences(notation) {
    let theSettings = notation.split(';')
    for (let i in theSettings) {
        let [setting,rule] = theSettings[i].split('=');
        if (u(setting) || u(rule)) {
            SERVER.debug('Undefined setting or rule')
        } else {
            switch (setting) {
                case 'difficulty':
                    document.getElementById('diff3').removeAttribute('checked');
                    document.getElementById('diff' + rule).setAttribute('checked','checked');
                    break;
                case 'timeout':
                    timeoutInput.value = +rule;
                    break;
                case 'aceHigh':
                    if (rule != 'false') {
                        aceHighSwitch.click();
                    }
                default:
            }
        }
    }
}