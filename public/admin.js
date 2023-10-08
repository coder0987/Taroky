window.onload = () => {
    if (!localStorage.getItem('tarokyInstance')) {
        do {
            localStorage.setItem('tarokyInstance',Math.random()*1000000000000000000);
        } while (localStorage.getItem('tarokyInstance') == 0);
    }

    socket = io({auth: {token: localStorage.getItem('tarokyInstance')}});

    {
        //Auto sign-in using cookies
        let theUsername = getCookie('username');
        let theToken = getCookie('token');
        if (theUsername && theToken) {
            socket.emit('login',theUsername,theToken);
        } else {
            //no admin
            document.getElementById('goAway').removeAttribute('hidden');
            window.location = 'https://machtarok.com/';
        }
    }

    socket.on('admin', function(returnAdmin) {
        if (returnAdmin) {
            //good for you
            document.getElementById('main').removeAttribute('hidden');
            document.getElementById('message').innerHTML = 'Welcome, Admin ' + getCookie('username');
        } else {
            //no access granted
            document.getElementById('goAway').removeAttribute('hidden');
            window.location = 'https://machtarok.com/';
        }
    });

    socket.on('playerList', function(playerData) {
        const tbl = document.getElementById('table');
        tbl.innerHTML = '';

        for (let i in playerData) {
            delete playerData[i].roomsSeen;
            delete playerData[i].pid;
            if (playerData[i].userInfo) {
                playerData[i].admin = playerData[i].userInfo.admin == 1;
                playerData[i].elo = playerData[i].userInfo.elo;
            } else {
                playerData[i].admin = false;
                playerData[i].elo = 'Unranked';
            }
            delete playerData[i].userInfo;
            playerData[i].disconnecting = playerData[i].tempDisconnect;
            delete playerData[i].tempDisconnect;
        }

        const tableHead = tbl.createTHead();
        const headerRow = tableHead.insertRow();
        const usernameHeader = document.createElement('th');
        usernameHeader.appendChild(document.createTextNode('Username'));
        usernameHeader.scope = 'col'
        headerRow.appendChild(usernameHeader);
        for (let value in playerData[0]) {
            if (value != 'username') {
                const td = document.createElement('th');
                td.appendChild(document.createTextNode(value));
                td.scope = 'col';
                headerRow.appendChild(td);
            }
        }
        const actionHeader = document.createElement('th');
        actionHeader.appendChild(document.createTextNode('Actions'));
        actionHeader.scope = 'col'
        headerRow.appendChild(actionHeader);

        const tableBody = tbl.createTBody();
        for (let i = 0; i < playerData.length; i++) {
            const tr = tableBody.insertRow();
            const th = document.createElement('th');
            th.scope = 'row';
            th.innerHTML = playerData[i].username;
            tr.appendChild(th);
            for (let value in playerData[i]) {
                if (value != 'username') {
                    const td = tr.insertCell();
                    td.appendChild(document.createTextNode(
                        typeof playerData[i][value] == 'object' ?
                            /*JSON.stringify(playerData[i][value])*/ 'obj' :
                            playerData[i][value]
                    ));
                }
            }
            const action = document.createElement('td');
            const message = document.createElement('button');
            message.id = playerData[i].id;
            message.addEventListener('click',msg);
            message.innerHTML = 'Message';
            message.classList.add('btn');
            message.classList.add('btn-primary');
            action.appendChild(message);
            tr.appendChild(action);
        }
    });
    socket.on('roomList', function(roomData) {
        const tbl = document.getElementById('roomTable');
        tbl.innerHTML = '';

        for (let i in roomData) {
            for (let p in roomData[i]) {
                //todo: remove unnecessary data
                roomData[i][p.substring(1)] = roomData[i][p];
                delete roomData[i][p];
            }
            delete roomData[i].settings;
        }

        const tableHead = tbl.createTHead();
        const headerRow = tableHead.insertRow();
        const nameHeader = document.createElement('th');
        nameHeader.appendChild(document.createTextNode('Name'));
        nameHeader.scope = 'col'
        headerRow.appendChild(nameHeader);
        for (let value in roomData[0]) {
            if (value != 'name') {
                const td = document.createElement('th');
                td.appendChild(document.createTextNode(value));
                td.scope = 'col';
                headerRow.appendChild(td);
            }
        }
        const actionHeader = document.createElement('th');
        actionHeader.appendChild(document.createTextNode('Actions'));
        actionHeader.scope = 'col'
        headerRow.appendChild(actionHeader);

        const tableBody = tbl.createTBody();
        for (let i = 0; i < roomData.length; i++) {
            const tr = tableBody.insertRow();
            const th = document.createElement('th');
            th.scope = 'row';
            th.innerHTML = roomData[i].name;
            tr.appendChild(th);
            for (let value in roomData[i]) {
                if (value != 'name') {
                    const td = tr.insertCell();
                    td.appendChild(document.createTextNode(
                        typeof roomData[i][value] == 'object' ?
                            /*JSON.stringify(playerData[i][value])*/ 'obj' :
                            roomData[i][value]
                    ));
                }
            }
            const action = document.createElement('td');
            const remove = document.createElement('button');
            remove.id = roomData[i].name;
            remove.addEventListener('click',rmv);
            remove.innerHTML = 'Remove';
            remove.classList.add('btn');
            remove.classList.add('btn-primary');
            action.appendChild(remove);
            tr.appendChild(action);
        }
    });

    socket.on('disconnect', function() {
        document.getElementById('status').innerHTML = 'Disconnected';
    });
}

function msg(event) {
    let id = this.id;
    let message = prompt('Message to send');
    if (message.length > 0) {
        socket.emit('adminMessage',id,message);
    }
}

function rmv(event) {
    let id = this.id;
    socket.emit('removeRoom',id);
}

//thanks w3 schools
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}