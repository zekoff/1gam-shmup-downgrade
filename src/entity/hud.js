/* global Phaser, game, shmup */
var WeaponDisplay = require('./weapon_display');

var STARS_FOR_EXTRA_LIFE = 20;

var Hud = function() {
    Phaser.Group.call(this, game);
    this.scoreText = game.make.bitmapText(790, 600, 'font', 'SCORE: ', 24);
    this.scoreText.anchor.set(1, 1);
    this.livesText = game.make.bitmapText(120, 600, 'font', 'LIVES: ', 24);
    this.livesText.anchor.set(0, 1);
    this.starsText = game.make.bitmapText(120, 550, 'font', 'STARS: ', 16);
    this.livesText.anchor.set(0, 1);
    this.add(this.scoreText);
    this.add(this.livesText);
    this.add(this.starsText);
    this.lastFrameScore = this.displayedScore = shmup.data.ship.score;
    this.scoreTween = null;
    this.weaponDisplay = new WeaponDisplay();
    this.boss = null;
    this.bossText = game.make.bitmapText(400, 40, 'font', "BOSS", 32);
    this.bossText.anchor.set(0.5, 0);
    this.bossText.exists = false;
    this.add(this.bossText);
    this.bossHealthBackground = game.make.image(400, 10, 'pix');
    this.bossHealthBackground.anchor.set(0.5, 0);
    this.bossHealthBackground.width = 400;
    this.bossHealthBackground.height = 20;
    this.bossHealthBackground.exists = false;
    this.bossHealthBackground.tint = 0x404040;
    this.add(this.bossHealthBackground);
    this.bossHealth = game.make.image(400, 11, 'pix');
    this.bossHealth.anchor.set(0.5, 0);
    this.bossHealth.width = 398;
    this.bossHealth.height = 18;
    this.bossHealth.exists = false;
    this.bossHealth.tint = 0xf89d00;
    this.add(this.bossHealth);
    this.scorePulse = null;
};
Hud.prototype = Object.create(Phaser.Group.prototype);
Hud.prototype.constructor = Hud;
Hud.prototype.pulseScore = function() {
    // if (this.scorePulse) this.scorePulse.stop();
    // this.scorePulse = game.add.tween(this.scoreText.scale);
    // this.scorePulse.to({
    //     x: 1.3,
    //     y: 1.3
    // }, 300, Phaser.Easing.Cubic.Out);
    // this.scorePulse.to({
    //     x: 1,
    //     y: 1
    // }, 500, Phaser.Easing.Cubic.In);
    // this.scorePulse.start();
};
Hud.prototype.update = function() {
    // if (this.lastFrameScore != shmup.data.ship.score) {
    //     this.pulseScore();
    //     if (this.scoreTween) this.scoreTween.stop();
    //     this.scoreTween = game.add.tween(this);
    //     this.scoreTween.to({
    //         displayedScore: shmup.data.ship.score
    //     }, 750, null, true);
    // }
    if (shmup.data.ship.stars >= STARS_FOR_EXTRA_LIFE) {
        shmup.data.ship.stars -= STARS_FOR_EXTRA_LIFE;
        shmup.data.ship.lives++;
    }
    this.lastFrameScore = shmup.data.ship.score;
    this.scoreText.setText("SCORE: " + Math.floor(shmup.data.ship.score));
    this.livesText.setText("LIVES: " + shmup.data.ship.lives);
    this.starsText.setText("STARS: " + shmup.data.ship.stars + "/" + STARS_FOR_EXTRA_LIFE);
    if (this.boss)
        this.bossHealth.width = 398 * (this.boss.health / this.boss.maxHealth);
};
Hud.prototype.setBoss = function(boss) {
    this.boss = boss;
    var bossExists = boss || 0;
    this.bossText.exists = bossExists;
    this.bossHealthBackground.exists = bossExists;
    this.bossHealth.exists = bossExists;
};

module.exports = Hud;