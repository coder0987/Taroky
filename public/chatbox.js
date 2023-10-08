//These functions will all need to be changed
//Feel free to do whatever with them, so long as they get the messages to the players

const maxMessages = 16;

function addMessage(theString) {
    console.log(theString);
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    toInsert.innerHTML = theString;
    container.insertBefore(toInsert, container.firstChild);
    clearAllButXMessages(maxMessages);
}
function addBoldMessage(theString) {
    console.log('BOLD: ' + theString);
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    let bold = document.createElement('strong');
    let text = document.createTextNode(theString);
    bold.appendChild(text);
    toInsert.appendChild(bold);
    container.insertBefore(toInsert, container.firstChild);
    clearAllButXMessages(maxMessages);
}
function addError(theString) {
    //Maybe make it red or something?
    console.error(theString);
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    toInsert.innerHTML = theString;
    container.insertBefore(toInsert, container.firstChild);
    clearAllButXMessages(maxMessages);
}
function playerSentMessage(thePlayer,theMessage) {
    console.log(thePlayer + ': ' + theMessage)
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    toInsert.innerHTML = thePlayer + ': ' + theMessage;
    container.insertBefore(toInsert, container.firstChild);
    clearAllButXMessages(maxMessages);
}
function clearChat() {
    //For when we have an actual chatbox
    document.getElementById('chatbox').innerHTML = '<p></p>';
}
function clearLastXMessages(x) {
    //For when we have an actual chatbox
    let messagesToClear = document.getElementById('chatbox').children;
    for (let i = messagesToClear.length - 1; i >= 0 && i>= messagesToClear.length - x - 1; i--) {
        document.getElementById('chatbox').removeChild(document.getElementById('chatbox').children[i]);
    }
}

function clearAllButXMessages(x) {
    let messagesToClear = document.getElementById('chatbox').children;
    for (let i = messagesToClear.length - 1; i >= x; i--) {
        document.getElementById('chatbox').removeChild(document.getElementById('chatbox').children[i]);
    }
}