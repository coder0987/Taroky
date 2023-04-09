## Mach Taroky
An online multiplayer Taroky game for 1-4 players.

This project is under active development and the latest beta release is available at https://machtarok.com.

For more information on gameplay and rules, see gameplay.md

Note that every group plays a different variation of Taroky, and these rules may not align with ones you are familiar with

### Self Hosting

Prerequisites: 

- NodeJS

Download and unpack the ZIP file

1. Change working directories to the installed folder\
`cd Taroky`


2. run `sudo npm install`


3. On Windows, run the run.bat file\
`./run.bat`\
On Linux, run the run.sh file\
`sh run.sh`

In both cases, the server will automatically restart on crash. The server will bind to port 8442 by default. Edit the server.listen(8442) statement at the end of _server.js to change this

### Debugging and Development

Notice a bug and want to help fix it? MachTarok has built-in development tools for just that

When starting the server, use\
`node _server.js debug 5`

This will activate debug mode and set log level to 5\
These are the log levels:

0.  Server crashes only 
1. Recoverable Errors 
2. Warnings 
3. Informational (default)
4. Debug 
5. Trace

This will also switch the service port to 8448, which allows for a development version and a production version to be run simultaneously

### Credits

Created by Samuel, Lauren, and James Mach

Art is credited in /assets/default-deck/deck-info.md
