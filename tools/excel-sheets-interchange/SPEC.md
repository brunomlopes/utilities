## Overview

This repository contains a javascript web app in nextjs to assist in copying data to and from microsoft excel and google sheets.


## Features

### UI

- This will be a single screen application, all client-side
- There will be a switch to toggle the direction from excel (input) to sheets (output), or from sheets (input) to excel (output).
- There will be a dropbox to select which culture is used on excel (english, portuguese, default to english)
- There will be a dropbox to select which culture is used on google sheets (english, portuguese, default to english)
- The switch and the dropboxes will store the selected value on local storage, so that a user only needs to pick the options once
- No other storage is in scope
- There will be an input text box to paste text
- When text is pasted, it is interpreted, converted and placed on an output text box
- There will be a button to place the text from the output text box into the user's clipboard
- There will be a button to replace the input text box content with the content of the user's clipboard

### Text interpretation and conversion

When text is pasted into the input box, the following conversions are handled:
Input.1 - We consider that text is a tab-separated sequence of either strings or numbers
Input.2 - Numbers are interpreted using the culture selected for the input
Input.3 - Any currency symbol is removed
Input.4 - If a cell contains just - , or a currency symbol and -, it is considered to be the number 0

The output text box is then filled with the same sequence:
Output.1 - Numbers are converted to strings using the culture selected for the output