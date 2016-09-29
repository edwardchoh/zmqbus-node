'use strict';
const assert = require('assert');
const sinon  = require('sinon')
const zmqbus = require('../');

describe('zmqbus',function(){
    describe('createNode', function(){
        it('should create a new elected node', function(done){
            let n1 = zmqbus.createNode({election_timeout: 250});
            let cb = sinon.spy();
            n1.subscribe('chan1');

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
})
