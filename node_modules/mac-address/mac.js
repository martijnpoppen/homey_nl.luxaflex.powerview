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

var LENGTH = 6;
module.exports.LENGTH = LENGTH;

// [0x11, 0x22, 0x33, 0x44, 0x55, 0x66] ==> '11:22:33:44:55:66'
module.exports.toString = function(buf, offset) {
  offset = ~~offset;

  _validateLength(buf, offset);

  var string = '';
  var byteList = [];
  for (var i = 0; i < LENGTH; ++i) {
    var tmpByte = buf.readUInt8(offset + i);
    var tmpStr = tmpByte.toString(16);
    if (tmpStr.length < 2) {
      tmpStr = '0' + tmpStr;
    }
    byteList.push(tmpStr);
  }

  return byteList.join(':');
};

// '11:22:33:44:55:66' ==> [0x11, 0x22, 0x33, 0x44, 0x55, 0x66]
module.exports.toBuffer = function(string, buf, offset) {
  offset = ~~offset;
  buf = (buf instanceof Buffer) ? buf : new Buffer(LENGTH + offset);

  _validateLength(buf, offset);

  var values = string.split(':');
  if (!values || values.length !== LENGTH) {
    throw(new Error('Invalid MAC [' + string +
                    ']; should follow pattern [##:##:##:##:##:##]'));
  }

  for (var i = 0; i < LENGTH; ++i) {
    var tmpByte = parseInt(values[i], 16);
    buf.writeUInt8(tmpByte, offset + i);
  }

  return buf;
};

function _validateLength(buf, offset) {
  if (buf.length < offset + LENGTH) {
    throw(new Error('Buffer is not large enough to store a ' + LENGTH +
                    '-byte MAC starting at offset [' + offset + '].  Total ' +
                    'length is [' + buf.length + ']'));
  }
}
