const MAX_GAMES = 20;
const THIS_SERVER_PORT = 25564;
const BASE_PORT = 25565;
var actualPort = 0;

const execFile = require('child_process').execFile;
const sha256 = require('js-sha256').sha256;

const Express = require('express');
const server = Express();
server.use(Express.json())

const freePorts = new Array();
const games = new Map();

init();
startNewServer();
var currentGames = 0; // Count with current games

function startNewServer(){
  actualPort = freePorts.shift();
  currentGames++;
  execFile('Server.exe', ['-port', actualPort], function(err, data) {  //SERVER.EXE ES EL EJECUTABLE DEL SERVIDOR, NECESARIO PARA EJECUTAR ESTE JS
      console.log(err)
      console.log(data.toString()); 
  });
}

function init(){
  for (let i = 0; i < MAX_GAMES + 1; i++) {
    freePorts.push(i + BASE_PORT);    
  }
}

function createMatchID(id1, id2, port){
  var min = Math.min(id1, id2);
  var max = Math.max(id1, id2);
  var time = Date.now();
  var matchID = sha256(time.toString() + min.toString() + max.toString());

  games.set(min.toString(), {matchID:matchID, port:port});
  games.set(max.toString(), {matchID:matchID, port:port});

  return matchID;
}

var semaforo = false;

async function startNewGame(req, res)
{  
  while(!freePorts.length) await sleep(500); //Espera hasta que haya un puerto libre
  
  while(semaforo) await sleep(5);
  
  semaforo = true;  

  var ID1 = req.query.ID1;
  if(games.has(ID1)){
    console.log(`Game Already Exists`);
    var r = games.get(ID1);
    semaforo = false;
    return res.send({port:r.port, matchID:r.matchID}); 
  }
  var ID2 = req.query.ID2;
  console.log(`New Game`);

  var port = actualPort;
  startNewServer();
  var matchID = createMatchID(ID1, ID2, port)

  semaforo = false;

  return res.send({port:port, matchID:matchID});
}
server.get('/gameServer/newGame', startNewGame);

async function finishGame(req, res)
{
  while(semaforo) await sleep(5);

  semaforo = true;  
  var deletedOneGame = false;

  var ID1 = req.query.ID1;
  if(games.has(ID1)){
    freePorts.push(games.get(ID1).port);
    games.delete(ID1);
    deletedOneGame = true;
  }

  var ID2 = req.query.ID2;
  if(games.has(ID2)){
    games.delete(ID2);
    deletedOneGame = true;
  }

  if(deletedOneGame)
    currentGames--;

  semaforo = false;

  return res.send({status:true});
}
server.get('/gameServer/finishGame', finishGame);

async function getCurrentGames(req, res)
{
  console.log("------------------------- GAMES -----------------------")
  console.log(games);
  return res.send({games:currentGames});
}
server.get('/gameServer/currentGames', getCurrentGames);

function getTest(req, res)
{
  console.log(`Se hizo get`);

  return res.send("reply");
}
server.get('/test/get', getTest);

async function startup()
{
  console.log(`Server is running on port ${THIS_SERVER_PORT}`);
}

server.listen(THIS_SERVER_PORT, startup);

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  