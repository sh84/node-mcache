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
   *   8..11  - storage_id,
   *   12     - command,
   *   13..16 - keys count
   *   17..20 - vals count
   *   {6}    - key1 length
   *   key1
   *   {6}    - key2 length
   *   key2
   *   {6}    - val1 length
   *   val1
   *   {6}    - val2 length
   *   val2
   * @param  {String} data
   * @return {Object[]} - [{id, command, keys, vals}]
   */
  decode(data) {
    this.buf += data;
    let result = [];
    var len = this.buf.length, pos = 0;
    while (pos + 21 <= len) {
      let new_pos = this._decodeMsg(pos, len, result);
      if (!new_pos) break;
      pos = new_pos;
    }
    this.buf = this.buf.substr(pos);
    return result;
  }

  _decodeMsg(pos, len, msgs) {
    let id = parseInt(this.buf.substr(pos, 8), 36);
    let storage_id = parseInt(this.buf.substr(pos+8, 4), 36);
    let command = this.buf[pos + 12];
    let keys_count = parseInt(this.buf.substr(pos + 13, 4), 36);
    let vals_count = parseInt(this.buf.substr(pos + 17, 4), 36);
    pos += 21;
    let keys = Array(keys_count);
    for (var i=0; i < keys_count; i++) {
      if (pos + 6 > len) return false;
      let key_len = parseInt(this.buf.substr(pos, 6), 36);
      if (pos + 6 + key_len > len) return false;
      keys[i] = this.buf.substr(pos + 6, key_len);
      pos += 6 + key_len;
    }
    let vals = Array(vals_count);
    for (var k=0; k < vals_count; k++) {
      if (pos + 6 > len) return false;
      let val_len = parseInt(this.buf.substr(pos, 6), 36);
      if (pos + 6 + val_len > len) return false;
      vals[k] = this.buf.substr(pos + 6, val_len);
      pos += 6 + val_len;
    }
    msgs.push({id, storage_id, command, keys, vals});
    return pos;
  }

  /**
   * encode object to string
   * @param {Object} obj
   * @param {Number} obj.id, max 36^8
   * @param {Number} obj.storage_id, max 36^4
   * @param {String} obj.command - 1 character
   * @param {String[]} obj.keys, each key max length 36^6
   * @param {String[]} obj.vals, each val max length 36^6
   * @return {String}
   */
  encode(obj) {
    let command = obj.command || ' ';
    let keys_count = obj.keys === undefined ? 0 : obj.keys.length;
    let vals_count = obj.vals === undefined ? 0 : obj.vals.length;
    var result = 
      this._numToString(8, obj.id) +
      this._numToString(4, obj.storage_id) +
      command[0] + 
      this._numToString(4, keys_count) +
      this._numToString(4, vals_count);
    for (var i=0; i < keys_count; i++) {
      let str = obj.keys[i].toString();
      result += this._numToString(6, str.length);
      result += str;
    }
    for (var k=0; k < vals_count; k++) {
      let str = obj.vals[k].toString();
      result += this._numToString(6, str.length);
      result += str;
    }
    return result;
  }

  _numToString(base, num) {
    let s = Number(num || 0).toString(36);
    return '0'.repeat(base - s.length) + s;
  }
}

module.exports = EncDec;
