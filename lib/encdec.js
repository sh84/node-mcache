'use strict';

/**
 * Commom class to encode message to string and decode string to message
 */
class EncDec {
  constructor() {
    this.buf = '';
  }


  /**
   * decode next piece of data 
   * byte format:
   *   0..7   - id,
   *   8      - command,
   *   9..16  - keys count
   *   17..24 - vals count
   *   {8}    - key1 length
   *   key1
   *   {8}    - key2 length
   *   key2
   *   {8}    - val1 length
   *   val1
   *   {8}    - val2 length
   *   val2
   * @param  {String} data
   * @return {Object[]} - [{id, command, keys, vals}]
   */
  decode(data) {
    this.buf += data;
    let result = [];
    var len = this.buf.length, pos = 0;
    while (pos + 25 <= len) {
      let new_pos = this._decodeMsg(pos, len, result);
      if (!new_pos) break;
      pos = new_pos;
    }
    this.buf = this.buf.substr(pos);
    return result;
  }

  _decodeMsg(pos, len, msgs) {
    let id = parseInt(this.buf.substr(pos, 8), 36);
    let command = this.buf[pos + 8];
    let keys_count = parseInt(this.buf.substr(pos + 9, 8), 36);
    let vals_count = parseInt(this.buf.substr(pos + 17, 8), 36);
    pos += 25;
    let keys = Array(keys_count);
    for (var i=0; i < keys_count; i++) {
      if (pos + 8 > len) return false;
      let key_len = parseInt(this.buf.substr(pos, 8), 36);
      if (pos + 8 + key_len > len) return false;
      keys[i] = this.buf.substr(pos + 8, key_len);
      pos += 8 + key_len;
    }
    let vals = Array(vals_count);
    for (var k=0; k < vals_count; k++) {
      if (pos + 8 > len) return false;
      let val_len = parseInt(this.buf.substr(pos, 8), 36);
      if (pos + 8 + val_len > len) return false;
      vals[k] = this.buf.substr(pos + 8, val_len);
      pos += 8 + val_len;
    }
    msgs.push({id, command, keys, vals});
    return pos;
  }

  /**
   * encode object to string
   * @param {Object} obj
   * @param {Number} obj.id
   * @param {String} obj.command - 1 character
   * @param {String[]} obj.keys
   * @param {String[]} obj.vals
   * @return {String}
   */
  encode(obj) {
    let command = obj.command || ' ';
    let keys_count = obj.keys === undefined ? 0 : obj.keys.length;
    let vals_count = obj.vals === undefined ? 0 : obj.vals.length;
    var result = 
      this._numToString(obj.id) +
      command[0] + 
      this._numToString(keys_count) +
      this._numToString(vals_count);
    for (var i=0; i < keys_count; i++) {
      let str = obj.keys[i].toString();
      result += this._numToString(str.length);
      result += str;
    }
    for (var k=0; k < vals_count; k++) {
      let str = obj.vals[k].toString();
      result += this._numToString(str.length);
      result += str;
    }
    return result;
  }

  _numToString(num) {
    let s = Number(num || 0).toString(36);
    return '0'.repeat(8 - s.length) + s;
  }
}

module.exports = EncDec;
