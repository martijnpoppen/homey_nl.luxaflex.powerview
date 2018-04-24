# mac-address

MAC address parsing functions.

[![Build Status](https://travis-ci.org/wanderview/node-mac-address.png)](https://travis-ci.org/wanderview/node-mac-address)

## Example

```javascript
var mac = require('mac-address');
var bufferEqual = require('buffer-equal');

var string = '11:22:33:44:55:66';
var buffer = new Buffer([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);

// basics
mac.LENGTH === 6;                           // true
mac.toString(buffer) === string;            // true
bufferEqual(mac.toBuffer(string), buffer);  // true

var longBuffer = new Buffer(1024);
var offset = 512;

// write directly into an existing buffer
mac.toBuffer(string, longBuffer, offset);

// parse out of the middle of a buffer
mac.toString(longBuffer, offset);

// exceptions
mac.toString(new Buffer(mac.LENGTH - 1));   // throws illegal length Error
mac.toBuffer('zz:xx::b:blarg');             // throws illegal format Error
```
