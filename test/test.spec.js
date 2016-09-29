'use strict';
const assert = require('assert');
const sinon  = require('sinon')
const zmqbus = require('../');
const Elector = require('../lib/election');

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
		let elector;
		before(function(done){
			elector = new Elector({election_timeout: 2000, multicast_port:55555})
		});
		
		after(function(done){
			elector.stop();
			elector = null;
		});

		it('should elect it self', function( done ){
			this.timeout( 6000);
			
			elector.on('ready', (addr) =>{
				elector.start()
			})

			elector.on('error', done)

			elector.on('elected', (elect) =>{
				assert.equal(elect.id, elector.id);
				console.log('elected');
				done()
			})
		});
	})
})
