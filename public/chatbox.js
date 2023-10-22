//Classes to try and organize a little
class ChatBox {
    constructor() {
        this.container = document.getElementById('chatbox');
        this.messages = [];
    }

    addServerMessage(messageText,bold=false) {
        let author = 'MachTarok';
        let currentTimestamp = getFormattedTime();
        if (!messageText) { return; }
        let lastMessage = this.getLastMessage();
        if (lastMessage && author == lastMessage.getAuthor() && currentTimestamp == lastMessage.getTimestamp()) {
            lastMessage.addNewLineOfMessage(messageText,bold);
        } else {
            let message = new Message(author, messageText, bold);
            this.messages.push(message);
            this.container.appendChild(message.getHTMLElement());
        }
        this.updateScrollHeight();
    }

    addPlayerMessage(author, messageText) {
        let currentTimestamp = getFormattedTime();
        if (!messageText) { return; }
        let lastMessage = this.getLastMessage();
        if (lastMessage && author == lastMessage.getAuthor() && currentTimestamp == lastMessage.getTimestamp()) {
            lastMessage.addNewLineOfMessage(messageText, false);
        } else {
            let message = new Message(author, messageText, false);
            this.messages.push(message);
            this.container.appendChild(message.getHTMLElement());
        }
        this.updateScrollHeight();
    }

    getLastMessage() {
        if (this.messages.length > 0) {
            return this.messages[this.messages.length - 1];
        } else {
            return null; // Return null if there are no messages
        }
    }
    updateScrollHeight() {
        this.container.scrollTop = this.container.scrollHeight;
    }
}

class Message {
    constructor(author, message, bold) {
        this.author = author;
        this.timestamp = getFormattedTime();
        this.text = [message];
        //this.messageHtml = this.createMessageHtml(message); //this is done in createHtml
        this.htmlElement = this.createHtml(message, bold);
    }

    createHtml(messageString, bold) {
        //Create overall contaitner which holds author and chat bubble
        let messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container');

        //Create Author container and text
        let author = document.createElement('div');
        author.classList.add('author-container');
        let authorText = document.createElement('p');
        authorText.classList.add('author-text');
        authorText.innerHTML = this.author + ':';
        author.appendChild(authorText);

        //Get chat bubble which holds messages and timestamp
        let chatBubble = document.createElement('div');
        chatBubble.classList.add('chat-bubble');

        //Create message
        this.messageHtml = this.createMessageHtml(messageString, bold);

        //Add message to chat bubble
        chatBubble.appendChild(this.messageHtml);

        //Add to author and chat bubble to the message container
        messageContainer.appendChild(author);
        messageContainer.appendChild(chatBubble);

        return messageContainer;
    }

    createMessageHtml(messageString, bold) {
        let message = document.createElement('p');
        message.classList.add('message');

        let messageText;
        messageText = document.createElement('span');
        messageText.innerHTML = messageString;
        messageText.classList.add('message-text');
        if (bold) { messageText.classList.add('bold'); }
        message.appendChild(messageText);


        let timestamp = getTimestampSpan(this.timestamp);
        message.appendChild(timestamp);

        return message;
    }

    getAuthor() {
        return this.author;
    }

    getTimestamp() {
        return this.timestamp;
    }

    getHTMLElement() {
        return this.htmlElement;
    }

    getMessageHtml() {
        return this.messageHtml;
    }

    addNewLineOfMessage(newMessageText,bold) {
        this.text.push(newMessageText);
        let message = this.messageHtml;

        let messageText = document.createElement('span');
        messageText.innerHTML = newMessageText;
        messageText.classList.add('message-text');
        if (bold) { messageText.classList.add('bold'); }

        let timestamp = message.lastElementChild; //get last element
        message.insertBefore(messageText, timestamp);
    }
}


//These functions will all need to be changed
//Feel free to do whatever with them, so long as they get the messages to the players
const maxMessages = 256;
let chatBox;
$(document).ready(function () {
    chatBox = new ChatBox();
});
function addMessage(theString) {
    console.log(theString);
    chatBox.addServerMessage(theString);
}
function addBoldMessage(theString) {
    console.log('BOLD: ' + theString);
    chatBox.addServerMessage(theString, true)
    /*let container = document.getElementById('chatbox');
    let toInsert = document.createElement("p");
    let bold = document.createElement('strong');
    let text = document.createTextNode(theString);
    bold.appendChild(text);
    toInsert.appendChild(bold);
    container.insertBefore(toInsert, container.firstChild);
    clearAllButXMessages(maxMessages);*/
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
    console.log(thePlayer + ': ' + theMessage);
    chatBox.addPlayerMessage(thePlayer, theMessage);
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

function getFormattedTime() {
    const date = new Date(Date.now());
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12; //convert 0 to 12
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    return formattedTime;
}

function getTimestampSpan(time) {
    let timestamp = document.createElement("span");
    timestamp.innerHTML = time
    timestamp.classList.add("timestamp");
    return timestamp;
}


