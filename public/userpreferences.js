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
    aceHighSwitch = document.getElementById('aceHigh');
    timeoutInput = document.getElementById('timeout');
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
        let settings = pref.settings;
        let [aceHigh, difficulty, timeout, lock] = settings.split(';');
        let avatar = pref.avatar;
        let deck = pref.deck;
        let chat = pref.chat;

        timeoutInput.value = timeout;
        document.getElementById('av0').removeAttribute('checked');
        document.getElementById('av' + avatar).setAttribute('checked','checked');
        //todo load the rest of the settings
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