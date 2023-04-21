const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

/*TODO
    The admin panel is to help facilitate control of the server and should
    only be accessible by administrators. Currently this is done by not forwarding
    a domain to this port. However, in the future, I'd like admins to be able to
    remotely deal with problems by signing in to admin accounts and using the panel from
    there. When that happens, this won't need to be a separate http server at all.
    Until then, this is the admin panel.
    */

class AdminPanel {
static shouldRestartServer = false;
static startAdminPanel(port) {
    const panel = http.createServer((req, res) => {
        if (req.method == 'GET') {
            let q = url.parse(req.url, true);
            let filename = '.' + q.pathname;
            if (filename == '.' || filename == './') {
                filename = './_admin.html';
            }
            if (filename.lastIndexOf('.') < filename.lastIndexOf('/')) {
                filename += '.html';
            }
            let ext = path.parse(filename).ext;
            let MIME_TYPE = {
                '.ico': 'image/png',
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.css': 'text/css',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.wav': 'audio/wav',
                '.mp3': 'audio/mpeg',
                '.svg': 'image/svg+xml',
                '.pdf': 'application/pdf',
                '.doc': 'application/msword'
            };
            fs.readFile(filename, function (err, data) {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    return res.end("404 Not Found");
                }
                res.writeHead(200, { 'Content-Type': MIME_TYPE[ext] || 'text/plain' });
                res.write(data);
                return res.end();
            });
        } else {
            //POST
            let success = true;
            let q = url.parse(req.url, true);
            SERVER.log('Admin action: ' + q.pathname);

            switch (q.pathname) {
                case '/RESTART_WHEN_NEXT_EMPTY':
                    //Next time there are no players, restart the server
                    AdminPanel.shouldRestartServer = true;
                    break;
                //This is where we can add more functions to the admin panel
            }


            if (success) {
                res.writeHead(200);
                return res.end();
            } else {
                res.writeHead(400);
                return res.end();
            }
        }
    });

    panel.listen(port);
    SERVER.log('Admin panel available at http://localhost:' + port + '/');
}
}

module.exports = AdminPanel;
