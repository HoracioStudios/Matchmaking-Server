const MAX_GAMES = 25;
const THIS_SERVER_PORT = 25564;
const BASE_PORT = 25566;
var actualPort = 0;

const execFile = require('child_process').execFile;
const sha256 = require('js-sha256').sha256;

const Express = require('express');
const server = Express();
server.use(Express.json())

const freePorts = new Array();
const games = new Map();
var currentPID;

init();
currentPID = startNewServer();
var currentGames = 0; // Count with current games

function startNewServer(){
  actualPort = freePorts.shift();
  return execFile('Server.exe', ['-port', actualPort], function(err, data) {  
      console.log(data.toString()); 
  });
}

function init(){
  for (let i = 0; i < MAX_GAMES + 1; i++) {
    freePorts.push(i + BASE_PORT);    
  }
}

function createMatchID(key, port, PID){
  var time = Date.now();
  var matchID = sha256(time.toString() + key);

  games.set(key, {matchID:matchID, port:port, PID: PID});

  return matchID;
}

function getKey(id1, id2){
  var min = Math.min(id1, id2);
  var max = Math.max(id1, id2);

  return (min + '+' + max);
}

var semaforo = false;

async function startNewGame(req, res)
{  
  while(semaforo) await sleep(5);

  semaforo = true;

  var ID1 = req.body.ID1;
  var ID2 = req.body.ID2;
  
  var key = getKey(ID1, ID2);
  console.log(key);
  if(games.has(key)){
    var r = games.get(key);
    console.log(`Game Already Exists: ` + ID1 + ' ID2: ' + ID2 + 'port: ' + r.port);
    semaforo = false;
    return res.send({port:r.port, matchID:r.matchID});    
  }

  if(currentGames == MAX_GAMES){ //Envio de error por que el servidor esta lleno
    semaforo = false;
    return res.sendStatus(503);
  }
  
  currentGames++;

  console.log(`New Game ID1: ` + ID1 + ' ID2: ' + ID2);
  console.log(games);

  var port = actualPort;
  
  var matchID = createMatchID(key, port, currentPID);
  currentPID = startNewServer();

  semaforo = false;

  return res.send({port:port, matchID:matchID});
}
server.post('/game-instances', startNewGame);

async function finishGame(req, res)
{
  while(semaforo) await sleep(5);

  semaforo = true;  

  var ID1 = req.body.ID1;
  var ID2 = req.body.ID2;

  var key = getKey(ID1, ID2);

  if(games.has(key)){
    var r = games.get(key);
    freePorts.push(r.port);
    games.delete(key);
    console.log(`Game Finish ID1: ` + ID1 + ' ID2: ' + ID2 + ' key: ' + key);
    r.PID.kill();
    currentGames--;
  }

  semaforo = false;

  return res.send({status:true});
}
server.delete('/game-instances', finishGame);

async function getCurrentGames(req, res)
{
  console.log("------------------------- GAMES -----------------------")
  console.log(games);
  return res.send({games:currentGames});
}
server.get('/game-instances', getCurrentGames);

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