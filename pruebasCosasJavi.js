
/*
var request = require('request');

const url = 'http://localhost:25565';

var ID = 0;

async function test(name)
{
  request.post({
    url:     url + '/signIn',
    json:    { nick : "joker", password: "joder", rating: Math.random() * 3000, RD: Math.random() * 100 }
  }, function(error, response, body){
    //console.log(body);
    ID++;

    console.log(ID);
  });
}

for (let i = 0; i < 1000; i++) {
  test(i);
}
*/


let dataFile = require('./Bots.json');
dataFileConvert = {};

for (const key in dataFile) {
  if (Object.hasOwnProperty.call(dataFile, key)) {
    const element = dataFile[key];

    element.id = Number(element.id);
    element.points = Number(element.points);
    element.deviation = Number(element.deviation);
    element.rival = "";
    
    dataFileConvert[key] = element;
  }
}

fs = require('fs');

let pog = JSON.stringify(dataFileConvert);

fs.writeFileSync('./Bots_FIXED.json', pog, function (err) {
  if (err) return console.log(err);
  console.log('Hello World > helloworld.txt');
});