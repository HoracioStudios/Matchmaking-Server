
/*
  variables que controlan si se desea emplear una función de procesado de información al subir una partida a la base de datos.
*/
const USE_REDEFINITION = true;
const REDEFINITIONS_PATH = "./redefinitions.js";

/*
  controla si se desea recibir mensajes por consola de diversos logs por el archivo
*/
const DEBUGLOG = true;

/*
  variables que controlan si se desea emplear el sistema de autorización por tokens. En caso de no emplearse se deberá proporcionar información manualmente en muchos servicios
*/
const PROCESS_AUTHENTICATION = true;

/*
  variables que controlan si se desea emplear HTTPS, y las rutas a los archivos de certificado y key
*/
const HTTPS = false;
const CERTIFICATE_PATH = './sensitive/certificate.crt';
const PRIVATE_KEY_PATH = './sensitive/privateKey.key';


/*
  variables que controlan si se desea emplear una URI distinta de la defecto (localhost:27017) para conectarse a la base de datos
*/
const USE_CUSTOM_URI = true;
const URI_PATH = './sensitive/uri.uri';


const MongoJS = require("./MongoJS/mongoJS.js");

/*
  version
*/
const versionCheck = '1.0.6';


if(USE_REDEFINITION)
{
  try {
    const Redefinitions = require(REDEFINITIONS_PATH);
    MongoJS.playerDataProcessing = Redefinitions.playerDataProcessing;
  }
  catch(error) { console.log("\nERROR: El archivo \'" + REDEFINITIONS_PATH + "\' no existe, o no está definida la función a redefinir. Ignora esto si no vas a querer emplear esta feature\n"); }
}


var fs = require('fs');

const defaultParameters = { rating: 1500, RD: 350 };

//NOTA: poner esto a lo que pongamos de espera en la búsqueda
//const ttlMilliseconds = 600000;
const ttlMilliseconds = 20000;

//import express from 'express';
const Express = require('express');
const server = Express();
server.use(Express.json())

const port = 25565;

const onlineUsers = [];

if(!HTTPS)
{
  server.listen(port, startup);
}
else
{
  //archivo index.js
  var https = require('https');
  
  https.createServer({
     cert: fs.readFileSync(CERTIFICATE_PATH),
     key: fs.readFileSync(PRIVATE_KEY_PATH)
   }, server).listen(port, startup);
}

 
const authTokenExpiration = '5m';

const JWT = require('jsonwebtoken');
const { versions } = require("process");

const secret = "poggers";
const refreshSecret = "poggerinos";

var refreshTokens = [];

/////////////////////////////////////////////

const authenticateJWT = (req, res, next) =>
{
  if(!PROCESS_AUTHENTICATION)
    next();
  else
  {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        JWT.verify(token, secret, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
  }
};

/////////////////////////////////////////////

const waitSecsToRD = 2;

/////////////////////////////////////////////
//PRUEBAS
/////////////////////////////////////////////

// Prueba de get
// envía: {reply: "reply"}
function getTest(req, res)
{
  let num = req.query.num;

  if(num !== undefined)
  {
    if(DEBUGLOG) console.log(`Se hizo get con query`);
    
    if(DEBUGLOG) console.log(`num es ${num}`);
    
    return res.send({reply: num * num});
  }

  if(DEBUGLOG) console.log(`Se hizo get`);
  
  return res.send("reply");
}
server.get('/test', getTest);

// Prueba de post
// envía: {reply: req.body}
function postTest(req, res)
{
  if(DEBUGLOG) console.log(`Se hizo post`);
  if(DEBUGLOG) console.log(req.body);
  return res.send(req.body);
}
server.post('/test', postTest)


/////////////////////////////////////////////
// CUENTAS
/////////////////////////////////////////////

// Comprobar si un nick o email está libre
//"/accounts/check-availability/?nick=x&email=x"
// nos aseguramos en el juego que el nick/email sea válido
// envía: {message: message, emailAvailable: bool, nickAvailable: bool}
async function availability(req, res)
{
  let email = req.query.email;

  let nick = req.query.nick;

  if(email === nick && email === undefined)
    return res.status(400).send({message: "Petición inválida, no se ha enviado ningún dato"});

  var reply = {};
  
  try
  {
    if(email !== undefined)
    {
      if(DEBUGLOG) console.log(`Se quiere verificar si se puede usar el email "${email}"`);
      reply.emailAvailable = await MongoJS.isEmailAvailable(email);
    }
    if(nick !== undefined)
    {
      if(DEBUGLOG) console.log(`Se quiere verificar si se puede usar el nick "${nick}"`);
      reply.nickAvailable = await MongoJS.isNickAvailable(nick);
    }
  }
  catch (error)
  {
    return res.status(502).send({message: "Base de datos no acepta conexión"});
  }

  return res.send(reply);
}

server.get('/accounts/check-availability', availability);

var ID = 0;

var isProcessing = false;


// Registro de un nuevo jugador
// asumimos que ya se ha verificado que no existan esos credenciales
async function signIn(req, res)
{
  var nick = req.body.nick;
  var email = req.body.email;
  var password = req.body.password;  
  
  if(nick === undefined || email === undefined || password === undefined) 
  return res.status(400).send({message: "Petición inválida, no se ha enviado ningún dato o faltan datos"});
  
  while(isProcessing) await sleep(5);
  
  isProcessing = true;

  if(DEBUGLOG) console.log(`Player ${nick} is signing in`);

  try
  {
    if(PROCESS_AUTHENTICATION && req.body.rating !== undefined && req.body.RD !== undefined)
      await MongoJS.addPlayer(ID, { rating: req.body.rating, RD: req.body.RD }, {nick: nick, email: email, password: password, creation: Date.now()});  
    else
      await MongoJS.addPlayer(ID, defaultParameters, {nick: nick, email: email, password: password, creation: Date.now()});
    
    ID++;
  }
  catch (error)
  {
    return res.status(502).send({message: "Base de datos no acepta conexión"});
  }
  
  isProcessing = false;

  if(DEBUGLOG) console.log(`Added user:`);
  if(DEBUGLOG) console.log({id: ID - 1, nick: nick, email: email, password: password});

  return res.sendStatus(200);
}
server.post('/accounts', signIn);


// Se usa para borrar una cuenta
async function deleteAccount(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.body.id;
  else id = req.user.id;

  try
  {
    await MongoJS.deletePlayerByID(id);
  }
  catch (error)
  {
    if(DEBUGLOG) console.log(error);
    return res.status(502).send({message: "Base de datos no acepta conexión"});
  }

  return res.sendStatus(200);
}
server.delete('/accounts', authenticateJWT, deleteAccount);


// Se usa para hacer log in de los jugadores. Se envía nick y la contraseña hasheada
async function verifyLogin(nick, password)
{
  var query = {};

  if(nick === undefined) return {status: 400, message: "Petición inválida, no se ha enviado ningún dato"};

  else
  {
    query.nick = nick;
    if (DEBUGLOG) console.log(`Player with nick ${nick} is trying to log in`);
  }

  var player;

  try
  {
    player = await MongoJS.findPlayerByLogin(query); 
  }
  catch (error)
  {
    return {status: 502, message: "Base de datos no acepta conexión"};
  }

  if (player === null || player.password != password) return {status: 404, message: "No se ha encontrado un jugador con esos credenciales"};

  return player;
}

// Servicio para hacer log in de los jugadores
async function logIn(req, res)
{
  var nick = req.body.nick;
  var password = req.body.password;
  var version = req.body.version;

  if(version === undefined || version != versionCheck){
    return res.status(426).send( { message: 'Version equivocada. Actualiza el juego' } );
  }
  
  try
  {
    var result = await verifyLogin(nick, password);
  }
  catch(error) {}

  if(result.status !== undefined) return res.status(result.status).send( { message: result.message } );

  await MongoJS.logLogin(result.id);

  // Generate an access token
  const accessToken = JWT.sign({ nick: nick, id: result.id, email: result.email }, secret, { expiresIn: authTokenExpiration });
  const refreshToken = JWT.sign({ nick: nick, id: result.id, email: result.email }, refreshSecret);

  refreshTokens.push(refreshToken);

  return res.send({id: result.id, accessToken: accessToken, refreshToken: refreshToken});
}
server.post('/accounts/sessions', logIn);


// Cierre de sesión y eliminación de refresh token
function logOut(req, res)
{
  const { refreshToken } = req.body;

  if (!refreshToken) {
      return res.status(400).send( { message: "Petición inválida, no se ha enviado ningún dato" } );
  }

  refreshTokens = refreshTokens.filter(t => t !== refreshToken);

  res.sendStatus(200);
}
server.delete('/accounts/sessions', authenticateJWT, logOut);

// Refresco de sesión
async function refreshSession(req, res)
{
  const { refreshToken } = req.body;

  if (!refreshToken) {
      return res.sendStatus(400);
  }

  if (!refreshTokens.includes(refreshToken)) {
      return res.sendStatus(403);
  }

  JWT.verify(refreshToken, refreshSecret, (err, user) => {
      if (err) {
          return res.sendStatus(403);
      }

      const accessToken = JWT.sign({ nick: user.nick, id: user.id, email: user.email }, secret, { expiresIn: authTokenExpiration });

      res.json({
          accessToken : accessToken
      });
  });
}
server.post('/accounts/sessions/refresh', refreshSession);


//get que devuelva la info de un jugador
// /accounts/by-id/:id y /accounts/by-nick/:nick, sustituyendo :id o :nick por el identificador o el nombre de usuario respectivamente
async function getInfo(req, res)
{
  var id = parseInt(req.params.id);
  var nick = req.params.nick;

  var player;

  if(id === undefined || isNaN(id))
  {
    if(nick === undefined) return res.status(400).send({message: "Petición inválida, no se ha enviado ningún dato"});

    else
    {
      try
      {
        player = await MongoJS.findPlayerSafe({ nick: nick });
      }
      catch (error)
      {
        return res.status(502).send({message: "Base de datos no acepta conexión"});
      }
    }
  }
  else
  {
    try
    {
      player = await MongoJS.findPlayerSafe({ id: id });
    }
    catch (error)
    {
      return res.status(502).send({message: "Base de datos no acepta conexión"});
    }
  }

  if (player === null) return res.status(404).send({message: "No se ha encontrado jugador"});

  return res.send(player);
}
//by-id y by-nick inspirado en RIOT: https://developer.riotgames.com/apis#account-v1/GET_getByPuuid
server.get('/accounts/by-id/:id', getInfo);
server.get('/accounts/by-nick/:nick', getInfo);

//envío info tras partida
async function sendRoundInfo(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.body.id;
  else id = req.user.id;

  try
  {
    await MongoJS.updatePlayerResults(id, req.body.results);
  }
  catch (error)
  {
    return res.status(502).send( {message: "Base de datos no acepta conexión"} );
  }

  return res.sendStatus(200);
}
server.post('/accounts/rounds', authenticateJWT, sendRoundInfo);


/////////////////////////////////////////////
// MATCHMAKING
/////////////////////////////////////////////


// Devuelve la lista de usuarios online
server.get('/matchmaking/user-list', (req, res) => {

  return res.send({ onlineUsers: onlineUsers });
});


//limpieza de usuarios no activos en la lista de espera
function timeToLiveCleanup(onlineUserList, i)
{

  var toDelete = [];

  var now = Date.now();

  for (let r = 0; r < onlineUserList.length; r++) {
    const data = onlineUserList[r];

    if(now - ttlMilliseconds > data.lastCheck) toDelete.push(r);
  }

  //console.log(toDelete);

  var spliceOffset = 0;
  var aux = "";
  
  toDelete.forEach(index => {

    aux += onlineUserList[index].playerData.nick + " - ";

    onlineUserList.splice(index + spliceOffset, 1);

    if(i >= index)
      spliceOffset--;
  });

  if(toDelete.length > 0) 
  {
    console.log("CLEANUP :" + aux);
  }

  return spliceOffset;
}

//función que realiza el emparejamiento
function makeTheMatch(user, onlineUserList)
{
  var userData = user.playerData;

  var min = userData.rating - (userData.RD + (waitSecsToRD * user.waitTime));
  var max = userData.rating + (userData.RD + (waitSecsToRD * user.waitTime));

  var bestRival = undefined;

  for (let r = 0; r < onlineUserList.length; r++) {
    const rivalData = onlineUserList[r].playerData;

    if(rivalData.id == userData.id) continue;
    if(onlineUserList[r].found)
    {
      if(onlineUserList[r].found.id != userData.id)
        continue;
      else
      {
        bestRival = rivalData;
        break;
      }
    }

    var minRival = rivalData.rating - (rivalData.RD + (waitSecsToRD * onlineUserList[r].waitTime));
    var maxRival = rivalData.rating + (rivalData.RD + (waitSecsToRD * onlineUserList[r].waitTime));

    if(minRival > max || maxRival < min)
    {
      continue;
    }
    
    if(bestRival === undefined)
    {
      bestRival = rivalData;
    }
    else
    {
      var conditions = false;


      conditions |= Math.abs(bestRival.rating - userData.rating) > Math.abs(rivalData.rating - userData.rating);
      conditions |= Math.abs(bestRival.rating - userData.rating) == Math.abs(rivalData.rating - userData.rating) && rivalData.RD < bestRival.RD;
      conditions |= rivalData.RD == bestRival.RD && rivalData.id < bestRival.id;

      if(conditions)
      {
        bestRival = rivalData;
      }
    }
  }

  return bestRival;
}

//añade a un jugador a la lista de espera
async function addToQueue(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.body.id;
  else id = req.user.id;

  id = parseInt(id);

  var waitTime = req.query.waitTime;
  if(waitTime === undefined) waitTime = 0;
  
  waitTime = parseFloat(waitTime);

  try
  {
    var player = await MongoJS.findPlayerSafe({ id: id });
  }
  catch (error)
  {
    return res.status(502).send({message: "Base de datos no acepta conexión"});
  }
  
  while(waitSearchPair) await sleep(5);
  
  waitSearchPair = true;

  var i = 0;

  i = onlineUsers.findIndex(p => p.playerData.id == id);
  
  if(i < 0)
    onlineUsers.push( { playerData: player, found: false, waitTime: waitTime, lastCheck: Date.now() } );
  else
    onlineUsers[i] = { playerData: player, found: false, waitTime: waitTime, lastCheck: Date.now() };

  waitSearchPair = false;

  //enviar algo??

  res.sendStatus(200);
}
server.post('/matchmaking', authenticateJWT, addToQueue);

var waitSearchPair = false;

//petición de búsqueda de pareja
//IMPORTANTE: DEBE SEGUIR HACIÉNDOSE HASTA QUE AMBOS ESTÉN EN LA SALA. POR SI SE DESCONECTA EL OPONENTE.
async function searchPair(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.query.id;
  else id = req.user.id;

  id = parseInt(id);
  
  while(waitSearchPair) await sleep(5);
  
  waitSearchPair = true;
  
  var waitTime = req.query.waitTime;

  if(waitTime === undefined) waitTime = 0;

  waitTime = parseFloat(waitTime.replace(/,/, '.'));

  var i = 0;

  i = onlineUsers.findIndex(p => p.playerData.id == id);

  if(i < 0)
  {
    waitSearchPair = false;
    return res.status(404).send({ message: "Este usuario no está en la lista" });
  }
  else
  {
    try
    {
      onlineUsers[i].playerData = await MongoJS.findPlayerSafe({ id: id });
    }
    catch (error)
    {
      waitSearchPair = false;
      return res.status(502).send({message: "Base de datos no acepta conexión"});
    }

    if(onlineUsers[i] === undefined)
    {
      console.log(i + " BUT REAL SIZE IS " + onlineUsers.length);
      console.log("id was " + id);
      
      waitSearchPair = false;
      return res.status(404).send({ message: "Este error es un poco turbio, prueba a reiniciar el juego y manda al canal de errores" });
    }
    else
    {
      onlineUsers[i].waitTime = waitTime;
      onlineUsers[i].lastCheck = Date.now();
    }
  }

  i += timeToLiveCleanup(onlineUsers, i);
  
  waitSearchPair = false;

  if(i < 0) return res.status(404).send({ message: "Este usuario no está en la lista" });

  var bestRival = undefined;

  if(!onlineUsers[i].found) bestRival = makeTheMatch(onlineUsers[i], onlineUsers);
  else
  {
    var index = onlineUsers.findIndex(p => p.playerData.id == onlineUsers[i].found.id);

    if (index == -1 || onlineUsers[index] === undefined)
    {
      var pog = 0;
      pog++;
    }

    if(index > -1 && onlineUsers[index].playerData.id == onlineUsers[i].found.id && (!onlineUsers[index].found || onlineUsers[index].found.id == onlineUsers[i].playerData.id))
    {
      bestRival = {};
      bestRival = onlineUsers[i].found;
    }
    else
    {
      onlineUsers[i].found = false;
      bestRival = makeTheMatch(onlineUsers[i], onlineUsers);
    }
  }

  if(bestRival === undefined || bestRival.id == onlineUsers[i].playerData.id) return res.send({ found: false });

  var bestRivalIndex = onlineUsers.findIndex(p => p.playerData.id == bestRival.id);

  onlineUsers[bestRivalIndex].found = onlineUsers[i].playerData;
  onlineUsers[i].found = onlineUsers[bestRivalIndex].playerData;

  onlineUsers[bestRivalIndex].mutual = true;

  return res.send({ found: true, finished: (onlineUsers[i].mutual !== undefined && onlineUsers[i].mutual), rivalID: bestRival.id, rivalNick: bestRival.nick, bestRivalRating: bestRival.rating, bestRivalRD: bestRival.RD, myRating: onlineUsers[i].playerData.rating, myRD: onlineUsers[i].playerData.RD });
}
server.get('/matchmaking', authenticateJWT, searchPair);

//salirse de la cola (tanto por cancelado como por haber encontrado pareja)
//IMPORTANTE: SALIR SOLO DESPUÉS DE HABER EMPAREJADO A AMBOS EN LA SALA. NO ANTES.
async function leaveQueue(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.body.id;
  else id = req.user.id;
  
  while(waitSearchPair) await sleep(5);
  
  waitSearchPair = true;
  
  var i = onlineUsers.findIndex(p => p.playerData.id == id);

  if(i < 0)
  {
    waitSearchPair = false;
    return res.status(404).send({ message: "Este usuario no está en la lista" });
  }

  onlineUsers.splice(i, 1);

  waitSearchPair = false;

  return res.sendStatus(200);
}
server.delete('/matchmaking', authenticateJWT, leaveQueue);

// Comprobación de la versión actual del juego
// antes de hacer logIn
server.get('/version', (req, res) => {
  var version = "1.0.0";
  return res.send({version: version});
});

//función de inicio. Busca si existe un archivo con la URI privada
async function startup()
{
  console.log(`Server is running on port ${port}`);

  if(USE_CUSTOM_URI)
  {
    try {
      var uri = fs.readFileSync(URI_PATH, 'utf8');
      MongoJS.init(uri);
    } catch (error)
    {    
      console.log("\nERROR: No se ha encontrado el archivo \'" + URI_PATH + "\', se empleará la conexión por defecto a la base de datos\n");
    }
  }

  try
  {
    ID = await MongoJS.getUserCount();
  }
  catch (error)
  {
    console.log("Base de datos no va, se pone a 0 por defecto")
    ID = 0;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  