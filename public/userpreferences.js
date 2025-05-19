let form;
let saveButton;
let chatSwitch;
let aceHighSwitch;
let timeoutInput;
let botPlayTimeInput;
let botThinkTimeInput;
const SHOW_TOUR = false;
let userNameToken = '';
let shouldLeave = false;

window.addEventListener('load', function() {
    form = document.getElementById('form');
    saveButton = document.getElementById('saveUP');
    chatSwitch = document.getElementById('chatSwitch');
    aceHighSwitch = document.getElementById('aceHighLow');
    timeoutInput = document.getElementById('timeout');
    aceHighSwitch.addEventListener('click',aceHighClick);
    botPlayTimeInput = document.getElementById('botPlayTime');
    botThinkTimeInput = document.getElementById('botThinkTime');
    chatSwitch.addEventListener('click',chatClick);
    form.addEventListener('submit', send, true)
    document.getElementById("saveExitTop").addEventListener('click', () => {shouldLeave = true});
    document.getElementById("exitTop").addEventListener('click', () => {window.close();});
    document.getElementById("exitBottom").addEventListener('click', () => {window.close();});
    syncValWithSwitch()
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

function syncValWithSwitch() {
    if (aceHighSwitch.checked != (aceHighSwitch.value == 'on')) {
        aceHighSwitch.checked = !aceHighSwitch.checked;
    }
    if (chatSwitch.checked != (chatSwitch.value == 'on')) {
        chatSwitch.checked = !chatSwitch.checked;
    }
}

function preferencesCallback(event) {
    //console.log(event);
    console.log(this.status);
    if (this.status === 200) {
        console.log(this.responseText);
        if (shouldLeave) {
            window.close();
        }
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

        chatSwitch.value = chat ? 'on' : 'off';

        notationToSettingsPreferences(pref.settings);

        document.getElementById('av0').removeAttribute('checked');
        document.getElementById('av' + avatar).setAttribute('checked','checked');

        document.getElementById('mach-deck-thumb').removeAttribute('checked');
        document.getElementById(deck).setAttribute('checked','checked');
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
        switch (setting) {
            case 'difficulty':
                document.getElementById('diff3').removeAttribute('checked');
                document.getElementById('diff' + (1+ +rule)).setAttribute('checked','checked');
                break;
            case 'timeout':
                timeoutInput.value = +rule / 1000;
                break;
            case 'aceHigh':
                if (rule != 'false') {
                    aceHighSwitch.value = 'on';
                } else {
                    aceHighSwitch.value = 'off';
                }
                break;
            case 'botPlayTime':
                botPlayTimeInput.value = +rule / 1000;
                break;
            case 'botThinkTime':
                botThinkTimeInput.value = +rule / 1000;
                break;
            default:
        }
    }
    syncValWithSwitch()
}