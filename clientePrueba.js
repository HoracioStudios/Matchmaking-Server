var request = require('request');

const url = 'http://localhost:25565';

var poggerinos = "";

var defaultLogin = {nick: "test", password: "test"};

let dataFile = require('./Bots.json');
let users = require ('./UserInfo.json');
//console.log(JSON.stringify(users, null, 2))

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
    console.log(body);  });
}
//console.log(JSON.stringify(dataOnline, null, 2))


function searchPair(index)
{
  request.post({
    url:     url + '/searchPair',
    json:    { playerID : dataOnline[index].id, waitTime: 0 }
  }, function(error, response, body){
    console.log(body);
    if(!body.finished)
      return;

    dataOnline[index].rival = body.rivalID;
  });
}

function simularJugadores()
{
  while (true)
  {
    for (let index = 0; index < dataOnline.length; index++) {
      searchPair(index);
    }

    dataOnline.forEach(jugadorOnline => {
      if(!jugadorOnline.rival) return;

      if(dataOnline.find(p => p.id == jugadorOnline.rival)) 
      {
        simulateGame(jugadorOnline.id, jugadorOnline.rival);
      }

      jugadorOnline.rival = NaN;
      arraydeonline.find(p => p.id == jugadorOnline.rival).rival = NaN;
    });
  }
}

function prediction(RD1, RD2, r1, r2){
  let elevateG = -g(Math.sqrt(RD1**2 + RD2**2))*(r1-r2)/400;
  return 1/(1+10**elevateG);
}

function generateRound(user1, user2){
  var results = [];
  var result = prediction(user1.RD, user2.RD, user1.points, user2.points);
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
    var resultado = generateRound(dataFile[first].RD, dataFile[second].RD, dataFile[first].points, dataFile[second].points);
    request.post({
      url:      url + '/sendRoundInfo', 
      json:     { playerID : first, results: [ {result: resultado[0], time: resultado[2], opponent: second} ] }
      }, function(error, response, body){
        console.log(body);
    });

    request.post({
      url:      url + '/sendRoundInfo', 
      json:     { playerID : second, results: [ {result: resultado[1], time: result[2], opponent: first} ] }
      }, function(error, response, body){
        console.log(body);
    });
  }
}

/*
for (let i = 0; i < Object.keys(users).length; i++){
  signIn(users[i].email, users[i].nick, users[i].password, dataFile[i].points, dataFile[i].deviation);
}
*/

let dataOnline = getRandom(dataFile, 100)
searchPair(0);
