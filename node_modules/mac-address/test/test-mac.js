// Copyright (c) 2013, Benjamin J. Kelly ("Author")
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

'use strict';

var mac = require('../mac');

var MAC_BUF = new Buffer([0x11, 0x02, 0x30, 0x4f, 0x05, 0xf6]);
var MAC_STR = '11:02:30:4f:05:f6';

module.exports.toString = function(test) {
  test.expect(1);
  test.equal(MAC_STR, mac.toString(MAC_BUF));
  test.done();
};

module.exports.toStringOffset = function(test) {
  test.expect(1);
  var longBuf = new Buffer(20);
  var offset = 10;
  MAC_BUF.copy(longBuf, offset);
  test.equal(MAC_STR, mac.toString(longBuf, offset));
  test.done();
};

module.exports.toStringLength = function(test) {
  test.expect(1);
  var buf = MAC_BUF.slice(0, mac.LENGTH - 1);
  test.throws(function() {
    mac.toString(buf);
  });
  test.done();
};

module.exports.toBuffer = function(test) {
  test.expect(1);
  test.deepEqual(MAC_BUF, mac.toBuffer(MAC_STR));
  test.done();
};

module.exports.toBufferUpperCase = function(test) {
  test.expect(1);
  test.deepEqual(MAC_BUF, mac.toBuffer(MAC_STR.toUpperCase()));
  test.done();
};

module.exports.toBufferExisting = function(test) {
  test.expect(2);
  var buf = new Buffer(MAC_BUF);
  test.equal(buf, mac.toBuffer(MAC_STR, buf));
  test.deepEqual(MAC_BUF, buf);
  test.done();
};

module.exports.toBufferExistingOffset = function(test) {
  test.expect(2);
  var buf = new Buffer(20);
  var offset = 11;
  MAC_BUF.copy(buf, offset);
  test.equal(buf, mac.toBuffer(MAC_STR, buf, offset));
  test.deepEqual(MAC_BUF, buf.slice(offset, offset + mac.LENGTH));
  test.done();
};

module.exports.toBufferExistingLength = function(test) {
  test.expect(1);
  var buf = MAC_BUF.slice(0, mac.LENGTH - 1);
  test.throws(function() {
    test.toBuffer(MAC_STR, buf);
  });
  test.done();
};
