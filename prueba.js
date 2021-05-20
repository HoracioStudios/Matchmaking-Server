const MongoJS = require('./modules/mongoJS.js');

const DEBUGLOG = true;

const DEBUG = false;

//NOTA: poner esto a lo que pongamos de espera en la búsqueda
const ttlMilliseconds = 2000;

//import express from 'express';
const Express = require('express');
const server = Express();
server.use(Express.json())
const port = 25565;

const onlineUsers = [];

//archivo index.js
var fs = require('fs');
var https = require('https');

https.createServer({
   cert: fs.readFileSync('certificate.crt'),
   key: fs.readFileSync('privateKey.key')
 },server).listen(port, startup);

async function startup()
{
   console.log(`Server is running on port ${port}`);

   try
   {
      ID = await MongoJS.getUserCount();

      //console.log(ID);
   }
   catch (error)
   {
      console.log("Base de datos no va, se pone a 0 por defecto")
      ID = 0;
   }
}


/////////////////////////////////////////////

const authenticateJWT = (req, res, next) => {

   console.log("yay");
   next();
 };

server.post('/token', (req, res) => {
});

async function poggers(req, res)
{
   console.log("yay 2");

   res.send('Book added successfully');
}

server.get('/joder', authenticateJWT, poggers);

/////////////////////////////////////////////