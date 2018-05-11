/* eslint-env node, mocha */
/* eslint no-invalid-this: 0 */
'use strict';

const should = require('should');
const {itAsync, noProtObj} = require('./helper.js');

module.exports = function(newCache) {
  function beforeNewCache(opts = {}) {
    before(function(done) {
      newCache(100, opts, (cache) => {
        this.cache = cache;
        done();
      });
    });
  }
  function newCacheP(ttl, opts) {
    return new Promise((resolve) => {
      newCache(ttl, opts, resolve);
    });
  }
  describe('simpe set, get and delete', function() {
    beforeNewCache();
    it('get with callback', function(done) {
      this.cache.get('test1', function(err, val) {
        val.should.be.eql('test1');
        done(err);
      });
    });
    it('set function called once', function() {
      this.cache.set_function.should.be.calledOnce();
    });
    it('get with int param', function(done) {
      this.cache.get(111, function(err, val) {
        val.should.be.eql('111');
        done(err);
      });
    });
    it('get with promise', function() {
      this.cache.getP('test2').should.finally.be.eql('test2');
    });
    it('set with callback', function(done) {
      this.cache.set('test3', 't3', function(err, val) {
        val.should.be.eql('t3');
        done(err);
      });
    });
    it('set with promise', function() {
      this.cache.setP('test4', 't4').should.finally.be.eql('t4');
    });
    it('del with callback', function(done) {
      this.cache.del('test1', done);
    });
    it('del with promise', function() {
      this.cache.delP('test2').should.be.fulfilled();
    });
    it('run get in getExist callback', function(done) {
      this.cache.getExist('val', (_err1_, val1) => {
        should(val1).be.eql(undefined);
        this.cache.get('val', (_err2, val2) => {
          val2.should.be.eql('val');
          done();
        });
      });
    });
  });

  describe('set function throw error', function() {
    beforeNewCache({set_fn_error: true});
    it('with callback', function(done) {
      this.cache.get('error1', function(err) {
        err.should.be.Error();
        err.message.should.be.eql('error1');
        done();
      });
    });
    it('with promise', function() {
      this.cache.getP('error2').should.be.rejectedWith('error2');
    });
  });

  describe('few gets - one set function call (cache working)', function() {
    beforeNewCache();
    it('should be one', function() {
      return Promise.all([
        this.cache.getP('val').should.be.fulfilledWith('val'),
        this.cache.getP('val').should.be.fulfilledWith('val'),
        new Promise((succ) => setTimeout(succ, 10))
          .then(() => this.cache.getP('val')).should.be.fulfilledWith('val')
      ])
      .then(() => this.cache.set_function.should.be.calledOnce())
      .should.be.fulfilled();
    });
  });

  describe('few gets - one set function call (while set_fn going)', function() {
    beforeNewCache({set_fn_deferred_run: 10});
    it('should be one', function() {
      return Promise.all([
        this.cache.getP('val1').should.be.fulfilledWith('val1'),
        this.cache.getP('val2').should.be.fulfilledWith('val2'),
        this.cache.getP('val2').should.be.fulfilledWith('val2'),
        this.cache.getP('val1').should.be.fulfilledWith('val1')
      ])
      .then(() => this.cache.set_function.should.be.calledTwice())
      .should.be.fulfilled();
    });
  });

  describe('force set, get and delete', function() {
    itAsync('with promises', function*() {
      yield this.cache.setP('key_for_del', 'bla-bla');
      yield this.cache.setP('key_for_del', 'new bla-bla');
      let val = yield this.cache.getP('key_for_del');
      val.should.be.eql('new bla-bla');
      this.cache.set_function.should.not.be.called();
      yield this.cache.delP('key_for_del');
      val = yield this.cache.getP('key_for_del');
      val.should.be.eql('key_for_del');
      this.cache.set_function.should.be.calledOnce();
    }, function*() {
      this.cache = yield newCacheP(100, {});
    });
  });

  describe('get many keys at once', function() {
    beforeNewCache({set_fn_many_keys: true});
    
    it('get with incorrect set_function', function(done) {
      newCache(100, {}, (cache) => {
        let t = [1, 2];
        cache.get(t, function(err) {
          err.should.be.Error();  
          done();
        });
      });
    });

    it('all new', function(done) {
      this.cache.get(['val1', 'val2', 'val3'], (err, result) => {
        should(result).be.eql(noProtObj({
          val1: 'val1',
          val2: 'val2',
          val3: 'val3'
        }));
        this.cache.set_function.should.have.calledOnce();
        this.cache.set_function.should.be.calledWith(['val1', 'val2', 'val3']);
        done(err);
      });
    });

    it('get with int param', function(done) {
      let t = ['0', 1, 0];
      this.cache.get(t, function(err, val) {
        should(val).be.eql(noProtObj({
          '0': '0',
          '1': '1'
        }));
        done(err);
      });
    });
    
    itAsync('one new of three', function*() {
      yield this.cache.setP('val1', 'val1');
      yield this.cache.setP('val2', 'val2');
      let result = yield this.cache.getP(['val1', 'val2', 'val3']);
      should(result).be.eql(noProtObj({
        val1: 'val1',
        val2: 'val2',
        val3: 'val3'
      }));
      yield this.cache.getP('val1');
      this.cache.set_function.should.be.calledOnce();
      this.cache.set_function.should.be.calledWith(['val3']);
    }, function*() {
      this.cache = yield newCacheP(100, {set_fn_many_keys: true});
    });
    
    itAsync('all proccessing set_fn', function*() {
      this.cache.get(['val1', 'val2', 'val3']);
      let result = yield this.cache.getP(['val1', 'val2', 'val3']);
      should(result).be.eql(noProtObj({
        val1: 'val1',
        val2: 'val2',
        val3: 'val3'
      }));
      this.cache.set_function.should.be.calledOnce();
    }, function*() {
      this.cache = yield newCacheP(100, {set_fn_many_keys: true, set_fn_deferred_run: 10});
    });

    it('run get in getExist callback', function(done) {
      this.cache.getExist(['val'], (_err1_, result1) => {
        should(result1).be.eql(noProtObj({
          val: undefined
        }));
        this.cache.get(['val'], (_err2, result2) => {
          should(result2).be.eql(noProtObj({
            val: 'val'
          }));
          done();
        });
      });
    });
  });
};
