//import express from 'express';
var express = require('express');
const server = express();
server.use(express.json())
const port = 25565;

// Prueba de que el servidor esta operativo
server.get('/prueba/get', (req, res) => {
  console.log(`Se hizo get`);
  return res.send("Prueba get");
})

// Comprobación de la versión actual del juego
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

// Registro de un nuevo jugador
// parámetros json: username, email, password
server.post('/signin', (req, res) => {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  console.log(`Player ${username} is trying to sign in`);

  // Devuelve el id del jugador o un 
  // código de error (números negativos)
  return res.send("1");
})

// Se usa para hacer log in de los jugadores
server.post('/login', (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  console.log(`Player ${username} is trying to log in`);

  // Devuelve el id del jugador o un 
  // codigo de error (numeros negativos)
  // Errores: contraseña incorrecta
  return res.send("1");
})

// Inicio de la cola. 
// parametros json: id
server.post('/startQueue', (req, res) => {
  var id = req.body.id;
  console.log(`Player ${id} is looking for a game`);


  
  // Respuesta al jugador
  return res.send("1");
})

// Metodo llamado para cancelar la cola del jugador
// y eliminarlo de la lista de jugadores online
server.post('/cancelQueue', (req, res) => {
  var id = req.body.id;
  console.log(`Player ${id} canceled the queue`);


  
  // Respuesta al jugador
  return res.send("1");
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});