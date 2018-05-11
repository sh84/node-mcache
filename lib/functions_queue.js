'use strict';

/**
 * Class for the managing functions - formig queue and run.
 */
class FunctionsQueue {
  constructor() {
    this.queue_map = new Map();
  }

  /**
   * add function to queue
   * @param {String}   key      
   * @param {Function} fn 
   * @return {Number} - new queue length for type & key
   */
  add(key, fn) {
    let queue = this.queue_map.get(key);
    if (!queue) {
      queue = [];
      this.queue_map.set(key, queue);
    }
    if (fn) queue.push(fn);
    return queue.length;
  }

  /**
   * get functions count in the queue
   * @param {String}   key      
   * @return {Number} - new queue length for type & key
   */
  count(key) {
    let queue = this.queue_map.get(key);
    return queue ? queue.length : 0;
  }  

  /**
   * run all queue functions with error, key, value
   * @param {String}  key      
   * @param {*}       error     
   * @param {*}       value    
   */
  run(key, error, value) {
    let queue = this.queue_map.get(key);
    if (queue) {
      this.queue_map.delete(key);
      for (var i=0; i < queue.length; i++) {
        queue[i](error, key, value);
      }
    }
  }

  /**
   * delete fn for all keys
   * @param {String[]} keys
   * @param {Function} fn 
   */
  clear(keys, fn) {
    for (var i=0; i < keys.length; i++) {
      let queue = this.queue_map.get(keys[i]);
      if (queue) {
        let index = queue.indexOf(fn);
        if (~index) {
          queue.splice(index, 1);
          if (queue.length == 0) this.queue_map.delete(keys[i]);
        }
      }
    }
  }
}

module.exports = FunctionsQueue;
