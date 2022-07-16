const http = require('http');
const url = require('url');
const fs = require('fs');

http.createServer(function (req, res) {
  var q = url.parse(req.url, true);
  var filename = "." + q.pathname;
  if (filename == '.' || filename == './') {
    filename = './index.html';
  }
  let mimeType = 'text/html';
  if (~filename.indexOf('.js')) {
    mimeType = 'application/javascript';
  }
  if (~filename.indexOf('.css')) {
    mimeType = 'text/css';
  }
  fs.readFile(filename, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    } 
    res.writeHead(200, {'Content-Type': mimeType});
    res.write(data);
    return res.end();
  });
}).listen(8080);
console.log('Listening on port 8080');