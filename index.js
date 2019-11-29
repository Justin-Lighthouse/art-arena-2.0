
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(8080);

const randomImage = function() {

  const defaultSize = 350;
  const randomNumber = Math.floor(Math.random() * 1048);
  
  return (`https://picsum.photos/id/${randomNumber}/500/300`);
};

// routing
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// usernames which are currently connected to the chat
var usernames = {};

// rooms which are currently available in chat
var rooms = ['Lobby','Arena #1','Arena #2'];
const roomImages = {};

// random image
var img = randomImage();

io.sockets.on('connection', function (socket) {

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.room = 'Lobby';
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join('Lobby');
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected to Lobby');
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to('Lobby').emit('updatechat', 'SERVER', username + ' has connected to this room');
		socket.emit('updaterooms', rooms, 'Lobby');
	});

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});

	socket.on('switchRoom', function(newroom){
    // leave the current room (stored in session)
    var room = io.sockets.adapter.rooms[newroom];
    if (room === undefined) {
      let stockImage = randomImage()
      roomImages[newroom] = {reference: stockImage}
      // console.log(roomImages[newroom])
      // console.log(newroom)
      socket.leave(socket.room);
      // join new room, received as function parameter
      socket.join(newroom);
      socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
      // sent message to OLD room
      socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
      // update socket session room title
      socket.room = newroom;
      socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
      socket.emit('updaterooms', rooms, newroom);
    } else if (newroom !== "Lobby" && room.length < 4) {
      socket.leave(socket.room);
      // join new room, received as function parameter
      socket.join(newroom);

      // console.log(roomImages[newroom])
      // console.log(roomImages[newroom].newroom)
      io.in(newroom).emit('displayreference', roomImages[newroom]);
      console.log("dub tif")
      // check how many people are in the room after a person joins
      room = io.sockets.adapter.rooms[newroom];

      if (room.length === 4) {
        console.log("here")
        io.in(socket.room).emit('display-reference', roomImages[newroom].newroom);
      }

      socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
      // sent message to OLD room
      socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
      // update socket session room title
      socket.room = newroom;
      socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
      socket.emit('updaterooms', rooms, newroom);
    } else if (newroom === "Lobby") {
      socket.leave(socket.room);
      // join new room, received as function parameter
      socket.join(newroom);
      socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
      // sent message to OLD room
      socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
      // update socket session room title
      socket.room = newroom;
      socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
      socket.emit('updaterooms', rooms, newroom);
    } else {
      console.log("FULL ROOM")
    }
  });
  
  socket.on('donedrawing', function(drawing) {
    roomImages[socket.room][socket.username] = drawing;
    // console.log(Object.keys(roomImages[socket.room]))
    if (Object.keys(roomImages[socket.room]).length === 5) {
      io.in(socket.room).emit('displayphotos', roomImages[socket.room]);
    }
    // need to hide canvas after this occurs to prevent the player from drawing more.
  })

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		socket.leave(socket.room);
	});
});