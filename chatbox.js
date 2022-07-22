//These functions will all need to be changed
//Feel free to do whatever with them, so long as they get the messages to the players

function addMessage(theString) {
    console.log(theString);
}
function addError(theString) {
    //Maybe make it red or something?
    console.error(theString);
}
function playerSentMessage(thePlayer,theMessage) {
    console.log(thePlayer + ': ' + theMessage)
}
function clearChat() {
    //For when we have an actual chatbox
}
function clearLastXMessages(x) {
    //For when we have an actual chatbox
}