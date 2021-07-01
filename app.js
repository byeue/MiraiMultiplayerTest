var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};

var oldX = -3;
var oldY = -3;
var tempGen = "female";

var Entity = function(){
    var self = {
        x:250,
        y:250,
        sx:0,
        msg:"",
        id:"",
        clicked: false,
        gender:""
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        if(self.pressingRight) {
            self.x += self.maxSpd;
            self.sx = 60;
            self.clicked = false;
          }
        if(self.pressingLeft) {
            self.x -= self.maxSpd;
            self.sx = 0;
            self.clicked = false;
          }
        if(self.pressingUp) {
            self.y -= self.maxSpd;
            self.clicked = false;
          }
        if(self.pressingDown){
            self.y += self.maxSpd;
            self.clicked = false;
          }
    }
    return self;
}

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.sx = 0;
    self.msg = "";
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.clicked = false;
    self.maxSpd = 10;
    self.gender = tempGen;
    Player.list[id] = self;
  return self;
}

var USERS = {
  //LOGIN INFO
  "twiza":"crystal",
  "ue":"ethan",
  "":"admin",
}

var isValidPassword = function(data,cb){
  setTimeout(function(){
    cb(USERS[data.username] === data.password);
  }, 10);
}

var isUsernameTaken = function(data,cb){
  setTimeout(function(){
    cb(USERS[data.username]);
  }, 10);
}

var addUser = function(data,cb){
  setTimeout(function(){
    USERS[data.username] = data.password;
    cb();
  }, 10);
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on('login',function(data){
            isValidPassword(data,function(res){
                if(res){
                    Player.onConnect(socket);
                    socket.emit('loginResponse',{success:true});
                    if (data.username == 'twiza') {
                      tempGen = 'male';
                    }
                    else {
                      tempGen = 'female';
                    }
                  }
                else {
                    socket.emit('loginResponse',{success:false});
                }
            });
        });
        socket.on('register',function(data){
            isUsernameTaken(data,function(res){
                if(res || data.length === 0){
                    socket.emit('registerResponse',{success:false});}
                else {
                    addUser(data,function(){
                        socket.emit('registerResponse',{success:true});
                    });
                }
            });
        });


  socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
  });


});

Player.list = {};
Player.onConnect = function(socket){
    var player = Player(socket.id);
    socket.on('clickMove',function(data) {
      oldX = player.x;
      player.x = data.posX;
      player.y = data.posY;
      player.clicked = false;
      if(oldX < player.x) {
        player.sx = 60;
      }
      else {
        player.sx = 0;
      }
    })
    socket.on('male', function(data) {
      player.gender = data;
    })
    socket.on('female', function(data) {
      player.gender = data;
    })
    socket.on('mouseUp', function(data) {
      player.clicked = false;
    })
    socket.on('keyPress',function(data){
      if(data.inputId === 'left') {
          player.pressingLeft = data.state;
          player.sx = 0;
          player.clicked = false;
        }
        else if(data.inputId === 'right') {
            player.pressingRight = data.state;
            player.sx = 60;
            player.clicked = false;
        }
        else if(data.inputId === 'up') {
            player.pressingUp = data.state;
            player.clicked = false;
        }
        else if(data.inputId === 'down') {
            player.pressingDown = data.state;
            player.clicked = false;
        }
    });



}
Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            x:player.x,
            y:player.y,
            oldX: oldX,
            oldY: oldY,
            sx:player.sx,
            msg:player.msg,
            number:player.number,
            clicked: player.clicked,
            gender: tempGen
        });
    }
    return pack;
}


setInterval(function(){
    var pack = {
        player:Player.update(),
    }

    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/25);
