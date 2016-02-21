/* global game, shmup */
var state = {};

state.create = function() {
    this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
    game.add.bitmapText(400, 150, 'font', "RESULTS", 48).anchor.set(0.5);
    var killed = shmup.data.ship.enemiesKilled;
    var total = shmup.data.stage.totalEnemies;
    var ufoKilled = shmup.data.ship.ufosKilled;
    var ufoTotal = shmup.data.stage.totalUfos;
    var stageNumber = shmup.data.game.challenge ? "CHALLENGE MODE" : "STAGE " + shmup.data.game.history.length;
    var toDisplay = [
        stageNumber,
        '"' + shmup.data.stage.name + '"',
        'Difficulty: ' + shmup.data.stage.difficulty,
        'Enemies destroyed: ' + killed + '/' + total + ' (' + Math.floor(killed / total * 100) + "%)",
        'UFOs destroyed: ' + ufoKilled + '/' + ufoTotal + ' (' + Math.floor(ufoKilled / ufoTotal * 100) + "%)",
        'Total Score: ' + shmup.data.ship.score
    ];
    var i;
    for (i = 1; i <= toDisplay.length; i++) {
        game.time.events.add(500 * i, function(index) {
            game.add.bitmapText(400, 180 + index * 40, 'font', toDisplay[index - 1], 24).anchor.set(0.5);
        }, this, i);
    }
    game.time.events.add((toDisplay.length + 2) * 500, function() {
        game.add.bitmapText(400, 550, 'font', "(click to continue)", 16).anchor.set(0.5);
        game.input.onUp.addOnce(function() {
            if (shmup.data.game.challenge) game.state.start('title');
            else if (shmup.data.game.history.length < 5)
                game.state.start('level_select');
            else game.state.start('win');
        });
    });
};

state.update = function() {
    this.background.tilePosition.y += 10 * game.time.physicsElapsed;
};

module.exports = state;