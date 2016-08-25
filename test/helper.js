/* eslint-env node, mocha */
'use strict';

require('mocha');
require('should');
const sinon = require('sinon');
require('should-sinon');

const MCache = require('../index.js');

exports.runAsync = function(fn, prev_val) {
  let gen = typeof fn == 'function' ? fn() : fn;
  let r;
  try {
    r = gen.next(prev_val);	
  } catch (e) {
    return Promise.reject(e);
  }
  if (r.done) {
    return Promise.resolve(r.value);
  } else {
    return Promise.resolve(r.value).then(
      val => exports.runAsync(gen, val)
    ).catch(
      err => Promise.resolve(gen.throw(err)).then(val => exports.runAsync(gen, val))
    );
  }
};

exports.itAsync = function(msg, fn, setup_fn) {
  it(msg, function(done) {
    if (setup_fn) {
      exports.runAsync(setup_fn.bind(this)).then(() => {
        exports.runAsync(fn.bind(this)).then(() => done(), err => done(err));
      }, err => done(err));
    } else {
      exports.runAsync(fn.bind(this)).then(() => done(), err => done(err));
    }
  });
};

exports.newCache = function(ttl, params) {
  let set_fn;
  if (params.set_fn) {
    set_fn = params.set_fn;
  } else if (params.set_fn_error) {
    set_fn = sinon.spy((key, cb) => cb(new Error(key)));
  } else if (params.set_fn_many_keys) {
    set_fn = sinon.spy((keys, cb) => {
      let val = keys.reduce((obj, item) => {
        obj[item] = item;
        return obj;
      }, {});  
      cb(null, val);
    });
  } else {
    set_fn = sinon.spy((key, cb) => cb(null, key));
  }
  if (params.set_fn_deferred_run) {
    let old_set_fn = set_fn;
    set_fn = sinon.spy((key, cb) => 
      setTimeout(old_set_fn.bind(null, key, cb), params.set_fn_deferred_run)
    );
  }
  return new MCache(ttl, params, set_fn);
};

exports.noProtObj = function(obj) {
  return Object.assign(Object.create(null), obj);
};
