class ChatBox {
    constructor(maxChatMessages) {
        this.container = document.getElementById('chatbox');
        this.chatMessages = [];
        this.maxChatMessages = maxChatMessages;
    }

    addServerMessage(messageText,bold=false) {
        let author = 'MachTarok';
        let currentTimestamp = getFormattedTime();
        if (!messageText) { return; }
        let lastMessage = this.getLastMessage();
        if (this.shouldAppend(lastMessage, author, currentTimestamp, false)) {
            lastMessage.addNewLineOfMessage(messageText,bold);
        } else {
            let message = new ChatMessage(author, messageText, bold, false);
            this.chatMessages.push(message);
            this.container.appendChild(message.getHtmlElement());
            if (this.chatMessages.length > this.maxChatMessages) {
                // remove oldest chat message til we are under the maximum
                while (this.chatMessages.length > this.maxChatMessages) {
                    this.removeOldestMessage()
                }
            }
        }
        this.updateScrollHeight();
    }

    addErrorMessage(messageText, bold=false) {
        let author = 'MachTarok';
        let currentTimestamp = getFormattedTime();
        if (!messageText) { return; }
        let lastMessage = this.getLastMessage();
        if (this.shouldAppend(lastMessage,author, currentTimestamp, true)) {
            lastMessage.addNewLineOfMessage(messageText, bold);
        } else {
            let message = new ChatMessage(author, messageText, bold, true);
            this.chatMessages.push(message);
            this.container.appendChild(message.getHtmlElement());
            if (this.chatMessages.length > this.maxChatMessages) {
                // remove oldest chat message til we are under the maximum
                while (this.chatMessages.length > this.maxChatMessages) {
                    this.removeOldestMessage()
                }
            }
        }
        this.updateScrollHeight();
    }

    addPlayerMessage(author, messageText) {
        let currentTimestamp = getFormattedTime();
        if (!messageText) { return; }
        let lastMessage = this.getLastMessage();
        if (this.shouldAppend(lastMessage, author, currentTimestamp, false)) {
            lastMessage.addNewLineOfMessage(messageText, false);
        } else {
            let message = new ChatMessage(author, messageText, false, false);
            this.chatMessages.push(message);
            this.container.appendChild(message.getHtmlElement());
            if (this.chatMessages.length > this.maxChatMessages) {
                // remove oldest chat message til we are under the maximum
                while (this.chatMessages.length > this.maxChatMessages) {
                    this.removeOldestMessage()
                }
            }
        }
        this.updateScrollHeight();
    }

    shouldAppend(lastMessage, author, currentTimestamp, isError) {
        return lastMessage && author == lastMessage.getAuthor() && currentTimestamp == lastMessage.getTimestamp() && isError == lastMessage.getIsError();
    }

    getLastMessage() {
        if (this.chatMessages.length > 0) {
            return this.chatMessages[this.chatMessages.length - 1];
        } else {
            return null; // Return null if there are no messages
        }
    }

    getNumMessages() {
        return this.chatMessages.length;
    }

    removeOldestMessage() {
        let oldestMessage = this.getLastMessage();
        oldestMessage.getHtmlElement().parentNode.removeChild(oldestMessage.getHtmlElement());
    }

    removeMessage(message) {
        if (message) {
            message.getHtmlElement().parentNode.removeChild(message.getHtmlElement());
        }
    }

    updateScrollHeight() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    clearAllMessages() {
        for (let message in this.chatMessages) {
            if (message) {
                this.removeMessage(message);
            }
        }
    }
}

class ChatMessage {
    constructor(author, message, bold, isError) {
        this.author = author;
        this.timestamp = getFormattedTime();
        this.text = [message];
        this.isError = isError
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
        if (this.isError) {
            message.classList.add('error-message');
        } else {
            message.classList.add('regular-message');
        }

        let messageText = document.createElement('span');
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

    getHtmlElement() {
        return this.htmlElement;
    }

    getMessageHtml() {
        return this.messageHtml;
    }

    getIsError() {
        return this.isError;
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

class GameLog {
    constructor() {
        this.container = document.getElementById('gamelog');
        this.logMessages = [];
    }

    addGameLogMessage(subject,messageText) {
        let currentTimestamp = getFormattedTime();
        if (!messageText) { return; }
        let message = new GameLogMessage(subject,messageText);
        //TODO: implement
    }
}

class GameLogMessage {
    //unlike chat messages each message is on 1 line
    constructor(subject, message, bold) {
        this.subject = subject;
        this.timestamp = getFormattedTime();
        this.text = message;
        //this.messageHtml = this.createMessageHtml(message); //this is done in createHtml
        this.htmlElement = this.createHtml(message, bold);
    }

    createHtml(subject, messageString) {
        let messageContainer = document.createElement('div');
        return messageContainer;
    }

    createMessageHtml(subject, messageString, bold) {
        let message = document.createElement('p');
        message.classList.add('game-log-message');

        let subjectText = document.createElement('span');
        subjectText.innerHTML = subject;


        let messageText = document.createElement('span');
        messageText.innerHTML = messageString;
        messageText.classList.add('game-log-message-text');
        if (bold) { messageText.classList.add('bold'); }
        message.appendChild(messageText);

        let timestamp = getTimestampSpan(this.timestamp);
        message.appendChild(timestamp);

        return message;
    }

    getSubject() {
        return this.subject;
    }

    getTimestamp() {
        return this.timestamp;
    }

    getHtmlElement() {
        return this.htmlElement;
    }

    getMessageHtml() {
        return this.messageHtml;
    }
}

class Ledger {
    //class for logic for showing overall chip change of the session
    //TODO implement
}

//These functions will all need to be changed
//Feel free to do whatever with them, so long as they get the messages to the players
const maxMessages = 256;
let chatBox;
$(document).ready(function () {
    chatBox = new ChatBox(maxMessages);
});
function addMessage(theString) {
    console.log(theString);
    chatBox.addServerMessage(theString);
}
function addBoldMessage(theString) {
    console.log('Bold: ' + theString);
    chatBox.addServerMessage(theString, true)
}
function addError(theString) {
    console.error('ERROR: ' + theString);
    chatBox.addErrorMessage(theString);
}
function playerSentMessage(thePlayer,theMessage) {
    console.log(thePlayer + ': ' + theMessage);
    chatBox.addPlayerMessage(thePlayer, theMessage);
}
function clearChat() {
    console.log('Clearing Chat');
    chatBox.clearAllMessages();
}
function clearLastXMessages(x) {
    for (let i = 0; i < x; i++) {
        chatBox.removeOldestMessage();
    }
}

function clearAllButXMessages(x) {
    let numToDelete = chatBox.getNumMessages() - x;
    while (numToDelete > 0) {
        chatBox.removeOldestMessage();
    }
}


//UTIL funcs
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

function enableChat() {
    document.getElementById('chat-send-button').classList.remove('disabled');
    document.getElementById('chat-input').placeholder = 'Your Message (press Enter to submit)';
    document.getElementById('chat-input').removeAttribute('readonly')
}
function disableChat() {
    document.getElementById('chat-send-button').classList.add('disabled');
    document.getElementById('chat-input').placeholder = 'Sign in to send chat messages';
    document.getElementById('chat-input').setAttribute('readonly','true');
}