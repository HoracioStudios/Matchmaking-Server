const MongoJS = require('./modules/mongoJS.js');

const DEBUGLOG = true;

const defaultParameters = {rating: 1500, RD: 350};

//NOTA: poner esto a lo que pongamos de espera en la búsqueda
const ttlMilliseconds = 7000;

//import express from 'express';
const Express = require('express');
const server = Express();
server.use(Express.json())
const port = 25565;

const onlineUsers = [];

/////////////////////////////////////////////
// 
/////////////////////////////////////////////

const internalErrorCodes = {DATABASEDOWN: 0, NOPASSWORD: 1, NOEMAILNICK: 2, WRONGLOGIN: 3, WRONGPASSWORD: 4, NOIDNICK: 5, WRONGIDNICK: 6, NOTINQUEUE: 7 };

const waitSecsToRD = 10;

/////////////////////////////////////////////
//PRUEBAS
/////////////////////////////////////////////

// Prueba de get
// envía: {reply: "reply"}
function getTest(req, res)
{
  if(DEBUGLOG) console.log(`Se hizo get`);

  return res.send("reply");
}
server.get('/test/get', getTest);

// Prueba de query
//"/test/query/?num=x"
// envía: {reply: num ^2}
function queryTest(req, res)
{
  if(DEBUGLOG) console.log(`Se hizo get con query`);
  
  let num = req.query.num;

  if(DEBUGLOG) console.log(`num es ${num}`);

  return res.send({reply: num * num});
}
server.get('/test/query', queryTest);

// Prueba de post
// envía: {reply: req.body}
function postTest(req, res)
{
  console.log(`Se hizo post`);
  console.log(req.body.data);
  return res.send(req.body);
}
server.post('/test/post', postTest)



/////////////////////////////////////////////
// DISPONIBILIDAD
/////////////////////////////////////////////

// Comprobar si un nick está libre
//"/available/nick/?nick=x"
// nos aseguramos en el juego que el nick sea válido
// envía: {code: errorCode, internal: internalErrorCodes, message: message, reply: bool}
async function nickAvailability(req, res)
{
  let nick = req.query.nick;

  if(DEBUGLOG) console.log(`Se quiere verificar si se puede usar el nick "${nick}"`);

  var exists;
  
  try
  {
    exists = await MongoJS.isNickAvailable(nick);
  }
  catch (error)
  {
    return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
  }

  //por ajustarnos a lo "estándar" en HTTP, 200 significa OK
  return res.send({code: 200, reply: exists});
}
server.get('/available/nick', nickAvailability);

// Comprobar si un email está libre 
//"/available/email/?email=x"
// nos aseguramos en el juego que el email sea válido
// envía: {code: errorCode, internal: internalErrorCodes, message: message, reply: bool}
async function emailAvailability(req, res)
{
  let email = req.query.email;

  if(DEBUGLOG) console.log(`Se quiere verificar si se puede usar el email "${email}"`);

  var exists;

  try
  {
    exists = await MongoJS.isEmailAvailable(email);
  }
  catch (error)
  {
    return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
  }

  //por ajustarnos a lo "estándar" en HTTP, 200 significa OK
  return res.send({code: 200, reply: exists});
}
server.get('/available/email', emailAvailability);


/////////////////////////////////////////////
// CUENTAS
/////////////////////////////////////////////

const DEBUG = true;

// Registro de un nuevo jugador
// parámetros json: nick, email, password
//asumimos que ya se ha verificado que no existan esos credenciales
// envía: {code: errorCode, internal: internalErrorCodes, message: message}

var ID = 0;

var isProcessing = false;

async function signIn(req, res)
{
  var nick = req.body.nick;
  var email = req.body.email;
  var password = req.body.password;
  if(DEBUGLOG) console.log(`Player ${nick} is signing in`);

  
  if(nick === undefined && email === undefined) return res.status(400).send({code: 400, internal: internalErrorCodes.NOEMAILNICK, message: "No se ha recibido ni nick ni email"});
  else if(password === undefined) return res.status(400).send({code: 400, internal: internalErrorCodes.NOPASSWORD, message: "No se ha recibido contraseña"});

  while(isProcessing) await sleep(5);

  isProcessing = true;

  try
  {

    if(DEBUG && req.body.rating !== undefined && req.body.RD !== undefined)
      await MongoJS.addPlayer(ID, { rating: req.body.rating, RD: req.body.RD }, {nick: nick, email: email, password: password, salt: "", creation: (new Date()).toString()});  
    else
      await MongoJS.addPlayer(ID, defaultParameters, {nick: nick, email: email, password: password, salt: "", creation: (new Date()).toString()});
    
    ID++;

  }
  catch (error)
  {
    return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
  }
  
  isProcessing = false;

  if(DEBUGLOG) console.log(`Added user:`);
  if(DEBUGLOG) console.log({id: ID - 1, nick: nick, email: email, password: password});

  return res.send({code: 200});
}
server.post('/signin', signIn);


// Se usa para hacer log in de los jugadores. Se envía email o nick (o ambos, pero email tiene preferencia) y la contraseña hasheada
// parámetros json: nick, email, password
// envía: {code: errorCode, message: message, internal: internalErrorCode}
// message es para nosotros, y internal sirve para buscar el mensaje de error en las tablas de idiomas. Internal depende de la acción realizada, NO ES GLOBAL
// (empleamos estándar de HTTP) => 200 = no hay errores, 400 = error de cliente
async function verifyLogin(email, nick, password)
{

  var query = {};

  //siempre se prioriza el login con email
  if(email === undefined)
  {
    if(nick === undefined) return {code: 400, internal: internalErrorCodes.NOEMAILNICK, message: "No se ha recibido ni email ni nick."};

    else
    {
      query.nick = nick;
      if (DEBUGLOG) console.log(`Player with nick ${nick} is trying to log in`);
    }
  }
  else
  {
    query.email = email;    
    if (DEBUGLOG) console.log(`Player with email ${email} is trying to log in`);
  }

  var player;

  try
  {
    player = await MongoJS.findPlayerByLogin(query); 
  }
  catch (error)
  {
    return {code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"};
  }

  if (player === null) return {code: 400, internal: internalErrorCodes.WRONGLOGIN, message: "No se ha encontrado un jugador con esos credenciales"};
  else if (player.password != password) return {code: 400, internal: internalErrorCodes.WRONGPASSWORD, message: "Contraseña incorrecta"};

  // Errores: contraseña incorrecta
  return player;
}

async function logIn(req, res)
{
  var email = req.body.email;
  var nick = req.body.nick;
  var password = req.body.password;
  
  try
  {
    var result = await verifyLogin(email, nick, password);
  }
  catch(error) {}

  if(result.code !== undefined) return res.status(result.code).send(result);

  await MongoJS.logLogin(result.id);

  // Errores: contraseña incorrecta
  return res.send({code: 200, ID: result.id});
}
server.post('/login', logIn);


// Se usa para borrar una cuenta. POR AHORA Se envía email o nick (o ambos, pero email tiene preferencia) y la contraseña hasheada
// parámetros json: nick, email, password
// envía: {code: errorCode, message: message, internal: internalErrorCode}
// message es para nosotros, y internal sirve para buscar el mensaje de error en las tablas de idiomas. Internal depende de la acción realizada, NO ES GLOBAL
// (empleamos estándar de HTTP) => 200 = no hay errores, 400 = error de cliente
async function deleteAccount(req, res)
{
  var email = req.body.email;
  var nick = req.body.nick;
  var password = req.body.password;
  
  try
  {
    var result = await verifyLogin(email, nick, password);
  }
  catch(error) {}

  if(result.code !== undefined) return res.status(result.code).send(result);
  
  try
  {
    await MongoJS.deletePlayerByID(result.id);
  }
  catch (error)
  {
    return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
  }

  // Errores: contraseña incorrecta
  return res.send({code: 200});
}
server.post('/deleteAccount', deleteAccount);


/////////////////////////////////////////////
// PETICIONES DE DATOS
/////////////////////////////////////////////

// Devuelve la lista de usuarios online (IDs de jugadores)
// envía: {code: errorCode, onlineUsers: onlineUsers}
server.get('/petition/onlineUsers', (req, res) => {

  return res.send({code: 200, onlineUsers: onlineUsers});
});


//get que devuelva la info de partidas de un jugador (victorias, derrotas, etc)
      //server.get('/getInfo') y luego la URL de acceso sería "/getInfo/?playerID:x" => dentro de la función lo sacas con req.query.playerID
async function getInfo(req, res)
{
  var id = parseInt(req.query.playerID);
  var nick = req.query.playerNick;

  var player;

  if(id === undefined || id === NaN)
  {
    if(nick === undefined) return res.status(400).send({code: 400, internal: internalErrorCodes.NOIDNICK, message: "No se ha recibido un ID o nick."});

    else
    {
      try
      {
        player = await MongoJS.findPlayerByLogin({ nick: nick });
        player = await MongoJS.findPlayerSafe(player.id);
      }
      catch (error)
      {
        return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
      }
    }
  }
  else
  {
    try
    {
      player = await MongoJS.findPlayerSafe(id);
    }
    catch (error)
    {
      return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
    }
  }

  if (player === null) return res.status(400).send({code: 400, internal: internalErrorCodes.WRONGIDNICK, message: "No se ha encontrado un jugador con ese ID o nick"});

  var playerCopy = player;

  return res.send({code: 200, data: playerCopy});
}
server.get('/petition/getInfo', getInfo);


/////////////////////////////////////////////
// ENVÍO DE DATOS
/////////////////////////////////////////////

//envío info tras partida
async function sendRoundInfo(req, res)
{
  if(!DEBUG)
  {
    
    try
    {
      //temp, ser4ía mejor usar access tokens pa esto, pero bueno
      var player = await verifyLogin(req.body.email, req.body.nick, req.body.password);
    }
    catch(error) {}

    if(player.code !== undefined) return res.status(player.code).send(player);
  }
  else
    var player = { id: req.body.playerID };

  try
  {
    await MongoJS.updatePlayerResults(player.id, req.body.results);
  }
  catch (error)
  {
    return {code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"};
  }

  return res.send({code: 200});
}
server.post('/sendRoundInfo', sendRoundInfo);


/////////////////////////////////////////////
// MATCHMAKING
/////////////////////////////////////////////

//NOTA: esto se hace por petición, el emparejamiento ocurre cada vez que se llama al servicio. Asumo que está chido así.

function timeToLiveCleanup(onlineUserList)
{
  var toDelete = [];

  var now = Date.now();

  for (let r = 0; r < onlineUserList.length; r++) {
    const data = onlineUserList[r];

    if(now - ttlMilliseconds > data.lastCheck) toDelete.push(r);
  }

  console.log(toDelete);

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

  var min = userData.rating - (userData.RD + (waitSecsToRD * userData.waitTime));
  var max = userData.rating + (userData.RD + (waitSecsToRD * userData.waitTime));

  var bestRival = undefined;

  for (let r = 0; r < onlineUserList.length; r++) {
    const rivalData = onlineUserList[r].playerData;

    if(rivalData.id == userData.id) continue;
    if(rivalData.found) continue;

    var minRival = rivalData.rating - (rivalData.RD + (waitSecsToRD * rivalData.waitTime));
    var maxRival = rivalData.rating + (rivalData.RD + (waitSecsToRD * rivalData.waitTime));

    if(minRival >= max || maxRival <= min) continue;
    
    if(bestRival === undefined) bestRival = { index: r, playerData: rivalData };
    else
    {
      var conditions = false;

      conditions |= Math.abs(bestRival.playerData.rating - userData.rating) > Math.abs(rivalData.rating - userData.rating);
      conditions |= Math.abs(bestRival.playerData.rating - userData.rating) == Math.abs(rivalData.rating - userData.rating) && rivalData.RD < bestRival.playerData.RD;
      conditions |= rivalData.RD == bestRival.playerData.RD && rivalData.id < bestRival.playerData.id;

      if(conditions)
      {
        bestRival = rivalData;
        bestRival.index = r;
      }
    }
  }

  return bestRival;
}

//proceso matchmaking
//IMPORTANTE: DEBE SEGUIR HACIÉNDOSE HASTA QUE AMBOS ESTÉN EN LA SALA. POR SI SE DESCONECTA EL OPONENTE.
async function searchPair(req, res)
{
  var id;
  if(id === "") id = parseInt(req.body.playerID);
  else id = req.body.playerID;

  var player;

  if(id === undefined || id === NaN) return res.status(400).send({code: 400, internal: internalErrorCodes.NOIDNICK, message: "No se ha recibido un ID o nick."});
  else
  {
    try
    {
      player = await MongoJS.findPlayerSafe(id);
    }
    catch (error)
    {
      return res.status(500).send({code: 500, internal: internalErrorCodes.DATABASEDOWN, message: "Mongo no acepta conexión"});
    }
  }

  if (player === null) return res.status(400).send({code: 400, internal: internalErrorCodes.WRONGIDNICK, message: "No se ha encontrado un jugador con ese ID o nick"});


  var waitTime;
  if(waitTime === "") waitTime = Number(req.body.waitTime);
  else waitTime = req.body.waitTime;

  var i = 0;

  if(waitTime < 0)
  {
    onlineUsers.push( { playerData: player, found: false, waitTime: 0, lastCheck: Date.now() } );
    
    i = onlineUsers.length - 1;
  }
  else
  {
    i = onlineUsers.findIndex(p => p.playerData.id == player.id);
    var found = onlineUsers[i];

    if(found === undefined)
    {
      onlineUsers.push( { playerData: player, found: false, waitTime: 0, lastCheck: Date.now() } );
      
      i = onlineUsers.length - 1;
    }
    else
    {
      found.playerData = player;
      found.waitTime = waitTime;
      found.lastCheck = Date.now();
    }
  }

  //console.log(onlineUsers);

  i += timeToLiveCleanup(onlineUsers);

  console.log(onlineUsers);

  var bestRival = undefined;

  if(!onlineUsers[i].found) bestRival = makeTheMatch(onlineUsers[i], onlineUsers);
  else
  {
    var index = onlineUsers[i].found.index;

    if(onlineUsers[index].id == onlineUsers[i].found.id)
    {
      bestRival = {};
      bestRival = onlineUsers[i].found;
    }
    else
    {
      onlineUsers.found = false;
      bestRival = makeTheMatch(onlineUsers[i], onlineUsers);
    }
  }

  if(bestRival === undefined) return res.send({code: 200, found: false});

  onlineUsers[bestRival.index].found = onlineUsers[i].playerData;
  onlineUsers[bestRival.index].found.index = i;

  return res.send({ code: 200, found: true, finished: onlineUsers[i].found, rivalID: bestRival.id, rivalNick: bestRival.nick });
}
server.post('/searchPair', searchPair);

//salirse de la cola (tanto por cancelado como por haber encontrado pareja)
//IMPORTANTE: SALIR SOLO DESPUÉS DE HABER EMPAREJADO A AMBOS EN LA SALA. NO ANTES.
async function leaveQueue(req, res)
{
  var id;
  if(id === "") id = parseInt(req.body.playerID);
  else id = req.body.playerID;
  
  var i = onlineUsers.findIndex(p => p.playerData.id == id);

  if(i < 0)
    return res.status(400).send({ code: 400, internal: internalErrorCodes.NOTINQUEUE, message: "Este id no está en la lista" });

  onlineUsers.splice(i, 1);

  return res.send({ code: 200 });
}
server.post('/leaveQueue', leaveQueue);


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
  return res.send(version);
});

function test()
{
}

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
    console.log("Mongo no va, se pone a 0 por defecto")
    ID = 0;
  }

  test();
}

server.listen(port, startup);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  