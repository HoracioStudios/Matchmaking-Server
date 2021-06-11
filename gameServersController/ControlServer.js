const MAX_GAMES = 5;
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

init();
startNewServer();
var currentGames = 0; // Count with current games

function startNewServer(){
  actualPort = freePorts.shift();
  execFile('Server.exe', ['-port', actualPort], function(err, data) {  
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

  games.set(min, {matchID:matchID, port:port});
  games.set(max, {matchID:matchID, port:port});

  return matchID;
}

var semaforo = false;

async function startNewGame(req, res)
{  
  while(semaforo) await sleep(5);

  semaforo = true;

  if(currentGames == MAX_GAMES){ //Envio de error por que el servidor esta lleno
    semaforo = false;
    return res.sendStatus(503);
  }

  var ID1 = req.body.ID1;
  var ID2 = req.body.ID2;
  if(games.has(ID1)){
    var r = games.get(ID1);
    console.log(`Game Already Exists: ` + ID1 + ' ID2: ' + ID2 + 'port: ' + r.port);
    semaforo = false;
    currentGames++;
    return res.send({port:r.port, matchID:r.matchID}); 
  }
  console.log(`New Game ID1: ` + ID1 + ' ID2: ' + ID2);

  var port = actualPort;
  startNewServer();
  var matchID = createMatchID(ID1, ID2, port)

  semaforo = false;

  return res.send({port:port, matchID:matchID});
}
server.post('/game-instances', startNewGame);

async function finishGame(req, res)
{
  while(semaforo) await sleep(5);

  semaforo = true;  
  var deletedOneGame = false;

  var ID1 = req.body.ID1;
  if(games.has(ID1)){
    freePorts.push(games.get(ID1).port);
    games.delete(ID1);
    deletedOneGame = true;
  }

  var ID2 = req.body.ID2;
  if(games.has(ID2)){
    freePorts.push(games.get(ID2).port);
    games.delete(ID2);
    deletedOneGame = true;
  }
  console.log(`Game Finish ID1: ` + ID1 + ' ID2: ' + ID2);
  if(deletedOneGame)
    currentGames--;

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