'use strict';

/**
 * Simple storage based on Map
 */
class MemoryStorage {
  /**
   * @param {Object} params
   * @param {Number} [params.ttl]            - Key time to live, ms
   * @param {Number} [params.gc_time]        - Interval for run gc, ms
   * @param {Number} [params.gc_start]       - Timeout for starting gc timer, ms
   * @param {Number} [params.gc_count=10000] - Count of procces elements for one gc tick
   */
  constructor(params) {
    this.ttl = params.ttl;
    this.gc_start = params.gc_start;
    this.gc_time = params.gc_time;
    this.gc_count = params.gc_count || 10000;
    
    this._data = new Map();
    this._time = new Map();
    if (params.gc_time) this._gc_timer = setTimeout(this.gc.bind(this), params.gc_start);
  }

  /**
   * get values by keys
   * @param  {String[]} keys     - Array of string keys
   * @param  {Function} callback - Called with (error, data), where data is hash
   *   {key: { 
   *     available: <boolean>,
   *     value: <value>
   *   }}
   */
  get(keys, callback) {
    let result = Object.create(null);
    let now = Date.now();
    for (var i=0; i < keys.length; i++) {
      let key = keys[i];
      let time = this._time.get(key); // time when data were setted
      if (time && now - time < this.ttl) {
        result[key] = {
          available: true,
          value: this._data.get(key)
        };
      } else {
        result[key] = {available: false};
      }
    }
    callback(null, result);
  }

  /**
   * set values
   * @param  {Object} vals     - {key: value} hash
   * @param  {Function} [callback] - Called with (error)
   */
  set(vals, callback) {
    let time_now = Date.now();
    let keys = Object.keys(vals);
    for (var i=0; i < keys.length; i++) {
      let key = keys[i];
      let val = vals[key];
      this._time.set(key, time_now);
      this._data.set(key, val);
    }
    if (callback) callback();
  }

  /**
   * del values
   * @param  {String[]} keys   - Array of string keys
   * @param  {Function} [callback] - Called with (error)
   */
  del(keys, callback) {
    for (var i=0; i < keys.length; i++) {
      let key = keys[i];
      this._data.delete(key);
      this._time.delete(key);
    }
    if (callback) callback();
  }

  /**
   * run gc
   */
  gc(callback) {
    this._gc(this._data.keys(), Date.now(), callback);
  }

  _gc(keys_iterator, now, callback) {
    if (this._gc_timer) clearTimeout(this._gc_timer);
    let count = 0;
    let next = keys_iterator.next();
    while (!next.done && count < this.gc_count) {
      let key = next.value;
      let time = this._time.get(key);
      if (time && now - time > this.ttl) {
        this._time.delete(key);
        this._data.delete(key);
      }
      count += 1;
      next = keys_iterator.next();
    }
    if (next.done) {
      this._gc_timer = setTimeout(() => this.gc(), this.gc_time);
      if (callback) callback();
    } else {
      setTimeout(() => this._gc(keys_iterator, now, callback), 0);
    }
  }

  getSize() {
    return this._data.size;
  }
}

module.exports = MemoryStorage;
