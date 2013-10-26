# zmqbus

   Peer to peer messaging bus, zero setup with failover and pub/sub functionality.

   zmqbus is a distributed messaging bus and event emitter built with ZeroMQ. And it's open source.

   zmqbus doesn't use a centralized broker, but instead builds a peer-to-peer network of nodes. Failover is built-in, so if a node fails the network will recover and continue sending/receving messages.

   Speedy. Since zmqbus uses ZeroMQ, it is much faster than equivalent broker-based setups. However, the downside is there is no built-in message persistence nor receive reciepts.

   No configuration needed, works out of the box, easy to deploy. By default all nodes in a subnet will discover each other and elect a master node. When the master node goes down, an election will be called for to elect a new master.

## Usage

```js
var zmqbus = require('zmqbus');

// Run multiple instances of this across processes/machines.
// All instances will receive/send to each other by channel.

var node = zmqbus.createNode({});
node.on('ready', function() {
	// subscribe to equity channel
	node.subscribe("equity");

	// publish a quote cluster-wide
	node.publish("equity", "AAPL", 500.0);
});

node.on('message', function(msg) {
	console.log("received " + msg);
});
```

## API

To create a new node:

```js
var node = require('zmqbus').createNode({});
```

Listen for 'ready' event before calling other methods

```js
node.on('ready', function() {
	// node is ready
});
```

Listen for 'message' event for messages. msg is an array, the first element will contain the channel name.

```js
node.on('message', function(msg) {
	// msg[0] is channel name, msg.slice(1) will contain the rest of the message
});
```

To listen on a specific channel, use the subcribe() method. The node will only receive messages from channels it has subscribed to. Use the special name '*' to listen to all channels.

```js
// subscribe to equity channel
node.subscribe('equity');
```

There is a corresponding unsubscribe() method to stop listening from that channel.

```js
// unsubscribe from equity channel
node.unsubscribe('equity');
```

To publish a message to a channel, use publish().

```js
// publish a message to the channel
node.publish('equity', 'AAPL', 500.0);
```

A node can be stopped by calling stop(). Note: this may trigger an election if this node is the master node.

```js
// stop a node. node may not be restarted nor used.
node.stop();
```

## Examples

See example/simple.js

Use the message bus to build applications like:

  * chat rooms
  * lightweight cluster-wide notifications
  * multiplayer game rooms

Similar services:

  * Google Cloud Messaging
  * PubNub
  * Pusher

## Advanced

require('zmqbus').createNode() accepts a config object with the following options:

  * `election_priority`
    * A node can be assigned a higher priority, so that it gets elected ahead of lesser priority nodes.
    * Default: `0`, set between 0 - 99.
  * `election_timeout`
    * Elections receive votes from all nodes in a cluster, the election waits for up to election_timeout milliseconds before it closes.
    * Default: `2000`. Set to higher value if network is lossy.
  * `heartbeat_period`
    * Master node heartbeats with nodes using this period (in msec).
    * Default: `2000`. Set to higher value if network is lossy.
  * `heartbeat_timeout`
    * If nodes detect no heartbeat beyond this timeout (in msec), an election is called for.
    * Default: `6000`. Set to higher value if network is lossy.
  * `multicast_addr`
    * Nodes discover and elect each other through multicast UDP using this address. Nodes in a cluster are identified by `multicast_addr`:`multicast_port`. To run multiple clusters in a single physical subnet change `multicast_addr`:`multicast_port`.
    * Default: `'239.1.2.4'`. Set to any private multicast address, or set to '255.255.255.255' for subnet broadcast if the subnet router has issues with multicasting.
  * `multicast_port`
    * See above.
    * Default: `45555`. Set to another port number (max. 65535) to run multiple clusters on a physical subnet.

Example:

```js
var options = { election_priority: 2, multicast_addr: '239.9.9.9', multicast_addr: '42424' };
var node = require('zmqbus').createNode(options);
```

## Resources

* [ZeroMQ](http://zeromq.org)

## Installing

`npm install`

## Tests

`coffee test/tests`

