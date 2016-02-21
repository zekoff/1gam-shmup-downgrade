/* global game, Phaser, shmup */
var Enemy = require('./enemy');
var ShotTypes = require('../util/shot');

var createRandomLocationTween = function(target, tween) {
    tween.to({
        x: game.rnd.between(100, 700),
        y: game.rnd.between(20, 300)
    }, 2500, null, true);
};

var Boss = function(difficulty) {
    Phaser.Sprite.call(this, game, 400, 0, game.rnd.pick(Enemy.prototype.IMAGE_KEYS));
    this.anchor.set(0.5);
    game.physics.arcade.enable(this);
    this.body.setSize(this.body.width * .7, this.body.height * .7);
    this.moveTimer = 0;
    this.moveState = this.INIT;
    this.moveTween = null;
    // this.shotTimer = 0;
    this.scale.set(1.5);
    this.maxHealth = this.health = 3000 + difficulty * 1000; // shot-in-the-dark for balance
    this.events.onKilled.add(function() {
        var rect = new Phaser.Rectangle(this.left, this.top, this.width, this.height);
        var p = new Phaser.Point();
        for (var i = 0; i < 10; i++) {
            rect.random(p);
            // shmup.emitter.burst(p.x, p.y);
        }
        // game.sound.play('boss_explode', 0.3);
        shmup.hud.setBoss(null);
    }, this);

    this.weapons = [];
    var i;
    for (i = 0; i < difficulty * 3; i++) {
        var weapon = {
            x: 0,
            y: 0,
            shotTimer: 0,
        };
        weapon.shotUpdate = game.rnd.pick(ShotTypes.bossShots).bind(weapon);
        this.weapons.push(weapon);
    }
};
Boss.prototype = Object.create(Phaser.Sprite.prototype);
Boss.prototype.constructor = Boss;
Boss.prototype.INIT = 0;
Boss.prototype.PAN = 1;
Boss.prototype.RANDOM = 2;
Boss.prototype.update = function() {
    if (!this.alive) return; // seems like this should be the default behavior in Phaser...
    // handle movement based on move state / health
    var weaponsEngaged = 1;
    switch (this.moveState) {
        case this.INIT:
            weaponsEngaged = Math.ceil(this.weapons.length / 3);
            if (this.y < 150) this.y += 30 * game.time.physicsElapsed;
            if (this.health < this.maxHealth * .7) this.moveState = this.PAN;
            break;
        case this.PAN:
            weaponsEngaged = Math.ceil(this.weapons.length / 3) * 2;
            if (!this.moveTween) {
                this.moveTween = game.tweens.create(this);
                this.moveTween.to({
                    x: 650
                }, 3000, null, false, 0, -1, true);
                game.add.tween(this).to({
                    x: 150
                }, 1500, null, true).chain(this.moveTween);
            }
            if (this.health < this.maxHealth * .35) {
                this.moveTween.stop();
                this.moveTween = null;
                this.moveState = this.RANDOM;
            }
            break;
        case this.RANDOM:
            weaponsEngaged = this.weapons.length;
            if (!this.moveTween) {
                this.moveTween = game.add.tween(this);
                this.moveTween.onComplete.add(createRandomLocationTween);
                createRandomLocationTween(null, this.moveTween);
            }
            break;
    }
    var i;
    for (i = 0; i < weaponsEngaged; i++) {
        this.weapons[i].x = this.x;
        this.weapons[i].y = this.y;
        this.weapons[i].shotUpdate();
    }
};

module.exports = Boss;