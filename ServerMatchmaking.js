const MongoJS = require('./modules/mongoJS.js');

const DEBUGLOG = true;

const PROCESS_AUTHENTICATION = false;
const HTTPS = false;

const defaultParameters = {rating: 1500, RD: 350};

//NOTA: poner esto a lo que pongamos de espera en la búsqueda
const ttlMilliseconds = 600000;

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
  var fs = require('fs');
  var https = require('https');
  
  https.createServer({
     cert: fs.readFileSync('certificate.crt'),
     key: fs.readFileSync('privateKey.key')
   }, server).listen(port, startup);
}

 
const authTokenExpiration = '5m';

const JWT = require('jsonwebtoken');

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
//"/available/?nick=x&email=x"
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

// Registro de un nuevo jugador
// parámetros json: nick, email, password
//asumimos que ya se ha verificado que no existan esos credenciales
// envía: {message: message}

var ID = 0;

var isProcessing = false;

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
      await MongoJS.addPlayer(ID, { rating: req.body.rating, RD: req.body.RD }, {nick: nick, email: email, password: password, salt: "", creation: (new Date()).toString()});  
    else
      await MongoJS.addPlayer(ID, defaultParameters, {nick: nick, email: email, password: password, salt: "", creation: (new Date()).toString()});
    
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


// Se usa para borrar una cuenta. POR AHORA Se envía email o nick (o ambos, pero email tiene preferencia) y la contraseña hasheada
// parámetros json: nick, email, password
// envía: {message: message}
// message es para nosotros
// (empleamos estándar de HTTP) => 200 = no hay errores, 400 = error de cliente
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

// Se usa para hacer log in de los jugadores. Se envía email o nick (o ambos, pero email tiene preferencia) y la contraseña hasheada
// parámetros json: nick, email, password
// envía: {message: message}
// message es para nosotros
// (empleamos estándar de HTTP) => 200 = no hay errores, 400 = error de cliente
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

async function logIn(req, res)
{
  var nick = req.body.nick;
  var password = req.body.password;
  
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
          accessToken
      });
  });
}
server.post('/accounts/sessions/refresh', refreshSession);


//get que devuelva la info de partidas de un jugador (victorias, derrotas, etc)
      //server.get('/getInfo') y luego la URL de acceso sería "/getInfo/?playerID=x" => dentro de la función lo sacas con req.query.playerID
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


// Devuelve la lista de usuarios online (IDs de jugadores)
// envía: {status: errorCode, onlineUsers: onlineUsers}
server.get('/matchmaking/user-list', (req, res) => {

  return res.send({ onlineUsers: onlineUsers });
});

//NOTA: esto se hace por petición, el emparejamiento ocurre cada vez que se llama al servicio. Asumo que está chido así.

function timeToLiveCleanup(onlineUserList)
{
  var toDelete = [];

  var now = Date.now();

  for (let r = 0; r < onlineUserList.length; r++) {
    const data = onlineUserList[r];

    if(now - ttlMilliseconds > data.lastCheck) toDelete.push(r);
  }

  //console.log(toDelete);

  var spliceOffset = 0;
  
  toDelete.forEach(index => {
    onlineUserList.splice(index + spliceOffset, 1);
    spliceOffset--;
  });

  return spliceOffset;
}

function makeTheMatch(user, onlineUserList)
{
  var userData = user.playerData;

  var min = userData.rating - (userData.RD + (waitSecsToRD * user.waitTime));
  var max = userData.rating + (userData.RD + (waitSecsToRD * user.waitTime));

  var bestRival = undefined;

  for (let r = 0; r < onlineUserList.length; r++) {
    const rivalData = onlineUserList[r].playerData;

    if(rivalData.id == userData.id) continue;
    if(rivalData.found) continue;

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

//proceso matchmaking
//IMPORTANTE: DEBE SEGUIR HACIÉNDOSE HASTA QUE AMBOS ESTÉN EN LA SALA. POR SI SE DESCONECTA EL OPONENTE.
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
  
  onlineUsers.push( { playerData: player, found: false, waitTime: waitTime, lastCheck: Date.now() } );

  //enviar algo??

  res.sendStatus(200);
}
server.post('/matchmaking', authenticateJWT, addToQueue);

//proceso matchmaking
//IMPORTANTE: DEBE SEGUIR HACIÉNDOSE HASTA QUE AMBOS ESTÉN EN LA SALA. POR SI SE DESCONECTA EL OPONENTE.
async function searchPair(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.query.id;
  else id = req.user.id;

  id = parseInt(id);
  
  var waitTime = req.query.waitTime;

  if(waitTime === undefined) waitTime = 0;

  waitTime = parseFloat(waitTime);

  var i = 0;

  i = onlineUsers.findIndex(p => p.playerData.id == id);

  if(i < 0)
  {
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
      return res.status(502).send({message: "Base de datos no acepta conexión"});
    }
    onlineUsers[i].waitTime = waitTime;
    onlineUsers[i].lastCheck = Date.now();
  }

  //console.log(onlineUsers);

  i += timeToLiveCleanup(onlineUsers);

  //console.log(onlineUsers);

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

    if(index > -1 && onlineUsers[index].playerData.id == onlineUsers[i].found.id)
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

  if(bestRival === undefined) return res.send({ found: false });

  var bestRivalIndex = onlineUsers.findIndex(p => p.playerData.id == bestRival.id);

  onlineUsers[bestRivalIndex].found = onlineUsers[i].playerData;

  return res.send({ found: true, finished: onlineUsers[i].found, rivalID: bestRival.id, rivalNick: bestRival.nick });
}
server.get('/matchmaking', authenticateJWT, searchPair);

//salirse de la cola (tanto por cancelado como por haber encontrado pareja)
//IMPORTANTE: SALIR SOLO DESPUÉS DE HABER EMPAREJADO A AMBOS EN LA SALA. NO ANTES.
function leaveQueue(req, res)
{
  var id;

  if(!PROCESS_AUTHENTICATION) id = req.body.id;
  else id = req.user.id;
  
  var i = onlineUsers.findIndex(p => p.playerData.id == id);

  if(i < 0)
    return res.status(404).send({ message: "Este usuario no está en la lista" });

  onlineUsers.splice(i, 1);

  return res.sendStatus(200);
}
server.delete('/matchmaking', authenticateJWT, leaveQueue);


/////////////////////////////////////////////
//TO DO
/////////////////////////////////////////////

//recuperación cuenta (contraseña nueva?)

//cambio pass y nick

//access tokens??? salt???

// Comprobación de la versión actual del juego
// antes de hacer logIn
// cómo sacamos la versión? la ponemos en la base de datos?
server.get('/version', (req, res) => {
  var version = "1.0.0";
  return res.send({version: version});
});

async function startup()
{
  console.log(`Server is running on port ${port}`);

  try
  {
    ID = await MongoJS.getUserCount();

    //console.log(ID);
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