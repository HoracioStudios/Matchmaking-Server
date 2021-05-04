

var request = require('request');

const url = 'http://localhost:25565';

var poggerinos = "";

var defaultLogin = {nick: "test", password: "test"};

var arraydejugadores = [ { id: 0, rating: loquesea, rd: loquesea}, ...,  ];
var arraydeonline = [ { id: 1, rating: loquesea, rd: loquesea, rival : false} ];

function searchPair(index)
{
  var poggerinos = "";
  
  poggerinos = request.post({
    url:     url + '/searchPair',
    json:    { playerID : arraydeonline[index].id, waitTime: 0 }
  }, function(error, response, body){
    if(!body.finished)
      return;

    arraydeonline[index].rival = body.rivalID;
  });
}

function elBucle()
{
  while (true)
  {
    for (let index = 0; index < arraydeonline.length; index++) {
      searchPair(index);
    }

    arraydeonline.forEach(jugadorOnline => {
      if(!jugadorOnline.rival) return;

      if(arraydeonline.find(p => p.id == jugadorOnline.rival)) 
      {
        simulaPartida(jugadorOnline.id, jugadorOnline.rival);
      }

      jugadorOnline.rival = false;
      arraydeonline.find(p => p.id == jugadorOnline.rival).rival = false;
    });
  }
}

function simulaPartida(uno, otro)
{
  arraydejugadores[uno];
  arraydejugadores[otro];

  simulas la partidita con los dos rds y cosos varios

  request.post({
    url:      url + '/leaveQueue', 
    json:     { playerID : uno }
    }, function(error, response, body){
      console.log(body);
  });

  request.post({
    url:      url + '/leaveQueue', 
    json:     { playerID : otro }
    }, function(error, response, body){
      console.log(body);
  });

  request.post({
    url:      url + '/sendRoundInfo', 
    json:     { playerID : uno, results: [ {result: resultado, time: tiempo} ] }
    }, function(error, response, body){
      console.log(body);
  });

  request.post({
    url:      url + '/sendRoundInfo', 
    json:     { playerID : otro, results: [ {result: resultado, time: tiempo} ] }
    }, function(error, response, body){
      console.log(body);
  });
}

get();

console.log(poggerinos);