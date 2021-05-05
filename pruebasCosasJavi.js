

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

for (let i = 0; i < 20; i++) {
  test(i);
}