'use strict';
const assert = require('assert');
const sinon  = require('sinon')
const zmqbus = require('../');

describe('zmqbus',function(){
    describe('createNode', function(){
        it('should create a new elected node', function(done){
            this.timeout(300000)
            let n1 = zmqbus.createNode({election_timeout: 5000});
            let cb = sinon.spy();

            n1.on('ready',()=>{
                n1.subscribe('chan1');
                n1.publish('chan1', `msg${process.pid}`)
                n1.publish('chan2', `msg${process.pid}`)
                setTimeout(function(){
                    assert.ok( cb.calledOnce, `cb should be called once go ${cb.called}` );
                    done();
                },5000)
            });

            n1.on('message', ()=>{
                console.log('message', arguments)
                cb();
            });
        });
        
    })
})
