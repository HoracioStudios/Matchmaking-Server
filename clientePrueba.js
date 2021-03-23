//import express from 'express';
const express = require('express');
const readline = require('readline')
const server = express();

const port = 25565;

var cont = 0;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question((answer) => {
  // TODO: Log the answer in a database
  console.log(`Thank you for your valuable feedback: ${answer}`);

  rl.close();
});

rl.on('line', (input) => {
  res.send(cont.toString());
});

server.get('/', (req, res) => {
  cont+=1;
  return res.send(cont.toString());
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
