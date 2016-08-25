/* eslint-env node, mocha */
'use strict';

const should = require('should');
const MCache = require('../index.js');

describe('General', function() {
  let fn = function() {};
  it('constructor whith bad params', function() {
    should.throws(() => new MCache(), Error, 'Mcache without params'); 
    should.throws(() => new MCache('test', {}, fn), Error, 'Mcache with string ttl');
    should.throws(() => new MCache(100, {}, 123), Error, 'Mcache with not function param');
  });
  describe('constructor with correct params', function() {
    it('ttl', function() {
      new MCache(100, {}, fn).options.ttl.should.be.eql(100000);
      new MCache('100', {}, fn).options.ttl.should.be.eql(100000);
      new MCache('100ms', {}, fn).options.ttl.should.be.eql(100);
    });
    it('type', function() { 
      new MCache(100, {}, fn).options.type.should.be.eql('memory');
      //new MCache(100, {type: 'cluster'}, fn).options.type.should.be.eql('cluster');
    });
    it('time', function() {
      new MCache(100, {gc_time: 66}, fn).options.gc_time.should.be.eql(66000);
      // depricated form
      new MCache(100, 66, fn).options.gc_time.should.be.eql(66000);
    });
    it('short form', function() {
      new MCache(100, fn).should.be.ok();
    });
  });
});
