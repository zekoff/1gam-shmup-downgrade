/* global game, shmup */

var state = {};

state.create = function() {
    this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
    if (shmup.data.game.challenge) {
        var gameoverText = game.add.bitmapText(400, 300, 'font', 'GAME OVER', 64);
        gameoverText.anchor.set(0.5);
        game.time.events.add(3000, function() {
            game.state.start('title');
        });
        return;
    }
    var continueText = game.add.bitmapText(400, 250, 'font', "CONTINUE?", 48);
    continueText.anchor.set(0.5);
    this.timeToContinue = 9.99;
    game.time.events.add(1000, function() {
        this.timerText = game.add.bitmapText(400, 300, 'font', "", 48);
        this.timerText.anchor.set(0.5);
        game.add.tween(this).to({
            timeToContinue: 0
        }, 10000, null, true).onComplete.add(function() {
            this.timerText.exists = false;
            continueText.exists = false;
            var gameoverText = game.add.bitmapText(400, 300, 'font', 'GAME OVER', 64);
            gameoverText.anchor.set(0.5);
            game.time.events.add(3000, function() {
                game.state.start('title');
            });
        }, this);
        game.input.onUp.addOnce(function() {
            shmup.data.ship = {
                score: 0,
                weaponLevels: [1, 1, 1],
                currentWeapon: 0,
                stars: 0,
                lives: 2,
                enemiesKilled: 0,
                ufosKilled: 0
            };
            game.state.start('main');
        });
    }, this);
};

state.update = function() {
    this.background.tilePosition.y += 10 * game.time.physicsElapsed;
    if (this.timerText)
        this.timerText.setText(Math.floor(this.timeToContinue));
};

module.exports = state;