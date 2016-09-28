/*jshint laxcomma: true, smarttabs: true, node: true, esnext: true*/
'use strict';
/**
 * 
 * @module zmqbus/lib/node
 * @author Edward Choh
 * @author Eric Satterwhite
 * @since 0.0.1
 * @requires moduleA
 * @requires moduleB
 * @requires moduleC
 */


const zmq                  = require('zmq')
    , async                = require('async')
    , Elector              = require('./election')
    , {EventEmitter}       = require('events')
    , {get_local_endpoint} = require('./common')

/**
 * Description
 * @class module:node.js.Thing
 * @param {TYPE} param
 * @example var x = new node.js.THING();
 */
class Forwarder {
    constructor(){
        this.sub = zmq.socket('sub')
        this.pub = zmq.socket('pub')
        this.sub.bindSync('tcp://0.0.0.0:*')
        this.pub.bindSync('tcp://0.0.0.0:*')

        this.sub_addr = get_local_endpoint(this.sub);
        this.pub_addr = get_local_endpoint(this.pub);

        this.sub.subscribe('');
        this.sub.on('message', (msg...) =>{
            this.pub.send(msg);
        });
    }
}

/**
 * Description
 * @class module:node.js.Thing
 * @param {TYPE} param
 * @example var x = new node.js.THING();
 */
class ElectedNode extends EventEmitter{

    constructor(options = {}){
        // creates a forwarder device and advertises the connection metadata
        this.fwd           = new Forwarder();
        this.metadata      = {sub_addr: this.fwd.sub_addr, pub_addr: this.fwd.pub_addr};

        this.ready         = false;
        this.subscriptions = [];
        this.elector       = new Elector( this.options, this.metadata );
        
        this.elector.on('ready', (elector, addr) =>{
            this.elector.start();
        });

        this.elector.on('error', (err) =>{
            /**
             * @name node.js.Thing#event
             * @event
             * @param {TYPE} name description
             **/    
            this.emit('error', err);
        });

        this.elector.on('elected', (elect) =>{
            if (elect.sub_addr != this.metadata.sub_addr || elect.pub_addr != this.metadata.pub_addr || !this.ready){
                // new forwarder was elected
                this.metadata = elect;
                this.connect_backend();

                if (!this.ready){
                    this.ready = true
                    /**
                     * @name node.js.Thing#event
                     * @event
                     * @param {TYPE} name description
                     **/    
                    this.emit('ready')
                }
            }
        });
    }

    connect_backend(){
        // connect to new forwarder
        this.pub_sock && this.pub_sock.close();
        this.sub_sock && this.sub_sock.close();

        this.pub_sock = zmq.socket('pub');
        this.pub_sock.connect(this.metadata.sub_addr);

        this.sub_sock = zmq.socket('sub');
        this.sub_sock.connect(this.metadata.pub_addr);

        for(let s of this.subscriptions){
            this.sub_sock.subscribe(s);
            this.sub_sock.on('message', (msg...) =>{
                /**
                 * @name node.js.Thing#event
                 * @event
                 * @param {TYPE} name description
                 **/    
                this.emit( 'message', msg );
            }
        }
    }

    subscribe(...chan){
        for(let c of chan){
            this.sub_sock.subscribe(c);
            if( this.subscriptions.indexOf(c) < 0 ){
                this.subscriptions.push(c); 
            }
        }
    }

    unsubscribe(...chan){
        for( let c of chan){
            this.sub_sock.unsubscribe(c)
            let idx = this.subscriptions.indexOf(c)
            if( idx >= 0){
                this.subscriptions.splice(idx, 1);
            }
        }
    }

    publish(...msg){
        this.pub_sock.send(msg);
    }
}

exports.ElectedNode = ElectedNode
