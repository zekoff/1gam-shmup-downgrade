/* global game, shmup */
var state = {};

var STAGE_NAMES = ['IDDQD', 'IDKFA', 'UUDDLRLRBASS'];
var STAGE_DIFFICULTIES = [6, 6, 7];

state.create = function() {
    this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
    game.add.bitmapText(400, 100, 'font', "CHALLENGE MODE", 64).anchor.set(0.5);
    var description = game.add.bitmapText(400, 200, 'font', "Try for a high score on\nthese very difficult stages.");
    description.anchor.set(0.5);
    description.align = 'center';

    var backButton = game.add.image(400, 550, 'metalPanel');
    backButton.height = 50;
    backButton.width = 100;
    backButton.anchor.set(0.5);
    backButton.inputEnabled = true;
    backButton.events.onInputUp.add(function() {
        game.state.start('title');
    });
    game.add.bitmapText(400, 550, 'font', 'BACK', 24).anchor.set(0.5);

    var i;
    var leftColumn = 250;
    var rightColumn = 530;
    for (i = 0; i < 3; i++) {
        var yLocation = 300 + 70 * i;
        var button = game.add.image(leftColumn, yLocation, 'metalPanel');
        button.height = 50;
        button.width = 300;
        button.tint = 0xac3939;
        button.anchor.set(0.5);
        button.inputEnabled = true;
        button.events.onInputUp.add(function(source, pointer, someBoolean, index) {
            shmup.data.game.challenge = true;
            shmup.data.stage = {
                name: STAGE_NAMES[index],
                difficulty: STAGE_DIFFICULTIES[index]
            };
            shmup.data.ship.enemiesKilled = 0;
            game.state.start('main');
        }, this, 0, i);
        game.add.bitmapText(leftColumn, yLocation, 'font', STAGE_NAMES[i], 24).anchor.set(0.5);
        game.add.bitmapText(rightColumn, yLocation, 'font', "Difficulty: " + STAGE_DIFFICULTIES[i], 24).anchor.set(0.5);
    }
};

state.update = function() {
    this.background.tilePosition.y += 10 * game.time.physicsElapsed;
};

module.exports = state;