const request = require('request');

const url = 'http://localhost:25565';

var poggerinos = "";

var defaultLogin = {nick: "test", password: "test"};

const Glicko = require('./modules/Glicko.js');
let dataFile = require('./Bots.json');
let users = require ('./UserInfo.json');
//console.log(JSON.stringify(users, null, 2))

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  

function getRandom(arr, n) {
  var result = new Array(n),
      len = Object.keys(arr).length,
      taken = new Array(len);
  if (n > len)
      throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
      var x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

function signIn(emailUser, nickUser, passUser, points, deviation){
  request.post({
    url: url + '/signin',
    json: { nick : nickUser, email : emailUser, password : passUser, rating : points, RD : deviation}
  },function(error, response, body){
    //console.log(error);
    //console.log(response);
    console.log(body);  
  });
}
//console.log(JSON.stringify(dataOnline, null, 2))

async function getInQueue(index){
  request.post({
    url:     url + '/matchmaking',
    json: {id : dataOnline[index].id, waitTime: 0}
  }, function(error, response, body){
    if(error !== null)
      console.log("error al meterse en la lista: " + error);
      dataOnline[index].onQueue = true;
  });
}

async function searchPair(index, time)
{
  request.get({
    url:     url + '/matchmaking/?id=' + dataOnline[index].id + '&waitTime=' + time,
    json:    {}
  }, function(error, response, body){
    if(error !== null)
      return;

    //console.log(body);

    if(body === undefined)
      return;
    if(!body.finished)
      return;

    dataOnline[index].rival = body.rivalID;
  });
}

function simulateDisconnection(player){
  var prob = Math.floor(Math.random() * (gameCounter[player.id] * 10));
  var prob2 = Math.floor(Math.random() * 100);

  if (prob >= prob2)
    return true;
  else
    return false;
}

function simularJugadores()
{
  for (let index = 0; index < dataOnline.length; index++) {
    if(dataOnline[index].onQueue === undefined)
        getInQueue(index);
    else
        searchPair(index, 0);
  }

  if(dataOnline.length > 1)
  {
    dataOnline.forEach(jugadorOnline => {
      if(!jugadorOnline.rival || jugadorOnline.rival == NaN) return;

      if(dataOnline.find(p => p.id == jugadorOnline.rival)) 
      {
        simulateGame(jugadorOnline.id, jugadorOnline.rival);
      }

      dataOnline.find(p => p.id == jugadorOnline.rival).rival = NaN;
      jugadorOnline.rival = NaN;

      if(simulateDisconnection(jugadorOnline))
      {
        console.log("Jugador: " + jugadorOnline.id + " se ha desconectado.");
        let index = dataOnline.indexOf(jugadorOnline);
        dataOnline.splice(index, 1);
        var x = Math.floor(Math.random() * 500);
        getUserByID(x);
        console.log("Jugador: " + x + " se ha conectado.");
        getInQueue(index);
      }
    });
  }
}

function generateRound(user1, user2){
  var results = [];
  var result = Glicko.prediction(user1.RD, user2.RD, user1.rating, user2.rating);
  let match = Math.random();
  if(match < result){
      results[0] = 1;
      results[1] = 0;
  } else {
      results[0] = 0;
      results[1] = 1;
  }

  results[2] = Math.random() * (1 - 0.5) + 0.5;
  return results;
}

function simulateGame(first, second)
{

  var firstPlayer =  dataOnline.find(p => p.id == first);
  var secondPlayer =  dataOnline.find(p => p.id == second);
  request.delete({
    url:      url + '/matchmaking', 
    json:     { id : first }
    }, function(error, response, body){
      if(error !== null)
          console.log("HAY ERROR: " + error);
      //console.log(body);
  });

  request.delete({
    url:      url + '/matchmaking', 
    json:     { id : second }
    }, function(error, response, body){
      if(error !== null)
          console.log("HAY ERROR: " + error);
      //console.log(body);
  });

  for (let i = 0; i < 3; i++)
  {
    var resultado = generateRound(firstPlayer, secondPlayer);
    request.post({
      url:      url + '/accounts/rounds', 
      json:     { id : first, results: [ {result: resultado[0], time: resultado[2], opponent: second} ] }
      }, function(error, response, body){
        if(error !== null)
          console.log("HAY ERROR: " + error);
        //console.log(body);
    });

    request.post({
      url:      url + '/accounts/rounds', 
      json:     { id : second, results: [ {result: resultado[1], time: resultado[2], opponent: first} ] }
      }, function(error, response, body){
        if(error !== null)
          console.log("HAY ERROR: " + error);
        //console.log(body);
    });
  }

  console.log("/////////////////////////////////////////");
  console.log("id: " + first + " points:" + firstPlayer.rating + " RD: " + firstPlayer.RD);
  console.log("id: " + second + " points:" + secondPlayer.rating + " RD: " + secondPlayer.RD);
  console.log("/////////////////////////////////////////");
}

//for (let i = 0; i < Object.keys(users).length; i++){
//  signIn(users[i].email, users[i].nick, users[i].password, dataFile[i].points, dataFile[i].deviation);
//}

let dataOnline = [];

function getUserByID(id){
  request.get({
    url:    url + '/accounts/by-id/' + id,
    json: {}
  }, function (error, response, body){
    if(error !== null)
    {
      console.log("Error al pillar jugador: " + error);
      return;
    }

    dataOnline.push(body);
    //console.log(dataOnline);
  });
}

for (let i = 0; i < 10; i++)
{
  var x = Math.floor(Math.random() * 500);
  getUserByID(x);
}

/*for (let index = 0; index < dataOnline.length; index++) {
  getInQueue(index);
}*/
setInterval(simularJugadores, 2000);