/* global game, shmup, Phaser */
var state = {};

state.create = function() {
    this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
    var ship = game.add.sprite(200, 500, 'ship');
    var difficultyModifier = 0;
    var livesBonus = shmup.data.ship.lives * 10000;
    shmup.data.game.history.forEach(function(stage) {
        difficultyModifier += stage.difficulty;
    });
    var finalScore = (shmup.data.ship.score + livesBonus) * difficultyModifier;
    game.add.bitmapText(400, 150, 'font', "MISSION COMPLETE!", 56).anchor.set(0.5);
    var toDisplay = [
        'Score: ' + shmup.data.ship.score,
        'Bonus for lives remaining: ' + livesBonus,
        'Difficulty Multiplier: ' + difficultyModifier,
        'Final Score: ' + finalScore
    ];
    var i, scoreText;
    for (i = 1; i <= toDisplay.length; i++) {
        game.time.events.add(1000 * i, function(index) {
            scoreText = game.add.bitmapText(400, 200 + index * 50, 'font', toDisplay[index - 1], 28);
            scoreText.anchor.set(0.5, 0);
        }, this, i);
    }
    game.time.events.add((toDisplay.length) * 1500, function() {
        game.add.tween(scoreText.scale).to({
            x: 1.5,
            y: 1.5
        }, 1000, null, true);
    });
    game.time.events.add((toDisplay.length + 2) * 1500, function() {
        game.add.bitmapText(400, 550, 'font', "(click to return to title screen)", 16).anchor.set(0.5);
        game.input.onUp.addOnce(function() {
            game.state.start('title');
        });
    });
    game.add.tween(ship).to({
        x: 600
    }, 7000, Phaser.Easing.Sinusoidal.InOut, true, 0, -1, true);
};

state.update = function() {
    this.background.tilePosition.y += 10 * game.time.physicsElapsed;
};

module.exports = state;