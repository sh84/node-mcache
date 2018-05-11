'use strict';

const assert = require('assert');
const FunctionsQueue = require('./lib/functions_queue.js');
const MemoryStorage = require('./lib/memory_storage.js');
const SocketStorageWrapper = require('./lib/socket_storage_wrapper.js');
// const ClusterCache = require('./lib/cluster_cache.js');

/**
 * setCallback - main callback used for setting value by key or array of keys.
 *
 * @callback setCallback
 * @param {(String|String[])} key       - Key or array of keys, where key must be string 
 *                              or object with .toString() method used to obtain string key.
 * @param {Function} callback - Callback(error, val) for simple key 
 *                              or Callback(error, {key1: val1, key2: val2}) for array key.
 */

/**
 * Main class
 * 
 */
class MCache {
  /*
   * @param {Number|String} ttl - Key time to live, in seconds for Number 
   *                              or in milliseconds with "<number>ms" format for String
   * @param {Object} params     - Can used as set_function in two arguments form constructor
   * @param {String} [params.type=memory]          - Storage type
   * @param {Number} [params.gc_time=60]           - Interval for run gc, in seconds, 0 - disable gc
   * @param {Date|Number} [params.gc_start]        - Start delay for starting gc timer, in seconds
   * @param {Number} [params.set_function_timeout=60000] - Timeout for set_function, in milliseconds
   * @param {Object} [params.socket_server]        - Use one socket server for all clients
   * @param {String} [params.socket_server.socket_path=node-mcache.sock] - used unix socket path
   * @param {Boolean} [params.socket_server.create_server=true] - create server on first client connect 
   * @param {Boolean} [params.socket_server.only_server=false]  - only create server, without client
   * @param {Boolean} [params.socket_server.callback]  - ready callback
   * @param {setCallback} set_function             - Function for setting value for uncached keys 
   */
  constructor(ttl, params, set_function) {
    if (typeof params == 'function' && typeof set_function == 'undefined') {
      this.set_function = params;
      this.options = this._prepareParams(ttl);
    } else {
      this.set_function = set_function;
      this.options = this._prepareParams(ttl, params);
    }
    
    if (!(this.options.socket_server && this.options.socket_server.only_server)) {
      assert(parseInt(this.options.ttl) > 0, 'ttl must be > 0');
      assert(this.set_function instanceof Function, 'set_function must be function');
      assert(this.options.type == 'memory', 'type must be "memory"');
    }
    
    this.get_queue = new FunctionsQueue();
    if (this.options.socket_server) {
      let storage_params = Object.assign({}, this.options);
      delete storage_params.socket_server;
      this.storage = new SocketStorageWrapper(
        Object.assign({storage_params}, this.options.socket_server)
      );
      let server_lib = this.storage.init((err) => {
        if (this.options.socket_server.callback) {
          this.options.socket_server.callback(err, this, server_lib);
        } else if (err) {
          throw err;
        }
      });
    } else {
      if (this.options.type == 'memory') {
        this.storage = new MemoryStorage(this.options);
      }
    }
  }

  _prepareParams(ttl, params = {}) {
    let options = {};
    options.ttl = ~ttl.toString().indexOf('ms') ? parseInt(ttl) : ttl * 1000;
    if (typeof params == 'object') {
      options = Object.assign(options, params);
    } else {
      options.gc_time = params && params*1;
    }
    options.type = options.type || 'memory';
    options.gc_time = options.gc_time === 0 ? 0 : options.gc_time * 1000 || 60000;
    if (options.gc_start instanceof Date) {
      options.gc_start = Math.abs(new Date() - options.gc_start);
    } else if (typeof options.gc_start == 'undefined') {
      options.gc_start = Math.floor(Math.random() * options.gc_time);
    } else if (parseInt(options.gc_start) > 0) {
      options.gc_start = Math.abs(parseInt(options.gc_start)) * 1000;
    } else {
      options.gc_start = options.gc_time;
    }
    options.set_function_timeout = (parseInt(options.set_function_timeout) || 60000) * 1;
    return options;
  }

  /**
   * get value(s) by key(s), run set_function if not exist
   * @param  {String|String[]} key - Key or array of keys
   * @param  {Function} callback   - Callback(error, val) for key, 
   *                                 Callback(error, {key1: val1, key2: val2,..}) for array of keys
   */
  get(key, callback) {
    if (Array.isArray(key)) {
      this.getMany(key, callback);
    } else {
      this.getOne(key, callback);
    }
  }

  /**
   * Promise version get function
   * @param  {String|String[]} key - Key or array of keys
   * @return {Promise}
   */
  getP(key) {
    return new Promise((resolve, reject) => {
      this.get(key, (error, val) => error ? reject(error) : resolve(val));
    });
  }

  /**
   * get value(s) by key(s), not run set_function if not exist
   * @param  {String|String[]} key - Key or array of keys
   * @param  {Function} callback   - Callback(error, val) for key, 
   *                                 Callback(error, {key1: val1, key2: val2,..}) for array of keys
   */
  getExist(key, callback) {
    if (Array.isArray(key)) {
      this.getMany(key, callback, false);
    } else {
      this.getOne(key, callback, false);
    }
  }

  /**
   * Promise version getExist function
   * @param  {String|String[]} key - Key or array of keys
   * @return {Promise}
   */
  getExistP(key) {
    return new Promise((resolve, reject) => {
      this.getExist(key, (error, val) => error ? reject(error) : resolve(val));
    });
  }

  /**
   * get value by key
   * @param  {String} key
   * @param  {Function} callback - Callback(error, val) for key
   */
  getOne(key, callback, run_set = true) {
    let _key = key.toString();
    // push callback to queue
    let get_queue_length = this.get_queue.add(_key, (err, _, val) => 
      callback && callback(err, val)
    );
    // only for first call make storage.get
    if (get_queue_length > 1) return;
    this.storage.get([_key], (get_err, data) => {
      if (get_err) return this.get_queue.run(_key, get_err);
      let el = data[_key];
      // data is available or not run set function
      if (el.available || !run_set) return this.get_queue.run(_key, get_err, el.value);
      this._runSetFunction(_key, (set_fn_err, set_val) => {
        this.get_queue.run(_key, set_fn_err, set_val);
        if (!set_fn_err) this.storage.set({[_key]: set_val});
      });
    });
  }

  /**
   * get values by keys
   * @param  {String[]} key      - Array of string keys
   * @param  {Function} callback - Callback(error, vals) for keys, where
   *                               vals is hash {key1: val1, key2: val2,..}
   */
  getMany(keys, callback, run_set = true) {
    let result = Object.create(null);
    let wait_count = keys.length;
    let _keys = new Array(wait_count);
    const keyReadyCallback = (err, key, val) => {
      if (err) {
        this.get_queue.clear(_keys, keyReadyCallback);
        callback && callback(err);
      } else {
        result[key] = val;
        wait_count -= 1;
        if (wait_count == 0 && callback) callback(null, result);
      }
    };

    let get_keys = [];
    for (var i=0; i < keys.length; i++) {
      _keys[i] = keys[i].toString();
      if (this.get_queue.add(_keys[i], keyReadyCallback) == 1) 
        get_keys.push(_keys[i]);
    }
    this.storage.get(get_keys, (get_err, data) => {
      if (get_err) return keyReadyCallback(get_err);
      let keys_to_set = [];
      for (var k=0; k < get_keys.length; k++) {
        let key = get_keys[k];
        let el = data[key];
        if (el.available || !run_set) {
          this.get_queue.run(key, null, el.value);
        } else {
          keys_to_set.push(key);
        }
      }
      if (keys_to_set.length == 0) return;
      
      this._runSetFunction(keys_to_set, (set_err, vals_hash) => {
        for (var j=0; j < keys_to_set.length; j++) {
          let key = keys_to_set[j];
          if (Object.prototype.hasOwnProperty.call(vals_hash, key)) {
            this.get_queue.run(key, set_err, vals_hash[key]);
          } else {
            keyReadyCallback(new Error(
              `Set function return [${Object.keys(vals_hash).join(', ')}] keys, need [${keys_to_set.join(', ')}] keys.`
            ));
          }
        }
        if (!set_err) this.storage.set(vals_hash);
      });
    });
  }

  /**
   * foce set value without calling set_callback
   * @param {String} key
   * @param {*} val
   * @param {Function} [callback] - called after real value setting
   */
  set(key, val, callback) {
    this.storage.set({[key]: val}, err => callback && callback(err, val));
  }

  /**
   * Promise version set function
   * @param {String} key
   * @param {*} val
   * @return {Promise}
   */
  setP(key, val) {
    return new Promise((resolve, reject) => {
      this.set(key, val, (error, set_val) => error ? reject(error) : resolve(set_val));
    });
  }

  /**
   * delete value by key
   * @param {String} key
   * @param {Function} [callback] - called after real delete
   */
  del(key, callback) {
    this.storage.del([key], err => callback && callback(err));
  }

  /**
   * Promise version del function
   * @param {String} key
   * @return {Promise}
   */
  delP(key) {
    return new Promise((resolve, reject) => {
      this.del(key, error => error ? reject(error) : resolve());
    });
  }

  /**
   * force run garbage collector (gc)
   * @param {Function} [callback] - called on garbage collector finish
   */
  gc(callback) {
    this.storage.gc(err => callback && callback(err));
  }

  /**
   * Promise version gc function
   * @return {Promise}
   */
  gcP() {
    return new Promise((resolve, reject) => {
      this.gc(error => error ? reject(error) : resolve());
    });
  }

  _runSetFunction(key, callback) {
    let timeout_flag = false;
    let timer = setTimeout(function() {
      clearTimeout(timer);
      timeout_flag = true;
      callback('set_function waiting timeout');
    }, this.options.set_function_timeout);
    this.set_function(key, function(err, val) {
      clearTimeout(timer);
      if (!timeout_flag) callback(err, val);
    });
  }
}

module.exports = MCache;
