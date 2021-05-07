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


async function searchPair(index)
{
  request.post({
    url:     url + '/searchPair',
    json:    { playerID : dataOnline[index].id, waitTime: 0, realIndex : index }
  }, function(error, response, body){
    if(error !== null)
      return;

    console.log(body);

    if(body === undefined)
      return;
    if(!body.finished)
      return;

    dataOnline[index].rival = body.rivalID;
  });
}

function simularJugadores()
{
  for (let index = 0; index < dataOnline.length; index++) {
    searchPair(index);
  }

  dataOnline.forEach(jugadorOnline => {
    if(!jugadorOnline.rival || jugadorOnline.rival == NaN) return;

    if(dataOnline.find(p => p.id == jugadorOnline.rival)) 
    {
      simulateGame(jugadorOnline.id, jugadorOnline.rival);
    }

    dataOnline.find(p => p.id == jugadorOnline.rival).rival = NaN;
    jugadorOnline.rival = NaN;
  });
}

function generateRound(user1, user2){
  var results = [];
  var result = Glicko.prediction(user1.deviation, user2.deviation, user1.points, user2.points);
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
  request.post({
    url:      url + '/leaveQueue', 
    json:     { playerID : first }
    }, function(error, response, body){
      console.log(body);
  });

  request.post({
    url:      url + '/leaveQueue', 
    json:     { playerID : second }
    }, function(error, response, body){
      console.log(body);
  });

  for (let i = 0; i < 3; i++)
  {
    var resultado = generateRound(dataFile[first], dataFile[second]);
    request.post({
      url:      url + '/sendRoundInfo', 
      json:     { playerID : first, results: [ {result: resultado[0], time: resultado[2], opponent: second} ] }
      }, function(error, response, body){
        console.log(body);
    });

    request.post({
      url:      url + '/sendRoundInfo', 
      json:     { playerID : second, results: [ {result: resultado[1], time: resultado[2], opponent: first} ] }
      }, function(error, response, body){
        console.log(body);
    });
  }
}

let dataOnline = getRandom(dataFile, 5);

setInterval(simularJugadores, 500);