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
        tbl.id = 'table';
        tbl.style.width = '100px';
        tbl.style.border = '1px solid black';

        const headerRow = tbl.insertRow();
        for (let value in playerData[0]) {
            const td = headerRow.insertCell();
            td.appendChild(document.createTextNode(value));
            td.style.border = '1px solid black';
        }

        for (let i = 0; i < playerData.length; i++) {
            const tr = tbl.insertRow();
            for (let value in playerData[i]) {
                const td = tr.insertCell();
                td.appendChild(document.createTextNode(
                    typeof playerData[i][value] == 'object' ?
                        JSON.stringify(playerData[i][value]) :
                        playerData[i][value]
                ));
                td.style.border = '1px solid black';
            }
        }
    });
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