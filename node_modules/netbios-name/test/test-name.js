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

var NBName = require('../name');

module.exports.testNewSimpleName = function(test) {
  test.expect(5);
  var name = 'foobar';
  var nbname = new NBName({fqdn: name});
  test.equals(nbname.error, null);
  test.equals(nbname.paddedName.length, 15);
  test.equals(nbname.paddedName, 'foobar         ');
  test.equals(nbname.scopeId, '');
  test.equals(nbname.name, name);
  test.done();
};

module.exports.testNewBadSimpleName = function(test) {
  test.expect(1);
  var name = 'ThisNameIsTooLong';
  var nbname = new NBName({fqdn: name});
  test.notEqual(nbname.error, null);
  test.done();
};

module.exports.testNewFullName = function(test) {
  test.expect(6);
  var name = 'snafu.example.com';
  var nbname = new NBName({fqdn: name});
  test.equals(nbname.error, null);
  test.equals(nbname.paddedName.length, 15);
  test.equals(nbname.paddedName, 'snafu          ');
  test.equals(nbname.scopeId, 'example.com');
  test.equals(nbname.name, 'snafu');
  test.equals(nbname.fqdn, name);
  test.done();
};

module.exports.testNewFullName2 = function(test) {
  test.expect(6);
  var name = 'snafu';
  var scopeId = 'example.com';
  var fqdn = name + '.' + scopeId;
  var nbname = new NBName({name: name, scopeId: scopeId});
  test.equals(nbname.error, null);
  test.equals(nbname.paddedName.length, 15);
  test.equals(nbname.paddedName, 'snafu          ');
  test.equals(nbname.scopeId, scopeId);
  test.equals(nbname.name, name);
  test.equals(nbname.fqdn, fqdn);
  test.done();
};

module.exports.testNewBadFullName = function(test) {
  test.expect(1);
  var name = 'ThisNameIsTooLong.example.com';
  var nbname = new NBName({fqdn: name});
  test.notEqual(nbname.error, null);
  test.done();
};

module.exports.testToString = function(test) {
  test.expect(3);

  var nbname = new NBName({fqdn: 'foobar.example.com', suffix: 0x20});
  test.equal(nbname.toString(), 'foobar<20>.example.com');

  nbname = new NBName({fqdn: 'foobar.example.com', suffix: 0x00});
  test.equal(nbname.toString(), 'foobar<00>.example.com');

  nbname = new NBName({fqdn: 'foobar', suffix: 0x00});
  test.equal(nbname.toString(), 'foobar<00>');

  test.done();
};

module.exports.testWriteSimpleName = function(test) {
  test.expect(5);

  var name = 'foobar';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(34);

  var res = nbname.write(buf, 0, {});

  var bytes = 0;

  test.equal(res.error, null);
  test.equal(res.bytesWritten, (1 + 32 + 1));

  var length = buf.readUInt8(bytes);
  bytes += 1;
  test.equal(length, 32, 'encoded length word');

  var encodedString = buf.toString('ascii', bytes, bytes + length);
  bytes += length;
  test.ok(encodedString.match(/^\w+$/), 'encoded contents');

  var terminator = buf.readUInt8(bytes);
  bytes += 1;
  test.equal(terminator, 0, 'zero terminator');

  test.done();
};

module.exports.testWriteBadSimpleName = function(test) {
  test.expect(1);

  var name = 'ABCDEFGHIJKLMNOPQ';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(34);

  var res = nbname.write(buf, 0, {});

  test.notEqual(res.error, null);
  test.done();
};

module.exports.testWriteFullName = function(test) {
  test.expect(9);

  var name = 'foobar.example.com';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var expectedLength = 1;
  expectedLength += 32; // 32 byte netbios name
  expectedLength += 1;  // 1 byte length for 'example'
  expectedLength += 'example'.length;
  expectedLength += 1;  // 1 byte length for 'com'
  expectedLength += 'com'.length;
  expectedLength += 1;  // 1 byte for trailing null byte

  var buf = new Buffer(expectedLength);

  var res = nbname.write(buf, 0, {});
  var bytes = 0;

  test.equal(res.error, null);
  test.equal(res.bytesWritten, expectedLength);

  var length = buf.readUInt8(bytes);
  bytes += 1;
  test.equal(length, 32, 'encoded length word');

  var encodedString = buf.toString('ascii', bytes, bytes + length);
  bytes += length;
  test.ok(encodedString.match(/^\w+$/), 'encoded contents');

  length = buf.readUInt8(bytes);
  bytes += 1;
  test.equal(length, 'example'.length, 'example label length');

  var label = buf.toString('ascii', bytes, bytes + length);
  bytes += length;
  test.equal(label, 'example', 'example label');

  length = buf.readUInt8(bytes);
  bytes += 1;
  test.equal(length, 'com'.length, 'com label length');

  var label = buf.toString('ascii', bytes, bytes + length);
  bytes += length;
  test.equal(label, 'com', 'com label');

  var terminator = buf.readUInt8(bytes);
  bytes += 1;
  test.equal(terminator, 0, 'zero terminator');

  test.done();
};

module.exports.testWriteBadFullName = function(test) {
  test.expect(1);

  var name = 'ABCDEFGHIJKLMNOPQ.example.com';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(34);

  var res = nbname.write(buf, 0, {});
  test.notEqual(res.error, null);
  test.done();
};

module.exports.testWriteShortNameBufferOverrun = function(test) {
  test.expect(1);

  var name = 'foobar';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(30);

  var res = nbname.write(buf, 0, {});
  test.notEqual(res.error, null);
  test.done();
};

module.exports.testWriteFullNameBufferOverrun = function(test) {
  test.expect(1);

  var name = 'foobar.example.com';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(30);

  var res = nbname.write(buf, 0, {});
  test.notEqual(res.error, null);
  test.done();
};

module.exports.testWriteFullNameBufferOverrun2 = function(test) {
  test.expect(1);

  var name = 'foobar.example.com';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(38);

  var res = nbname.write(buf, 0, {});
  test.notEqual(res.error, null);
  test.done();
};

module.exports.testWriteFullNameBadScopeId = function(test) {
  test.expect(1);

  // Create a label > 64 which is illegal
  var longLabel = 'ABC3456789';
  longLabel += '0123456789';
  longLabel += '0123456789';
  longLabel += '0123456789';
  longLabel += '0123456789';
  longLabel += '0123456789';
  longLabel += '0123456789';

  var name = 'foobar.' + longLabel + '.com';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(128);

  var res = nbname.write(buf, 0, {});
  test.notEqual(res.error, null);
  test.done();
};

module.exports.testWriteNoPointers = function(test) {
  test.expect(1);

  var name = 'foobar';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(34);

  var res = nbname.write(buf, 0, null);
  test.equal(res.error, null);
  test.done();
};

module.exports.testWriteShortNamePointer = function(test) {
  test.expect(4);

  var nameMap = {};
  var name = 'foobar';
  var suffix = 0x20;
  var nbname = new NBName({fqdn: name, suffix: suffix});

  var buf = new Buffer(38);
  var bytes = 0;

  var res = nbname.write(buf, bytes, nameMap);
  test.equal(res.error, null);
  bytes += res.bytesWritten;

  var res2 = nbname.write(buf, bytes, nameMap);
  test.equal(res2.error, null);
  test.notEqual(res2.bytesWritten, res.bytesWritten, 'second packed length is different');
  test.equal(res2.bytesWritten, 2, 'second packed length is compressed');
  test.done();
};

module.exports.testWriteFullNamePointer = function(test) {
  test.expect(3);

  var nameMap = {};
  var scopeId = 'example.com';
  var name = 'foobar.' + scopeId;
  var name2 = 'snafu.' + scopeId;

  var suffix = 0x20;

  var nbname = new NBName({fqdn: name, suffix: suffix});
  var nbname2 = new NBName({fqdn: name2, suffix: suffix});

  var expectedLength = 1;
  expectedLength += 32; // 32 byte netbios name
  expectedLength += 1;  // 1 byte length for 'example'
  expectedLength += 'example'.length;
  expectedLength += 1;  // 1 byte length for 'com'
  expectedLength += 'com'.length;
  expectedLength += 1;  // 1 byte for trailing null byte
  expectedLength += 1;  // 1 byte for second netbios name
  expectedLength += 32; // 32 by netbios name
  expectedLength += 2;  // pointer to first scope ID

  var buf = new Buffer(expectedLength);
  var bytes = 0;

  var res = nbname.write(buf, bytes, nameMap);
  test.equal(res.error, null);

  bytes += res.bytesWritten;

  var res2 = nbname2.write(buf, bytes, nameMap);
  test.equal(res2.error, null);

  bytes += res2.bytesWritten;

  test.equal(bytes, expectedLength, 'total expected packed length');

  test.done();
};

module.exports.testReadSimpleName = function(test) {
  test.expect(4);

  verifyList(test, {}, ['foobar']);
  test.done();
};

module.exports.testReadFullName = function(test) {
  test.expect(4);

  verifyList(test, {}, ['foobar.example.com']);
  test.done();
};

module.exports.testReadSimpleNameWithPointer = function(test) {
  test.expect(9);

  var nameList = ['foobar', 'foobar'];
  var expectedLength = 1 + 32 + 1;  // first foobar
  expectedLength += 2;              // second foobar as pointer

  var len = verifyList(test, {}, nameList);
  test.equal(len, expectedLength, 'unpacked number of bytes');
  test.done();
};

module.exports.testReadSimpleNameWithoutPointer = function(test) {
  test.expect(9);

  var nameList = ['foobar', 'foobar'];
  var expectedLength = 1 + 32 + 1;  // first foobar
  expectedLength += 1 + 32 + 1;     // second foobar without pointer

  var len = verifyList(test, null, nameList);
  test.equal(len, expectedLength, 'unpacked number of bytes');
  test.done();
};

module.exports.testReadFullNameWithPointer = function(test) {
  test.expect(9);

  var name = 'foobar';
  var scopeId = '.example.com';
  var fullName = name + scopeId;
  var nameList = [fullName, fullName];
  var expectedLength = 1 + 32 + scopeId.length + 1;   // 1st full name
  expectedLength += 2;                                // 2nd full name w/ ptr

  var len = verifyList(test, {}, nameList);
  test.equal(len, expectedLength, 'unpacked number of bytes');
  test.done();
};

module.exports.testReadFullNameWithoutPointer = function(test) {
  test.expect(9);

  var name = 'foobar';
  var scopeId = '.example.com';
  var fullName = name + scopeId;
  var nameList = [fullName, fullName];
  var expectedLength = 1 + 32 + scopeId.length + 1;   // 1st full name
  expectedLength += 1 + 32 + scopeId.length + 1;      // 2nd full name w/o ptr

  var len = verifyList(test, null, nameList);
  test.equal(len, expectedLength, 'unpacked number of bytes');
  test.done();
};

module.exports.testReadBufferUnderrun = function(test) {
  test.expect(1);

  var buf = new Buffer(8);

  // Write a length value of 32 bytes which is longer than the buffer.
  buf.writeUInt8(32, 0);

  var nbname = NBName.fromBuffer(buf, 0);
  test.notEqual(nbname.error, null);
  test.done();
};

// Functions below will pack and then unpack a list of names.  Each unpacked
// name is then checked against the names originally passed in.  The final
// number of bytes read is passed back via callback.

function verifyList(test, nameMap, nameList, callback) {
  var buf = new Buffer(1024);
  var suffix = 0x20;

  var bytes = 0;

  nameList.forEach(function(name) {
    var nbname = new NBName({fqdn: name, suffix: suffix});
    var res = nbname.write(buf, bytes, nameMap);
    test.equal(res.error, null);
    bytes += res.bytesWritten;
  });

  var namesOut = [];
  var suffixesOut = [];

  bytes = 0;
  while (bytes < buf.length && namesOut.length < nameList.length) {
    var nbname = NBName.fromBuffer(buf, bytes);
    test.equal(nbname.error, null);
    bytes += nbname.bytesRead;

    namesOut.push(nbname.fqdn);
    suffixesOut.push(nbname.suffix);
  }

  for (var i = 0; i < nameList.length; ++i) {
    test.equal(namesOut[i], nameList[i],
               'unpacked name at index [' + i + ']');
    test.equal(suffixesOut[i], suffix, 'unpacked suffix');
  }

  return bytes;
}
