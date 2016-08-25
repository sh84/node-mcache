/* eslint-env node, mocha */
'use strict';

const sinon = require('sinon');
require('should');
require('should-sinon');
const FunctionsQueue = require('../lib/functions_queue.js');

describe('FunctionsQueue', function() {
  it('valid add and get count', function() {
    let queue = new FunctionsQueue();
    queue.count('key').should.be.eql(0);
    queue.add('key', () => {});
    queue.count('key').should.be.eql(1);
  });
  it('not increment count for add without fn', function() {
    let queue = new FunctionsQueue();
    queue.add('key').should.be.eql(0);
    queue.count('key').should.be.eql(0);
  });
  it('set and run', function() {
    let queue = new FunctionsQueue();
    let fn1 = sinon.spy();
    let fn2 = sinon.spy();
    let fn3 = sinon.spy();
    queue.add('key1', fn1).should.be.eql(1);
    queue.add('key1', fn2).should.be.eql(2);
    queue.add('key2', fn3).should.be.eql(1);
    queue.run('key1', 'err', 'val');
    fn1.should.be.calledOnce().and.calledWith('err', 'key1', 'val');
    fn2.should.be.calledOnce().and.calledWith('err', 'key1', 'val');
    fn3.should.not.be.called();
  });
  it('set and twice run', function() {
    let queue = new FunctionsQueue();
    let fn = sinon.spy();
    queue.add('key', fn).should.be.eql(1);
    queue.run('key', 'err', 'val');
    queue.run('key', 'err', 'val');
    fn.should.be.calledOnce();
  });
  it('clear', function() {
    let queue = new FunctionsQueue();
    let fn1 = sinon.spy();
    let fn2 = sinon.spy();
    queue.add('key1', fn1);
    queue.add('key1', fn2);
    queue.add('key2', fn1);
    queue.add('key3', fn1);
    queue.clear(['key1', 'key2'], fn1);
    // must be key1: [fn2], key2: [], key3: [fn1]
    queue.count('key1').should.be.eql(1);
    queue.count('key2').should.be.eql(0);
    queue.count('key3').should.be.eql(1);
    queue.run('key1', 'err', 'val');
    queue.run('key2', 'err', 'val');
    queue.run('key3', 'err', 'val');
    fn1.should.be.calledOnce();
    fn2.should.be.calledOnce();
  });
});
