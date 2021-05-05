

var request = require('request');

const url = 'http://localhost:25565';

request.post({
  url:     url + '/signIn',
  json:    { nick : "joder", password: "joder" }
}, function(error, response, body){
  console.log(body);
});

request.post({
  url:     url + '/signIn',
  json:    { nick : "aa", password: "joder" }
}, function(error, response, body){
  console.log(body);
});

request.post({
  url:     url + '/signIn',
  json:    { nick : "ss", password: "joder" }
}, function(error, response, body){
  console.log(body);
});

request.post({
  url:     url + '/signIn',
  json:    { nick : "dd", password: "joder" }
}, function(error, response, body){
  console.log(body);
});

request.post({
  url:     url + '/signIn',
  json:    { nick : "ww", password: "joder" }
}, function(error, response, body){
  console.log(body);
});