# TODO

This file contains a list of things we have yet TODO in no particular order

### Front End

* Replace the favicon
* Make it look pretty (CSS)
* Reduce card image quality to save load time - DONE
* fix nav display issue for sm and xs screens
* fix invisible nav toggle
* fix hover text color changes
* Add card image choices (MachTarok, Industrie Und Gluck, etc.)
* Add spelling variation preferences (Trull vs Trul, Povenost vs Povinnost vs Povinost, Honery vs Pane, Little Ones vs Tarocky, Big Ones vs Taroky, etc.)

### Back End

* Add Artificial Intelligence interactions
  * Primary AI: plays against itself
  * Secondary AI: deep learning based on players in ranked play
  * Tertiary AIs: deep learning based on each individual player's play style. One per player who has an account
  * GPU usage
  * Separate AI server
* Add TODOs to this list
* Add command-line argument outline
* Add persistent debug logs
* Add variations and variation requests
* Expand available room settings
* Connect a database (likely MariaDB) for player info
  * Stores ELO ratings
  * Stores default settings
  * Potential: user pfp?
  * Potential: game history?
  * AI deep-learning bots are stored on the AI server, not the user database
* Include ELO ratings for players and bots
* Add ranked matches for competitive play
* Increase back-end modularity for ease of variation additions