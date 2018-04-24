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

module.exports = NetbiosName;

// Source:  http://support.microsoft.com/kb/163409
var SUFFIX_TO_USAGE = {
  0x00: 'Workstation Service',
  0x01: 'Messenger Service',
  0x03: 'Messenger Service',
  0x06: 'RAS Server Service',
  0x1f: 'NetDDE Service',
  0x20: 'File Server Service',
  0x21: 'RAS Client Service',
  0x22: 'Microsoft Exchange Interchange',
  0x23: 'Microsoft Exchange Store',
  0x24: 'Microsoft Exchange Directory',
  0x30: 'Modem Sharing Server Service',
  0x31: 'Modem Sharing Client Service',
  0x43: 'SMS Clients Remote Control',
  0x44: 'SMS Administrators Remote Control Tool',
  0x45: 'SMS Clients Rmote Chat',
  0x46: 'SMS Clients Remote Transfer',
  0x4c: 'DEC Pathworks TCPIP service on Windows NT',
  0x42: 'mccaffee anti-virus',
  0x52: 'DEC Pathworks TCPIP service on Windows NT',
  0x87: 'Microsoft Exchange MTA',
  0x6a: 'Microsoft exchange IMC',
  0xbe: 'Network Monitor Agent',
  0xbf: 'Network Monitor Application',
  0x1b: 'Domain Master Browser',
  0x1c: 'Domain Controllers',
  0x1d: 'Master Browser',
  0x1e: 'Browser Service Elections',
  0x2b: 'Lotus Notes Server Service',
  0x2f: 'Lotus Notes',
  0x33: 'Lotus Notes'
};

var DEFAULT_SUFFIX = 0x00;

function NetbiosName(opts) {
  var self = (this instanceof NetbiosName)
           ? this
           : Object.create(NetbiosName.prototype);

  opts = opts || Object.create(null);

  var fqdn = opts.fqdn || null;
  if (fqdn) {
    self._decomposeAndInit(fqdn);
  } else {
    self._init(opts.name, opts.scopeId);
  }

  if (self.error) {
    return self;
  }

  self.suffix = (typeof opts.suffix === 'number') ? opts.suffix
                                                  : DEFAULT_SUFFIX;
  if (self.suffix > 0xff || self.suffix < 0) {
    self.error = new Error('Illegal suffix byte [' + self.suffix +
                           '].  Must be between 0x00 and 0xff.');
    return self;
  }

  self.usage = SUFFIX_TO_USAGE[self.suffix] || 'Unknown';
  self.bytesRead = 0;

  return self;
}

NetbiosName.fromBuffer = function(buf, offset) {
  var decompressed = _decompressName(buf, offset);
  if (decompressed.error) {
    return decompressed;
  }

  var decoded = _decodeName(decompressed.name);
  if (decoded.error) {
    return decoded;
  }

  var rtn = new NetbiosName({fqdn: decoded.fqdn, suffix: decoded.suffix});
  rtn.bytesRead = decompressed.bytesRead;

  return rtn;
};

NetbiosName.prototype.write = function(buf, offset, nameMap) {
  if (this.error) {
    return {error: this.error};
  }

  var encoded = this._encodeName();
  return this._compressName(buf, offset, nameMap, encoded);
};

NetbiosName.prototype.toString = function() {
  // Make sure suffix is displayed in hex with two digits
  var suffixString = this.suffix.toString(16);
  if (suffixString.length < 2) {
    suffixString = '0' + suffixString;
  }

  // wireshark style format:  foobar<20>.example.com
  return this.name + '<' + suffixString + '>' +
         (this.scopeId ? ('.' + this.scopeId) : '');
};

NetbiosName.prototype._decomposeAndInit = function(fqdn) {
  if (!fqdn) {
    this.error = new Error('No name provided.');
    return;
  }

  // Separate the name into its first part and the trailing domain
  var name = fqdn;
  var scopeId = '';
  var dotIndex = fqdn.indexOf('.');
  if (dotIndex > -1) {
    name = fqdn.substr(0, dotIndex);
    scopeId = fqdn.substr(dotIndex + 1);
  }

  if (!name) {
    this.error = new Error('Name cannot begin with dot.');
    return;
  }

  this._init(name, scopeId);
}

NetbiosName.prototype._init = function(name, scopeId) {
  if (!name) {
    this.error = new Error('No name provided.');
    return;
  }

  if (name.length > 15) {
    this.error = new Error('NetBIOS name [' + name +
                           '] too long.  Must be <= 15 chars.');
    return;
  }

  // space pad NetBIOS name out to 15 characters
  var pad = '               '.slice(name.length);

  this.name = name;
  this.paddedName = name + pad;
  this.scopeId = scopeId;
  this.fqdn = name + (scopeId ? ('.' + scopeId) : '');
};

// Decompress the name from the packet.  The compression scheme is defined
// in RFC 883 and is the same method used in DNS packets.  Essentially, names
// are stored in parts called labels.  Each label is preceded by a 2-bit flag
// field and 6-bit length field.  In the common case the 2-bits are zero and
// the length indicates how many bytes are in that label.  The parsing process
// is terminated by a zero length label.  Alternatively, a the 2-bit flags can
// both be set indicating a label pointer.  In that case the following 14-bits
// indicate an offset into the packet from which to read the remaining labels
// for the name.
function _decompressName(buf, offset) {
  var name = '';
  var bytes = 0;

  var octet = buf.readUInt8(offset + bytes);
  bytes += 1;

  // The name is made up of a variable number of labels.  Each label begins
  // with a length octet.  The string of labels is ended by a zero length octet.
  while (octet) {
    var label = null;

    // The first 2-bits of the octet are flags indicating if this is a length
    // value or a label pointer to elsewhere in the packet.
    var flags = octet & 0xc0;

    // If both the top 2-bits of the octet are set, then this is an offset pointer.
    if (flags === 0xc0) {
      // NOTE:  The number of bytes parsed was already incremented.  We need
      //        to re-read that first byte to incorporate it into our pointer
      //        value.  Therefore subtract one from the offset and only add
      //        one additional byte to the parsed count.
      var pointer = buf.readUInt16BE(offset + bytes - 1) & 0x3fff;
      bytes += 1;

      // NOTE:  This will only work if the start of the buffer corresponds to
      //        the start of the packet.  If the packet is embedded in a larger
      //        buffer then we need to pass through the offset to the start of
      //        the packet.
      var res = _decompressName(buf, pointer);
      if (res.error) {
        return res;
      }

      label = res.name;

      if (!label) {
        return {bytesRead: bytes, name: name}
      }

      // Once a pointer is used the name section is complete.  We do not need
      // to keep looking for a zero length octet.  Note there is some logic at
      // the end of the loop we still want to execute, so simply set octet to
      // zero to terminate the loop instead of breaking.
      octet = 0;

    // If neither of the bits are set then the name is stored inline in the
    // following bytes.  The name length is defined by the lower 6-bits of the
    // octet.
    } else if (flags === 0) {
      var length = octet & 0x3f;

      if (offset + bytes + length > buf.length) {
        return {
          error: new Error('Name label too large to fit in remaining packet ' +
                           'bytes.')
        };
      }

      label = buf.toString('ascii', offset + bytes, offset + bytes + length);
      bytes += length;

      // Look for the next label's length octet
      octet = buf.readUInt8(offset + bytes);
      bytes += 1;

    // Any other values are undefined, so throw an error.
    } else {
      return {
        error: new Error('Label length octet at offset [' +
                         (offset + bytes - 1) + '] has unexpected top 2-bits ' +
                         'of [' + flags + '];  should be [' + 0xc0 + '] or ' +
                         '[0].')
      };
    }

    // Append to the last parsed label to the name.  Separate labels with
    // periods.
    if (name.length > 0) {
      name += '.';
    }
    name += label;
  }

  return {bytesRead: bytes, name: name};
}

// Decode the NetBIOS name after it has been decompressed.  The NetBIOS
// name is represented as the first part of the FQDN.  See page 26 of
// RFC 1001 for full details on the encoding algorithm.  In short, each
// byte of the original NetBIOS name is split into two nibbles.  Each
// nibble is then encoded as a separate byte by adding the ASCII value for
// 'A'.  In order to decode we therefore must reverse this logic.
function _decodeName (name) {
  var encoded = name;
  var periodIndex = name.indexOf('.');
  if (periodIndex > -1) {
    encoded = name.slice(0, periodIndex);
  }

  var decoded = '';
  var suffix = 0;
  var charValue = 0;;

  for (var i = 0, n = encoded.length; i < n; ++i) {

    // decode char to first nibble
    if (i % 2 === 0) {
      charValue = (encoded.charCodeAt(i) - 'A'.charCodeAt(0)) << 4;

    // decore char to second nibble and then combine with first nibble
    } else {
      charValue += encoded.charCodeAt(i) - 'A'.charCodeAt(0);

      // Append the newly decoded character for the first 15 bytes
      if (i < (encoded.length - 1)) {
        decoded += String.fromCharCode(charValue);

      // The last byte is reserved by convention as the suffix or type
      } else {
        suffix = charValue;
      }
    }
  }

  // NetBIOS names are always space padded out to 15 characters
  decoded = decoded.trim();

  // If there was a scope identifier (domain name) after the NetBIOS name
  // then re-append it to the newly decoded name.
  if (periodIndex > -1) {
    decoded += name.slice(periodIndex);
  }

  return {fqdn: decoded, suffix: suffix};
}

NetbiosName.prototype._encodeName = function() {
  var netbiosName = new String(this.paddedName);

  // append the "suffix" as a character so it will be encoded
  netbiosName += String.fromCharCode(this.suffix);

  // Each character in the raw NetBIOS name is split into two nibbles.  These
  // nibbles are then each converted into a printable character by adding
  // the character 'A' to them.  See page 26 in RFC 1001 for more details.
  var encoded = '';
  for (var i = 0, n = netbiosName.length; i < n; ++i) {
    var ascii = netbiosName.charCodeAt(i);
    var nibble1 = ((ascii & 0xf0) >> 4);
    var nibble2 = (ascii & 0x0f);

    encoded += String.fromCharCode(nibble1 + 'A'.charCodeAt(0));
    encoded += String.fromCharCode(nibble2 + 'A'.charCodeAt(0));
  }

  // append the trailing scope domain name if present
  if (this.scopeId) {
    encoded += '.' + this.scopeId;
  }

  return encoded;
}

NetbiosName.prototype._compressName = function(buf, offset, nameMap, name) {
  var bytes = 0;

  // If we have written this name before, then create a pointer to it
  if (nameMap && nameMap[name] !== undefined) {
    var pointer = nameMap[name] & 0x3fff;

    // The top 2-bits must be set as a flag indicating its a pointer
    pointer |= 0xc000;

    if ((buf.length - offset) < 2) {
      return {
        error: new Error('buffer not large enough to write label pointer ' +
                         'for name [' + name + ']')
      };
    }

    buf.writeUInt16BE(pointer, offset + bytes);
    bytes += 2;

  // Otherwise we need to write the next part of the name to the buffer
  } else {

    // Record the we are storing the name at this location in the buffer
    // so that later names can point to it.
    if (nameMap) {
      nameMap[name] = offset + bytes;
    }

    // Extract the first part of the name
    var dotIndex = name.indexOf('.');
    var label = name;
    if (dotIndex > -1) {
      label = name.substr(0, dotIndex);
    }

    if (label.length > 64) {
      return {
        error: new Error('Label [' + label + '] is more than 64 characters ' +
                         'long.')
      };
    } else if ((buf.length - offset) < (1 + label.length)) {
      return {
        error: new Error('buffer not large enough to write name [' + name +
                         ']')
      };
    }

    // Write the length of the label out in a single octet.  The top 2-bits
    // must be zero since they are used as flags.
    var octet = label.length & 0x3f;
    buf.writeUInt8(octet, offset + bytes);
    bytes += 1;

    // Now write the label itself
    buf.write(label, offset + bytes);
    bytes += label.length;

    // If there are more parts to the name, then we need to continue
    // compressing the name to the buffer.  Use recursion.
    if (dotIndex > -1) {
      var rError = null;
      var remainder = name.substr(dotIndex + 1);
      var res = this._compressName(buf, offset + bytes, nameMap, remainder);
      if (res.error) {
        return res;
      }

      bytes += res.bytesWritten;

    // Once the last part of the name has been written we must terminate the
    // labels with an octet length of zero.
    } else {
      buf.writeUInt8(0, offset + bytes);
      bytes += 1;
    }
  }

  return {bytesWritten: bytes};
};
