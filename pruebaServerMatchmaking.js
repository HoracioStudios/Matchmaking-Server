//import express from 'express';
var express = require('express');
const server = express();
server.use(express.json())
const port = 25565;

var cont = 0;
// Rest C# 
// /start empieza a buscar emparejamiento 
// log in 
// crear cuenta
// 
server.get('/start', (req, res) => {
  cont+=1;
  return res.send(cont.toString());
})

server.get('/prueba/get', (req, res) => {
  console.log(`Se hizo get`);
  return res.send("Hola get");
})

server.post('/prueba/post', (req, res) => {
  console.log(`Se hizo post`);
  var respuesta = req.body;
  console.log(req.body.data);
  return res.send(req.body);
})

server.post('/login', (req, res) => {
  console.log(`Se hizo login`);
  var respuesta = req.body;
  console.log(req.body);
  return res.send("1");
})

server.post('/startQueue', (req, res) => {
  console.log(`Se hizo login`);
  var respuesta = req.body;
  console.log(req.body);
  return res.send("1");
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});