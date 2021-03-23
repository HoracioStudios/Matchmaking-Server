//import express from 'express';
var express = require('express');
const server = express();
server.use(express.json())
const port = 25565;


server.get('/prueba/get', (req, res) => {
  console.log(`Se hizo get`);
  return res.send("Hola get");
})

// Comprobacion de la version actual del juego
// antes de hacer logIn
server.get('/version', (req, res) => {
  var version = "1.0.0";
  return res.send(version);
})

server.post('/prueba/post', (req, res) => {
  console.log(`Se hizo post`);
  var respuesta = req.body;
  console.log(req.body.data);
  return res.send(req.body);
})

server.post('/signin', (req, res) => {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  console.log(`Player ${username} is trying to sign in`);

  // Devuelve el id del jugador o un 
  // codigo de error (numeros negativos)
  return res.send("1");
})


server.post('/login', (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  console.log(`Player ${username} is trying to log in`);

  // Devuelve el id del jugador o un 
  // codigo de error (numeros negativos)
  // Errores: contraseña incorrecta
  return res.send("1");
})

server.post('/startQueue', (req, res) => {
  var id = req.body.id;
  console.log(`Player ${id} is looking for a game`);


  
  // Respuesta al jugador
  return res.send("1");
})

server.post('/cancelQueue', (req, res) => {
  var id = req.body.id;
  console.log(`Player ${id} canceled the queue`);


  
  // Respuesta al jugador
  return res.send("1");
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});