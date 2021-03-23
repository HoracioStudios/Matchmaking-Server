var net = require('net');

var server = net.createServer();
// https://www.youtube.com/watch?v=nwV3MS6pryY&ab_channel=TechCBT
server.on("connection", function(socket){
    var remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
    console.log("new client connection is made %s", remoteAddress);

    socket.on("data", function(d){
        console.log("Data from %s: %s", remoteAddress, d);
        console.log(typeof(d));
        var separado = d.toString().split(" ");
        var key = parseInt(separado[0]);
        switch (key) {
            case 0:
                //Hacer algo para el comando 0
                socket.write("Comando 0: " + separado[1]);
                break;
        
            default:
                break;
        }
        socket.write("Hello " + d);
    });

    socket.once("close", function(){
        console.log("Connection from $s closed", remoteAddress);
    });

    socket.on("error", function(err){
        console.log("Connection %s error: %s", remoteAddress, err.message);
    });
});

server.listen(25565, function(){
    console.log("server listening to %j", server.address());
});