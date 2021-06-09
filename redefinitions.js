async function playerDataProcessing (playerID, gameResult, database, playerCollection, dataCollection)
{
  try
  {
    var win, loss, draw;
    win = loss = draw = 0;

    let total = 0, count = 0;

    let addTime = 0;

    gameResult.rounds.forEach(round => {
      total += round.result;
      count++;

      addTime += round.time;
    });

    addTime = addTime / 3.0;

    let avg = total / count;
    if(avg > 0.5) win++;
    else if (avg < 0.5) loss++;
    else draw++;

    // busca el id exacto del jugador
    var filter = { id: playerID };
    var options = { };
    var update = {
      $push: { pending: gameResult },
      $inc : { wins: win, losses: loss, draws: draw, totalTime: addTime, totalGames: 1, totalAccuracy: gameResult.accuracy, totalDmg: gameResult.dmgDealt },
      $set: { lastGame: (new Date()).toString() }
    };

    var playerChar = gameResult.playerChar.replace(' ', '').replace("(Clone)", '');
    var rivalChar = gameResult.rivalChar.replace(' ', '').replace("(Clone)", '');

    update.$inc["characterInfo." + playerChar + ".totalGames"] = 1;
    update.$inc["characterInfo." + playerChar + ".wins"] = win;
    update.$inc["characterInfo." + playerChar + ".losses"] = loss;
    update.$inc["characterInfo." + playerChar + ".draws"] = draw;
    update.$inc["characterInfo." + playerChar + ".totalTime"] = addTime;
    update.$inc["characterInfo." + playerChar + ".totalAccuracy"] = gameResult.accuracy;
    update.$inc["characterInfo." + playerChar + ".totalDmg"] = gameResult.dmgDealt;
    update.$inc["characterInfo." + playerChar + "." + rivalChar + ".totalGames"] = 1;
    update.$inc["characterInfo." + playerChar + "." + rivalChar + ".wins"] = win;
    var collection = database.collection(playerCollection);

    var result = await collection.updateOne(filter, update, options);

    update = { $inc: {} };

    update.$inc["characterInfo." + playerChar + ".totalGames"] = 1;
    update.$inc["characterInfo." + playerChar + ".wins"] = win;
    update.$inc["characterInfo." + playerChar + ".losses"] = loss;
    update.$inc["characterInfo." + playerChar + ".draws"] = draw;
    update.$inc["characterInfo." + playerChar + ".totalTime"] = addTime;
    update.$inc["characterInfo." + playerChar + ".totalAccuracy"] = gameResult.accuracy;
    update.$inc["characterInfo." + playerChar + ".totalDmg"] = gameResult.dmgDealt;
    update.$inc["characterInfo." + playerChar + "." + rivalChar + ".totalGames"] = 1;
    update.$inc["characterInfo." + playerChar + "." + rivalChar + ".wins"] = win;

    var collection = database.collection(dataCollection);

    var result = await collection.updateOne({}, update, options);

    return result;
  }
  catch(error)
  {
    console.log(error);
  }

  return undefined;
}

module.exports = { 
  playerDataProcessing
};