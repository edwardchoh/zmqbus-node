/*jshint esnext: true, laxcomma: true, node: true, mocha: true */
'use strict';
const assert = require('assert');
const sinon  = require('sinon')
const zmqbus = require('../');
const Elector = require('../lib/election');
const async = require('async');

describe('zmqbus',function(){
    describe('createNode', function(){
    let n1;
    before(function( done ){
      n1 = zmqbus.createNode({election_timeout: 250});
            n1.subscribe('chan1');
      done();
    });

    after(function( done ){
      n1.elector.stop();
      n1 = null;
      done();
    });

    it('should create a new elected node', function(done){
        let cb = sinon.spy();

        n1.on('ready',()=>{

            setTimeout(function(){
                n1.publish('chan1', `msg${process.pid}`)
                n1.publish('chan2', `msg${process.pid}`)
            }, 500 )

            setTimeout(function(){
                assert.ok( cb.calledOnce, `cb should be called once go ${cb.called}` );
                done();
            },1000)
        });
        n1.on('message', cb);
    });

  })

  describe('Elector',function(){
    var elector;
    before(function(done){
      done()
    });

    after(function(done){
      elector.stop();
      elector = null;
      done();
    });

    it('should elect it self', function( done ){
      this.timeout( 6000);

      elector = new Elector({election_timeout: 2000})
      elector.on('ready', (addr) =>{
        elector.start()
      })

      elector.on('error', done)

      elector.on('elected', (elect) =>{
        assert.equal(elect.id, elector.id);
        done()
      })
    });
  })

  describe('Election Priority', function(){
    let n1, n2, n3;
    after(function( done ){
      n1.stop();
      n2.stop();
      n3.stop();
      n1 = n2 = n3 = null;
      done();
    });

    it('should elect the node with the highest priorty', function( done ){
      this.timeout(10000);	
      n1 = new Elector({election_timeout: 250});
      n2 = new Elector({election_priority: 5, election_timeout: 250});
      n3 = new Elector({election_priority:1, election_timeout: 250});
      async.each([n1,n2,n3], function( node, cb ){
        node.on('ready', cb);
      }, function( err, result ){
        let nodes = [n1,n2,n3].sort( ( a, b ) => {
          return a.options.election_priority > b.options.election_priority ? -1 : 1;
        });
        assert.equal(nodes[0].options.election_priority, 5)
        done();
      });
    });
  });
})
