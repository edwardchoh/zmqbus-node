/*jshint laxcomma: true, smarttabs: true, node: true, esnext: true*/
'use strict';
/**
 * Communication Node nodes used to broadcast messages
 * @module zmqbus/lib/node
 * @author Edward Choh
 * @author Eric Satterwhite
 * @since 0.0.1
 * @requires zmq
 * @requires events
 * @requires zmqbus/lib/election
 * @requires zmqbus/lib/common
 */


const zmq                  = require('zeromq')
    , {EventEmitter}       = require('events')
    , Elector              = require('./election')
    , {get_local_endpoint} = require('./common')
    , debug                = require('debug')('zmqbus:node')
    ;



/**
 * Internal class that holds the pub/sub connections to broadcast messages to peers
 * @private
 * @constructor
 * @alias module:zmqbus/lib/node.Forwarder
 */
class Forwarder {
  constructor(){
      this.sub = zmq.socket('sub');
      this.pub = zmq.socket('pub');
      this.sub.bindSync('tcp://0.0.0.0:*');
      this.pub.bindSync('tcp://0.0.0.0:*');

      this.sub_addr = get_local_endpoint(this.sub);
      this.pub_addr = get_local_endpoint(this.pub);

      this.sub.subscribe('');
      this.sub.on('message', (...msg)=>{
          this.pub.send(msg);
      });
  }
}

/**
 * Primary node for sending and recieving messages to peers
 * @constructor
 * @alias module:zmqbus/lib/node
 * @param {Object} [options]
 * @param {Number} [election_priority=0] A node can be assigned a higher priority, so that it gets elected ahead of lesser priority nodes
 * @param {Number} [election_timeout=2000] lections receive votes from all nodes in a cluster, the election waits for up to election_timeout milliseconds before it closes
 * @param {Number} [heartbeat_period=2000] Master node heartbeats with nodes using this period (in msec).
 * @param {Number} [heartbeat_timeout=6000] If nodes detect no heartbeat beyond this timeout (in msec), an election is called for.
 * @param {String} [multicast_addr='239.1.2.4'] Nodes discover and elect each other through multicast UDP using this address. Nodes in a cluster are identified by multicast_addr:multicast_port. To run multiple clusters in a single physical subnet change multicast_addr:multicast_port`
 * @param {Number} [multicast_port=45555]
 * @fires module:zmqbus/lib/node#ready
 * @fires module:zmqbus/lib/node#error
 * @example var Node = require('zmqbus/lib/node');
var node = new Node({ election_priority: 2, multicast_addr: '239.9.9.9', multicast_addr: '42424' });
node.publish('channel', 'foo', 1, 2);
node.subscribe('channel');
node.on('message' ( msg )=>{
    ...
})
 */
class ElectedNode extends EventEmitter{

    constructor(options = {}){
        super();
        this.options       = Object.assign({}, options);

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
             * Fired when the election process encounters an error
             * @name module:zmqbus/lib/node#error
             * @event
             * @param {TYPE} name description
             **/    
            this.emit('error', err);
        });

        this.elector.on('elected', (elect) =>{
            debug(`node ${elect.id} elected. reconnecting ${elect.sub_addr} - ${elect.pub_addr}`)
            if (elect.sub_addr != this.metadata.sub_addr || elect.pub_addr != this.metadata.pub_addr || !this.ready){
                // new forwarder was elected
                this.metadata = elect;
                this.connect_backend();
                debug(`node ${this.elector.id} publishing from ${this.metadata.pub_addr}`)
                if (!this.ready){
                    this.ready = true;
                    /**
                     * dispatched when this node is connected on ready to send and recieve messages
                     * @name module:zmqbus/lib/node#ready
                     * @event
                     **/
                     debug(`node ${this.elector.id} is ready`)
                    this.emit('ready');
                }
            }
        });
    }


    /**
     * Closes any existing connections to and connects to the pub/sub addresses of the forwarding device
     * @private
     * @method module:zmqbus/lib/node#connect_backend
     * @fires module:zmqbus/lib/message
     **/
    connect_backend(){
        // connect to new forwarder
        this.pub_sock && this.pub_sock.close();
        this.sub_sock && this.sub_sock.close();

        this.pub_sock = zmq.socket('pub');
        this.pub_sock.connect(this.metadata.sub_addr);

        this.sub_sock = zmq.socket('sub');
        this.sub_sock.connect(this.metadata.pub_addr);
        debug(`node ${this.elector.id} listening to ${this.metadata.pub_addr}`)
        for(let s of this.subscriptions){
            this.sub_sock.subscribe(s);
        }
        this.sub_sock.on('message', (...msg)=>{
            /**
             * @name module:zmqbus/lib/node#message
             * @event
             * @param {Object|string} message The message object sent from a peer node
             **/
            this.emit( 'message', ...msg );
        });
    }

    /**
     * Subscribes this node to a named channel to recieve messages from
     * @method module:zmqbus/lib/node#subscribe
     * @param {...String} channel a channel to subscribe to
     * @example node.subscribe('stocks','sports','internal')
     **/
    subscribe(...chan){
        for(let c of chan){
            this.sub_sock && this.sub_sock.subscribe(c);
            if( this.subscriptions.indexOf(c) < 0 ){
                this.subscriptions.push(c); 
            }
        }
    }

    /**
     * Removes this node from a named channel
     * @method module:zmqbus/lib/node#unsubscribe
     * @param {...String} channel
     * @example node.unsubscribe('stocks','sports','internal')
     **/
    unsubscribe(...chan){
        for( let c of chan ){
            this.sub_sock && this.sub_sock.unsubscribe(c);
            let idx = this.subscriptions.indexOf(c);
            if( idx >= 0){
                this.subscriptions.splice(idx, 1);
            }
        }
    }

    /**
     * Broadcasts a message to all connected peers over a specific channel
     * @method module:zmqbus/lib/node#publish
     * @param {String} channel The name of the channel to broadcast over
     * @param {...Mixed} argument Message parts to send in the massage
     * @example node.publish('stocks', 'FEDEX', 102.10, '+2%')
     **/
    publish(...msg){
        this.pub_sock.send( msg );
    }
}

module.exports = ElectedNode;
