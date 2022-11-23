//These functions will all need to be changed
//Feel free to do whatever with them, so long as they get the messages to the players

function addMessage(theString) {
    console.log(theString);
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    toInsert.innerHTML = theString;
    container.insertBefore(toInsert, container.firstChild);
}
function addError(theString) {
    //Maybe make it red or something?
    console.error(theString);
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    toInsert.innerHTML = theString;
    container.insertBefore(toInsert, container.firstChild);
}
function playerSentMessage(thePlayer,theMessage) {
    console.log(thePlayer + ': ' + theMessage)
    let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    toInsert.innerHTML = thePlayer + ': ' + theMessage;
    container.insertBefore(toInsert, container.firstChild);
}
function clearChat() {
    //For when we have an actual chatbox
    document.getElementById('chatbox').innerHTML = '<p></p>';
}
function clearLastXMessages(x) {
    //For when we have an actual chatbox
}