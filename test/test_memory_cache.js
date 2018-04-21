/* eslint-env node, mocha */
'use strict';

const sinon = require('sinon');
const {newCache, itAsync} = require('./helper.js');
const commonTests = require('./common_tests.js');

describe('Memory', function() {
  commonTests(function(ttl, params, callback) {
    callback(
      newCache(ttl, Object.assign({type: 'memory'}, params))
    );
  });

  describe('set function timeout', function() {
    beforeEach(function() {
      this.clock = sinon.useFakeTimers(Date.now());
    });
    it('have time, default set_function_timeout=60s', function(done) {
      let cache = newCache(100, {set_fn_deferred_run: 59999});
      cache.get('key', (err, val) => {
        val.should.be.eql('key');
        done(err);
      });
      this.clock.tick(60000);
    });
    it('timeouted', function(done) {
      let cache = newCache(100, {set_function_timeout: 100, set_fn_deferred_run: 101});
      cache.get('key', err => {
        err.should.be.ok();
        done();
      });
      this.clock.tick(101);
    });
    afterEach(function() {
      this.clock.restore();
    });
  });

  describe('repeat set function call after ttl', function() {
    beforeEach(function() {
      this.clock = sinon.useFakeTimers(Date.now());
    });
    it('ttl=100ms', function(done) {
      let cache = newCache('100ms', {});
      cache.get('test');
      this.clock.tick(100);
      cache.get('test', (err, val) => {
        val.should.be.eql('test');
        cache.set_function.should.be.calledTwice();
        done(err);
      });
    });
    it('ttl=10s', function(done) {
      let cache = newCache(10, {});
      cache.get('test');
      this.clock.tick(10000);
      cache.get('test', (err, val) => {
        val.should.be.eql('test');
        cache.set_function.should.be.calledTwice();
        done(err);
      });
    });
    afterEach(function() {
      this.clock.restore();
    });
  });

  describe('get many keys at once', function() {
    itAsync('with ttl', function*() {
      let clock = sinon.useFakeTimers(Date.now());
      let cache = newCache(10, {set_fn_many_keys: true});
      yield cache.getP(['val1', 'val2', 'val3']);
      clock.tick(5000);
      yield cache.setP('val1', 'val1');
      clock.tick(5000);
      yield cache.getP(['val1', 'val2', 'val3']);
      cache.set_function.should.be.calledTwice();
      cache.set_function.should.be.calledWith(['val2', 'val3']);
      clock.restore();
    });
  });

  describe('gc', function() {    
    itAsync('default gc_time, default (random) gc_start', function*() {
      let clock = sinon.useFakeTimers(Date.now());
      let cache = newCache(60, {type: 'memory'});
      yield cache.getP('test1');
      cache.storage.getSize().should.be.eql(1);
      clock.tick(60000-1); // first gc run in 0..60s range
      cache.storage.getSize().should.be.eql(1);
      clock.tick(60000+1);
      cache.storage.getSize().should.be.eql(0);
      clock.restore();
    });
    itAsync('gc_time=10s, Date gc_start', function*() {
      let now = Date.now();
      let clock = sinon.useFakeTimers(now);
      let gc_start = new Date(now+6000);
      let cache = newCache(5, {type: 'memory', gc_time: 10, gc_start});
      yield cache.getP('test1');
      cache.storage.getSize().should.be.eql(1);
      clock.tick(6000); // first gc run on now+6s
      cache.storage.getSize().should.be.eql(0);
      yield cache.getP('test2');
      clock.tick(6000);
      cache.storage.getSize().should.be.eql(1);
      clock.tick(4000); // second gc run on first+10s
      cache.storage.getSize().should.be.eql(0);
      clock.restore();
    });
    itAsync('gc_time=10s, gc_start=6', function*() {
      let clock = sinon.useFakeTimers(Date.now());
      let cache = newCache(5, {type: 'memory', gc_time: 10, gc_start: 6});
      yield cache.getP('test1');
      cache.storage.getSize().should.be.eql(1);
      clock.tick(6000); // first gc run on now+6s
      cache.storage.getSize().should.be.eql(0);
      yield cache.getP('test2');
      clock.tick(6000);
      cache.storage.getSize().should.be.eql(1);
      clock.tick(4000); // second gc run on first+10s
      cache.storage.getSize().should.be.eql(0);
      clock.restore();
    });    
    itAsync('gc_time=0 - disable gc', function*() {
      let clock = sinon.useFakeTimers(Date.now());
      let cache = newCache(5, {type: 'memory', gc_time: 0, gc_start: 6});
      yield cache.getP('test1');
      cache.storage.getSize().should.be.eql(1);
      clock.tick(6000);
      cache.storage.getSize().should.be.eql(1);
      yield cache.getP('test2');
      clock.tick(1000000);
      cache.storage.getSize().should.be.eql(2);
      clock.restore();
    });  
  });
});
