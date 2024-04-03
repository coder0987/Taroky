let form;
let saveButton;
let chatSwitch;
let aceHighSwitch;
let timeout;
const SHOW_TOUR = false;
let userNameToken = '';

window.addEventListener('load', function() {
    form = document.getElementById('form');
    saveButton = document.getElementById('saveUP');
    chatSwitch = document.getElementById('chatSwitch');
    aceHighSwitch = document.getElementById('aceHigh');
    timeout = document.getElementById('timeout');
    form.addEventListener('submit', send, true)

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
        //location.replace('https://machtarok.com/');
    }
}, false);

function preferencesCallback(event) {
    //console.log(event);
    console.log(this.status);
    if (this.status === 200) {
        console.log(this.responseText);
    } else {
        console.log('Error: ');
        console.log(this.responseText);
    }
}

function getPreferencesCallback(event) {
    //console.log(event);
    console.log(this.status);
    if (this.status === 200) {
        let pref = JSON.parse(this.responseText)

    } else {
        console.log('Error: ');
        console.log(this.responseText);
    }
}

function send(e) {
    let formData = Object.fromEntries(new FormData(form).entries())

    console.log(formData);

    if (formData.deck) {
        document.cookie = 'deck=' + formData.deck;
    }

    const req = new XMLHttpRequest();
    req.addEventListener("load", preferencesCallback);
    req.open("POST", "/preferences", true);

    req.setRequestHeader("Authorization", 'Basic ' + userNameToken);
    req.send(new FormData(form).entries());
    e.preventDefault();
}