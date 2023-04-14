## Taroky Notation

An efficient method of transporting game data

### Breakdown

Taroky Notation starts off with a shuffled deck dealt out to each of the 4 players, along with chips counts

For the first game, it will look like this:

100/100/100/100/hand1/hand2/hand3/hand4/talon

Where the hands are each 12 cards like this:

Hand 1 belongs to Povinnost, then it proceeds counter-clockwise around the table

S1 Ace of spades\
HK King of hearts\
CR Rider of Clubs\
DJ Jack of Diamonds\
T01 The Pagat (I of trump)

Each card is decoded like this

Suit
S spades
H hearts
C clubs
D diamonds
T trump

Value (1 digit)
 * K king
 * Q queen
 * R rider
 * J jack
 * 4 4 / 10
 * 3 3 / 9
 * 2 2 / 8
 * 1 1 / 7

Trump Value (2 digits)
 * 01 I
 * 04 IIII
 * 14 XIV
 * 17 XVII
 * 22 Skyz

A hand is 12 cards strung together\
T05SKDRT18HRHKT07 etc.

With no spacing between cards

After the hands is drawing the talon

The P# flag is used to signal prever

.../talon/P1

Where 1 is Povinnost, etc. to 4

Without prever, the cards are assumed to be drawn from the first part of the talon and around

If a card is instead passed and not rejected, the gift flag is used

.../talon/G2

If it is offered and rejected, instead the GR flag is used

.../talon/GR2

The notation allows for both players to pass as well

.../talon/GR2GR3/

Then comes discarding

.../talon/HAH2H3S4C3S2/

Povinnost discards 4 cards, then the others follow

For prever,

.../talon/P1/T/HAH2H3/

Where T is top, B is bottom, and R is returned to top

Then moneycards are called

 * U uni
 * B bida
 * T tarocky
 * R taroky (rhuba not sure how to spell it lol)
 * 3 Trul
 * H honery
 * K Rosa-honery (k for kings)
 * P Rosa-honery plus (p for plus)

...discard/U1B2T3R4/

If Povinnost does not call bida or uni, it won't be listed in the moneycards

The partner card is listed

 * 9 XIX
 * 8 XVIII
 * 7 XVII
 * 6 XVI
 * 5 XV

.../moneycards/9/

In prever games, this is ignored

.../moneycards/...

Valat

Whoever calls valat receives the V flag

.../9/V1/

Similarly, the C flag is given for contra

Rhea- and supra- contra are listed in order, like so:

.../9/C2C1C2/

I on the End is given a similar flag

.../9/C2/I1/

Then tricks are denoted by cards and separated by slashes. The winner is placed at the end of the trick

.../I1/T02T04T15T194/...

After the 12 tricks, different settings are shown

.../trick12/settings

Settings are in the form FLAG=VALUE;FLAG=VALUE; etc.

For example

ACEWINS=true;

TIMEOUT=30;

DIFFICULTY=AI

The last setting in the list denotes who the player was in relation to Povinnost

...settings;pn=1

### All Together

chips/hands/talon/pass/discard/moneycards/partner/valat/contra/iote/tricks/settings

Or for prever

chips/hands/talon/prever/discard/moneycards/valat/contra/iote/tricks/settings

### Examples

Default game directly after cards were dealt:

100/100/100/100/H1H2H3H4HJHRHQHKS1S2S3S4/SJSRSQSKD1D2D3D4DJDRDQDK/C1C2C3C4CJCRCQCKT01T02T03T04/T05T06T07T08T09T10T11T12T13T14T15T16/T17T18T19T20T21T22/;pn=0

Default game where Povinnost may call Uni:

100/100/100/100/H1H2H3H4HJHRHQHKS1S2S3S4/T17T18T19T20T21T22D3D4DJDRDQDK/C1C2C3C4CJCRCQCKT01T02T03T04/T05T06T07T08T09T10T11T12T13T14T15T16/SJSRSQSKD1D2/timeout=0;pn=0
