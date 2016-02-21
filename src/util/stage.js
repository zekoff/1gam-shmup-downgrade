/* global shmup, game, Phaser */
var Enemy = require('../entity/enemy');
var MovementTypes = require('../util/movement');
var ShotTypes = require('../util/shot');
var Boss = require('../entity/boss');

var MUSIC_TRACKS = [
    'burning_engines',
    'challenge',
    'downtown',
    'ftl',
    'grand_prix'
];
var MUSIC_VOLUME = 0.1;

var INTRO_LENGTH = 4000;
var OUTRO_LENGTH = 4000;
var WARP_SPEED = 3000;

// Seed is a string that will be used to init the RNG.
// Difficulty is a number 1-5 for normal play, higher for challenge modes
var Stage = function(seed, difficulty) {
    var stageNumber = shmup.data.game.challenge ? "CHALLENGE MODE" : "STAGE " + shmup.data.game.history.length;
    var stageNumberText = game.add.bitmapText(400, 150, 'font', stageNumber, 40);
    stageNumberText.anchor.set(0.5);
    var stageNameText = game.add.bitmapText(400, 200, 'font', '"' + shmup.data.stage.name + '"', 36);
    stageNameText.anchor.set(0.5);
    game.time.events.add(INTRO_LENGTH / 4 * 3, function() {
        game.add.tween(stageNumberText).to({
            alpha: 0
        }, INTRO_LENGTH / 4, null, true);
        game.add.tween(stageNameText).to({
            alpha: 0
        }, INTRO_LENGTH / 4, null, true);
    });

    this.difficulty = difficulty;
    game.rnd.sow([seed]);
    this.trackName = game.rnd.pick(MUSIC_TRACKS);
    this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
    this.background.fixedToCamera = true;
    this.backgroundSpeed = 0;
    this.waves = [];
    var numWaves = 9 + (difficulty * 3);
    this.secondsBetweenWaves = (6.5 - this.difficulty * 0.5);
    var i;
    for (i = 0; i < numWaves; i++)
        this.waves.push(new Wave(difficulty));
    this.waves.push(new BossWave(difficulty));
    shmup.data.stage.totalEnemies = 0;
    shmup.data.stage.totalUfos = 0;
    shmup.data.ship.ufosKilled = 0;
    this.waves.forEach(function(wave) {
        if (wave.numberInWave)
            shmup.data.stage.totalEnemies += Math.ceil(wave.numberInWave);
    });
    // Bonus UFOs
    var stageLengthSeconds = numWaves * this.secondsBetweenWaves;
    shmup.data.stage.totalUfos = this.numUfos = difficulty;
    this.ufosSeen = 0;
    this.timeBetweenUfos = stageLengthSeconds / this.numUfos;

    this.updateTimer = 0;
    this.ufoTimer = this.timeBetweenUfos / 2;

    this.stageState = this.INTRO;
    this.stateTween = null;
    if (shmup.music) shmup.music.stop();
    shmup.music = game.sound.play(this.trackName, MUSIC_VOLUME, true);
};
Stage.prototype = {};
Stage.prototype.constructor = Stage;
Stage.prototype.INTRO = 0;
Stage.prototype.MAIN = 1;
Stage.prototype.OUTTRO = 2;
Stage.prototype.update = function() {
    this.background.tilePosition.y += this.backgroundSpeed * game.time.physicsElapsed;
    switch (this.stageState) {
        case this.INTRO:
            if (!this.stateTween) {
                shmup.player.alive = false;
                shmup.input.inputDisabled = true;
                shmup.player.x = 400;
                shmup.player.y = 600;
                this.stateTween = game.add.tween(shmup.player);
                this.stateTween.to({
                    y: 300
                }, INTRO_LENGTH / 2, Phaser.Easing.Sinusoidal.Out);
                this.stateTween.to({
                    y: 500
                }, INTRO_LENGTH / 2, Phaser.Easing.Sinusoidal.InOut);
                this.stateTween.onComplete.add(function() {
                    shmup.player.alive = true;
                    shmup.input.inputDisabled = false;
                    this.stageState = this.MAIN;
                    this.stateTween = null;
                }, this);
                this.stateTween.start();
                game.add.tween(this).to({
                    // backgroundSpeed: 600
                }, INTRO_LENGTH, null, true);
            }
            break;
        case this.MAIN:
            this.waves[0].update();

            this.updateTimer += game.time.physicsElapsed;
            if (this.waves.length == 1) {
                if (shmup.enemies.total == 0) this.stageState = this.OUTTRO;
                else return;
            }
            if (this.updateTimer > this.secondsBetweenWaves) {
                this.waves.shift();
                this.updateTimer = 0;
            }

            this.ufoTimer += game.time.physicsElapsed;
            if (this.ufoTimer > this.timeBetweenUfos) {
                this.ufoTimer -= this.timeBetweenUfos;
                if (this.ufosSeen++ < this.numUfos) shmup.enemies.add(new Ufo());
            }
            break;
        case this.OUTTRO:
            if (!this.stateTween) {
                shmup.player.alive = false;
                shmup.enemyBullets.callAll('kill');
                shmup.player.body.reset(shmup.player.x, shmup.player.y);
                shmup.input.inputDisabled = true;
                this.stateTween = game.add.tween(shmup.player);
                this.stateTween.to({
                    x: 400,
                    y: 500
                }, OUTRO_LENGTH / 2, Phaser.Easing.Sinusoidal.Out);
                this.stateTween.to({
                    y: 0
                }, OUTRO_LENGTH / 2, Phaser.Easing.Sinusoidal.In);
                game.time.events.add(OUTRO_LENGTH / 2, function() {
                    game.add.tween(this).to({
                        // backgroundSpeed: WARP_SPEED
                    }, OUTRO_LENGTH / 2, null, true);
                }, this);
                this.stateTween.start();
                this.stateTween.onComplete.add(function() {
                    shmup.data.game.tier++;
                    shmup.data.game.index = shmup.data.stage.index;
                    game.state.start('complete');
                });
            }
            break;
    }
};

var Wave = function(difficulty) {
    this.isComplete = false;
    this.timeToAdd = 0;
    this.numberAdded = 0;
    this.enemies = [];
    // set up single batch of enemies
    var enemyType = game.rnd.between(1, 3);
    this.healthRating = enemyType * 3;
    this.numberInWave = 9 / enemyType;
    this.timeBetweenAdding = 0.35 * enemyType;
    this.movementPattern = game.rnd.pick(MovementTypes);
    this.shotPattern = game.rnd.pick(ShotTypes.enemyShots);
    this.imageKey = game.rnd.pick(Enemy.prototype.IMAGE_KEYS);
};
Wave.prototype = {};
Wave.prototype.constructor = Wave;
Wave.prototype.update = function() {
    this.timeToAdd += game.time.physicsElapsed;
    if (this.timeToAdd > this.timeBetweenAdding && this.numberAdded < this.numberInWave) {
        this.timeToAdd = 0;
        this.numberAdded++;
        var enemy = new Enemy(this.imageKey, this.healthRating,
            this.movementPattern, this.shotPattern);
        shmup.enemies.add(enemy);
        this.enemies.push(enemy);
    }
};

var BossWave = function(difficulty) {
    this.init = false;
    this.boss = new Boss(difficulty);
};
BossWave.prototype = {};
BossWave.prototype.constructor = BossWave;
BossWave.prototype.update = function() {
    if (!this.init) {
        this.init = true;
        shmup.enemies.add(this.boss);
        shmup.hud.setBoss(this.boss);
    }
};

var UFO_IMAGE_KEYS = ['ufoBlue', 'ufoGreen', 'ufoRed', 'ufoYellow'];
var Ufo = function() {
    Phaser.Sprite.call(this, game, 0, 60, game.rnd.pick(UFO_IMAGE_KEYS));
    this.anchor.set(0.5);
    game.physics.arcade.enable(this);
    this.body.setSize(this.body.width * .8, this.body.height * .8);
    this.checkWorldBounds = true;
    this.outOfBoundsKill = true;
    this.health = 500;
    this.body.velocity.x = 160;
    this.events.onKilled.add(function() {
        if (this.health > 0) return;
        shmup.data.ship.ufosKilled++;
        // shmup.emitter.burst(this.x, this.y);
        shmup.data.ship.score += 10000;
        // game.sound.play('explode' + game.rnd.between(1, 6), 0.2);
    }, this);
};
Ufo.prototype = Object.create(Phaser.Sprite.prototype);
Ufo.prototype.constructor = Ufo;
Ufo.prototype.update = function() {
    // this.angle += 120 * game.time.physicsElapsed;
};

module.exports = Stage;