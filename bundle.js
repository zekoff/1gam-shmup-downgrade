(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    this.alpha = 0;
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
},{"../util/shot":20,"./enemy":3}],2:[function(require,module,exports){
/* global game */

var Emitter = function() {
    this.emitter = game.add.emitter(0, 0, 400);
    this.emitter.makeParticles('explosion');
    this.emitter.setScale(0.2, 0.4, 0.2, 0.4);
};
Emitter.prototype = {};
Emitter.prototype.constructor = Emitter;
Emitter.prototype.burst = function(x, y) {
    this.emitter.x = x;
    this.emitter.y = y;
    this.emitter.start(true, 300, null, 10);
};

module.exports = Emitter;
},{}],3:[function(require,module,exports){
/* global game, Phaser, shmup */
var Pickup = require('./pickup');

var Enemy = function(imageKey, healthRating, movementFunction, shotFunction) {
    Phaser.Sprite.call(this, game, 0, 0, imageKey);
    print(this.width, this.height);
    this.anchor.set(0.5);
    this.alpha = 0;
    game.physics.arcade.enable(this);
    this.body.setSize(this.body.width * .8, this.body.height * .8);
    this.checkWorldBounds = true;
    this.outOfBoundsKill = true;
    this.moveTimer = 0;
    this.speedFactor = healthRating / 3; // higher speed factor is slower (?)
    this.speedFactor *= 0.5;
    this.shotTimer = 0;
    this.scale.set(healthRating / 10);
    this.health = healthRating * healthRating / 2 * 10;
    this.moveUpdate = movementFunction.bind(this);
    if (shotFunction)
        this.shotUpdate = shotFunction.bind(this);
    this.events.onKilled.add(function() {
        if (this.health > 0) return;
        // shmup.emitter.burst(this.x, this.y);
        shmup.data.ship.score += healthRating * 100;
        shmup.data.ship.enemiesKilled++;
        var pickupChance = 0.9 - (shmup.data.ship.weaponLevels.reduce(function(a, b) {
            return a + b;
        }) / 20);
        if (game.rnd.frac() < pickupChance) shmup.pickups.add(new Pickup(this.x, this.y));
        // game.sound.play('explode' + game.rnd.between(1, 6), 0.2);
    }, this);
};
Enemy.prototype = Object.create(Phaser.Sprite.prototype);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.IMAGE_KEYS = [];
['Black', 'Blue', 'Green', 'Red'].forEach(function(color) {
    for (var i = 1; i < 6; i++) {
        Enemy.prototype.IMAGE_KEYS.push('enemy' + color + i);
    }
});

Enemy.prototype.update = function() {
    if (!this.alive) return;
    // this.rotation = Phaser.Math.angleBetweenPoints(this.previousPosition, this) - (Math.PI / 2);
    this.moveUpdate();
    if (this.shotUpdate)
        this.shotUpdate();
};


module.exports = Enemy;
},{"./pickup":5}],4:[function(require,module,exports){
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
},{"./weapon_display":7}],5:[function(require,module,exports){
/* global Phaser, shmup, game */
var Pickup = function(x, y, pickupType) {
    if (!pickupType) {
        if (game.rnd.frac() < 0.8) pickupType = 'star';
        else pickupType = game.rnd.pick(['powerup_red', 'powerup_green', 'powerup_blue']);
    }
    var displayCharacterMap = {
        'star': '*',
        'powerup_red': 'G',
        'powerup_green': 'S',
        'powerup_blue': 'M'
    };
    Phaser.BitmapText.call(this, game, x, y, 'font', displayCharacterMap[pickupType]);
    this.pickupType = pickupType;
    this.checkWorldBounds = true;
    this.outOfBoundsKill = true;
    this.anchor.set(0.5);
    game.physics.arcade.enable(this);
    this.body.acceleration.y = 50;
    switch (pickupType) {
        case 'powerup_red':
            this.powerupType = 1;
            break;
        case 'powerup_green':
            this.powerupType = 0;
            break;
        case 'powerup_blue':
            this.powerupType = 2;
            break;
        case 'star':
            break;
    }
};
Pickup.prototype = Object.create(Phaser.BitmapText.prototype);
Pickup.prototype.constructor = Pickup;
Pickup.prototype.update = function() {
    // if (this.pickupType == 'star') this.angle += 90 * game.time.physicsElapsed;
};
Pickup.prototype.pickedUp = function() {
    if (this.pickupType != 'star') {
        shmup.player.boostWeapon(this.powerupType);
        // game.sound.play('pickup_star', 0.5);
    }
    else {
        shmup.data.ship.score += 2000;
        shmup.data.ship.stars++;
        // game.sound.play('pickup_powerup', 0.5);
    }
};

module.exports = Pickup;
},{}],6:[function(require,module,exports){
/* global Phaser, game, shmup */
var Player = function() {
    Phaser.Sprite.call(this, game, 400, 500, 'ship');
    game.physics.arcade.enable(this);
    this.anchor.set(0.5);
    this.scale.set(0.5);
    this.shotTimer = 0;
    this.body.setSize(this.body.width * .4, this.body.height * .4, 0, 5);
    this.body.collideWorldBounds = true;
    this.alpha = 0;

    this.weapons = [shotgun, gatling, missile];
    shmup.data.ship.currentWeapon = 0;
    this.weaponUpdate = this.weapons[shmup.data.ship.currentWeapon].bind(this);
    this.chargeTime = 0;
    this.lastFrameCharging = false;
};
Player.prototype = Object.create(Phaser.Sprite.prototype);
Player.prototype.constructor = Player;
Player.prototype.FAST_SPEED = 350;
Player.prototype.SLOW_SPEED = 150;
Player.prototype.update = function() {
    if (!this.alive) return;
    this.shotTimer += game.time.physicsElapsed;
    this.weaponUpdate(this.alternateFire);
};
Player.prototype.cycleWeapon = function() {
    if (++shmup.data.ship.currentWeapon > 2) shmup.data.ship.currentWeapon = 0;
    this.weaponUpdate = this.weapons[shmup.data.ship.currentWeapon].bind(this);
};
Player.prototype.boostWeapon = function(weaponNumber) {
    if (shmup.data.ship.weaponLevels[weaponNumber] < 4) shmup.data.ship.weaponLevels[weaponNumber]++;
};
Player.prototype.hit = function() {
    if (this.invulnerable) return;
    // shmup.emitter.burst(this.x, this.y);
    // game.sound.play('boss_explode', 0.3);
    this.kill();
    shmup.data.ship.weaponLevels[shmup.data.ship.currentWeapon] = 1;
    this.invulnerable = true;
    if (shmup.data.ship.lives > 0)
        game.time.events.add(2000, function() {
            shmup.enemyBullets.callAll('kill');
            shmup.data.ship.lives--;
            this.x = 400;
            this.y = 500;
            // this.alpha = 0.5;
            this.revive();
            game.time.events.add(3000, function() {
                // this.alpha = 1;
                this.invulnerable = false;
            }, this);
        }, this);
    else game.time.events.add(2000, function() {
        game.state.start('gameover');
    });
};

// Spread weapon. Alternate fire narrows spread.
// Powerup increases number of shots in blast
var shotgun = function(alternate) {
    var fireSpeed = .18;
    if (this.shotTimer < fireSpeed) return;
    this.shotTimer -= fireSpeed;
    var shot, i;
    var spread = alternate ? 30 : 90;
    var numShots = 3 + shmup.data.ship.weaponLevels[0];
    for (var i = 0; i < numShots; i++) {
        shot = shmup.playerBullets.getBullet();
        shot.x = this.x;
        shot.y = this.y;
        shot.body.reset(shot.x, shot.y);
        shot.body.velocity.x = spread * i;
        game.physics.arcade.velocityFromAngle(-90 + ((-spread / 2) + (spread / numShots) * i + spread / numShots / 2),
            400, shot.body.velocity);
        shot.revive();
        shot.frame = 1;
        shot.power = 10;
        shot.update = function() {
            this.rotation = Phaser.Math.angleBetweenPoints(this.previousPosition, this) - (Math.PI / 2);
        };
    }
};

// Fast frontal weapon. Alternate fire charges a big shot.
// Powerup decreases time between shots
var gatling = function(alternate) {
    var shot;
    if (!alternate && this.lastFrameCharging) {
        this.lastFrameCharging = false;
        if (this.chargeTime > 1.5) this.chargeTime = 1.5;
        shot = shmup.playerBullets.getBullet();
        shot.x = this.x;
        shot.y = this.y;
        shot.body.reset(shot.x, shot.y);
        shot.body.velocity.y = -800;
        shot.revive();
        shot.rotation = 0;
        shot.update = function() {};
        shot.frame = 2;
        shot.power = this.chargeTime * 150 + (shmup.data.ship.weaponLevels[1] * 50);
        shot.height = 96 * this.chargeTime;
        shot.width = 48 * this.chargeTime;
        this.chargeTime = 0;
        return;
    }
    if (alternate) {
        this.shotTimer = 0;
        this.chargeTime += game.time.physicsElapsed;
        this.lastFrameCharging = true;
        return;
    }
    this.lastFrameCharging = false;
    var fireSpeed = .1 - shmup.data.ship.weaponLevels[1] / 100 * 2;
    if (this.shotTimer < fireSpeed) return;
    this.shotTimer -= fireSpeed;
    shot = shmup.playerBullets.getBullet();
    shot.x = this.x + (game.rnd.between(-20, 20));
    shot.y = this.y;
    shot.body.reset(shot.x, shot.y);
    shot.body.velocity.y = -800;
    shot.revive();
    shot.rotation = 0;
    shot.update = function() {};
    shot.frame = 2;
    shot.power = 12;
};

// Seeking weapon. Alternate fire increases speed but deactivates seeking
// Powerup increases payload
var missile = function(alternate) {
    var fireSpeed = alternate ? .1 : .2;
    if (this.shotTimer < fireSpeed) return;
    this.shotTimer -= fireSpeed;
    var shot = shmup.playerBullets.getBullet();
    shot.x = this.x;
    shot.y = this.y;
    shot.body.reset(shot.x, shot.y);
    shot.revive();
    shot.rotation = 0;
    shot.frame = 0;
    shot.power = shmup.data.ship.weaponLevels[2] * 16;
    shot.scale.set(0.35 * shmup.data.ship.weaponLevels[2]);
    shot.update = function() {};
    if (alternate) {
        shot.angle = game.rnd.between(-15, 15);
        game.physics.arcade.velocityFromAngle(-90 + shot.angle, 300, shot.body.velocity);
    }
    else {
        shot.angle = game.rnd.between(-30, 30);
        game.physics.arcade.velocityFromAngle(-90 + shot.angle, 300, shot.body.velocity);
        shot.update = function() {
            var turnRate = Math.PI / 2;
            var closestDistance = 10000;
            var closestEnemy = null;
            shmup.enemies.forEachAlive(function(enemy) {
                var seekDistance = 300;
                var dist = game.physics.arcade.distanceBetween(enemy, this);
                if (dist < seekDistance && dist < closestDistance)
                    closestEnemy = enemy;
            }, this);
            if (closestEnemy) {
                var targetRotation = -Math.PI / 2 + game.physics.arcade.angleBetween(closestEnemy, this);
                if (this.rotation !== targetRotation) {
                    var delta = targetRotation - this.rotation;
                    if (delta > 0) this.rotation += turnRate * game.time.physicsElapsed;
                    else this.rotation -= turnRate * game.time.physicsElapsed;
                }
                if (Math.abs(delta) < turnRate * game.time.physicsElapsed) this.rotation = targetRotation;
                game.physics.arcade.velocityFromRotation(-Math.PI / 2 + this.rotation, 300, this.body.velocity);
            }
        };
    }
};

module.exports = Player;
},{}],7:[function(require,module,exports){
/* global game, Phaser, shmup */

var WeaponDisplay = function() {
    Phaser.Group.call(this, game);
    this.x = 10;
    this.y = 490;
    var background = game.make.image(0, 0, 'pix');
    background.alpha = 0.5;
    background.width = 100;
    background.height = 100;
    this.add(background);
    // icon backgrounds
    this.redBackground = game.make.image(39, 69, 'pix');
    this.redBackground.width = this.redBackground.height = 22;
    this.redBackground.exists = false;
    this.add(this.redBackground);
    this.greenBackground = game.make.image(9, 69, 'pix');
    this.greenBackground.width = this.greenBackground.height = 22;
    this.greenBackground.exists = false;
    this.add(this.greenBackground);
    this.blueBackground = game.make.image(69, 69, 'pix');
    this.blueBackground.width = this.blueBackground.height = 22;
    this.blueBackground.exists = false;
    this.add(this.blueBackground);
    // icons
    this.redIcon = game.make.bitmapText(40, 70, 'font', 'G');
    this.redIcon.width = 20;
    this.redIcon.height = 20;
    this.add(this.redIcon);
    this.greenIcon = game.make.bitmapText(10, 70, 'font', 'S');
    this.greenIcon.width = 20;
    this.greenIcon.height = 20;
    this.add(this.greenIcon);
    this.blueIcon = game.make.bitmapText(70, 70, 'font', 'M');
    this.blueIcon.width = 20;
    this.blueIcon.height = 20;
    this.add(this.blueIcon);
    // bars
    this.redBars = [];
    this.greenBars = [];
    this.blueBars = [];
    var i, bar;
    for (i = 0; i < 4; i++) {
        bar = game.make.image(40, 10 + (15 * (3 - i)), 'pix');
        bar.height = 10;
        bar.width = 20;
        bar.tint = 0xffffff;
        this.redBars.push(bar);
        this.add(bar);
    }
    for (i = 0; i < 4; i++) {
        bar = game.make.image(10, 10 + (15 * (3 - i)), 'pix');
        bar.height = 10;
        bar.width = 20;
        bar.tint = 0xffffff;
        this.greenBars.push(bar);
        this.add(bar);
    }
    for (i = 0; i < 4; i++) {
        bar = game.make.image(70, 10 + (15 * (3 - i)), 'pix');
        bar.height = 10;
        bar.width = 20;
        bar.tint = 0xffffff;
        this.blueBars.push(bar);
        this.add(bar);
    }
};
WeaponDisplay.prototype = Object.create(Phaser.Group.prototype);
WeaponDisplay.prototype.constructor = WeaponDisplay;
WeaponDisplay.prototype.RED = 0xffffff;
WeaponDisplay.prototype.GREEN = 0xffffff;
WeaponDisplay.prototype.BLUE = 0xffffff;
WeaponDisplay.prototype.GREY = 0x404040;
WeaponDisplay.prototype.update = function() {
    this.redBars.forEach(function(bar) {
        bar.tint = this.GREY;
    }, this);
    this.greenBars.forEach(function(bar) {
        bar.tint = this.GREY;
    }, this);
    this.blueBars.forEach(function(bar) {
        bar.tint = this.GREY;
    }, this);
    var i;
    for (i = 0; i < shmup.data.ship.weaponLevels[1]; i++) this.redBars[i].tint = this.RED;
    for (i = 0; i < shmup.data.ship.weaponLevels[0]; i++) this.greenBars[i].tint = this.GREEN;
    for (i = 0; i < shmup.data.ship.weaponLevels[2]; i++) this.blueBars[i].tint = this.BLUE;
    this.redBackground.exists = false;
    this.redIcon.tint = 0x404040;
    this.greenBackground.exists = false;
    this.greenIcon.tint = 0x404040;
    this.blueBackground.exists = false;
    this.blueIcon.tint = 0x404040;
    switch (shmup.data.ship.currentWeapon) {
        case 0:
            // this.greenBackground.exists = true;
            this.greenIcon.tint = 0xffffff;
            break;
        case 1:
            // this.redBackground.exists = true;
            this.redIcon.tint = 0xffffff;
            break;
        case 2:
            // this.blueBackground.exists = true;
            this.blueIcon.tint = 0xffffff;
            break;
    }
};

module.exports = WeaponDisplay;
},{}],8:[function(require,module,exports){
(function (global){
/* global Phaser, game */
global.shmup = {};
global.game = new Phaser.Game();
global.print = console.log.bind(console);
game.state.add('load', require('./state/load'));
game.state.add('title', require('./state/title'));
game.state.add('main', require('./state/main'));
game.state.add('level_select', require('./state/level_select'));
game.state.add('gameover', require('./state/gameover'));
game.state.add('complete', require('./state/complete'));
game.state.add('win', require('./state/win'));
game.state.add('challenge', require('./state/challenge'));
game.state.start('load');
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./state/challenge":9,"./state/complete":10,"./state/gameover":11,"./state/level_select":12,"./state/load":13,"./state/main":14,"./state/title":15,"./state/win":16}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
/* global Phaser, game, shmup */
var WeaponDisplay = require('../entity/weapon_display');

var state = {};

var BLUE = 0x36bbf5;
var GREEN = 0x71c937;
var YELLOW = 0x36bbf5;
var ORANGE = 0x36bbf5;
var RED = 0xac3939;
var DARK_RED = 0x36bbf5;
var GREY = 0x404040;
var DIFFICULTY_COLORS = [BLUE, BLUE, BLUE, BLUE, BLUE];
var MUSIC_VOLUME = 0.1;

var Stage = function(name, x) {
    Phaser.Sprite.call(this, game, x, 0, 'dotWhite');
    this.stageName = name;
    this.x = x;
    this.height = this.width = 30;
    this.anchor.set(0.5);
};
Stage.prototype = Object.create(Phaser.Sprite.prototype);
Stage.prototype.constructor = Stage;

state.create = function() {
    if (shmup.music) shmup.music.stop();
    shmup.music = game.sound.play('digital_frontier', MUSIC_VOLUME, true);
    this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
    game.add.bitmapText(400, 60, 'font', "STAGE SELECT", 48).anchor.set(0.5);

    this.stageTiers = [];
    // tier 1
    var tier1 = [];
    tier1.push(new Stage("It Is A Good Day To Die", 400));
    this.stageTiers.push(tier1);
    // tier 2
    var tier2 = [];
    tier2.push(new Stage("Glittering Prizes", 325));
    tier2.push(new Stage("Onscreen", 475));
    this.stageTiers.push(tier2);
    // tier 3
    var tier3 = [];
    tier3.push(new Stage("Make It So", 250));
    tier3.push(new Stage("Deck Me Out", 400));
    tier3.push(new Stage("Black Sheep Wall", 550));
    this.stageTiers.push(tier3);
    // tier 4
    var tier4 = [];
    tier4.push(new Stage("Something For Nothing", 175));
    tier4.push(new Stage("Ophelia", 325));
    tier4.push(new Stage("Unite The Clans", 475));
    tier4.push(new Stage("Power Overwhelming", 625));
    this.stageTiers.push(tier4);
    // tier 5
    var tier5 = [];
    tier5.push(new Stage("There Can Only Be One", 100));
    tier5.push(new Stage("There Is No Cow Level", 250));
    tier5.push(new Stage("Every Little Thing She Does", 400));
    tier5.push(new Stage("Modify The Phase Variance", 550));
    tier5.push(new Stage("Medieval Man", 700));
    this.stageTiers.push(tier5);
    // programmatically set traits
    var i, j;
    for (i = 0; i < 5; i++) {
        this.stageTiers[i].forEach(function(stage) {
            stage.y = 450 - (80 * i);
        });
        var difficulty = this.stageTiers[i].length;
        for (j = 0; j < this.stageTiers[i].length; j++) {
            var node = this.stageTiers[i][j];
            node.index = j;
            node.difficulty = difficulty--;
            node.tint = DIFFICULTY_COLORS[node.difficulty - 1];
        }
    }
    // line-drawing pass
    for (i = 0; i < 4; i++) {
        this.stageTiers[i].forEach(function(stage) {
            var leftStage = this.stageTiers[i + 1][stage.index];
            var rightStage = this.stageTiers[i + 1][stage.index + 1];
            stage.leftLine = game.make.image(stage.x, stage.y, 'pix');
            stage.leftLine.anchor.set(0, 0.5);
            stage.leftLine.tint = RED;
            stage.leftLine.width = game.physics.arcade.distanceBetween(stage, leftStage);
            stage.leftLine.height = 2;
            stage.leftLine.rotation = game.physics.arcade.angleBetween(stage, leftStage);
            stage.rightLine = game.make.image(stage.x, stage.y, 'pix');
            stage.rightLine.anchor.set(0, 0.5);
            stage.rightLine.tint = GREEN;
            stage.rightLine.width = game.physics.arcade.distanceBetween(stage, rightStage);
            stage.rightLine.height = 2;
            stage.rightLine.rotation = game.physics.arcade.angleBetween(stage, rightStage);
        }, this);
    }

    var lineGroup = game.add.group();
    for (i = 0; i < 4; i++)
        this.stageTiers[i].forEach(function(stage) {
            lineGroup.add(stage.leftLine);
            lineGroup.add(stage.rightLine);
        });
    var nodeGroup = game.add.group();
    this.stageTiers.forEach(function(tier) {
        tier.forEach(function(stage) {
            nodeGroup.add(stage);
        });
    });
    var startNode = game.make.image(400, 530, 'pix');
    startNode.height = startNode.width = 15;
    startNode.anchor.set(0.5);
    nodeGroup.add(startNode);
    var startLine = game.make.image(400, 530, 'pix');
    startLine.width = game.physics.arcade.distanceBetween(startLine, this.stageTiers[0][0]);
    startLine.height = 2;
    startLine.anchor.set(0, 0.5);
    startLine.tint = GREEN;
    startLine.rotation = game.physics.arcade.angleBetween(startLine, this.stageTiers[0][0]);
    lineGroup.add(startLine);

    // set ship based on tier and index
    var currentLocation = shmup.data.game.tier == 0 ? startNode :
        this.stageTiers[shmup.data.game.tier - 1][shmup.data.game.index];
    this.ship = game.add.image(currentLocation.x, currentLocation.y, 'ship');
    this.ship.scale.set(0.5);
    this.ship.anchor.set(0.5);

    // add text
    game.add.bitmapText(10, 450, 'font', "STATUS", 40);
    game.add.existing(new WeaponDisplay());
    game.add.bitmapText(120, 510, 'font', "SCORE: " + shmup.data.ship.score, 20);
    game.add.bitmapText(120, 540, 'font', "LIVES: " + shmup.data.ship.lives, 20);
    game.add.bitmapText(120, 570, 'font', "STARS: " + shmup.data.ship.stars + "/20", 20);

    game.add.bitmapText(790, 450, 'font', "STAGE INFO", 40).anchor.set(1, 0);
    this.stageNameText = game.add.bitmapText(790, 570, 'font', 'NAME: ---', 20);
    this.stageNameText.anchor.set(1, 0);
    this.stageDifficultyText = game.add.bitmapText(790, 540, 'font', 'DIFFICULTY: -', 20);
    this.stageDifficultyText.anchor.set(1, 0);
    this.stage = null;
    // create LAUNCH button
    this.launchButton = game.add.image(790, 488, 'metalPanel');
    this.launchText = game.add.bitmapText(690, 497, 'font', "LAUNCH", 32);
    this.launchText.anchor.set(0.5, 0);
    this.launchText.tint = 0x202020;
    this.launchButton.anchor.set(1, 0);
    this.launchButton.width = 210;
    this.launchButton.height = 39;
    this.launchButton.tint = GREY;
    this.launchButton.inputEnabled = true;
    this.launchButton.events.onInputUp.add(function() {
        if (!this.selectedStage) return;
        this.launchButton.events.onInputUp.removeAll();
        this.ship.rotation = Math.PI / 2 +
            game.physics.arcade.angleBetween(this.ship, this.selectedStage);
        shmup.data.stage = {
            name: this.selectedStage.stageName,
            difficulty: this.selectedStage.difficulty,
            index: this.selectedStage.index
        };
        shmup.data.ship.enemiesKilled = 0;
        shmup.data.game.history.push(shmup.data.stage);
        var tween = game.add.tween(this.ship);
        tween.to({
            x: this.selectedStage.x,
            y: this.selectedStage.y
        }, 1);
        tween.onComplete.add(function() {
            game.state.start('main');
        });
        tween.start();
    }, this);

    // set reachable stages
    if (shmup.data.game.tier == 0) {
        this.stageTiers[0][0].reachable = true;
    }
    else {
        this.stageTiers[shmup.data.game.tier][shmup.data.game.index].reachable = true;
        this.stageTiers[shmup.data.game.tier][shmup.data.game.index + 1].reachable = true;
    }


    // enable input for nodes
    this.stageTiers.forEach(function(tier) {
        tier.forEach(function(stage) {
            stage.inputEnabled = true;
            stage.events.onInputUp.add(function(stage) {
                this.stageNameText.setText("NAME: " + stage.stageName);
                this.stageDifficultyText.setText("DIFFICULTY: " + stage.difficulty);
                // set selected stage only if reachable
                this.selectedStage = null;
                this.launchButton.inputEnabled = false;
                this.launchButton.tint = GREY;
                this.launchText.tint = 0x202020;
                if (stage.reachable) {
                    this.selectedStage = stage;
                    this.launchButton.inputEnabled = true;
                    this.launchButton.tint = RED;
                    this.launchText.tint = 0xffffff;
                }
                // do pulse tween
                if (this.pulseTween) this.pulseTween.stop();
                this.stageTiers.forEach(function(tier) {
                    tier.forEach(function(stage) {
                        stage.height = stage.width = 30;
                    });
                });
                stage.width = stage.height = 30;
                this.pulseTween = game.add.tween(stage);
                this.pulseTween.to({
                    // width: 60,
                    // height: 60
                }, 1000, Phaser.Easing.Sinusoidal.InOut, false, 0, -1, true);
                stage.width = 60;
                stage.height = 60;
                this.pulseTween.start();
            }, this, 0, stage);
        }, this);
    }, this);
};

state.update = function() {
    // this.background.tilePosition.y += 10 * game.time.physicsElapsed;
};

module.exports = state;
},{"../entity/weapon_display":7}],13:[function(require,module,exports){
/* global Phaser, game, shmup */
module.exports = {
    preload: function() {
        game.load.baseURL = './assets/';
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.canvas.oncontextmenu = function(e) {
            e.preventDefault();
        };
        game.load.image('pix');
        game.load.image('ship');
        game.stage.backgroundColor = 0x101010;
    },
    create: function() {
        var preloadSprite = game.add.sprite(400, 250, 'ship');
        preloadSprite.anchor.set(0.5);
        game.add.text(400, 500, "LOADING...", {
            fill: 'white',
            font: '36pt Arial'
        }).anchor.set(0.5);
        game.load.setPreloadSprite(preloadSprite, 1);

        shmup.data = {};
        shmup.data.global = {};
        shmup.data.global.gamepad = true;

        game.load.audio('burning_engines', 'Music/burning_engines.ogg');
        game.load.audio('challenge', 'Music/challenge.ogg');
        game.load.audio('downtown', 'Music/downtown.ogg');
        game.load.audio('ftl', 'Music/ftl.ogg');
        game.load.audio('grand_prix', 'Music/grand_prix.ogg');
        game.load.audio('monotolic', 'Music/monotolic.ogg');
        game.load.audio('digital_frontier', 'Music/digital_frontier.ogg');
        game.load.image('starfield');
        game.load.image('explosion');
        game.load.image('laser', 'Lasers/laserGreen02.png');
        game.load.image('powerup_blue', 'Power-ups/powerupBlue_bolt.png');
        game.load.image('powerup_green', 'Power-ups/powerupGreen_bolt.png');
        game.load.image('powerup_red', 'Power-ups/powerupRed_bolt.png');
        game.load.image('star', 'Power-ups/star_gold.png');
        game.load.image('ufoBlue');
        game.load.image('ufoGreen');
        game.load.image('ufoRed');
        game.load.image('ufoYellow');
        game.load.image('metalPanel');
        game.load.image('dotWhite');
        game.load.image('title_image');
        game.load.spritesheet('player_lasers', 'player_lasers.png', 13, 37);
        game.load.spritesheet('enemy_lasers', 'enemy_lasers.png', 48, 46);
        var i, name;
        ['Black', 'Blue', 'Green', 'Red'].forEach(function(color) {
            for (i = 1; i < 6; i++) {
                name = 'enemy' + color + i;
                game.load.image(name, 'Enemies/' + name + '.png');
            }
        });
        for (i = 1; i <= 6; i++) {
            name = 'explode' + i;
            game.load.audio(name, 'Sounds/' + name + '.ogg');
        }
        game.load.audio('boss_explode', 'Sounds/boss_explode.ogg');
        game.load.audio('pickup_star', 'Sounds/sfx_twoTone.ogg');
        game.load.audio('pickup_powerup', 'Sounds/sfx_shieldUp.ogg');
        game.load.bitmapFont('font', 'font.png', 'font.fnt');
        game.load.start();
    },
    update: function() {
        if (game.load.hasLoaded) {
            game.state.start('title');
        }
    }
};
},{}],14:[function(require,module,exports){
/* global game, shmup */
var Stage = require('../util/stage');
var Player = require('../entity/player');
var Input = require('../util/input');
var BulletPool = require('../util/bulletpool');
var Emitter = require('../entity/emitter');
var Hud = require('../entity/hud');
var state = {};

state.create = function() {
    shmup.emitter = new Emitter();
    shmup.enemyBullets = new BulletPool('enemy_lasers');
    shmup.playerBullets = new BulletPool('player_lasers');
    shmup.enemies = game.add.group();
    shmup.pickups = game.add.group();
    shmup.stage = new Stage(shmup.data.stage.name, shmup.data.stage.difficulty);
    shmup.player = new Player();
    game.add.existing(shmup.player);
    shmup.input = new Input(shmup.data.global.gamepad);
    shmup.hud = new Hud();
};

state.update = function() {
    shmup.stage.update();
    shmup.input.update();
    game.physics.arcade.overlap(shmup.enemies, shmup.playerBullets, function(enemy, shot) {
        enemy.damage(shot.power);
        shot.kill();
    });
    game.physics.arcade.overlap(shmup.player, shmup.enemyBullets, function(player, shot) {
        shot.kill();
        player.hit();
    });
    game.physics.arcade.overlap(shmup.player, shmup.pickups, function(player, pickup) {
        pickup.pickedUp();
        pickup.kill();
    });
};

state.render = function() {
    if (shmup.player.alive)
        game.debug.body(shmup.player, '#ffff00');
    shmup.playerBullets.forEach(function(playerBullet) {
        if (playerBullet.alive)
            game.debug.body(playerBullet, '#008080');
    });
    shmup.enemies.forEach(function(enemy) {
        if (enemy.alive && enemy.body.x != 0 && enemy.body.y != 0)
            game.debug.body(enemy, '#FF0000');
    });
    shmup.enemyBullets.forEach(function(enemyBullet) {
        if (enemyBullet.alive)
            game.debug.body(enemyBullet, '#ff8000');
    });
};

module.exports = state;
},{"../entity/emitter":2,"../entity/hud":4,"../entity/player":6,"../util/bulletpool":17,"../util/input":18,"../util/stage":21}],15:[function(require,module,exports){
/* global game, shmup */
var BLUE = 0x36bbf5;
var GREEN = 0x71c937;
var YELLOW = 0xb1c937;
var ORANGE = 0xac8039;
var RED = 0xac3939;
var DARK_RED = 0xcc2929;
var GREY = 0x404040;
var MUSIC_VOLUME = 0.2;
module.exports = {
    create: function() {
        if (shmup.music) shmup.music.stop();
        shmup.music = game.sound.play('monotolic', MUSIC_VOLUME, true);
        this.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');
        shmup.data.game = {
            tier: 0,
            index: 0,
            history: []
        };
        shmup.data.ship = {
            score: 0,
            weaponLevels: [1, 1, 1],
            currentWeapon: 0,
            stars: 0,
            lives: 2
        };
        // create title image
        game.add.image(0, 0, 'title_image');
        game.add.bitmapText(400, 230, 'font', "SHMUP", 80).anchor.set(0.5);
        // create main "play" button
        var playButton = game.add.image(250, 400, 'metalPanel');
        playButton.width = 300;
        playButton.height = 150;
        playButton.tint = BLUE;
        playButton.inputEnabled = true;
        playButton.events.onInputUp.add(function() {
            game.state.start('level_select');
        });
        game.add.bitmapText(400, 479, 'font', 'PLAY!', 36).anchor.set(0.5);
        // create challenge mode button
        var challengeButton = game.add.image(50, 400, 'metalPanel');
        challengeButton.width = 150;
        challengeButton.height = 150;
        challengeButton.tint = RED;
        challengeButton.inputEnabled = true;
        challengeButton.events.onInputUp.add(function() {
            game.state.start('challenge');
        });
        var challengeText = game.add.bitmapText(125, 479, 'font', 'Challenge\nMode', 16);
        challengeText.anchor.set(0.5);
        challengeText.align = 'center';
        // create fullscreen button
        var fullscreenButton = game.add.image(600, 410, 'metalPanel');
        fullscreenButton.width = 150;
        fullscreenButton.height = 50;
        fullscreenButton.tint = GREEN;
        fullscreenButton.inputEnabled = true;
        fullscreenButton.events.onInputUp.add(function() {
            game.scale.startFullScreen();
        });
        game.add.bitmapText(675, 439, 'font', 'FULLSCREEN', 16).anchor.set(0.5);
        // create gamepad button
        var gamepadButton = game.add.image(600, 490, 'metalPanel');
        var gamepadText = game.add.bitmapText(675, 519, 'font', "GAMEPAD?", 16);
        gamepadText.align = 'center';
        var activateGamepad = function() {
            shmup.data.global.gamepad = true;
            gamepadButton.tint = GREEN;
            gamepadButton.events.onInputUp.addOnce(deactivateGamepad);
            gamepadText.setText('GAMEPAD\nACTIVE');
        };
        var deactivateGamepad = function() {
            shmup.data.global.gamepad = false;
            gamepadButton.tint = GREY;
            gamepadButton.events.onInputUp.addOnce(activateGamepad);
            gamepadText.setText("GAMEPAD?");
        };
        gamepadText.anchor.set(0.5);
        gamepadButton.width = 150;
        gamepadButton.height = 50;
        gamepadButton.inputEnabled = true;
        deactivateGamepad();
        // create help button
        var helpButton = game.add.image(740, 10, 'metalPanel');
        helpButton.width = helpButton.height = 50;
        helpButton.inputEnabled = true;
        helpButton.events.onInputUp.add(function() {
            window.open("https://github.com/zekoff/1gam-shmup/blob/master/README.md");
        });
        game.add.bitmapText(767, 43, 'font', "?", 36).anchor.set(0.5);
    },
    update: function() {
        this.background.tilePosition.y += 10 * game.time.physicsElapsed;
    }
};
},{}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
/* global Phaser, game */

var BulletPool = function(key) {
    Phaser.Group.call(this, game, game.world, 'bulletpool', false,
        true, Phaser.Physics.ARCADE);
    this.key = key;
};
BulletPool.prototype = Object.create(Phaser.Group.prototype);
BulletPool.prototype.constructor = BulletPool;
BulletPool.prototype.getBullet = function() {
    var shot = this.getFirstDead();
    if (!shot) {
        shot = game.make.sprite(this.x, this.y, this.key);
        shot.alpha = 0;
        shot.height = 24;
        shot.width = 8;
        shot.anchor.set(0.5);
        shot.power = 10;
        shot.checkWorldBounds = true;
        shot.outOfBoundsKill = true;
        this.add(shot);
    }
    shot.height = 24;
    shot.width = 8;
    if (this.key == 'enemy_lasers') shot.update = function() {
        // this.angle += 120 * game.time.physicsElapsed;
    };
    return shot;
};

module.exports = BulletPool;
},{}],18:[function(require,module,exports){
/* global game, shmup, Phaser */
var DEADZONE = .1;
var MOUSE_INPUT = function() {
    if (this.inputDisabled) return;
    if (game.physics.arcade.distanceToPointer(shmup.player) > 10)
        game.physics.arcade.moveToPointer(shmup.player,
            game.input.activePointer.isDown ?
            shmup.player.SLOW_SPEED : shmup.player.FAST_SPEED);
    else {
        shmup.player.body.velocity.set(0);
        shmup.player.x = game.input.activePointer.x;
        shmup.player.y = game.input.activePointer.y;
    }
    shmup.player.alternateFire = game.input.activePointer.isDown;
};
var GAMEPAD_INPUT = function() {
    if (this.inputDisabled) return;
    shmup.player.alternateFire = this.pad.isDown(Phaser.Gamepad.XBOX360_A);

    if (!game.input.gamepad.supported || !game.input.gamepad.active ||
        !this.pad.connected) return;

    var cycleButtonThisFrame = this.pad.isDown(Phaser.Gamepad.XBOX360_X);
    if (!this.cycleButtonLastFrame && cycleButtonThisFrame) shmup.player.cycleWeapon();
    this.cycleButtonLastFrame = cycleButtonThisFrame;

    shmup.player.body.velocity.set(0);
    var xDir = 0,
        yDir = 0;

    // d-pad control
    if (this.pad.isDown(Phaser.Gamepad.XBOX360_DPAD_LEFT)) xDir = -1;
    else if (this.pad.isDown(Phaser.Gamepad.XBOX360_DPAD_RIGHT)) xDir = 1;
    if (this.pad.isDown(Phaser.Gamepad.XBOX360_DPAD_UP)) yDir = -1;
    else if (this.pad.isDown(Phaser.Gamepad.XBOX360_DPAD_DOWN)) yDir = 1;
    this.dummyPoint.copyFrom(shmup.player);
    this.dummyPoint.x += xDir;
    this.dummyPoint.y += yDir;
    if (xDir || yDir)
        game.physics.arcade.moveToObject(shmup.player, this.dummyPoint,
            this.pad.isDown(Phaser.Gamepad.XBOX360_A) ?
            shmup.player.SLOW_SPEED : shmup.player.FAST_SPEED);

    // thumbstick control
    var xAxis = this.pad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_X);
    var yAxis = this.pad.axis(Phaser.Gamepad.XBOX360_STICK_LEFT_Y);
    if (Math.abs(xAxis) < DEADZONE) xAxis = 0;
    if (Math.abs(yAxis) < DEADZONE) yAxis = 0;
    this.dummyPoint.copyFrom(shmup.player);
    this.dummyPoint.x += xAxis * 100;
    this.dummyPoint.y += yAxis * 100;
    if (xAxis || yAxis)
        game.physics.arcade.moveToObject(shmup.player, this.dummyPoint,
            this.pad.isDown(Phaser.Gamepad.XBOX360_A) ?
            shmup.player.SLOW_SPEED : shmup.player.FAST_SPEED);
};

var Input = function(useGamepad) {
    game.input.gamepad.start();
    this.pad = game.input.gamepad.pad1;
    this.dummyPoint = new Phaser.Point();
    if (useGamepad) {
        this.update = GAMEPAD_INPUT.bind(this);
        this.cycleButtonLastFrame = false;
    }
    else {
        this.update = MOUSE_INPUT.bind(this);
        game.input.mousePointer.rightButton.onDown.removeAll();
        game.input.mousePointer.rightButton.onDown.add(shmup.player.cycleWeapon, shmup.player);
    }
};
Input.prototype = {};
Input.prototype.constructor = Input;

module.exports = Input;
},{}],19:[function(require,module,exports){
/* global Phaser, game */
var spline1 = function() {
    var PATH_X = [0, 200, 400, 500, 550, 400, 200, -50];
    var PATH_Y = [50, 75, 150, 300, 200, 350, 100, 50];
    this.moveTimer += game.time.physicsElapsed / 4 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation(PATH_X, this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation(PATH_Y, this.moveTimer);
};
var spline2 = function() {
    var PATH_X = [0, 400, 600, 700, 400, 200, 600, 850];
    var PATH_Y = [300, 50, 100, 150, 200];
    this.moveTimer += game.time.physicsElapsed / 9 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation(PATH_X, this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation(PATH_Y, this.moveTimer);
};
var spline3 = function() {
    var PATH_X = [400, 200, 400, 600, 400, 400];
    var PATH_Y = [0, 100, 100, 100, 200, -50];
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation(PATH_X, this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation(PATH_Y, this.moveTimer);
};
var spline4 = function() {
    var PATH_X = [800, 100, 200, 350, 500, 600, 850];
    var PATH_Y = [400, 100, 200, 150, 100, 50, 50];
    this.moveTimer += game.time.physicsElapsed / 7 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation(PATH_X, this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation(PATH_Y, this.moveTimer);
};
var divebomb = function() {
    if (!this.x) this.x = game.rnd.between(100, 700);
    this.y += 200 * game.time.physicsElapsed;
};
var arcUpRight = function() {
    if (!this.moveInit) {
        this.moveInit = true;
        this.x = 0;
        this.y = 400;
    }
    this.x += 250 * game.time.physicsElapsed;
    this.y -= 60 * game.time.physicsElapsed;
};
var arcUpLeft = function() {
    if (!this.moveInit) {
        this.moveInit = true;
        this.x = 800;
        this.y = 400;
    }
    this.x -= 250 * game.time.physicsElapsed;
    this.y -= 60 * game.time.physicsElapsed;
};
var duckDownUp = function() {
    this.moveTimer += game.time.physicsElapsed / 4 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([100, 400, 700], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([0, 100, 105, 110, 105, 100, -50], this.moveTimer);
};
var smoothArcRightLeft = function() {
    this.moveTimer += game.time.physicsElapsed / 4 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([800, 600, 400, 200, 0], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([600, 300, 200, 300, 650], this.moveTimer);
};
var lineLeftDown = function() {
    if (!this.moveInit) {
        this.moveInit = true;
        this.x = 800;
        this.y = 50;
    }
    this.x -= 250 * game.time.physicsElapsed;
    this.y += 60 * game.time.physicsElapsed;
};
var lineRightDown = function() {
    if (!this.moveInit) {
        this.moveInit = true;
        this.x = 0;
        this.y = 50;
    }
    this.x += 250 * game.time.physicsElapsed;
    this.y += 60 * game.time.physicsElapsed;
};
var spline5 = function() {
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([800, 400, 100, 400, 850], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([50, 25, 50, 25, 50], this.moveTimer);
};
var spline6 = function() {
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([0, 300, 500, 200, 500, 700], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([100, 300, 200, 100, 300, -50], this.moveTimer);
};
var spline7 = function() {
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([400, 700, 200, 400], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([0, 300, 300, -50], this.moveTimer);
};
var spline8 = function() {
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([200, 600], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([0, 200, 300, 200, 0, -50], this.moveTimer);
};
var spline9 = function() {
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([0, 700, 100, 400, 300, 850], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([50, 100, 150, 200, 250], this.moveTimer);
};
var spline10 = function() {
    this.moveTimer += game.time.physicsElapsed / 5 / this.speedFactor;
    this.x = Phaser.Math.catmullRomInterpolation([800, 400, -50], this.moveTimer);
    this.y = Phaser.Math.catmullRomInterpolation([300, 200, 300], this.moveTimer);
};
var lineLeftDown2 = function() {
    if (!this.moveInit) {
        this.moveInit = true;
        this.x = 800;
        this.y = 200;
    }
    this.x -= 250 * game.time.physicsElapsed;
    this.y += 20 * game.time.physicsElapsed;
};
var lineRightDown2 = function() {
    if (!this.moveInit) {
        this.moveInit = true;
        this.x = 0;
        this.y = 200;
    }
    this.x += 250 * game.time.physicsElapsed;
    this.y += 20 * game.time.physicsElapsed;
};
module.exports = [spline1, spline2, spline3, spline4, divebomb, arcUpRight,
    arcUpLeft, duckDownUp, smoothArcRightLeft, lineLeftDown, lineRightDown,
    spline5, spline6, spline7, spline8, spline9, spline10, lineLeftDown2,
    lineRightDown2
];
},{}],20:[function(require,module,exports){
/* global shmup, game */

var SHOT_BODY_SCALE = .7;

var straight = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > .75 && game.rnd.frac() < .05) {
        this.shotTimer = 0;
        var shot = shmup.enemyBullets.getBullet();
        shot.x = this.x;
        shot.y = this.y;
        shot.width = shot.height = 30;
        shot.tint = 0xff0000;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        shot.body.velocity.x = 0;
        shot.body.velocity.y = 250;
    }
};
var aimed = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > 1.5 && game.rnd.frac() < .02) {
        this.shotTimer = 0;
        var shot = shmup.enemyBullets.getBullet();
        shot.tint = 0xffa0ff;
        shot.height = shot.width = 25;
        shot.x = this.x;
        shot.y = this.y;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        game.physics.arcade.moveToObject(shot, shmup.player, 300);
    }
};
var fatAimed = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > 1.5 && game.rnd.frac() < .05) {
        this.shotTimer = 0;
        var shot = shmup.enemyBullets.getBullet();
        shot.tint = 0xffff00;
        shot.height = 30;
        shot.width = 30;
        shot.x = this.x;
        shot.y = this.y;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        game.physics.arcade.moveToObject(shot, shmup.player, 200);
    }
};
var burst = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > 1 && game.rnd.frac() < 0.01) {
        this.shotTimer = 0;
        for (var i = -2; i < 3; i++) {
            var shot = shmup.enemyBullets.getBullet();
            shot.tint = 0xff8080;
            shot.height = shot.width = 15;
            shot.x = this.x;
            shot.y = this.y;
            shot.body.reset(shot.x, shot.y);
            shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
            shot.revive();
            game.physics.arcade.velocityFromAngle(90 + (15 * i), 200, shot.body.velocity);
        }
    }
};
var doubleStraight = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > .75 && game.rnd.frac() < .05) {
        this.shotTimer = 0;
        var shot = shmup.enemyBullets.getBullet();
        shot.x = this.x - 20;
        shot.y = this.y;
        shot.width = shot.height = 20;
        shot.tint = 0xff0000;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        shot.body.velocity.x = 0;
        shot.body.velocity.y = 250;
        shot = shmup.enemyBullets.getBullet();
        shot.x = this.x + 20;
        shot.y = this.y;
        shot.width = shot.height = 20;
        shot.tint = 0xff0000;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        shot.body.velocity.x = 0;
        shot.body.velocity.y = 250;
    }
};
var smallAimed = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > 0.5 && game.rnd.frac() < .02) {
        // add shots
        this.shotTimer = 0;
        var shot = shmup.enemyBullets.getBullet();
        shot.tint = 0xff80ff;
        shot.x = this.x;
        shot.y = this.y;
        shot.height = shot.width = 20;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        game.physics.arcade.moveToObject(shot, shmup.player, 300);
    }
};
var circleBurst = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > 3 && game.rnd.frac() < 0.05) {
        this.shotTimer = 0;
        for (var i = 0; i < 12; i++) {
            var shot = shmup.enemyBullets.getBullet();
            shot.tint = 0xff8080;
            shot.height = shot.width = 15;
            shot.x = this.x;
            shot.y = this.y;
            shot.body.reset(shot.x, shot.y);
            shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
            shot.revive();
            game.physics.arcade.velocityFromAngle(90 + (30 * i), 125, shot.body.velocity);
        }
    }
};
var singleRandom = function() {
    this.shotTimer += game.time.physicsElapsed;
    if (this.shotTimer > .75 && game.rnd.frac() < .05) {
        this.shotTimer = 0;
        var shot = shmup.enemyBullets.getBullet();
        shot.x = this.x;
        shot.y = this.y;
        shot.width = shot.height = 30;
        shot.tint = 0xff0000;
        shot.body.reset(shot.x, shot.y);
        shot.body.setSize(shot.width * SHOT_BODY_SCALE, shot.height * SHOT_BODY_SCALE);
        shot.revive();
        game.physics.arcade.velocityFromAngle(90 + (game.rnd.between(-30, 30)), 200, shot.body.velocity);
    }
};

module.exports = {
    enemyShots: [straight, aimed, fatAimed, burst, doubleStraight],
    bossShots: [aimed, fatAimed, burst, smallAimed, circleBurst, singleRandom]
};
},{}],21:[function(require,module,exports){
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

var INTRO_LENGTH = 500;
var OUTRO_LENGTH = 500;
var WARP_SPEED = 3000;

// Seed is a string that will be used to init the RNG.
// Difficulty is a number 1-5 for normal play, higher for challenge modes
var Stage = function(seed, difficulty) {
    var stageNumber = shmup.data.game.challenge ? "CHALLENGE MODE" : "STAGE " + shmup.data.game.history.length;
    var stageNumberText = game.add.bitmapText(400, 150, 'font', stageNumber, 40);
    stageNumberText.anchor.set(0.5);
    var stageNameText = game.add.bitmapText(400, 200, 'font', '"' + shmup.data.stage.name + '"', 36);
    stageNameText.anchor.set(0.5);
    stageNameText.alpha = 0;
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
    this.background.alpha = 0.4;
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
    this.alpha = 0;
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
},{"../entity/boss":1,"../entity/enemy":3,"../util/movement":19,"../util/shot":20}]},{},[8])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4yLjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZW50aXR5L2Jvc3MuanMiLCJzcmMvZW50aXR5L2VtaXR0ZXIuanMiLCJzcmMvZW50aXR5L2VuZW15LmpzIiwic3JjL2VudGl0eS9odWQuanMiLCJzcmMvZW50aXR5L3BpY2t1cC5qcyIsInNyYy9lbnRpdHkvcGxheWVyLmpzIiwic3JjL2VudGl0eS93ZWFwb25fZGlzcGxheS5qcyIsInNyYy9zdGFydHVwLmpzIiwic3JjL3N0YXRlL2NoYWxsZW5nZS5qcyIsInNyYy9zdGF0ZS9jb21wbGV0ZS5qcyIsInNyYy9zdGF0ZS9nYW1lb3Zlci5qcyIsInNyYy9zdGF0ZS9sZXZlbF9zZWxlY3QuanMiLCJzcmMvc3RhdGUvbG9hZC5qcyIsInNyYy9zdGF0ZS9tYWluLmpzIiwic3JjL3N0YXRlL3RpdGxlLmpzIiwic3JjL3N0YXRlL3dpbi5qcyIsInNyYy91dGlsL2J1bGxldHBvb2wuanMiLCJzcmMvdXRpbC9pbnB1dC5qcyIsInNyYy91dGlsL21vdmVtZW50LmpzIiwic3JjL3V0aWwvc2hvdC5qcyIsInNyYy91dGlsL3N0YWdlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBnbG9iYWwgZ2FtZSwgUGhhc2VyLCBzaG11cCAqL1xudmFyIEVuZW15ID0gcmVxdWlyZSgnLi9lbmVteScpO1xudmFyIFNob3RUeXBlcyA9IHJlcXVpcmUoJy4uL3V0aWwvc2hvdCcpO1xuXG52YXIgY3JlYXRlUmFuZG9tTG9jYXRpb25Ud2VlbiA9IGZ1bmN0aW9uKHRhcmdldCwgdHdlZW4pIHtcbiAgICB0d2Vlbi50byh7XG4gICAgICAgIHg6IGdhbWUucm5kLmJldHdlZW4oMTAwLCA3MDApLFxuICAgICAgICB5OiBnYW1lLnJuZC5iZXR3ZWVuKDIwLCAzMDApXG4gICAgfSwgMjUwMCwgbnVsbCwgdHJ1ZSk7XG59O1xuXG52YXIgQm9zcyA9IGZ1bmN0aW9uKGRpZmZpY3VsdHkpIHtcbiAgICBQaGFzZXIuU3ByaXRlLmNhbGwodGhpcywgZ2FtZSwgNDAwLCAwLCBnYW1lLnJuZC5waWNrKEVuZW15LnByb3RvdHlwZS5JTUFHRV9LRVlTKSk7XG4gICAgdGhpcy5hbmNob3Iuc2V0KDAuNSk7XG4gICAgdGhpcy5hbHBoYSA9IDA7XG4gICAgZ2FtZS5waHlzaWNzLmFyY2FkZS5lbmFibGUodGhpcyk7XG4gICAgdGhpcy5ib2R5LnNldFNpemUodGhpcy5ib2R5LndpZHRoICogLjcsIHRoaXMuYm9keS5oZWlnaHQgKiAuNyk7XG4gICAgdGhpcy5tb3ZlVGltZXIgPSAwO1xuICAgIHRoaXMubW92ZVN0YXRlID0gdGhpcy5JTklUO1xuICAgIHRoaXMubW92ZVR3ZWVuID0gbnVsbDtcbiAgICAvLyB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgdGhpcy5zY2FsZS5zZXQoMS41KTtcbiAgICB0aGlzLm1heEhlYWx0aCA9IHRoaXMuaGVhbHRoID0gMzAwMCArIGRpZmZpY3VsdHkgKiAxMDAwOyAvLyBzaG90LWluLXRoZS1kYXJrIGZvciBiYWxhbmNlXG4gICAgdGhpcy5ldmVudHMub25LaWxsZWQuYWRkKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVjdCA9IG5ldyBQaGFzZXIuUmVjdGFuZ2xlKHRoaXMubGVmdCwgdGhpcy50b3AsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgdmFyIHAgPSBuZXcgUGhhc2VyLlBvaW50KCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgICAgICAgcmVjdC5yYW5kb20ocCk7XG4gICAgICAgICAgICAvLyBzaG11cC5lbWl0dGVyLmJ1cnN0KHAueCwgcC55KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBnYW1lLnNvdW5kLnBsYXkoJ2Jvc3NfZXhwbG9kZScsIDAuMyk7XG4gICAgICAgIHNobXVwLmh1ZC5zZXRCb3NzKG51bGwpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy53ZWFwb25zID0gW107XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IGRpZmZpY3VsdHkgKiAzOyBpKyspIHtcbiAgICAgICAgdmFyIHdlYXBvbiA9IHtcbiAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICB5OiAwLFxuICAgICAgICAgICAgc2hvdFRpbWVyOiAwLFxuICAgICAgICB9O1xuICAgICAgICB3ZWFwb24uc2hvdFVwZGF0ZSA9IGdhbWUucm5kLnBpY2soU2hvdFR5cGVzLmJvc3NTaG90cykuYmluZCh3ZWFwb24pO1xuICAgICAgICB0aGlzLndlYXBvbnMucHVzaCh3ZWFwb24pO1xuICAgIH1cbn07XG5Cb3NzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLlNwcml0ZS5wcm90b3R5cGUpO1xuQm9zcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCb3NzO1xuQm9zcy5wcm90b3R5cGUuSU5JVCA9IDA7XG5Cb3NzLnByb3RvdHlwZS5QQU4gPSAxO1xuQm9zcy5wcm90b3R5cGUuUkFORE9NID0gMjtcbkJvc3MucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5hbGl2ZSkgcmV0dXJuOyAvLyBzZWVtcyBsaWtlIHRoaXMgc2hvdWxkIGJlIHRoZSBkZWZhdWx0IGJlaGF2aW9yIGluIFBoYXNlci4uLlxuICAgIC8vIGhhbmRsZSBtb3ZlbWVudCBiYXNlZCBvbiBtb3ZlIHN0YXRlIC8gaGVhbHRoXG4gICAgdmFyIHdlYXBvbnNFbmdhZ2VkID0gMTtcbiAgICBzd2l0Y2ggKHRoaXMubW92ZVN0YXRlKSB7XG4gICAgICAgIGNhc2UgdGhpcy5JTklUOlxuICAgICAgICAgICAgd2VhcG9uc0VuZ2FnZWQgPSBNYXRoLmNlaWwodGhpcy53ZWFwb25zLmxlbmd0aCAvIDMpO1xuICAgICAgICAgICAgaWYgKHRoaXMueSA8IDE1MCkgdGhpcy55ICs9IDMwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgICAgICAgICAgaWYgKHRoaXMuaGVhbHRoIDwgdGhpcy5tYXhIZWFsdGggKiAuNykgdGhpcy5tb3ZlU3RhdGUgPSB0aGlzLlBBTjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRoaXMuUEFOOlxuICAgICAgICAgICAgd2VhcG9uc0VuZ2FnZWQgPSBNYXRoLmNlaWwodGhpcy53ZWFwb25zLmxlbmd0aCAvIDMpICogMjtcbiAgICAgICAgICAgIGlmICghdGhpcy5tb3ZlVHdlZW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUd2VlbiA9IGdhbWUudHdlZW5zLmNyZWF0ZSh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUd2Vlbi50byh7XG4gICAgICAgICAgICAgICAgICAgIHg6IDY1MFxuICAgICAgICAgICAgICAgIH0sIDMwMDAsIG51bGwsIGZhbHNlLCAwLCAtMSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgZ2FtZS5hZGQudHdlZW4odGhpcykudG8oe1xuICAgICAgICAgICAgICAgICAgICB4OiAxNTBcbiAgICAgICAgICAgICAgICB9LCAxNTAwLCBudWxsLCB0cnVlKS5jaGFpbih0aGlzLm1vdmVUd2Vlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5oZWFsdGggPCB0aGlzLm1heEhlYWx0aCAqIC4zNSkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVR3ZWVuLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUd2VlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlU3RhdGUgPSB0aGlzLlJBTkRPTTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRoaXMuUkFORE9NOlxuICAgICAgICAgICAgd2VhcG9uc0VuZ2FnZWQgPSB0aGlzLndlYXBvbnMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKCF0aGlzLm1vdmVUd2Vlbikge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVR3ZWVuID0gZ2FtZS5hZGQudHdlZW4odGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlVHdlZW4ub25Db21wbGV0ZS5hZGQoY3JlYXRlUmFuZG9tTG9jYXRpb25Ud2Vlbik7XG4gICAgICAgICAgICAgICAgY3JlYXRlUmFuZG9tTG9jYXRpb25Ud2VlbihudWxsLCB0aGlzLm1vdmVUd2Vlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IHdlYXBvbnNFbmdhZ2VkOyBpKyspIHtcbiAgICAgICAgdGhpcy53ZWFwb25zW2ldLnggPSB0aGlzLng7XG4gICAgICAgIHRoaXMud2VhcG9uc1tpXS55ID0gdGhpcy55O1xuICAgICAgICB0aGlzLndlYXBvbnNbaV0uc2hvdFVwZGF0ZSgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQm9zczsiLCIvKiBnbG9iYWwgZ2FtZSAqL1xuXG52YXIgRW1pdHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZW1pdHRlciA9IGdhbWUuYWRkLmVtaXR0ZXIoMCwgMCwgNDAwKTtcbiAgICB0aGlzLmVtaXR0ZXIubWFrZVBhcnRpY2xlcygnZXhwbG9zaW9uJyk7XG4gICAgdGhpcy5lbWl0dGVyLnNldFNjYWxlKDAuMiwgMC40LCAwLjIsIDAuNCk7XG59O1xuRW1pdHRlci5wcm90b3R5cGUgPSB7fTtcbkVtaXR0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1pdHRlcjtcbkVtaXR0ZXIucHJvdG90eXBlLmJ1cnN0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuZW1pdHRlci54ID0geDtcbiAgICB0aGlzLmVtaXR0ZXIueSA9IHk7XG4gICAgdGhpcy5lbWl0dGVyLnN0YXJ0KHRydWUsIDMwMCwgbnVsbCwgMTApO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyOyIsIi8qIGdsb2JhbCBnYW1lLCBQaGFzZXIsIHNobXVwICovXG52YXIgUGlja3VwID0gcmVxdWlyZSgnLi9waWNrdXAnKTtcblxudmFyIEVuZW15ID0gZnVuY3Rpb24oaW1hZ2VLZXksIGhlYWx0aFJhdGluZywgbW92ZW1lbnRGdW5jdGlvbiwgc2hvdEZ1bmN0aW9uKSB7XG4gICAgUGhhc2VyLlNwcml0ZS5jYWxsKHRoaXMsIGdhbWUsIDAsIDAsIGltYWdlS2V5KTtcbiAgICBwcmludCh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgdGhpcy5hbmNob3Iuc2V0KDAuNSk7XG4gICAgdGhpcy5hbHBoYSA9IDA7XG4gICAgZ2FtZS5waHlzaWNzLmFyY2FkZS5lbmFibGUodGhpcyk7XG4gICAgdGhpcy5ib2R5LnNldFNpemUodGhpcy5ib2R5LndpZHRoICogLjgsIHRoaXMuYm9keS5oZWlnaHQgKiAuOCk7XG4gICAgdGhpcy5jaGVja1dvcmxkQm91bmRzID0gdHJ1ZTtcbiAgICB0aGlzLm91dE9mQm91bmRzS2lsbCA9IHRydWU7XG4gICAgdGhpcy5tb3ZlVGltZXIgPSAwO1xuICAgIHRoaXMuc3BlZWRGYWN0b3IgPSBoZWFsdGhSYXRpbmcgLyAzOyAvLyBoaWdoZXIgc3BlZWQgZmFjdG9yIGlzIHNsb3dlciAoPylcbiAgICB0aGlzLnNwZWVkRmFjdG9yICo9IDAuNTtcbiAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgdGhpcy5zY2FsZS5zZXQoaGVhbHRoUmF0aW5nIC8gMTApO1xuICAgIHRoaXMuaGVhbHRoID0gaGVhbHRoUmF0aW5nICogaGVhbHRoUmF0aW5nIC8gMiAqIDEwO1xuICAgIHRoaXMubW92ZVVwZGF0ZSA9IG1vdmVtZW50RnVuY3Rpb24uYmluZCh0aGlzKTtcbiAgICBpZiAoc2hvdEZ1bmN0aW9uKVxuICAgICAgICB0aGlzLnNob3RVcGRhdGUgPSBzaG90RnVuY3Rpb24uYmluZCh0aGlzKTtcbiAgICB0aGlzLmV2ZW50cy5vbktpbGxlZC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmhlYWx0aCA+IDApIHJldHVybjtcbiAgICAgICAgLy8gc2htdXAuZW1pdHRlci5idXJzdCh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIHNobXVwLmRhdGEuc2hpcC5zY29yZSArPSBoZWFsdGhSYXRpbmcgKiAxMDA7XG4gICAgICAgIHNobXVwLmRhdGEuc2hpcC5lbmVtaWVzS2lsbGVkKys7XG4gICAgICAgIHZhciBwaWNrdXBDaGFuY2UgPSAwLjkgLSAoc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVscy5yZWR1Y2UoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgKyBiO1xuICAgICAgICB9KSAvIDIwKTtcbiAgICAgICAgaWYgKGdhbWUucm5kLmZyYWMoKSA8IHBpY2t1cENoYW5jZSkgc2htdXAucGlja3Vwcy5hZGQobmV3IFBpY2t1cCh0aGlzLngsIHRoaXMueSkpO1xuICAgICAgICAvLyBnYW1lLnNvdW5kLnBsYXkoJ2V4cGxvZGUnICsgZ2FtZS5ybmQuYmV0d2VlbigxLCA2KSwgMC4yKTtcbiAgICB9LCB0aGlzKTtcbn07XG5FbmVteS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBoYXNlci5TcHJpdGUucHJvdG90eXBlKTtcbkVuZW15LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVuZW15O1xuRW5lbXkucHJvdG90eXBlLklNQUdFX0tFWVMgPSBbXTtcblsnQmxhY2snLCAnQmx1ZScsICdHcmVlbicsICdSZWQnXS5mb3JFYWNoKGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCA2OyBpKyspIHtcbiAgICAgICAgRW5lbXkucHJvdG90eXBlLklNQUdFX0tFWVMucHVzaCgnZW5lbXknICsgY29sb3IgKyBpKTtcbiAgICB9XG59KTtcblxuRW5lbXkucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5hbGl2ZSkgcmV0dXJuO1xuICAgIC8vIHRoaXMucm90YXRpb24gPSBQaGFzZXIuTWF0aC5hbmdsZUJldHdlZW5Qb2ludHModGhpcy5wcmV2aW91c1Bvc2l0aW9uLCB0aGlzKSAtIChNYXRoLlBJIC8gMik7XG4gICAgdGhpcy5tb3ZlVXBkYXRlKCk7XG4gICAgaWYgKHRoaXMuc2hvdFVwZGF0ZSlcbiAgICAgICAgdGhpcy5zaG90VXBkYXRlKCk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRW5lbXk7IiwiLyogZ2xvYmFsIFBoYXNlciwgZ2FtZSwgc2htdXAgKi9cbnZhciBXZWFwb25EaXNwbGF5ID0gcmVxdWlyZSgnLi93ZWFwb25fZGlzcGxheScpO1xuXG52YXIgU1RBUlNfRk9SX0VYVFJBX0xJRkUgPSAyMDtcblxudmFyIEh1ZCA9IGZ1bmN0aW9uKCkge1xuICAgIFBoYXNlci5Hcm91cC5jYWxsKHRoaXMsIGdhbWUpO1xuICAgIHRoaXMuc2NvcmVUZXh0ID0gZ2FtZS5tYWtlLmJpdG1hcFRleHQoNzkwLCA2MDAsICdmb250JywgJ1NDT1JFOiAnLCAyNCk7XG4gICAgdGhpcy5zY29yZVRleHQuYW5jaG9yLnNldCgxLCAxKTtcbiAgICB0aGlzLmxpdmVzVGV4dCA9IGdhbWUubWFrZS5iaXRtYXBUZXh0KDEyMCwgNjAwLCAnZm9udCcsICdMSVZFUzogJywgMjQpO1xuICAgIHRoaXMubGl2ZXNUZXh0LmFuY2hvci5zZXQoMCwgMSk7XG4gICAgdGhpcy5zdGFyc1RleHQgPSBnYW1lLm1ha2UuYml0bWFwVGV4dCgxMjAsIDU1MCwgJ2ZvbnQnLCAnU1RBUlM6ICcsIDE2KTtcbiAgICB0aGlzLmxpdmVzVGV4dC5hbmNob3Iuc2V0KDAsIDEpO1xuICAgIHRoaXMuYWRkKHRoaXMuc2NvcmVUZXh0KTtcbiAgICB0aGlzLmFkZCh0aGlzLmxpdmVzVGV4dCk7XG4gICAgdGhpcy5hZGQodGhpcy5zdGFyc1RleHQpO1xuICAgIHRoaXMubGFzdEZyYW1lU2NvcmUgPSB0aGlzLmRpc3BsYXllZFNjb3JlID0gc2htdXAuZGF0YS5zaGlwLnNjb3JlO1xuICAgIHRoaXMuc2NvcmVUd2VlbiA9IG51bGw7XG4gICAgdGhpcy53ZWFwb25EaXNwbGF5ID0gbmV3IFdlYXBvbkRpc3BsYXkoKTtcbiAgICB0aGlzLmJvc3MgPSBudWxsO1xuICAgIHRoaXMuYm9zc1RleHQgPSBnYW1lLm1ha2UuYml0bWFwVGV4dCg0MDAsIDQwLCAnZm9udCcsIFwiQk9TU1wiLCAzMik7XG4gICAgdGhpcy5ib3NzVGV4dC5hbmNob3Iuc2V0KDAuNSwgMCk7XG4gICAgdGhpcy5ib3NzVGV4dC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmFkZCh0aGlzLmJvc3NUZXh0KTtcbiAgICB0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kID0gZ2FtZS5tYWtlLmltYWdlKDQwMCwgMTAsICdwaXgnKTtcbiAgICB0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kLmFuY2hvci5zZXQoMC41LCAwKTtcbiAgICB0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kLndpZHRoID0gNDAwO1xuICAgIHRoaXMuYm9zc0hlYWx0aEJhY2tncm91bmQuaGVpZ2h0ID0gMjA7XG4gICAgdGhpcy5ib3NzSGVhbHRoQmFja2dyb3VuZC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kLnRpbnQgPSAweDQwNDA0MDtcbiAgICB0aGlzLmFkZCh0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kKTtcbiAgICB0aGlzLmJvc3NIZWFsdGggPSBnYW1lLm1ha2UuaW1hZ2UoNDAwLCAxMSwgJ3BpeCcpO1xuICAgIHRoaXMuYm9zc0hlYWx0aC5hbmNob3Iuc2V0KDAuNSwgMCk7XG4gICAgdGhpcy5ib3NzSGVhbHRoLndpZHRoID0gMzk4O1xuICAgIHRoaXMuYm9zc0hlYWx0aC5oZWlnaHQgPSAxODtcbiAgICB0aGlzLmJvc3NIZWFsdGguZXhpc3RzID0gZmFsc2U7XG4gICAgdGhpcy5ib3NzSGVhbHRoLnRpbnQgPSAweGY4OWQwMDtcbiAgICB0aGlzLmFkZCh0aGlzLmJvc3NIZWFsdGgpO1xuICAgIHRoaXMuc2NvcmVQdWxzZSA9IG51bGw7XG59O1xuSHVkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLkdyb3VwLnByb3RvdHlwZSk7XG5IdWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSHVkO1xuSHVkLnByb3RvdHlwZS5wdWxzZVNjb3JlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgKHRoaXMuc2NvcmVQdWxzZSkgdGhpcy5zY29yZVB1bHNlLnN0b3AoKTtcbiAgICAvLyB0aGlzLnNjb3JlUHVsc2UgPSBnYW1lLmFkZC50d2Vlbih0aGlzLnNjb3JlVGV4dC5zY2FsZSk7XG4gICAgLy8gdGhpcy5zY29yZVB1bHNlLnRvKHtcbiAgICAvLyAgICAgeDogMS4zLFxuICAgIC8vICAgICB5OiAxLjNcbiAgICAvLyB9LCAzMDAsIFBoYXNlci5FYXNpbmcuQ3ViaWMuT3V0KTtcbiAgICAvLyB0aGlzLnNjb3JlUHVsc2UudG8oe1xuICAgIC8vICAgICB4OiAxLFxuICAgIC8vICAgICB5OiAxXG4gICAgLy8gfSwgNTAwLCBQaGFzZXIuRWFzaW5nLkN1YmljLkluKTtcbiAgICAvLyB0aGlzLnNjb3JlUHVsc2Uuc3RhcnQoKTtcbn07XG5IdWQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGlmICh0aGlzLmxhc3RGcmFtZVNjb3JlICE9IHNobXVwLmRhdGEuc2hpcC5zY29yZSkge1xuICAgIC8vICAgICB0aGlzLnB1bHNlU2NvcmUoKTtcbiAgICAvLyAgICAgaWYgKHRoaXMuc2NvcmVUd2VlbikgdGhpcy5zY29yZVR3ZWVuLnN0b3AoKTtcbiAgICAvLyAgICAgdGhpcy5zY29yZVR3ZWVuID0gZ2FtZS5hZGQudHdlZW4odGhpcyk7XG4gICAgLy8gICAgIHRoaXMuc2NvcmVUd2Vlbi50byh7XG4gICAgLy8gICAgICAgICBkaXNwbGF5ZWRTY29yZTogc2htdXAuZGF0YS5zaGlwLnNjb3JlXG4gICAgLy8gICAgIH0sIDc1MCwgbnVsbCwgdHJ1ZSk7XG4gICAgLy8gfVxuICAgIGlmIChzaG11cC5kYXRhLnNoaXAuc3RhcnMgPj0gU1RBUlNfRk9SX0VYVFJBX0xJRkUpIHtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLnN0YXJzIC09IFNUQVJTX0ZPUl9FWFRSQV9MSUZFO1xuICAgICAgICBzaG11cC5kYXRhLnNoaXAubGl2ZXMrKztcbiAgICB9XG4gICAgdGhpcy5sYXN0RnJhbWVTY29yZSA9IHNobXVwLmRhdGEuc2hpcC5zY29yZTtcbiAgICB0aGlzLnNjb3JlVGV4dC5zZXRUZXh0KFwiU0NPUkU6IFwiICsgTWF0aC5mbG9vcihzaG11cC5kYXRhLnNoaXAuc2NvcmUpKTtcbiAgICB0aGlzLmxpdmVzVGV4dC5zZXRUZXh0KFwiTElWRVM6IFwiICsgc2htdXAuZGF0YS5zaGlwLmxpdmVzKTtcbiAgICB0aGlzLnN0YXJzVGV4dC5zZXRUZXh0KFwiU1RBUlM6IFwiICsgc2htdXAuZGF0YS5zaGlwLnN0YXJzICsgXCIvXCIgKyBTVEFSU19GT1JfRVhUUkFfTElGRSk7XG4gICAgaWYgKHRoaXMuYm9zcylcbiAgICAgICAgdGhpcy5ib3NzSGVhbHRoLndpZHRoID0gMzk4ICogKHRoaXMuYm9zcy5oZWFsdGggLyB0aGlzLmJvc3MubWF4SGVhbHRoKTtcbn07XG5IdWQucHJvdG90eXBlLnNldEJvc3MgPSBmdW5jdGlvbihib3NzKSB7XG4gICAgdGhpcy5ib3NzID0gYm9zcztcbiAgICB2YXIgYm9zc0V4aXN0cyA9IGJvc3MgfHwgMDtcbiAgICB0aGlzLmJvc3NUZXh0LmV4aXN0cyA9IGJvc3NFeGlzdHM7XG4gICAgdGhpcy5ib3NzSGVhbHRoQmFja2dyb3VuZC5leGlzdHMgPSBib3NzRXhpc3RzO1xuICAgIHRoaXMuYm9zc0hlYWx0aC5leGlzdHMgPSBib3NzRXhpc3RzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIdWQ7IiwiLyogZ2xvYmFsIFBoYXNlciwgc2htdXAsIGdhbWUgKi9cbnZhciBQaWNrdXAgPSBmdW5jdGlvbih4LCB5LCBwaWNrdXBUeXBlKSB7XG4gICAgaWYgKCFwaWNrdXBUeXBlKSB7XG4gICAgICAgIGlmIChnYW1lLnJuZC5mcmFjKCkgPCAwLjgpIHBpY2t1cFR5cGUgPSAnc3Rhcic7XG4gICAgICAgIGVsc2UgcGlja3VwVHlwZSA9IGdhbWUucm5kLnBpY2soWydwb3dlcnVwX3JlZCcsICdwb3dlcnVwX2dyZWVuJywgJ3Bvd2VydXBfYmx1ZSddKTtcbiAgICB9XG4gICAgdmFyIGRpc3BsYXlDaGFyYWN0ZXJNYXAgPSB7XG4gICAgICAgICdzdGFyJzogJyonLFxuICAgICAgICAncG93ZXJ1cF9yZWQnOiAnRycsXG4gICAgICAgICdwb3dlcnVwX2dyZWVuJzogJ1MnLFxuICAgICAgICAncG93ZXJ1cF9ibHVlJzogJ00nXG4gICAgfTtcbiAgICBQaGFzZXIuQml0bWFwVGV4dC5jYWxsKHRoaXMsIGdhbWUsIHgsIHksICdmb250JywgZGlzcGxheUNoYXJhY3Rlck1hcFtwaWNrdXBUeXBlXSk7XG4gICAgdGhpcy5waWNrdXBUeXBlID0gcGlja3VwVHlwZTtcbiAgICB0aGlzLmNoZWNrV29ybGRCb3VuZHMgPSB0cnVlO1xuICAgIHRoaXMub3V0T2ZCb3VuZHNLaWxsID0gdHJ1ZTtcbiAgICB0aGlzLmFuY2hvci5zZXQoMC41KTtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZSh0aGlzKTtcbiAgICB0aGlzLmJvZHkuYWNjZWxlcmF0aW9uLnkgPSA1MDtcbiAgICBzd2l0Y2ggKHBpY2t1cFR5cGUpIHtcbiAgICAgICAgY2FzZSAncG93ZXJ1cF9yZWQnOlxuICAgICAgICAgICAgdGhpcy5wb3dlcnVwVHlwZSA9IDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncG93ZXJ1cF9ncmVlbic6XG4gICAgICAgICAgICB0aGlzLnBvd2VydXBUeXBlID0gMDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwb3dlcnVwX2JsdWUnOlxuICAgICAgICAgICAgdGhpcy5wb3dlcnVwVHlwZSA9IDI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc3Rhcic6XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59O1xuUGlja3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLkJpdG1hcFRleHQucHJvdG90eXBlKTtcblBpY2t1cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQaWNrdXA7XG5QaWNrdXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGlmICh0aGlzLnBpY2t1cFR5cGUgPT0gJ3N0YXInKSB0aGlzLmFuZ2xlICs9IDkwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcblBpY2t1cC5wcm90b3R5cGUucGlja2VkVXAgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5waWNrdXBUeXBlICE9ICdzdGFyJykge1xuICAgICAgICBzaG11cC5wbGF5ZXIuYm9vc3RXZWFwb24odGhpcy5wb3dlcnVwVHlwZSk7XG4gICAgICAgIC8vIGdhbWUuc291bmQucGxheSgncGlja3VwX3N0YXInLCAwLjUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLnNjb3JlICs9IDIwMDA7XG4gICAgICAgIHNobXVwLmRhdGEuc2hpcC5zdGFycysrO1xuICAgICAgICAvLyBnYW1lLnNvdW5kLnBsYXkoJ3BpY2t1cF9wb3dlcnVwJywgMC41KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBpY2t1cDsiLCIvKiBnbG9iYWwgUGhhc2VyLCBnYW1lLCBzaG11cCAqL1xudmFyIFBsYXllciA9IGZ1bmN0aW9uKCkge1xuICAgIFBoYXNlci5TcHJpdGUuY2FsbCh0aGlzLCBnYW1lLCA0MDAsIDUwMCwgJ3NoaXAnKTtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZSh0aGlzKTtcbiAgICB0aGlzLmFuY2hvci5zZXQoMC41KTtcbiAgICB0aGlzLnNjYWxlLnNldCgwLjUpO1xuICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICB0aGlzLmJvZHkuc2V0U2l6ZSh0aGlzLmJvZHkud2lkdGggKiAuNCwgdGhpcy5ib2R5LmhlaWdodCAqIC40LCAwLCA1KTtcbiAgICB0aGlzLmJvZHkuY29sbGlkZVdvcmxkQm91bmRzID0gdHJ1ZTtcbiAgICB0aGlzLmFscGhhID0gMDtcblxuICAgIHRoaXMud2VhcG9ucyA9IFtzaG90Z3VuLCBnYXRsaW5nLCBtaXNzaWxlXTtcbiAgICBzaG11cC5kYXRhLnNoaXAuY3VycmVudFdlYXBvbiA9IDA7XG4gICAgdGhpcy53ZWFwb25VcGRhdGUgPSB0aGlzLndlYXBvbnNbc2htdXAuZGF0YS5zaGlwLmN1cnJlbnRXZWFwb25dLmJpbmQodGhpcyk7XG4gICAgdGhpcy5jaGFyZ2VUaW1lID0gMDtcbiAgICB0aGlzLmxhc3RGcmFtZUNoYXJnaW5nID0gZmFsc2U7XG59O1xuUGxheWVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLlNwcml0ZS5wcm90b3R5cGUpO1xuUGxheWVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBsYXllcjtcblBsYXllci5wcm90b3R5cGUuRkFTVF9TUEVFRCA9IDM1MDtcblBsYXllci5wcm90b3R5cGUuU0xPV19TUEVFRCA9IDE1MDtcblBsYXllci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmFsaXZlKSByZXR1cm47XG4gICAgdGhpcy5zaG90VGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHRoaXMud2VhcG9uVXBkYXRlKHRoaXMuYWx0ZXJuYXRlRmlyZSk7XG59O1xuUGxheWVyLnByb3RvdHlwZS5jeWNsZVdlYXBvbiA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICgrK3NobXVwLmRhdGEuc2hpcC5jdXJyZW50V2VhcG9uID4gMikgc2htdXAuZGF0YS5zaGlwLmN1cnJlbnRXZWFwb24gPSAwO1xuICAgIHRoaXMud2VhcG9uVXBkYXRlID0gdGhpcy53ZWFwb25zW3NobXVwLmRhdGEuc2hpcC5jdXJyZW50V2VhcG9uXS5iaW5kKHRoaXMpO1xufTtcblBsYXllci5wcm90b3R5cGUuYm9vc3RXZWFwb24gPSBmdW5jdGlvbih3ZWFwb25OdW1iZXIpIHtcbiAgICBpZiAoc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1t3ZWFwb25OdW1iZXJdIDwgNCkgc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1t3ZWFwb25OdW1iZXJdKys7XG59O1xuUGxheWVyLnByb3RvdHlwZS5oaXQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pbnZ1bG5lcmFibGUpIHJldHVybjtcbiAgICAvLyBzaG11cC5lbWl0dGVyLmJ1cnN0KHRoaXMueCwgdGhpcy55KTtcbiAgICAvLyBnYW1lLnNvdW5kLnBsYXkoJ2Jvc3NfZXhwbG9kZScsIDAuMyk7XG4gICAgdGhpcy5raWxsKCk7XG4gICAgc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1tzaG11cC5kYXRhLnNoaXAuY3VycmVudFdlYXBvbl0gPSAxO1xuICAgIHRoaXMuaW52dWxuZXJhYmxlID0gdHJ1ZTtcbiAgICBpZiAoc2htdXAuZGF0YS5zaGlwLmxpdmVzID4gMClcbiAgICAgICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoMjAwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzaG11cC5lbmVteUJ1bGxldHMuY2FsbEFsbCgna2lsbCcpO1xuICAgICAgICAgICAgc2htdXAuZGF0YS5zaGlwLmxpdmVzLS07XG4gICAgICAgICAgICB0aGlzLnggPSA0MDA7XG4gICAgICAgICAgICB0aGlzLnkgPSA1MDA7XG4gICAgICAgICAgICAvLyB0aGlzLmFscGhhID0gMC41O1xuICAgICAgICAgICAgdGhpcy5yZXZpdmUoKTtcbiAgICAgICAgICAgIGdhbWUudGltZS5ldmVudHMuYWRkKDMwMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMuYWxwaGEgPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMuaW52dWxuZXJhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgZWxzZSBnYW1lLnRpbWUuZXZlbnRzLmFkZCgyMDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgnZ2FtZW92ZXInKTtcbiAgICB9KTtcbn07XG5cbi8vIFNwcmVhZCB3ZWFwb24uIEFsdGVybmF0ZSBmaXJlIG5hcnJvd3Mgc3ByZWFkLlxuLy8gUG93ZXJ1cCBpbmNyZWFzZXMgbnVtYmVyIG9mIHNob3RzIGluIGJsYXN0XG52YXIgc2hvdGd1biA9IGZ1bmN0aW9uKGFsdGVybmF0ZSkge1xuICAgIHZhciBmaXJlU3BlZWQgPSAuMTg7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyIDwgZmlyZVNwZWVkKSByZXR1cm47XG4gICAgdGhpcy5zaG90VGltZXIgLT0gZmlyZVNwZWVkO1xuICAgIHZhciBzaG90LCBpO1xuICAgIHZhciBzcHJlYWQgPSBhbHRlcm5hdGUgPyAzMCA6IDkwO1xuICAgIHZhciBudW1TaG90cyA9IDMgKyBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzWzBdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtU2hvdHM7IGkrKykge1xuICAgICAgICBzaG90ID0gc2htdXAucGxheWVyQnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgIHNob3QuYm9keS52ZWxvY2l0eS54ID0gc3ByZWFkICogaTtcbiAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS52ZWxvY2l0eUZyb21BbmdsZSgtOTAgKyAoKC1zcHJlYWQgLyAyKSArIChzcHJlYWQgLyBudW1TaG90cykgKiBpICsgc3ByZWFkIC8gbnVtU2hvdHMgLyAyKSxcbiAgICAgICAgICAgIDQwMCwgc2hvdC5ib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgc2hvdC5yZXZpdmUoKTtcbiAgICAgICAgc2hvdC5mcmFtZSA9IDE7XG4gICAgICAgIHNob3QucG93ZXIgPSAxMDtcbiAgICAgICAgc2hvdC51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucm90YXRpb24gPSBQaGFzZXIuTWF0aC5hbmdsZUJldHdlZW5Qb2ludHModGhpcy5wcmV2aW91c1Bvc2l0aW9uLCB0aGlzKSAtIChNYXRoLlBJIC8gMik7XG4gICAgICAgIH07XG4gICAgfVxufTtcblxuLy8gRmFzdCBmcm9udGFsIHdlYXBvbi4gQWx0ZXJuYXRlIGZpcmUgY2hhcmdlcyBhIGJpZyBzaG90LlxuLy8gUG93ZXJ1cCBkZWNyZWFzZXMgdGltZSBiZXR3ZWVuIHNob3RzXG52YXIgZ2F0bGluZyA9IGZ1bmN0aW9uKGFsdGVybmF0ZSkge1xuICAgIHZhciBzaG90O1xuICAgIGlmICghYWx0ZXJuYXRlICYmIHRoaXMubGFzdEZyYW1lQ2hhcmdpbmcpIHtcbiAgICAgICAgdGhpcy5sYXN0RnJhbWVDaGFyZ2luZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5jaGFyZ2VUaW1lID4gMS41KSB0aGlzLmNoYXJnZVRpbWUgPSAxLjU7XG4gICAgICAgIHNob3QgPSBzaG11cC5wbGF5ZXJCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnggPSB0aGlzLng7XG4gICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnZlbG9jaXR5LnkgPSAtODAwO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBzaG90LnJvdGF0aW9uID0gMDtcbiAgICAgICAgc2hvdC51cGRhdGUgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgICBzaG90LmZyYW1lID0gMjtcbiAgICAgICAgc2hvdC5wb3dlciA9IHRoaXMuY2hhcmdlVGltZSAqIDE1MCArIChzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzWzFdICogNTApO1xuICAgICAgICBzaG90LmhlaWdodCA9IDk2ICogdGhpcy5jaGFyZ2VUaW1lO1xuICAgICAgICBzaG90LndpZHRoID0gNDggKiB0aGlzLmNoYXJnZVRpbWU7XG4gICAgICAgIHRoaXMuY2hhcmdlVGltZSA9IDA7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGFsdGVybmF0ZSkge1xuICAgICAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgICAgIHRoaXMuY2hhcmdlVGltZSArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgICAgIHRoaXMubGFzdEZyYW1lQ2hhcmdpbmcgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMubGFzdEZyYW1lQ2hhcmdpbmcgPSBmYWxzZTtcbiAgICB2YXIgZmlyZVNwZWVkID0gLjEgLSBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzWzFdIC8gMTAwICogMjtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPCBmaXJlU3BlZWQpIHJldHVybjtcbiAgICB0aGlzLnNob3RUaW1lciAtPSBmaXJlU3BlZWQ7XG4gICAgc2hvdCA9IHNobXVwLnBsYXllckJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgc2hvdC54ID0gdGhpcy54ICsgKGdhbWUucm5kLmJldHdlZW4oLTIwLCAyMCkpO1xuICAgIHNob3QueSA9IHRoaXMueTtcbiAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgIHNob3QuYm9keS52ZWxvY2l0eS55ID0gLTgwMDtcbiAgICBzaG90LnJldml2ZSgpO1xuICAgIHNob3Qucm90YXRpb24gPSAwO1xuICAgIHNob3QudXBkYXRlID0gZnVuY3Rpb24oKSB7fTtcbiAgICBzaG90LmZyYW1lID0gMjtcbiAgICBzaG90LnBvd2VyID0gMTI7XG59O1xuXG4vLyBTZWVraW5nIHdlYXBvbi4gQWx0ZXJuYXRlIGZpcmUgaW5jcmVhc2VzIHNwZWVkIGJ1dCBkZWFjdGl2YXRlcyBzZWVraW5nXG4vLyBQb3dlcnVwIGluY3JlYXNlcyBwYXlsb2FkXG52YXIgbWlzc2lsZSA9IGZ1bmN0aW9uKGFsdGVybmF0ZSkge1xuICAgIHZhciBmaXJlU3BlZWQgPSBhbHRlcm5hdGUgPyAuMSA6IC4yO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA8IGZpcmVTcGVlZCkgcmV0dXJuO1xuICAgIHRoaXMuc2hvdFRpbWVyIC09IGZpcmVTcGVlZDtcbiAgICB2YXIgc2hvdCA9IHNobXVwLnBsYXllckJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgc2hvdC54ID0gdGhpcy54O1xuICAgIHNob3QueSA9IHRoaXMueTtcbiAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgIHNob3QucmV2aXZlKCk7XG4gICAgc2hvdC5yb3RhdGlvbiA9IDA7XG4gICAgc2hvdC5mcmFtZSA9IDA7XG4gICAgc2hvdC5wb3dlciA9IHNobXVwLmRhdGEuc2hpcC53ZWFwb25MZXZlbHNbMl0gKiAxNjtcbiAgICBzaG90LnNjYWxlLnNldCgwLjM1ICogc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1syXSk7XG4gICAgc2hvdC51cGRhdGUgPSBmdW5jdGlvbigpIHt9O1xuICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgc2hvdC5hbmdsZSA9IGdhbWUucm5kLmJldHdlZW4oLTE1LCAxNSk7XG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUudmVsb2NpdHlGcm9tQW5nbGUoLTkwICsgc2hvdC5hbmdsZSwgMzAwLCBzaG90LmJvZHkudmVsb2NpdHkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2hvdC5hbmdsZSA9IGdhbWUucm5kLmJldHdlZW4oLTMwLCAzMCk7XG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUudmVsb2NpdHlGcm9tQW5nbGUoLTkwICsgc2hvdC5hbmdsZSwgMzAwLCBzaG90LmJvZHkudmVsb2NpdHkpO1xuICAgICAgICBzaG90LnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHR1cm5SYXRlID0gTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICB2YXIgY2xvc2VzdERpc3RhbmNlID0gMTAwMDA7XG4gICAgICAgICAgICB2YXIgY2xvc2VzdEVuZW15ID0gbnVsbDtcbiAgICAgICAgICAgIHNobXVwLmVuZW1pZXMuZm9yRWFjaEFsaXZlKGZ1bmN0aW9uKGVuZW15KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlZWtEaXN0YW5jZSA9IDMwMDtcbiAgICAgICAgICAgICAgICB2YXIgZGlzdCA9IGdhbWUucGh5c2ljcy5hcmNhZGUuZGlzdGFuY2VCZXR3ZWVuKGVuZW15LCB0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGlzdCA8IHNlZWtEaXN0YW5jZSAmJiBkaXN0IDwgY2xvc2VzdERpc3RhbmNlKVxuICAgICAgICAgICAgICAgICAgICBjbG9zZXN0RW5lbXkgPSBlbmVteTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgaWYgKGNsb3Nlc3RFbmVteSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXRSb3RhdGlvbiA9IC1NYXRoLlBJIC8gMiArIGdhbWUucGh5c2ljcy5hcmNhZGUuYW5nbGVCZXR3ZWVuKGNsb3Nlc3RFbmVteSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucm90YXRpb24gIT09IHRhcmdldFJvdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWx0YSA9IHRhcmdldFJvdGF0aW9uIC0gdGhpcy5yb3RhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhID4gMCkgdGhpcy5yb3RhdGlvbiArPSB0dXJuUmF0ZSAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB0aGlzLnJvdGF0aW9uIC09IHR1cm5SYXRlICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGEpIDwgdHVyblJhdGUgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQpIHRoaXMucm90YXRpb24gPSB0YXJnZXRSb3RhdGlvbjtcbiAgICAgICAgICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLnZlbG9jaXR5RnJvbVJvdGF0aW9uKC1NYXRoLlBJIC8gMiArIHRoaXMucm90YXRpb24sIDMwMCwgdGhpcy5ib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllcjsiLCIvKiBnbG9iYWwgZ2FtZSwgUGhhc2VyLCBzaG11cCAqL1xuXG52YXIgV2VhcG9uRGlzcGxheSA9IGZ1bmN0aW9uKCkge1xuICAgIFBoYXNlci5Hcm91cC5jYWxsKHRoaXMsIGdhbWUpO1xuICAgIHRoaXMueCA9IDEwO1xuICAgIHRoaXMueSA9IDQ5MDtcbiAgICB2YXIgYmFja2dyb3VuZCA9IGdhbWUubWFrZS5pbWFnZSgwLCAwLCAncGl4Jyk7XG4gICAgYmFja2dyb3VuZC5hbHBoYSA9IDAuNTtcbiAgICBiYWNrZ3JvdW5kLndpZHRoID0gMTAwO1xuICAgIGJhY2tncm91bmQuaGVpZ2h0ID0gMTAwO1xuICAgIHRoaXMuYWRkKGJhY2tncm91bmQpO1xuICAgIC8vIGljb24gYmFja2dyb3VuZHNcbiAgICB0aGlzLnJlZEJhY2tncm91bmQgPSBnYW1lLm1ha2UuaW1hZ2UoMzksIDY5LCAncGl4Jyk7XG4gICAgdGhpcy5yZWRCYWNrZ3JvdW5kLndpZHRoID0gdGhpcy5yZWRCYWNrZ3JvdW5kLmhlaWdodCA9IDIyO1xuICAgIHRoaXMucmVkQmFja2dyb3VuZC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmFkZCh0aGlzLnJlZEJhY2tncm91bmQpO1xuICAgIHRoaXMuZ3JlZW5CYWNrZ3JvdW5kID0gZ2FtZS5tYWtlLmltYWdlKDksIDY5LCAncGl4Jyk7XG4gICAgdGhpcy5ncmVlbkJhY2tncm91bmQud2lkdGggPSB0aGlzLmdyZWVuQmFja2dyb3VuZC5oZWlnaHQgPSAyMjtcbiAgICB0aGlzLmdyZWVuQmFja2dyb3VuZC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmFkZCh0aGlzLmdyZWVuQmFja2dyb3VuZCk7XG4gICAgdGhpcy5ibHVlQmFja2dyb3VuZCA9IGdhbWUubWFrZS5pbWFnZSg2OSwgNjksICdwaXgnKTtcbiAgICB0aGlzLmJsdWVCYWNrZ3JvdW5kLndpZHRoID0gdGhpcy5ibHVlQmFja2dyb3VuZC5oZWlnaHQgPSAyMjtcbiAgICB0aGlzLmJsdWVCYWNrZ3JvdW5kLmV4aXN0cyA9IGZhbHNlO1xuICAgIHRoaXMuYWRkKHRoaXMuYmx1ZUJhY2tncm91bmQpO1xuICAgIC8vIGljb25zXG4gICAgdGhpcy5yZWRJY29uID0gZ2FtZS5tYWtlLmJpdG1hcFRleHQoNDAsIDcwLCAnZm9udCcsICdHJyk7XG4gICAgdGhpcy5yZWRJY29uLndpZHRoID0gMjA7XG4gICAgdGhpcy5yZWRJY29uLmhlaWdodCA9IDIwO1xuICAgIHRoaXMuYWRkKHRoaXMucmVkSWNvbik7XG4gICAgdGhpcy5ncmVlbkljb24gPSBnYW1lLm1ha2UuYml0bWFwVGV4dCgxMCwgNzAsICdmb250JywgJ1MnKTtcbiAgICB0aGlzLmdyZWVuSWNvbi53aWR0aCA9IDIwO1xuICAgIHRoaXMuZ3JlZW5JY29uLmhlaWdodCA9IDIwO1xuICAgIHRoaXMuYWRkKHRoaXMuZ3JlZW5JY29uKTtcbiAgICB0aGlzLmJsdWVJY29uID0gZ2FtZS5tYWtlLmJpdG1hcFRleHQoNzAsIDcwLCAnZm9udCcsICdNJyk7XG4gICAgdGhpcy5ibHVlSWNvbi53aWR0aCA9IDIwO1xuICAgIHRoaXMuYmx1ZUljb24uaGVpZ2h0ID0gMjA7XG4gICAgdGhpcy5hZGQodGhpcy5ibHVlSWNvbik7XG4gICAgLy8gYmFyc1xuICAgIHRoaXMucmVkQmFycyA9IFtdO1xuICAgIHRoaXMuZ3JlZW5CYXJzID0gW107XG4gICAgdGhpcy5ibHVlQmFycyA9IFtdO1xuICAgIHZhciBpLCBiYXI7XG4gICAgZm9yIChpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBiYXIgPSBnYW1lLm1ha2UuaW1hZ2UoNDAsIDEwICsgKDE1ICogKDMgLSBpKSksICdwaXgnKTtcbiAgICAgICAgYmFyLmhlaWdodCA9IDEwO1xuICAgICAgICBiYXIud2lkdGggPSAyMDtcbiAgICAgICAgYmFyLnRpbnQgPSAweGZmZmZmZjtcbiAgICAgICAgdGhpcy5yZWRCYXJzLnB1c2goYmFyKTtcbiAgICAgICAgdGhpcy5hZGQoYmFyKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBiYXIgPSBnYW1lLm1ha2UuaW1hZ2UoMTAsIDEwICsgKDE1ICogKDMgLSBpKSksICdwaXgnKTtcbiAgICAgICAgYmFyLmhlaWdodCA9IDEwO1xuICAgICAgICBiYXIud2lkdGggPSAyMDtcbiAgICAgICAgYmFyLnRpbnQgPSAweGZmZmZmZjtcbiAgICAgICAgdGhpcy5ncmVlbkJhcnMucHVzaChiYXIpO1xuICAgICAgICB0aGlzLmFkZChiYXIpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGJhciA9IGdhbWUubWFrZS5pbWFnZSg3MCwgMTAgKyAoMTUgKiAoMyAtIGkpKSwgJ3BpeCcpO1xuICAgICAgICBiYXIuaGVpZ2h0ID0gMTA7XG4gICAgICAgIGJhci53aWR0aCA9IDIwO1xuICAgICAgICBiYXIudGludCA9IDB4ZmZmZmZmO1xuICAgICAgICB0aGlzLmJsdWVCYXJzLnB1c2goYmFyKTtcbiAgICAgICAgdGhpcy5hZGQoYmFyKTtcbiAgICB9XG59O1xuV2VhcG9uRGlzcGxheS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBoYXNlci5Hcm91cC5wcm90b3R5cGUpO1xuV2VhcG9uRGlzcGxheS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBXZWFwb25EaXNwbGF5O1xuV2VhcG9uRGlzcGxheS5wcm90b3R5cGUuUkVEID0gMHhmZmZmZmY7XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZS5HUkVFTiA9IDB4ZmZmZmZmO1xuV2VhcG9uRGlzcGxheS5wcm90b3R5cGUuQkxVRSA9IDB4ZmZmZmZmO1xuV2VhcG9uRGlzcGxheS5wcm90b3R5cGUuR1JFWSA9IDB4NDA0MDQwO1xuV2VhcG9uRGlzcGxheS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZWRCYXJzLmZvckVhY2goZnVuY3Rpb24oYmFyKSB7XG4gICAgICAgIGJhci50aW50ID0gdGhpcy5HUkVZO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZ3JlZW5CYXJzLmZvckVhY2goZnVuY3Rpb24oYmFyKSB7XG4gICAgICAgIGJhci50aW50ID0gdGhpcy5HUkVZO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuYmx1ZUJhcnMuZm9yRWFjaChmdW5jdGlvbihiYXIpIHtcbiAgICAgICAgYmFyLnRpbnQgPSB0aGlzLkdSRVk7XG4gICAgfSwgdGhpcyk7XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IHNobXVwLmRhdGEuc2hpcC53ZWFwb25MZXZlbHNbMV07IGkrKykgdGhpcy5yZWRCYXJzW2ldLnRpbnQgPSB0aGlzLlJFRDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1swXTsgaSsrKSB0aGlzLmdyZWVuQmFyc1tpXS50aW50ID0gdGhpcy5HUkVFTjtcbiAgICBmb3IgKGkgPSAwOyBpIDwgc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1syXTsgaSsrKSB0aGlzLmJsdWVCYXJzW2ldLnRpbnQgPSB0aGlzLkJMVUU7XG4gICAgdGhpcy5yZWRCYWNrZ3JvdW5kLmV4aXN0cyA9IGZhbHNlO1xuICAgIHRoaXMucmVkSWNvbi50aW50ID0gMHg0MDQwNDA7XG4gICAgdGhpcy5ncmVlbkJhY2tncm91bmQuZXhpc3RzID0gZmFsc2U7XG4gICAgdGhpcy5ncmVlbkljb24udGludCA9IDB4NDA0MDQwO1xuICAgIHRoaXMuYmx1ZUJhY2tncm91bmQuZXhpc3RzID0gZmFsc2U7XG4gICAgdGhpcy5ibHVlSWNvbi50aW50ID0gMHg0MDQwNDA7XG4gICAgc3dpdGNoIChzaG11cC5kYXRhLnNoaXAuY3VycmVudFdlYXBvbikge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAvLyB0aGlzLmdyZWVuQmFja2dyb3VuZC5leGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5ncmVlbkljb24udGludCA9IDB4ZmZmZmZmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIC8vIHRoaXMucmVkQmFja2dyb3VuZC5leGlzdHMgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5yZWRJY29uLnRpbnQgPSAweGZmZmZmZjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAvLyB0aGlzLmJsdWVCYWNrZ3JvdW5kLmV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmJsdWVJY29uLnRpbnQgPSAweGZmZmZmZjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV2VhcG9uRGlzcGxheTsiLCIvKiBnbG9iYWwgUGhhc2VyLCBnYW1lICovXG5nbG9iYWwuc2htdXAgPSB7fTtcbmdsb2JhbC5nYW1lID0gbmV3IFBoYXNlci5HYW1lKCk7XG5nbG9iYWwucHJpbnQgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuZ2FtZS5zdGF0ZS5hZGQoJ2xvYWQnLCByZXF1aXJlKCcuL3N0YXRlL2xvYWQnKSk7XG5nYW1lLnN0YXRlLmFkZCgndGl0bGUnLCByZXF1aXJlKCcuL3N0YXRlL3RpdGxlJykpO1xuZ2FtZS5zdGF0ZS5hZGQoJ21haW4nLCByZXF1aXJlKCcuL3N0YXRlL21haW4nKSk7XG5nYW1lLnN0YXRlLmFkZCgnbGV2ZWxfc2VsZWN0JywgcmVxdWlyZSgnLi9zdGF0ZS9sZXZlbF9zZWxlY3QnKSk7XG5nYW1lLnN0YXRlLmFkZCgnZ2FtZW92ZXInLCByZXF1aXJlKCcuL3N0YXRlL2dhbWVvdmVyJykpO1xuZ2FtZS5zdGF0ZS5hZGQoJ2NvbXBsZXRlJywgcmVxdWlyZSgnLi9zdGF0ZS9jb21wbGV0ZScpKTtcbmdhbWUuc3RhdGUuYWRkKCd3aW4nLCByZXF1aXJlKCcuL3N0YXRlL3dpbicpKTtcbmdhbWUuc3RhdGUuYWRkKCdjaGFsbGVuZ2UnLCByZXF1aXJlKCcuL3N0YXRlL2NoYWxsZW5nZScpKTtcbmdhbWUuc3RhdGUuc3RhcnQoJ2xvYWQnKTsiLCIvKiBnbG9iYWwgZ2FtZSwgc2htdXAgKi9cbnZhciBzdGF0ZSA9IHt9O1xuXG52YXIgU1RBR0VfTkFNRVMgPSBbJ0lERFFEJywgJ0lES0ZBJywgJ1VVRERMUkxSQkFTUyddO1xudmFyIFNUQUdFX0RJRkZJQ1VMVElFUyA9IFs2LCA2LCA3XTtcblxuc3RhdGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iYWNrZ3JvdW5kID0gZ2FtZS5hZGQudGlsZVNwcml0ZSgwLCAwLCA4MDAsIDYwMCwgJ3N0YXJmaWVsZCcpO1xuICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAxMDAsICdmb250JywgXCJDSEFMTEVOR0UgTU9ERVwiLCA2NCkuYW5jaG9yLnNldCgwLjUpO1xuICAgIHZhciBkZXNjcmlwdGlvbiA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAyMDAsICdmb250JywgXCJUcnkgZm9yIGEgaGlnaCBzY29yZSBvblxcbnRoZXNlIHZlcnkgZGlmZmljdWx0IHN0YWdlcy5cIik7XG4gICAgZGVzY3JpcHRpb24uYW5jaG9yLnNldCgwLjUpO1xuICAgIGRlc2NyaXB0aW9uLmFsaWduID0gJ2NlbnRlcic7XG5cbiAgICB2YXIgYmFja0J1dHRvbiA9IGdhbWUuYWRkLmltYWdlKDQwMCwgNTUwLCAnbWV0YWxQYW5lbCcpO1xuICAgIGJhY2tCdXR0b24uaGVpZ2h0ID0gNTA7XG4gICAgYmFja0J1dHRvbi53aWR0aCA9IDEwMDtcbiAgICBiYWNrQnV0dG9uLmFuY2hvci5zZXQoMC41KTtcbiAgICBiYWNrQnV0dG9uLmlucHV0RW5hYmxlZCA9IHRydWU7XG4gICAgYmFja0J1dHRvbi5ldmVudHMub25JbnB1dFVwLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgndGl0bGUnKTtcbiAgICB9KTtcbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgNTUwLCAnZm9udCcsICdCQUNLJywgMjQpLmFuY2hvci5zZXQoMC41KTtcblxuICAgIHZhciBpO1xuICAgIHZhciBsZWZ0Q29sdW1uID0gMjUwO1xuICAgIHZhciByaWdodENvbHVtbiA9IDUzMDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciB5TG9jYXRpb24gPSAzMDAgKyA3MCAqIGk7XG4gICAgICAgIHZhciBidXR0b24gPSBnYW1lLmFkZC5pbWFnZShsZWZ0Q29sdW1uLCB5TG9jYXRpb24sICdtZXRhbFBhbmVsJyk7XG4gICAgICAgIGJ1dHRvbi5oZWlnaHQgPSA1MDtcbiAgICAgICAgYnV0dG9uLndpZHRoID0gMzAwO1xuICAgICAgICBidXR0b24udGludCA9IDB4YWMzOTM5O1xuICAgICAgICBidXR0b24uYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBidXR0b24uaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgYnV0dG9uLmV2ZW50cy5vbklucHV0VXAuYWRkKGZ1bmN0aW9uKHNvdXJjZSwgcG9pbnRlciwgc29tZUJvb2xlYW4sIGluZGV4KSB7XG4gICAgICAgICAgICBzaG11cC5kYXRhLmdhbWUuY2hhbGxlbmdlID0gdHJ1ZTtcbiAgICAgICAgICAgIHNobXVwLmRhdGEuc3RhZ2UgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogU1RBR0VfTkFNRVNbaW5kZXhdLFxuICAgICAgICAgICAgICAgIGRpZmZpY3VsdHk6IFNUQUdFX0RJRkZJQ1VMVElFU1tpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzaG11cC5kYXRhLnNoaXAuZW5lbWllc0tpbGxlZCA9IDA7XG4gICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCdtYWluJyk7XG4gICAgICAgIH0sIHRoaXMsIDAsIGkpO1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KGxlZnRDb2x1bW4sIHlMb2NhdGlvbiwgJ2ZvbnQnLCBTVEFHRV9OQU1FU1tpXSwgMjQpLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dChyaWdodENvbHVtbiwgeUxvY2F0aW9uLCAnZm9udCcsIFwiRGlmZmljdWx0eTogXCIgKyBTVEFHRV9ESUZGSUNVTFRJRVNbaV0sIDI0KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgfVxufTtcblxuc3RhdGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iYWNrZ3JvdW5kLnRpbGVQb3NpdGlvbi55ICs9IDEwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTsiLCIvKiBnbG9iYWwgZ2FtZSwgc2htdXAgKi9cbnZhciBzdGF0ZSA9IHt9O1xuXG5zdGF0ZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQgPSBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIDgwMCwgNjAwLCAnc3RhcmZpZWxkJyk7XG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDE1MCwgJ2ZvbnQnLCBcIlJFU1VMVFNcIiwgNDgpLmFuY2hvci5zZXQoMC41KTtcbiAgICB2YXIga2lsbGVkID0gc2htdXAuZGF0YS5zaGlwLmVuZW1pZXNLaWxsZWQ7XG4gICAgdmFyIHRvdGFsID0gc2htdXAuZGF0YS5zdGFnZS50b3RhbEVuZW1pZXM7XG4gICAgdmFyIHVmb0tpbGxlZCA9IHNobXVwLmRhdGEuc2hpcC51Zm9zS2lsbGVkO1xuICAgIHZhciB1Zm9Ub3RhbCA9IHNobXVwLmRhdGEuc3RhZ2UudG90YWxVZm9zO1xuICAgIHZhciBzdGFnZU51bWJlciA9IHNobXVwLmRhdGEuZ2FtZS5jaGFsbGVuZ2UgPyBcIkNIQUxMRU5HRSBNT0RFXCIgOiBcIlNUQUdFIFwiICsgc2htdXAuZGF0YS5nYW1lLmhpc3RvcnkubGVuZ3RoO1xuICAgIHZhciB0b0Rpc3BsYXkgPSBbXG4gICAgICAgIHN0YWdlTnVtYmVyLFxuICAgICAgICAnXCInICsgc2htdXAuZGF0YS5zdGFnZS5uYW1lICsgJ1wiJyxcbiAgICAgICAgJ0RpZmZpY3VsdHk6ICcgKyBzaG11cC5kYXRhLnN0YWdlLmRpZmZpY3VsdHksXG4gICAgICAgICdFbmVtaWVzIGRlc3Ryb3llZDogJyArIGtpbGxlZCArICcvJyArIHRvdGFsICsgJyAoJyArIE1hdGguZmxvb3Ioa2lsbGVkIC8gdG90YWwgKiAxMDApICsgXCIlKVwiLFxuICAgICAgICAnVUZPcyBkZXN0cm95ZWQ6ICcgKyB1Zm9LaWxsZWQgKyAnLycgKyB1Zm9Ub3RhbCArICcgKCcgKyBNYXRoLmZsb29yKHVmb0tpbGxlZCAvIHVmb1RvdGFsICogMTAwKSArIFwiJSlcIixcbiAgICAgICAgJ1RvdGFsIFNjb3JlOiAnICsgc2htdXAuZGF0YS5zaGlwLnNjb3JlXG4gICAgXTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAxOyBpIDw9IHRvRGlzcGxheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCg1MDAgKiBpLCBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDE4MCArIGluZGV4ICogNDAsICdmb250JywgdG9EaXNwbGF5W2luZGV4IC0gMV0sIDI0KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIH0sIHRoaXMsIGkpO1xuICAgIH1cbiAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgodG9EaXNwbGF5Lmxlbmd0aCArIDIpICogNTAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDU1MCwgJ2ZvbnQnLCBcIihjbGljayB0byBjb250aW51ZSlcIiwgMTYpLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgZ2FtZS5pbnB1dC5vblVwLmFkZE9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoc2htdXAuZGF0YS5nYW1lLmNoYWxsZW5nZSkgZ2FtZS5zdGF0ZS5zdGFydCgndGl0bGUnKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHNobXVwLmRhdGEuZ2FtZS5oaXN0b3J5Lmxlbmd0aCA8IDUpXG4gICAgICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgnbGV2ZWxfc2VsZWN0Jyk7XG4gICAgICAgICAgICBlbHNlIGdhbWUuc3RhdGUuc3RhcnQoJ3dpbicpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnN0YXRlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmFja2dyb3VuZC50aWxlUG9zaXRpb24ueSArPSAxMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7IiwiLyogZ2xvYmFsIGdhbWUsIHNobXVwICovXG5cbnZhciBzdGF0ZSA9IHt9O1xuXG5zdGF0ZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQgPSBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIDgwMCwgNjAwLCAnc3RhcmZpZWxkJyk7XG4gICAgaWYgKHNobXVwLmRhdGEuZ2FtZS5jaGFsbGVuZ2UpIHtcbiAgICAgICAgdmFyIGdhbWVvdmVyVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAzMDAsICdmb250JywgJ0dBTUUgT1ZFUicsIDY0KTtcbiAgICAgICAgZ2FtZW92ZXJUZXh0LmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoMzAwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgY29udGludWVUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDI1MCwgJ2ZvbnQnLCBcIkNPTlRJTlVFP1wiLCA0OCk7XG4gICAgY29udGludWVUZXh0LmFuY2hvci5zZXQoMC41KTtcbiAgICB0aGlzLnRpbWVUb0NvbnRpbnVlID0gOS45OTtcbiAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgxMDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50aW1lclRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMzAwLCAnZm9udCcsIFwiXCIsIDQ4KTtcbiAgICAgICAgdGhpcy50aW1lclRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBnYW1lLmFkZC50d2Vlbih0aGlzKS50byh7XG4gICAgICAgICAgICB0aW1lVG9Db250aW51ZTogMFxuICAgICAgICB9LCAxMDAwMCwgbnVsbCwgdHJ1ZSkub25Db21wbGV0ZS5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyVGV4dC5leGlzdHMgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnRpbnVlVGV4dC5leGlzdHMgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBnYW1lb3ZlclRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMzAwLCAnZm9udCcsICdHQU1FIE9WRVInLCA2NCk7XG4gICAgICAgICAgICBnYW1lb3ZlclRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICAgICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoMzAwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgndGl0bGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgZ2FtZS5pbnB1dC5vblVwLmFkZE9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzaG11cC5kYXRhLnNoaXAgPSB7XG4gICAgICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICAgICAgd2VhcG9uTGV2ZWxzOiBbMSwgMSwgMV0sXG4gICAgICAgICAgICAgICAgY3VycmVudFdlYXBvbjogMCxcbiAgICAgICAgICAgICAgICBzdGFyczogMCxcbiAgICAgICAgICAgICAgICBsaXZlczogMixcbiAgICAgICAgICAgICAgICBlbmVtaWVzS2lsbGVkOiAwLFxuICAgICAgICAgICAgICAgIHVmb3NLaWxsZWQ6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCdtYWluJyk7XG4gICAgICAgIH0pO1xuICAgIH0sIHRoaXMpO1xufTtcblxuc3RhdGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iYWNrZ3JvdW5kLnRpbGVQb3NpdGlvbi55ICs9IDEwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnRpbWVyVGV4dClcbiAgICAgICAgdGhpcy50aW1lclRleHQuc2V0VGV4dChNYXRoLmZsb29yKHRoaXMudGltZVRvQ29udGludWUpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7IiwiLyogZ2xvYmFsIFBoYXNlciwgZ2FtZSwgc2htdXAgKi9cbnZhciBXZWFwb25EaXNwbGF5ID0gcmVxdWlyZSgnLi4vZW50aXR5L3dlYXBvbl9kaXNwbGF5Jyk7XG5cbnZhciBzdGF0ZSA9IHt9O1xuXG52YXIgQkxVRSA9IDB4MzZiYmY1O1xudmFyIEdSRUVOID0gMHg3MWM5Mzc7XG52YXIgWUVMTE9XID0gMHgzNmJiZjU7XG52YXIgT1JBTkdFID0gMHgzNmJiZjU7XG52YXIgUkVEID0gMHhhYzM5Mzk7XG52YXIgREFSS19SRUQgPSAweDM2YmJmNTtcbnZhciBHUkVZID0gMHg0MDQwNDA7XG52YXIgRElGRklDVUxUWV9DT0xPUlMgPSBbQkxVRSwgQkxVRSwgQkxVRSwgQkxVRSwgQkxVRV07XG52YXIgTVVTSUNfVk9MVU1FID0gMC4xO1xuXG52YXIgU3RhZ2UgPSBmdW5jdGlvbihuYW1lLCB4KSB7XG4gICAgUGhhc2VyLlNwcml0ZS5jYWxsKHRoaXMsIGdhbWUsIHgsIDAsICdkb3RXaGl0ZScpO1xuICAgIHRoaXMuc3RhZ2VOYW1lID0gbmFtZTtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy53aWR0aCA9IDMwO1xuICAgIHRoaXMuYW5jaG9yLnNldCgwLjUpO1xufTtcblN0YWdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLlNwcml0ZS5wcm90b3R5cGUpO1xuU3RhZ2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RhZ2U7XG5cbnN0YXRlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChzaG11cC5tdXNpYykgc2htdXAubXVzaWMuc3RvcCgpO1xuICAgIHNobXVwLm11c2ljID0gZ2FtZS5zb3VuZC5wbGF5KCdkaWdpdGFsX2Zyb250aWVyJywgTVVTSUNfVk9MVU1FLCB0cnVlKTtcbiAgICB0aGlzLmJhY2tncm91bmQgPSBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIDgwMCwgNjAwLCAnc3RhcmZpZWxkJyk7XG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDYwLCAnZm9udCcsIFwiU1RBR0UgU0VMRUNUXCIsIDQ4KS5hbmNob3Iuc2V0KDAuNSk7XG5cbiAgICB0aGlzLnN0YWdlVGllcnMgPSBbXTtcbiAgICAvLyB0aWVyIDFcbiAgICB2YXIgdGllcjEgPSBbXTtcbiAgICB0aWVyMS5wdXNoKG5ldyBTdGFnZShcIkl0IElzIEEgR29vZCBEYXkgVG8gRGllXCIsIDQwMCkpO1xuICAgIHRoaXMuc3RhZ2VUaWVycy5wdXNoKHRpZXIxKTtcbiAgICAvLyB0aWVyIDJcbiAgICB2YXIgdGllcjIgPSBbXTtcbiAgICB0aWVyMi5wdXNoKG5ldyBTdGFnZShcIkdsaXR0ZXJpbmcgUHJpemVzXCIsIDMyNSkpO1xuICAgIHRpZXIyLnB1c2gobmV3IFN0YWdlKFwiT25zY3JlZW5cIiwgNDc1KSk7XG4gICAgdGhpcy5zdGFnZVRpZXJzLnB1c2godGllcjIpO1xuICAgIC8vIHRpZXIgM1xuICAgIHZhciB0aWVyMyA9IFtdO1xuICAgIHRpZXIzLnB1c2gobmV3IFN0YWdlKFwiTWFrZSBJdCBTb1wiLCAyNTApKTtcbiAgICB0aWVyMy5wdXNoKG5ldyBTdGFnZShcIkRlY2sgTWUgT3V0XCIsIDQwMCkpO1xuICAgIHRpZXIzLnB1c2gobmV3IFN0YWdlKFwiQmxhY2sgU2hlZXAgV2FsbFwiLCA1NTApKTtcbiAgICB0aGlzLnN0YWdlVGllcnMucHVzaCh0aWVyMyk7XG4gICAgLy8gdGllciA0XG4gICAgdmFyIHRpZXI0ID0gW107XG4gICAgdGllcjQucHVzaChuZXcgU3RhZ2UoXCJTb21ldGhpbmcgRm9yIE5vdGhpbmdcIiwgMTc1KSk7XG4gICAgdGllcjQucHVzaChuZXcgU3RhZ2UoXCJPcGhlbGlhXCIsIDMyNSkpO1xuICAgIHRpZXI0LnB1c2gobmV3IFN0YWdlKFwiVW5pdGUgVGhlIENsYW5zXCIsIDQ3NSkpO1xuICAgIHRpZXI0LnB1c2gobmV3IFN0YWdlKFwiUG93ZXIgT3ZlcndoZWxtaW5nXCIsIDYyNSkpO1xuICAgIHRoaXMuc3RhZ2VUaWVycy5wdXNoKHRpZXI0KTtcbiAgICAvLyB0aWVyIDVcbiAgICB2YXIgdGllcjUgPSBbXTtcbiAgICB0aWVyNS5wdXNoKG5ldyBTdGFnZShcIlRoZXJlIENhbiBPbmx5IEJlIE9uZVwiLCAxMDApKTtcbiAgICB0aWVyNS5wdXNoKG5ldyBTdGFnZShcIlRoZXJlIElzIE5vIENvdyBMZXZlbFwiLCAyNTApKTtcbiAgICB0aWVyNS5wdXNoKG5ldyBTdGFnZShcIkV2ZXJ5IExpdHRsZSBUaGluZyBTaGUgRG9lc1wiLCA0MDApKTtcbiAgICB0aWVyNS5wdXNoKG5ldyBTdGFnZShcIk1vZGlmeSBUaGUgUGhhc2UgVmFyaWFuY2VcIiwgNTUwKSk7XG4gICAgdGllcjUucHVzaChuZXcgU3RhZ2UoXCJNZWRpZXZhbCBNYW5cIiwgNzAwKSk7XG4gICAgdGhpcy5zdGFnZVRpZXJzLnB1c2godGllcjUpO1xuICAgIC8vIHByb2dyYW1tYXRpY2FsbHkgc2V0IHRyYWl0c1xuICAgIHZhciBpLCBqO1xuICAgIGZvciAoaSA9IDA7IGkgPCA1OyBpKyspIHtcbiAgICAgICAgdGhpcy5zdGFnZVRpZXJzW2ldLmZvckVhY2goZnVuY3Rpb24oc3RhZ2UpIHtcbiAgICAgICAgICAgIHN0YWdlLnkgPSA0NTAgLSAoODAgKiBpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkaWZmaWN1bHR5ID0gdGhpcy5zdGFnZVRpZXJzW2ldLmxlbmd0aDtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHRoaXMuc3RhZ2VUaWVyc1tpXS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLnN0YWdlVGllcnNbaV1bal07XG4gICAgICAgICAgICBub2RlLmluZGV4ID0gajtcbiAgICAgICAgICAgIG5vZGUuZGlmZmljdWx0eSA9IGRpZmZpY3VsdHktLTtcbiAgICAgICAgICAgIG5vZGUudGludCA9IERJRkZJQ1VMVFlfQ09MT1JTW25vZGUuZGlmZmljdWx0eSAtIDFdO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGxpbmUtZHJhd2luZyBwYXNzXG4gICAgZm9yIChpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICB0aGlzLnN0YWdlVGllcnNbaV0uZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgICAgICAgICAgdmFyIGxlZnRTdGFnZSA9IHRoaXMuc3RhZ2VUaWVyc1tpICsgMV1bc3RhZ2UuaW5kZXhdO1xuICAgICAgICAgICAgdmFyIHJpZ2h0U3RhZ2UgPSB0aGlzLnN0YWdlVGllcnNbaSArIDFdW3N0YWdlLmluZGV4ICsgMV07XG4gICAgICAgICAgICBzdGFnZS5sZWZ0TGluZSA9IGdhbWUubWFrZS5pbWFnZShzdGFnZS54LCBzdGFnZS55LCAncGl4Jyk7XG4gICAgICAgICAgICBzdGFnZS5sZWZ0TGluZS5hbmNob3Iuc2V0KDAsIDAuNSk7XG4gICAgICAgICAgICBzdGFnZS5sZWZ0TGluZS50aW50ID0gUkVEO1xuICAgICAgICAgICAgc3RhZ2UubGVmdExpbmUud2lkdGggPSBnYW1lLnBoeXNpY3MuYXJjYWRlLmRpc3RhbmNlQmV0d2VlbihzdGFnZSwgbGVmdFN0YWdlKTtcbiAgICAgICAgICAgIHN0YWdlLmxlZnRMaW5lLmhlaWdodCA9IDI7XG4gICAgICAgICAgICBzdGFnZS5sZWZ0TGluZS5yb3RhdGlvbiA9IGdhbWUucGh5c2ljcy5hcmNhZGUuYW5nbGVCZXR3ZWVuKHN0YWdlLCBsZWZ0U3RhZ2UpO1xuICAgICAgICAgICAgc3RhZ2UucmlnaHRMaW5lID0gZ2FtZS5tYWtlLmltYWdlKHN0YWdlLngsIHN0YWdlLnksICdwaXgnKTtcbiAgICAgICAgICAgIHN0YWdlLnJpZ2h0TGluZS5hbmNob3Iuc2V0KDAsIDAuNSk7XG4gICAgICAgICAgICBzdGFnZS5yaWdodExpbmUudGludCA9IEdSRUVOO1xuICAgICAgICAgICAgc3RhZ2UucmlnaHRMaW5lLndpZHRoID0gZ2FtZS5waHlzaWNzLmFyY2FkZS5kaXN0YW5jZUJldHdlZW4oc3RhZ2UsIHJpZ2h0U3RhZ2UpO1xuICAgICAgICAgICAgc3RhZ2UucmlnaHRMaW5lLmhlaWdodCA9IDI7XG4gICAgICAgICAgICBzdGFnZS5yaWdodExpbmUucm90YXRpb24gPSBnYW1lLnBoeXNpY3MuYXJjYWRlLmFuZ2xlQmV0d2VlbihzdGFnZSwgcmlnaHRTdGFnZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIHZhciBsaW5lR3JvdXAgPSBnYW1lLmFkZC5ncm91cCgpO1xuICAgIGZvciAoaSA9IDA7IGkgPCA0OyBpKyspXG4gICAgICAgIHRoaXMuc3RhZ2VUaWVyc1tpXS5mb3JFYWNoKGZ1bmN0aW9uKHN0YWdlKSB7XG4gICAgICAgICAgICBsaW5lR3JvdXAuYWRkKHN0YWdlLmxlZnRMaW5lKTtcbiAgICAgICAgICAgIGxpbmVHcm91cC5hZGQoc3RhZ2UucmlnaHRMaW5lKTtcbiAgICAgICAgfSk7XG4gICAgdmFyIG5vZGVHcm91cCA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgdGhpcy5zdGFnZVRpZXJzLmZvckVhY2goZnVuY3Rpb24odGllcikge1xuICAgICAgICB0aWVyLmZvckVhY2goZnVuY3Rpb24oc3RhZ2UpIHtcbiAgICAgICAgICAgIG5vZGVHcm91cC5hZGQoc3RhZ2UpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgc3RhcnROb2RlID0gZ2FtZS5tYWtlLmltYWdlKDQwMCwgNTMwLCAncGl4Jyk7XG4gICAgc3RhcnROb2RlLmhlaWdodCA9IHN0YXJ0Tm9kZS53aWR0aCA9IDE1O1xuICAgIHN0YXJ0Tm9kZS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgbm9kZUdyb3VwLmFkZChzdGFydE5vZGUpO1xuICAgIHZhciBzdGFydExpbmUgPSBnYW1lLm1ha2UuaW1hZ2UoNDAwLCA1MzAsICdwaXgnKTtcbiAgICBzdGFydExpbmUud2lkdGggPSBnYW1lLnBoeXNpY3MuYXJjYWRlLmRpc3RhbmNlQmV0d2VlbihzdGFydExpbmUsIHRoaXMuc3RhZ2VUaWVyc1swXVswXSk7XG4gICAgc3RhcnRMaW5lLmhlaWdodCA9IDI7XG4gICAgc3RhcnRMaW5lLmFuY2hvci5zZXQoMCwgMC41KTtcbiAgICBzdGFydExpbmUudGludCA9IEdSRUVOO1xuICAgIHN0YXJ0TGluZS5yb3RhdGlvbiA9IGdhbWUucGh5c2ljcy5hcmNhZGUuYW5nbGVCZXR3ZWVuKHN0YXJ0TGluZSwgdGhpcy5zdGFnZVRpZXJzWzBdWzBdKTtcbiAgICBsaW5lR3JvdXAuYWRkKHN0YXJ0TGluZSk7XG5cbiAgICAvLyBzZXQgc2hpcCBiYXNlZCBvbiB0aWVyIGFuZCBpbmRleFxuICAgIHZhciBjdXJyZW50TG9jYXRpb24gPSBzaG11cC5kYXRhLmdhbWUudGllciA9PSAwID8gc3RhcnROb2RlIDpcbiAgICAgICAgdGhpcy5zdGFnZVRpZXJzW3NobXVwLmRhdGEuZ2FtZS50aWVyIC0gMV1bc2htdXAuZGF0YS5nYW1lLmluZGV4XTtcbiAgICB0aGlzLnNoaXAgPSBnYW1lLmFkZC5pbWFnZShjdXJyZW50TG9jYXRpb24ueCwgY3VycmVudExvY2F0aW9uLnksICdzaGlwJyk7XG4gICAgdGhpcy5zaGlwLnNjYWxlLnNldCgwLjUpO1xuICAgIHRoaXMuc2hpcC5hbmNob3Iuc2V0KDAuNSk7XG5cbiAgICAvLyBhZGQgdGV4dFxuICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoMTAsIDQ1MCwgJ2ZvbnQnLCBcIlNUQVRVU1wiLCA0MCk7XG4gICAgZ2FtZS5hZGQuZXhpc3RpbmcobmV3IFdlYXBvbkRpc3BsYXkoKSk7XG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCgxMjAsIDUxMCwgJ2ZvbnQnLCBcIlNDT1JFOiBcIiArIHNobXVwLmRhdGEuc2hpcC5zY29yZSwgMjApO1xuICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoMTIwLCA1NDAsICdmb250JywgXCJMSVZFUzogXCIgKyBzaG11cC5kYXRhLnNoaXAubGl2ZXMsIDIwKTtcbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDEyMCwgNTcwLCAnZm9udCcsIFwiU1RBUlM6IFwiICsgc2htdXAuZGF0YS5zaGlwLnN0YXJzICsgXCIvMjBcIiwgMjApO1xuXG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg3OTAsIDQ1MCwgJ2ZvbnQnLCBcIlNUQUdFIElORk9cIiwgNDApLmFuY2hvci5zZXQoMSwgMCk7XG4gICAgdGhpcy5zdGFnZU5hbWVUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg3OTAsIDU3MCwgJ2ZvbnQnLCAnTkFNRTogLS0tJywgMjApO1xuICAgIHRoaXMuc3RhZ2VOYW1lVGV4dC5hbmNob3Iuc2V0KDEsIDApO1xuICAgIHRoaXMuc3RhZ2VEaWZmaWN1bHR5VGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNzkwLCA1NDAsICdmb250JywgJ0RJRkZJQ1VMVFk6IC0nLCAyMCk7XG4gICAgdGhpcy5zdGFnZURpZmZpY3VsdHlUZXh0LmFuY2hvci5zZXQoMSwgMCk7XG4gICAgdGhpcy5zdGFnZSA9IG51bGw7XG4gICAgLy8gY3JlYXRlIExBVU5DSCBidXR0b25cbiAgICB0aGlzLmxhdW5jaEJ1dHRvbiA9IGdhbWUuYWRkLmltYWdlKDc5MCwgNDg4LCAnbWV0YWxQYW5lbCcpO1xuICAgIHRoaXMubGF1bmNoVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNjkwLCA0OTcsICdmb250JywgXCJMQVVOQ0hcIiwgMzIpO1xuICAgIHRoaXMubGF1bmNoVGV4dC5hbmNob3Iuc2V0KDAuNSwgMCk7XG4gICAgdGhpcy5sYXVuY2hUZXh0LnRpbnQgPSAweDIwMjAyMDtcbiAgICB0aGlzLmxhdW5jaEJ1dHRvbi5hbmNob3Iuc2V0KDEsIDApO1xuICAgIHRoaXMubGF1bmNoQnV0dG9uLndpZHRoID0gMjEwO1xuICAgIHRoaXMubGF1bmNoQnV0dG9uLmhlaWdodCA9IDM5O1xuICAgIHRoaXMubGF1bmNoQnV0dG9uLnRpbnQgPSBHUkVZO1xuICAgIHRoaXMubGF1bmNoQnV0dG9uLmlucHV0RW5hYmxlZCA9IHRydWU7XG4gICAgdGhpcy5sYXVuY2hCdXR0b24uZXZlbnRzLm9uSW5wdXRVcC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5zZWxlY3RlZFN0YWdlKSByZXR1cm47XG4gICAgICAgIHRoaXMubGF1bmNoQnV0dG9uLmV2ZW50cy5vbklucHV0VXAucmVtb3ZlQWxsKCk7XG4gICAgICAgIHRoaXMuc2hpcC5yb3RhdGlvbiA9IE1hdGguUEkgLyAyICtcbiAgICAgICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUuYW5nbGVCZXR3ZWVuKHRoaXMuc2hpcCwgdGhpcy5zZWxlY3RlZFN0YWdlKTtcbiAgICAgICAgc2htdXAuZGF0YS5zdGFnZSA9IHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMuc2VsZWN0ZWRTdGFnZS5zdGFnZU5hbWUsXG4gICAgICAgICAgICBkaWZmaWN1bHR5OiB0aGlzLnNlbGVjdGVkU3RhZ2UuZGlmZmljdWx0eSxcbiAgICAgICAgICAgIGluZGV4OiB0aGlzLnNlbGVjdGVkU3RhZ2UuaW5kZXhcbiAgICAgICAgfTtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLmVuZW1pZXNLaWxsZWQgPSAwO1xuICAgICAgICBzaG11cC5kYXRhLmdhbWUuaGlzdG9yeS5wdXNoKHNobXVwLmRhdGEuc3RhZ2UpO1xuICAgICAgICB2YXIgdHdlZW4gPSBnYW1lLmFkZC50d2Vlbih0aGlzLnNoaXApO1xuICAgICAgICB0d2Vlbi50byh7XG4gICAgICAgICAgICB4OiB0aGlzLnNlbGVjdGVkU3RhZ2UueCxcbiAgICAgICAgICAgIHk6IHRoaXMuc2VsZWN0ZWRTdGFnZS55XG4gICAgICAgIH0sIDEpO1xuICAgICAgICB0d2Vlbi5vbkNvbXBsZXRlLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ21haW4nKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHR3ZWVuLnN0YXJ0KCk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvLyBzZXQgcmVhY2hhYmxlIHN0YWdlc1xuICAgIGlmIChzaG11cC5kYXRhLmdhbWUudGllciA9PSAwKSB7XG4gICAgICAgIHRoaXMuc3RhZ2VUaWVyc1swXVswXS5yZWFjaGFibGUgPSB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zdGFnZVRpZXJzW3NobXVwLmRhdGEuZ2FtZS50aWVyXVtzaG11cC5kYXRhLmdhbWUuaW5kZXhdLnJlYWNoYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuc3RhZ2VUaWVyc1tzaG11cC5kYXRhLmdhbWUudGllcl1bc2htdXAuZGF0YS5nYW1lLmluZGV4ICsgMV0ucmVhY2hhYmxlID0gdHJ1ZTtcbiAgICB9XG5cblxuICAgIC8vIGVuYWJsZSBpbnB1dCBmb3Igbm9kZXNcbiAgICB0aGlzLnN0YWdlVGllcnMuZm9yRWFjaChmdW5jdGlvbih0aWVyKSB7XG4gICAgICAgIHRpZXIuZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgICAgICAgICAgc3RhZ2UuaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHN0YWdlLmV2ZW50cy5vbklucHV0VXAuYWRkKGZ1bmN0aW9uKHN0YWdlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFnZU5hbWVUZXh0LnNldFRleHQoXCJOQU1FOiBcIiArIHN0YWdlLnN0YWdlTmFtZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFnZURpZmZpY3VsdHlUZXh0LnNldFRleHQoXCJESUZGSUNVTFRZOiBcIiArIHN0YWdlLmRpZmZpY3VsdHkpO1xuICAgICAgICAgICAgICAgIC8vIHNldCBzZWxlY3RlZCBzdGFnZSBvbmx5IGlmIHJlYWNoYWJsZVxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRTdGFnZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXVuY2hCdXR0b24uaW5wdXRFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXVuY2hCdXR0b24udGludCA9IEdSRVk7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXVuY2hUZXh0LnRpbnQgPSAweDIwMjAyMDtcbiAgICAgICAgICAgICAgICBpZiAoc3RhZ2UucmVhY2hhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRTdGFnZSA9IHN0YWdlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdW5jaEJ1dHRvbi5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdW5jaEJ1dHRvbi50aW50ID0gUkVEO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhdW5jaFRleHQudGludCA9IDB4ZmZmZmZmO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBkbyBwdWxzZSB0d2VlblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnB1bHNlVHdlZW4pIHRoaXMucHVsc2VUd2Vlbi5zdG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFnZVRpZXJzLmZvckVhY2goZnVuY3Rpb24odGllcikge1xuICAgICAgICAgICAgICAgICAgICB0aWVyLmZvckVhY2goZnVuY3Rpb24oc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWdlLmhlaWdodCA9IHN0YWdlLndpZHRoID0gMzA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0YWdlLndpZHRoID0gc3RhZ2UuaGVpZ2h0ID0gMzA7XG4gICAgICAgICAgICAgICAgdGhpcy5wdWxzZVR3ZWVuID0gZ2FtZS5hZGQudHdlZW4oc3RhZ2UpO1xuICAgICAgICAgICAgICAgIHRoaXMucHVsc2VUd2Vlbi50byh7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdpZHRoOiA2MCxcbiAgICAgICAgICAgICAgICAgICAgLy8gaGVpZ2h0OiA2MFxuICAgICAgICAgICAgICAgIH0sIDEwMDAsIFBoYXNlci5FYXNpbmcuU2ludXNvaWRhbC5Jbk91dCwgZmFsc2UsIDAsIC0xLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBzdGFnZS53aWR0aCA9IDYwO1xuICAgICAgICAgICAgICAgIHN0YWdlLmhlaWdodCA9IDYwO1xuICAgICAgICAgICAgICAgIHRoaXMucHVsc2VUd2Vlbi5zdGFydCgpO1xuICAgICAgICAgICAgfSwgdGhpcywgMCwgc3RhZ2UpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LCB0aGlzKTtcbn07XG5cbnN0YXRlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHRoaXMuYmFja2dyb3VuZC50aWxlUG9zaXRpb24ueSArPSAxMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7IiwiLyogZ2xvYmFsIFBoYXNlciwgZ2FtZSwgc2htdXAgKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWxvYWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBnYW1lLmxvYWQuYmFzZVVSTCA9ICcuL2Fzc2V0cy8nO1xuICAgICAgICBnYW1lLnNjYWxlLnBhZ2VBbGlnbkhvcml6b250YWxseSA9IHRydWU7XG4gICAgICAgIGdhbWUuc2NhbGUucGFnZUFsaWduVmVydGljYWxseSA9IHRydWU7XG4gICAgICAgIGdhbWUuc2NhbGUuZnVsbFNjcmVlblNjYWxlTW9kZSA9IFBoYXNlci5TY2FsZU1hbmFnZXIuU0hPV19BTEw7XG4gICAgICAgIGdhbWUuY2FudmFzLm9uY29udGV4dG1lbnUgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH07XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgncGl4Jyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgnc2hpcCcpO1xuICAgICAgICBnYW1lLnN0YWdlLmJhY2tncm91bmRDb2xvciA9IDB4MTAxMDEwO1xuICAgIH0sXG4gICAgY3JlYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHByZWxvYWRTcHJpdGUgPSBnYW1lLmFkZC5zcHJpdGUoNDAwLCAyNTAsICdzaGlwJyk7XG4gICAgICAgIHByZWxvYWRTcHJpdGUuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBnYW1lLmFkZC50ZXh0KDQwMCwgNTAwLCBcIkxPQURJTkcuLi5cIiwge1xuICAgICAgICAgICAgZmlsbDogJ3doaXRlJyxcbiAgICAgICAgICAgIGZvbnQ6ICczNnB0IEFyaWFsJ1xuICAgICAgICB9KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGdhbWUubG9hZC5zZXRQcmVsb2FkU3ByaXRlKHByZWxvYWRTcHJpdGUsIDEpO1xuXG4gICAgICAgIHNobXVwLmRhdGEgPSB7fTtcbiAgICAgICAgc2htdXAuZGF0YS5nbG9iYWwgPSB7fTtcbiAgICAgICAgc2htdXAuZGF0YS5nbG9iYWwuZ2FtZXBhZCA9IHRydWU7XG5cbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdidXJuaW5nX2VuZ2luZXMnLCAnTXVzaWMvYnVybmluZ19lbmdpbmVzLm9nZycpO1xuICAgICAgICBnYW1lLmxvYWQuYXVkaW8oJ2NoYWxsZW5nZScsICdNdXNpYy9jaGFsbGVuZ2Uub2dnJyk7XG4gICAgICAgIGdhbWUubG9hZC5hdWRpbygnZG93bnRvd24nLCAnTXVzaWMvZG93bnRvd24ub2dnJyk7XG4gICAgICAgIGdhbWUubG9hZC5hdWRpbygnZnRsJywgJ011c2ljL2Z0bC5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdncmFuZF9wcml4JywgJ011c2ljL2dyYW5kX3ByaXgub2dnJyk7XG4gICAgICAgIGdhbWUubG9hZC5hdWRpbygnbW9ub3RvbGljJywgJ011c2ljL21vbm90b2xpYy5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdkaWdpdGFsX2Zyb250aWVyJywgJ011c2ljL2RpZ2l0YWxfZnJvbnRpZXIub2dnJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgnc3RhcmZpZWxkJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgnZXhwbG9zaW9uJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgnbGFzZXInLCAnTGFzZXJzL2xhc2VyR3JlZW4wMi5wbmcnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdwb3dlcnVwX2JsdWUnLCAnUG93ZXItdXBzL3Bvd2VydXBCbHVlX2JvbHQucG5nJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgncG93ZXJ1cF9ncmVlbicsICdQb3dlci11cHMvcG93ZXJ1cEdyZWVuX2JvbHQucG5nJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgncG93ZXJ1cF9yZWQnLCAnUG93ZXItdXBzL3Bvd2VydXBSZWRfYm9sdC5wbmcnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdzdGFyJywgJ1Bvd2VyLXVwcy9zdGFyX2dvbGQucG5nJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgndWZvQmx1ZScpO1xuICAgICAgICBnYW1lLmxvYWQuaW1hZ2UoJ3Vmb0dyZWVuJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgndWZvUmVkJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgndWZvWWVsbG93Jyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgnbWV0YWxQYW5lbCcpO1xuICAgICAgICBnYW1lLmxvYWQuaW1hZ2UoJ2RvdFdoaXRlJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgndGl0bGVfaW1hZ2UnKTtcbiAgICAgICAgZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdwbGF5ZXJfbGFzZXJzJywgJ3BsYXllcl9sYXNlcnMucG5nJywgMTMsIDM3KTtcbiAgICAgICAgZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdlbmVteV9sYXNlcnMnLCAnZW5lbXlfbGFzZXJzLnBuZycsIDQ4LCA0Nik7XG4gICAgICAgIHZhciBpLCBuYW1lO1xuICAgICAgICBbJ0JsYWNrJywgJ0JsdWUnLCAnR3JlZW4nLCAnUmVkJ10uZm9yRWFjaChmdW5jdGlvbihjb2xvcikge1xuICAgICAgICAgICAgZm9yIChpID0gMTsgaSA8IDY7IGkrKykge1xuICAgICAgICAgICAgICAgIG5hbWUgPSAnZW5lbXknICsgY29sb3IgKyBpO1xuICAgICAgICAgICAgICAgIGdhbWUubG9hZC5pbWFnZShuYW1lLCAnRW5lbWllcy8nICsgbmFtZSArICcucG5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDw9IDY7IGkrKykge1xuICAgICAgICAgICAgbmFtZSA9ICdleHBsb2RlJyArIGk7XG4gICAgICAgICAgICBnYW1lLmxvYWQuYXVkaW8obmFtZSwgJ1NvdW5kcy8nICsgbmFtZSArICcub2dnJyk7XG4gICAgICAgIH1cbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdib3NzX2V4cGxvZGUnLCAnU291bmRzL2Jvc3NfZXhwbG9kZS5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdwaWNrdXBfc3RhcicsICdTb3VuZHMvc2Z4X3R3b1RvbmUub2dnJyk7XG4gICAgICAgIGdhbWUubG9hZC5hdWRpbygncGlja3VwX3Bvd2VydXAnLCAnU291bmRzL3NmeF9zaGllbGRVcC5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmJpdG1hcEZvbnQoJ2ZvbnQnLCAnZm9udC5wbmcnLCAnZm9udC5mbnQnKTtcbiAgICAgICAgZ2FtZS5sb2FkLnN0YXJ0KCk7XG4gICAgfSxcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoZ2FtZS5sb2FkLmhhc0xvYWRlZCkge1xuICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgndGl0bGUnKTtcbiAgICAgICAgfVxuICAgIH1cbn07IiwiLyogZ2xvYmFsIGdhbWUsIHNobXVwICovXG52YXIgU3RhZ2UgPSByZXF1aXJlKCcuLi91dGlsL3N0YWdlJyk7XG52YXIgUGxheWVyID0gcmVxdWlyZSgnLi4vZW50aXR5L3BsYXllcicpO1xudmFyIElucHV0ID0gcmVxdWlyZSgnLi4vdXRpbC9pbnB1dCcpO1xudmFyIEJ1bGxldFBvb2wgPSByZXF1aXJlKCcuLi91dGlsL2J1bGxldHBvb2wnKTtcbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi4vZW50aXR5L2VtaXR0ZXInKTtcbnZhciBIdWQgPSByZXF1aXJlKCcuLi9lbnRpdHkvaHVkJyk7XG52YXIgc3RhdGUgPSB7fTtcblxuc3RhdGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgc2htdXAuZW1pdHRlciA9IG5ldyBFbWl0dGVyKCk7XG4gICAgc2htdXAuZW5lbXlCdWxsZXRzID0gbmV3IEJ1bGxldFBvb2woJ2VuZW15X2xhc2VycycpO1xuICAgIHNobXVwLnBsYXllckJ1bGxldHMgPSBuZXcgQnVsbGV0UG9vbCgncGxheWVyX2xhc2VycycpO1xuICAgIHNobXVwLmVuZW1pZXMgPSBnYW1lLmFkZC5ncm91cCgpO1xuICAgIHNobXVwLnBpY2t1cHMgPSBnYW1lLmFkZC5ncm91cCgpO1xuICAgIHNobXVwLnN0YWdlID0gbmV3IFN0YWdlKHNobXVwLmRhdGEuc3RhZ2UubmFtZSwgc2htdXAuZGF0YS5zdGFnZS5kaWZmaWN1bHR5KTtcbiAgICBzaG11cC5wbGF5ZXIgPSBuZXcgUGxheWVyKCk7XG4gICAgZ2FtZS5hZGQuZXhpc3Rpbmcoc2htdXAucGxheWVyKTtcbiAgICBzaG11cC5pbnB1dCA9IG5ldyBJbnB1dChzaG11cC5kYXRhLmdsb2JhbC5nYW1lcGFkKTtcbiAgICBzaG11cC5odWQgPSBuZXcgSHVkKCk7XG59O1xuXG5zdGF0ZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBzaG11cC5zdGFnZS51cGRhdGUoKTtcbiAgICBzaG11cC5pbnB1dC51cGRhdGUoKTtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm92ZXJsYXAoc2htdXAuZW5lbWllcywgc2htdXAucGxheWVyQnVsbGV0cywgZnVuY3Rpb24oZW5lbXksIHNob3QpIHtcbiAgICAgICAgZW5lbXkuZGFtYWdlKHNob3QucG93ZXIpO1xuICAgICAgICBzaG90LmtpbGwoKTtcbiAgICB9KTtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm92ZXJsYXAoc2htdXAucGxheWVyLCBzaG11cC5lbmVteUJ1bGxldHMsIGZ1bmN0aW9uKHBsYXllciwgc2hvdCkge1xuICAgICAgICBzaG90LmtpbGwoKTtcbiAgICAgICAgcGxheWVyLmhpdCgpO1xuICAgIH0pO1xuICAgIGdhbWUucGh5c2ljcy5hcmNhZGUub3ZlcmxhcChzaG11cC5wbGF5ZXIsIHNobXVwLnBpY2t1cHMsIGZ1bmN0aW9uKHBsYXllciwgcGlja3VwKSB7XG4gICAgICAgIHBpY2t1cC5waWNrZWRVcCgpO1xuICAgICAgICBwaWNrdXAua2lsbCgpO1xuICAgIH0pO1xufTtcblxuc3RhdGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHNobXVwLnBsYXllci5hbGl2ZSlcbiAgICAgICAgZ2FtZS5kZWJ1Zy5ib2R5KHNobXVwLnBsYXllciwgJyNmZmZmMDAnKTtcbiAgICBzaG11cC5wbGF5ZXJCdWxsZXRzLmZvckVhY2goZnVuY3Rpb24ocGxheWVyQnVsbGV0KSB7XG4gICAgICAgIGlmIChwbGF5ZXJCdWxsZXQuYWxpdmUpXG4gICAgICAgICAgICBnYW1lLmRlYnVnLmJvZHkocGxheWVyQnVsbGV0LCAnIzAwODA4MCcpO1xuICAgIH0pO1xuICAgIHNobXVwLmVuZW1pZXMuZm9yRWFjaChmdW5jdGlvbihlbmVteSkge1xuICAgICAgICBpZiAoZW5lbXkuYWxpdmUgJiYgZW5lbXkuYm9keS54ICE9IDAgJiYgZW5lbXkuYm9keS55ICE9IDApXG4gICAgICAgICAgICBnYW1lLmRlYnVnLmJvZHkoZW5lbXksICcjRkYwMDAwJyk7XG4gICAgfSk7XG4gICAgc2htdXAuZW5lbXlCdWxsZXRzLmZvckVhY2goZnVuY3Rpb24oZW5lbXlCdWxsZXQpIHtcbiAgICAgICAgaWYgKGVuZW15QnVsbGV0LmFsaXZlKVxuICAgICAgICAgICAgZ2FtZS5kZWJ1Zy5ib2R5KGVuZW15QnVsbGV0LCAnI2ZmODAwMCcpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTsiLCIvKiBnbG9iYWwgZ2FtZSwgc2htdXAgKi9cbnZhciBCTFVFID0gMHgzNmJiZjU7XG52YXIgR1JFRU4gPSAweDcxYzkzNztcbnZhciBZRUxMT1cgPSAweGIxYzkzNztcbnZhciBPUkFOR0UgPSAweGFjODAzOTtcbnZhciBSRUQgPSAweGFjMzkzOTtcbnZhciBEQVJLX1JFRCA9IDB4Y2MyOTI5O1xudmFyIEdSRVkgPSAweDQwNDA0MDtcbnZhciBNVVNJQ19WT0xVTUUgPSAwLjI7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc2htdXAubXVzaWMpIHNobXVwLm11c2ljLnN0b3AoKTtcbiAgICAgICAgc2htdXAubXVzaWMgPSBnYW1lLnNvdW5kLnBsYXkoJ21vbm90b2xpYycsIE1VU0lDX1ZPTFVNRSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgODAwLCA2MDAsICdzdGFyZmllbGQnKTtcbiAgICAgICAgc2htdXAuZGF0YS5nYW1lID0ge1xuICAgICAgICAgICAgdGllcjogMCxcbiAgICAgICAgICAgIGluZGV4OiAwLFxuICAgICAgICAgICAgaGlzdG9yeTogW11cbiAgICAgICAgfTtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwID0ge1xuICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICB3ZWFwb25MZXZlbHM6IFsxLCAxLCAxXSxcbiAgICAgICAgICAgIGN1cnJlbnRXZWFwb246IDAsXG4gICAgICAgICAgICBzdGFyczogMCxcbiAgICAgICAgICAgIGxpdmVzOiAyXG4gICAgICAgIH07XG4gICAgICAgIC8vIGNyZWF0ZSB0aXRsZSBpbWFnZVxuICAgICAgICBnYW1lLmFkZC5pbWFnZSgwLCAwLCAndGl0bGVfaW1hZ2UnKTtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDIzMCwgJ2ZvbnQnLCBcIlNITVVQXCIsIDgwKS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIC8vIGNyZWF0ZSBtYWluIFwicGxheVwiIGJ1dHRvblxuICAgICAgICB2YXIgcGxheUJ1dHRvbiA9IGdhbWUuYWRkLmltYWdlKDI1MCwgNDAwLCAnbWV0YWxQYW5lbCcpO1xuICAgICAgICBwbGF5QnV0dG9uLndpZHRoID0gMzAwO1xuICAgICAgICBwbGF5QnV0dG9uLmhlaWdodCA9IDE1MDtcbiAgICAgICAgcGxheUJ1dHRvbi50aW50ID0gQkxVRTtcbiAgICAgICAgcGxheUJ1dHRvbi5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBwbGF5QnV0dG9uLmV2ZW50cy5vbklucHV0VXAuYWRkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgnbGV2ZWxfc2VsZWN0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgNDc5LCAnZm9udCcsICdQTEFZIScsIDM2KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIC8vIGNyZWF0ZSBjaGFsbGVuZ2UgbW9kZSBidXR0b25cbiAgICAgICAgdmFyIGNoYWxsZW5nZUJ1dHRvbiA9IGdhbWUuYWRkLmltYWdlKDUwLCA0MDAsICdtZXRhbFBhbmVsJyk7XG4gICAgICAgIGNoYWxsZW5nZUJ1dHRvbi53aWR0aCA9IDE1MDtcbiAgICAgICAgY2hhbGxlbmdlQnV0dG9uLmhlaWdodCA9IDE1MDtcbiAgICAgICAgY2hhbGxlbmdlQnV0dG9uLnRpbnQgPSBSRUQ7XG4gICAgICAgIGNoYWxsZW5nZUJ1dHRvbi5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBjaGFsbGVuZ2VCdXR0b24uZXZlbnRzLm9uSW5wdXRVcC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCdjaGFsbGVuZ2UnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBjaGFsbGVuZ2VUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCgxMjUsIDQ3OSwgJ2ZvbnQnLCAnQ2hhbGxlbmdlXFxuTW9kZScsIDE2KTtcbiAgICAgICAgY2hhbGxlbmdlVGV4dC5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGNoYWxsZW5nZVRleHQuYWxpZ24gPSAnY2VudGVyJztcbiAgICAgICAgLy8gY3JlYXRlIGZ1bGxzY3JlZW4gYnV0dG9uXG4gICAgICAgIHZhciBmdWxsc2NyZWVuQnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoNjAwLCA0MTAsICdtZXRhbFBhbmVsJyk7XG4gICAgICAgIGZ1bGxzY3JlZW5CdXR0b24ud2lkdGggPSAxNTA7XG4gICAgICAgIGZ1bGxzY3JlZW5CdXR0b24uaGVpZ2h0ID0gNTA7XG4gICAgICAgIGZ1bGxzY3JlZW5CdXR0b24udGludCA9IEdSRUVOO1xuICAgICAgICBmdWxsc2NyZWVuQnV0dG9uLmlucHV0RW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGZ1bGxzY3JlZW5CdXR0b24uZXZlbnRzLm9uSW5wdXRVcC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBnYW1lLnNjYWxlLnN0YXJ0RnVsbFNjcmVlbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg2NzUsIDQzOSwgJ2ZvbnQnLCAnRlVMTFNDUkVFTicsIDE2KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIC8vIGNyZWF0ZSBnYW1lcGFkIGJ1dHRvblxuICAgICAgICB2YXIgZ2FtZXBhZEJ1dHRvbiA9IGdhbWUuYWRkLmltYWdlKDYwMCwgNDkwLCAnbWV0YWxQYW5lbCcpO1xuICAgICAgICB2YXIgZ2FtZXBhZFRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDY3NSwgNTE5LCAnZm9udCcsIFwiR0FNRVBBRD9cIiwgMTYpO1xuICAgICAgICBnYW1lcGFkVGV4dC5hbGlnbiA9ICdjZW50ZXInO1xuICAgICAgICB2YXIgYWN0aXZhdGVHYW1lcGFkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzaG11cC5kYXRhLmdsb2JhbC5nYW1lcGFkID0gdHJ1ZTtcbiAgICAgICAgICAgIGdhbWVwYWRCdXR0b24udGludCA9IEdSRUVOO1xuICAgICAgICAgICAgZ2FtZXBhZEJ1dHRvbi5ldmVudHMub25JbnB1dFVwLmFkZE9uY2UoZGVhY3RpdmF0ZUdhbWVwYWQpO1xuICAgICAgICAgICAgZ2FtZXBhZFRleHQuc2V0VGV4dCgnR0FNRVBBRFxcbkFDVElWRScpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgZGVhY3RpdmF0ZUdhbWVwYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNobXVwLmRhdGEuZ2xvYmFsLmdhbWVwYWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGdhbWVwYWRCdXR0b24udGludCA9IEdSRVk7XG4gICAgICAgICAgICBnYW1lcGFkQnV0dG9uLmV2ZW50cy5vbklucHV0VXAuYWRkT25jZShhY3RpdmF0ZUdhbWVwYWQpO1xuICAgICAgICAgICAgZ2FtZXBhZFRleHQuc2V0VGV4dChcIkdBTUVQQUQ/XCIpO1xuICAgICAgICB9O1xuICAgICAgICBnYW1lcGFkVGV4dC5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGdhbWVwYWRCdXR0b24ud2lkdGggPSAxNTA7XG4gICAgICAgIGdhbWVwYWRCdXR0b24uaGVpZ2h0ID0gNTA7XG4gICAgICAgIGdhbWVwYWRCdXR0b24uaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgZGVhY3RpdmF0ZUdhbWVwYWQoKTtcbiAgICAgICAgLy8gY3JlYXRlIGhlbHAgYnV0dG9uXG4gICAgICAgIHZhciBoZWxwQnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoNzQwLCAxMCwgJ21ldGFsUGFuZWwnKTtcbiAgICAgICAgaGVscEJ1dHRvbi53aWR0aCA9IGhlbHBCdXR0b24uaGVpZ2h0ID0gNTA7XG4gICAgICAgIGhlbHBCdXR0b24uaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgaGVscEJ1dHRvbi5ldmVudHMub25JbnB1dFVwLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5vcGVuKFwiaHR0cHM6Ly9naXRodWIuY29tL3pla29mZi8xZ2FtLXNobXVwL2Jsb2IvbWFzdGVyL1JFQURNRS5tZFwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoNzY3LCA0MywgJ2ZvbnQnLCBcIj9cIiwgMzYpLmFuY2hvci5zZXQoMC41KTtcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuYmFja2dyb3VuZC50aWxlUG9zaXRpb24ueSArPSAxMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICB9XG59OyIsIi8qIGdsb2JhbCBnYW1lLCBzaG11cCwgUGhhc2VyICovXG52YXIgc3RhdGUgPSB7fTtcblxuc3RhdGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iYWNrZ3JvdW5kID0gZ2FtZS5hZGQudGlsZVNwcml0ZSgwLCAwLCA4MDAsIDYwMCwgJ3N0YXJmaWVsZCcpO1xuICAgIHZhciBzaGlwID0gZ2FtZS5hZGQuc3ByaXRlKDIwMCwgNTAwLCAnc2hpcCcpO1xuICAgIHZhciBkaWZmaWN1bHR5TW9kaWZpZXIgPSAwO1xuICAgIHZhciBsaXZlc0JvbnVzID0gc2htdXAuZGF0YS5zaGlwLmxpdmVzICogMTAwMDA7XG4gICAgc2htdXAuZGF0YS5nYW1lLmhpc3RvcnkuZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgICAgICBkaWZmaWN1bHR5TW9kaWZpZXIgKz0gc3RhZ2UuZGlmZmljdWx0eTtcbiAgICB9KTtcbiAgICB2YXIgZmluYWxTY29yZSA9IChzaG11cC5kYXRhLnNoaXAuc2NvcmUgKyBsaXZlc0JvbnVzKSAqIGRpZmZpY3VsdHlNb2RpZmllcjtcbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMTUwLCAnZm9udCcsIFwiTUlTU0lPTiBDT01QTEVURSFcIiwgNTYpLmFuY2hvci5zZXQoMC41KTtcbiAgICB2YXIgdG9EaXNwbGF5ID0gW1xuICAgICAgICAnU2NvcmU6ICcgKyBzaG11cC5kYXRhLnNoaXAuc2NvcmUsXG4gICAgICAgICdCb251cyBmb3IgbGl2ZXMgcmVtYWluaW5nOiAnICsgbGl2ZXNCb251cyxcbiAgICAgICAgJ0RpZmZpY3VsdHkgTXVsdGlwbGllcjogJyArIGRpZmZpY3VsdHlNb2RpZmllcixcbiAgICAgICAgJ0ZpbmFsIFNjb3JlOiAnICsgZmluYWxTY29yZVxuICAgIF07XG4gICAgdmFyIGksIHNjb3JlVGV4dDtcbiAgICBmb3IgKGkgPSAxOyBpIDw9IHRvRGlzcGxheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgxMDAwICogaSwgZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHNjb3JlVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAyMDAgKyBpbmRleCAqIDUwLCAnZm9udCcsIHRvRGlzcGxheVtpbmRleCAtIDFdLCAyOCk7XG4gICAgICAgICAgICBzY29yZVRleHQuYW5jaG9yLnNldCgwLjUsIDApO1xuICAgICAgICB9LCB0aGlzLCBpKTtcbiAgICB9XG4gICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoKHRvRGlzcGxheS5sZW5ndGgpICogMTUwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGdhbWUuYWRkLnR3ZWVuKHNjb3JlVGV4dC5zY2FsZSkudG8oe1xuICAgICAgICAgICAgeDogMS41LFxuICAgICAgICAgICAgeTogMS41XG4gICAgICAgIH0sIDEwMDAsIG51bGwsIHRydWUpO1xuICAgIH0pO1xuICAgIGdhbWUudGltZS5ldmVudHMuYWRkKCh0b0Rpc3BsYXkubGVuZ3RoICsgMikgKiAxNTAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDU1MCwgJ2ZvbnQnLCBcIihjbGljayB0byByZXR1cm4gdG8gdGl0bGUgc2NyZWVuKVwiLCAxNikuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBnYW1lLmlucHV0Lm9uVXAuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ3RpdGxlJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGdhbWUuYWRkLnR3ZWVuKHNoaXApLnRvKHtcbiAgICAgICAgeDogNjAwXG4gICAgfSwgNzAwMCwgUGhhc2VyLkVhc2luZy5TaW51c29pZGFsLkluT3V0LCB0cnVlLCAwLCAtMSwgdHJ1ZSk7XG59O1xuXG5zdGF0ZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQudGlsZVBvc2l0aW9uLnkgKz0gMTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlOyIsIi8qIGdsb2JhbCBQaGFzZXIsIGdhbWUgKi9cblxudmFyIEJ1bGxldFBvb2wgPSBmdW5jdGlvbihrZXkpIHtcbiAgICBQaGFzZXIuR3JvdXAuY2FsbCh0aGlzLCBnYW1lLCBnYW1lLndvcmxkLCAnYnVsbGV0cG9vbCcsIGZhbHNlLFxuICAgICAgICB0cnVlLCBQaGFzZXIuUGh5c2ljcy5BUkNBREUpO1xuICAgIHRoaXMua2V5ID0ga2V5O1xufTtcbkJ1bGxldFBvb2wucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuR3JvdXAucHJvdG90eXBlKTtcbkJ1bGxldFBvb2wucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQnVsbGV0UG9vbDtcbkJ1bGxldFBvb2wucHJvdG90eXBlLmdldEJ1bGxldCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzaG90ID0gdGhpcy5nZXRGaXJzdERlYWQoKTtcbiAgICBpZiAoIXNob3QpIHtcbiAgICAgICAgc2hvdCA9IGdhbWUubWFrZS5zcHJpdGUodGhpcy54LCB0aGlzLnksIHRoaXMua2V5KTtcbiAgICAgICAgc2hvdC5hbHBoYSA9IDA7XG4gICAgICAgIHNob3QuaGVpZ2h0ID0gMjQ7XG4gICAgICAgIHNob3Qud2lkdGggPSA4O1xuICAgICAgICBzaG90LmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgc2hvdC5wb3dlciA9IDEwO1xuICAgICAgICBzaG90LmNoZWNrV29ybGRCb3VuZHMgPSB0cnVlO1xuICAgICAgICBzaG90Lm91dE9mQm91bmRzS2lsbCA9IHRydWU7XG4gICAgICAgIHRoaXMuYWRkKHNob3QpO1xuICAgIH1cbiAgICBzaG90LmhlaWdodCA9IDI0O1xuICAgIHNob3Qud2lkdGggPSA4O1xuICAgIGlmICh0aGlzLmtleSA9PSAnZW5lbXlfbGFzZXJzJykgc2hvdC51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdGhpcy5hbmdsZSArPSAxMjAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgfTtcbiAgICByZXR1cm4gc2hvdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnVsbGV0UG9vbDsiLCIvKiBnbG9iYWwgZ2FtZSwgc2htdXAsIFBoYXNlciAqL1xudmFyIERFQURaT05FID0gLjE7XG52YXIgTU9VU0VfSU5QVVQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pbnB1dERpc2FibGVkKSByZXR1cm47XG4gICAgaWYgKGdhbWUucGh5c2ljcy5hcmNhZGUuZGlzdGFuY2VUb1BvaW50ZXIoc2htdXAucGxheWVyKSA+IDEwKVxuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm1vdmVUb1BvaW50ZXIoc2htdXAucGxheWVyLFxuICAgICAgICAgICAgZ2FtZS5pbnB1dC5hY3RpdmVQb2ludGVyLmlzRG93biA/XG4gICAgICAgICAgICBzaG11cC5wbGF5ZXIuU0xPV19TUEVFRCA6IHNobXVwLnBsYXllci5GQVNUX1NQRUVEKTtcbiAgICBlbHNlIHtcbiAgICAgICAgc2htdXAucGxheWVyLmJvZHkudmVsb2NpdHkuc2V0KDApO1xuICAgICAgICBzaG11cC5wbGF5ZXIueCA9IGdhbWUuaW5wdXQuYWN0aXZlUG9pbnRlci54O1xuICAgICAgICBzaG11cC5wbGF5ZXIueSA9IGdhbWUuaW5wdXQuYWN0aXZlUG9pbnRlci55O1xuICAgIH1cbiAgICBzaG11cC5wbGF5ZXIuYWx0ZXJuYXRlRmlyZSA9IGdhbWUuaW5wdXQuYWN0aXZlUG9pbnRlci5pc0Rvd247XG59O1xudmFyIEdBTUVQQURfSU5QVVQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pbnB1dERpc2FibGVkKSByZXR1cm47XG4gICAgc2htdXAucGxheWVyLmFsdGVybmF0ZUZpcmUgPSB0aGlzLnBhZC5pc0Rvd24oUGhhc2VyLkdhbWVwYWQuWEJPWDM2MF9BKTtcblxuICAgIGlmICghZ2FtZS5pbnB1dC5nYW1lcGFkLnN1cHBvcnRlZCB8fCAhZ2FtZS5pbnB1dC5nYW1lcGFkLmFjdGl2ZSB8fFxuICAgICAgICAhdGhpcy5wYWQuY29ubmVjdGVkKSByZXR1cm47XG5cbiAgICB2YXIgY3ljbGVCdXR0b25UaGlzRnJhbWUgPSB0aGlzLnBhZC5pc0Rvd24oUGhhc2VyLkdhbWVwYWQuWEJPWDM2MF9YKTtcbiAgICBpZiAoIXRoaXMuY3ljbGVCdXR0b25MYXN0RnJhbWUgJiYgY3ljbGVCdXR0b25UaGlzRnJhbWUpIHNobXVwLnBsYXllci5jeWNsZVdlYXBvbigpO1xuICAgIHRoaXMuY3ljbGVCdXR0b25MYXN0RnJhbWUgPSBjeWNsZUJ1dHRvblRoaXNGcmFtZTtcblxuICAgIHNobXVwLnBsYXllci5ib2R5LnZlbG9jaXR5LnNldCgwKTtcbiAgICB2YXIgeERpciA9IDAsXG4gICAgICAgIHlEaXIgPSAwO1xuXG4gICAgLy8gZC1wYWQgY29udHJvbFxuICAgIGlmICh0aGlzLnBhZC5pc0Rvd24oUGhhc2VyLkdhbWVwYWQuWEJPWDM2MF9EUEFEX0xFRlQpKSB4RGlyID0gLTE7XG4gICAgZWxzZSBpZiAodGhpcy5wYWQuaXNEb3duKFBoYXNlci5HYW1lcGFkLlhCT1gzNjBfRFBBRF9SSUdIVCkpIHhEaXIgPSAxO1xuICAgIGlmICh0aGlzLnBhZC5pc0Rvd24oUGhhc2VyLkdhbWVwYWQuWEJPWDM2MF9EUEFEX1VQKSkgeURpciA9IC0xO1xuICAgIGVsc2UgaWYgKHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX0RQQURfRE9XTikpIHlEaXIgPSAxO1xuICAgIHRoaXMuZHVtbXlQb2ludC5jb3B5RnJvbShzaG11cC5wbGF5ZXIpO1xuICAgIHRoaXMuZHVtbXlQb2ludC54ICs9IHhEaXI7XG4gICAgdGhpcy5kdW1teVBvaW50LnkgKz0geURpcjtcbiAgICBpZiAoeERpciB8fCB5RGlyKVxuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm1vdmVUb09iamVjdChzaG11cC5wbGF5ZXIsIHRoaXMuZHVtbXlQb2ludCxcbiAgICAgICAgICAgIHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX0EpID9cbiAgICAgICAgICAgIHNobXVwLnBsYXllci5TTE9XX1NQRUVEIDogc2htdXAucGxheWVyLkZBU1RfU1BFRUQpO1xuXG4gICAgLy8gdGh1bWJzdGljayBjb250cm9sXG4gICAgdmFyIHhBeGlzID0gdGhpcy5wYWQuYXhpcyhQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX1NUSUNLX0xFRlRfWCk7XG4gICAgdmFyIHlBeGlzID0gdGhpcy5wYWQuYXhpcyhQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX1NUSUNLX0xFRlRfWSk7XG4gICAgaWYgKE1hdGguYWJzKHhBeGlzKSA8IERFQURaT05FKSB4QXhpcyA9IDA7XG4gICAgaWYgKE1hdGguYWJzKHlBeGlzKSA8IERFQURaT05FKSB5QXhpcyA9IDA7XG4gICAgdGhpcy5kdW1teVBvaW50LmNvcHlGcm9tKHNobXVwLnBsYXllcik7XG4gICAgdGhpcy5kdW1teVBvaW50LnggKz0geEF4aXMgKiAxMDA7XG4gICAgdGhpcy5kdW1teVBvaW50LnkgKz0geUF4aXMgKiAxMDA7XG4gICAgaWYgKHhBeGlzIHx8IHlBeGlzKVxuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm1vdmVUb09iamVjdChzaG11cC5wbGF5ZXIsIHRoaXMuZHVtbXlQb2ludCxcbiAgICAgICAgICAgIHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX0EpID9cbiAgICAgICAgICAgIHNobXVwLnBsYXllci5TTE9XX1NQRUVEIDogc2htdXAucGxheWVyLkZBU1RfU1BFRUQpO1xufTtcblxudmFyIElucHV0ID0gZnVuY3Rpb24odXNlR2FtZXBhZCkge1xuICAgIGdhbWUuaW5wdXQuZ2FtZXBhZC5zdGFydCgpO1xuICAgIHRoaXMucGFkID0gZ2FtZS5pbnB1dC5nYW1lcGFkLnBhZDE7XG4gICAgdGhpcy5kdW1teVBvaW50ID0gbmV3IFBoYXNlci5Qb2ludCgpO1xuICAgIGlmICh1c2VHYW1lcGFkKSB7XG4gICAgICAgIHRoaXMudXBkYXRlID0gR0FNRVBBRF9JTlBVVC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmN5Y2xlQnV0dG9uTGFzdEZyYW1lID0gZmFsc2U7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZSA9IE1PVVNFX0lOUFVULmJpbmQodGhpcyk7XG4gICAgICAgIGdhbWUuaW5wdXQubW91c2VQb2ludGVyLnJpZ2h0QnV0dG9uLm9uRG93bi5yZW1vdmVBbGwoKTtcbiAgICAgICAgZ2FtZS5pbnB1dC5tb3VzZVBvaW50ZXIucmlnaHRCdXR0b24ub25Eb3duLmFkZChzaG11cC5wbGF5ZXIuY3ljbGVXZWFwb24sIHNobXVwLnBsYXllcik7XG4gICAgfVxufTtcbklucHV0LnByb3RvdHlwZSA9IHt9O1xuSW5wdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW5wdXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXQ7IiwiLyogZ2xvYmFsIFBoYXNlciwgZ2FtZSAqL1xudmFyIHNwbGluZTEgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgUEFUSF9YID0gWzAsIDIwMCwgNDAwLCA1MDAsIDU1MCwgNDAwLCAyMDAsIC01MF07XG4gICAgdmFyIFBBVEhfWSA9IFs1MCwgNzUsIDE1MCwgMzAwLCAyMDAsIDM1MCwgMTAwLCA1MF07XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNCAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oUEFUSF9YLCB0aGlzLm1vdmVUaW1lcik7XG4gICAgdGhpcy55ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oUEFUSF9ZLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIHNwbGluZTIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgUEFUSF9YID0gWzAsIDQwMCwgNjAwLCA3MDAsIDQwMCwgMjAwLCA2MDAsIDg1MF07XG4gICAgdmFyIFBBVEhfWSA9IFszMDAsIDUwLCAxMDAsIDE1MCwgMjAwXTtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA5IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1gsIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1ksIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgc3BsaW5lMyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBQQVRIX1ggPSBbNDAwLCAyMDAsIDQwMCwgNjAwLCA0MDAsIDQwMF07XG4gICAgdmFyIFBBVEhfWSA9IFswLCAxMDAsIDEwMCwgMTAwLCAyMDAsIC01MF07XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oUEFUSF9YLCB0aGlzLm1vdmVUaW1lcik7XG4gICAgdGhpcy55ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oUEFUSF9ZLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIHNwbGluZTQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgUEFUSF9YID0gWzgwMCwgMTAwLCAyMDAsIDM1MCwgNTAwLCA2MDAsIDg1MF07XG4gICAgdmFyIFBBVEhfWSA9IFs0MDAsIDEwMCwgMjAwLCAxNTAsIDEwMCwgNTAsIDUwXTtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA3IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1gsIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1ksIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgZGl2ZWJvbWIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMueCkgdGhpcy54ID0gZ2FtZS5ybmQuYmV0d2VlbigxMDAsIDcwMCk7XG4gICAgdGhpcy55ICs9IDIwMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG52YXIgYXJjVXBSaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5tb3ZlSW5pdCkge1xuICAgICAgICB0aGlzLm1vdmVJbml0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy54ID0gMDtcbiAgICAgICAgdGhpcy55ID0gNDAwO1xuICAgIH1cbiAgICB0aGlzLnggKz0gMjUwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHRoaXMueSAtPSA2MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG52YXIgYXJjVXBMZWZ0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm1vdmVJbml0KSB7XG4gICAgICAgIHRoaXMubW92ZUluaXQgPSB0cnVlO1xuICAgICAgICB0aGlzLnggPSA4MDA7XG4gICAgICAgIHRoaXMueSA9IDQwMDtcbiAgICB9XG4gICAgdGhpcy54IC09IDI1MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICB0aGlzLnkgLT0gNjAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xudmFyIGR1Y2tEb3duVXAgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA0IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbMTAwLCA0MDAsIDcwMF0sIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbMCwgMTAwLCAxMDUsIDExMCwgMTA1LCAxMDAsIC01MF0sIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgc21vb3RoQXJjUmlnaHRMZWZ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNCAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzgwMCwgNjAwLCA0MDAsIDIwMCwgMF0sIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbNjAwLCAzMDAsIDIwMCwgMzAwLCA2NTBdLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIGxpbmVMZWZ0RG93biA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5tb3ZlSW5pdCkge1xuICAgICAgICB0aGlzLm1vdmVJbml0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy54ID0gODAwO1xuICAgICAgICB0aGlzLnkgPSA1MDtcbiAgICB9XG4gICAgdGhpcy54IC09IDI1MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICB0aGlzLnkgKz0gNjAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xudmFyIGxpbmVSaWdodERvd24gPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMubW92ZUluaXQpIHtcbiAgICAgICAgdGhpcy5tb3ZlSW5pdCA9IHRydWU7XG4gICAgICAgIHRoaXMueCA9IDA7XG4gICAgICAgIHRoaXMueSA9IDUwO1xuICAgIH1cbiAgICB0aGlzLnggKz0gMjUwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHRoaXMueSArPSA2MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG52YXIgc3BsaW5lNSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubW92ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCAvIDUgLyB0aGlzLnNwZWVkRmFjdG9yO1xuICAgIHRoaXMueCA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFs4MDAsIDQwMCwgMTAwLCA0MDAsIDg1MF0sIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbNTAsIDI1LCA1MCwgMjUsIDUwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzcGxpbmU2ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzAsIDMwMCwgNTAwLCAyMDAsIDUwMCwgNzAwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFsxMDAsIDMwMCwgMjAwLCAxMDAsIDMwMCwgLTUwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzcGxpbmU3ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzQwMCwgNzAwLCAyMDAsIDQwMF0sIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbMCwgMzAwLCAzMDAsIC01MF0sIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgc3BsaW5lOCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubW92ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCAvIDUgLyB0aGlzLnNwZWVkRmFjdG9yO1xuICAgIHRoaXMueCA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFsyMDAsIDYwMF0sIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbMCwgMjAwLCAzMDAsIDIwMCwgMCwgLTUwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzcGxpbmU5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzAsIDcwMCwgMTAwLCA0MDAsIDMwMCwgODUwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFs1MCwgMTAwLCAxNTAsIDIwMCwgMjUwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzcGxpbmUxMCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubW92ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCAvIDUgLyB0aGlzLnNwZWVkRmFjdG9yO1xuICAgIHRoaXMueCA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFs4MDAsIDQwMCwgLTUwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFszMDAsIDIwMCwgMzAwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBsaW5lTGVmdERvd24yID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm1vdmVJbml0KSB7XG4gICAgICAgIHRoaXMubW92ZUluaXQgPSB0cnVlO1xuICAgICAgICB0aGlzLnggPSA4MDA7XG4gICAgICAgIHRoaXMueSA9IDIwMDtcbiAgICB9XG4gICAgdGhpcy54IC09IDI1MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICB0aGlzLnkgKz0gMjAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xudmFyIGxpbmVSaWdodERvd24yID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm1vdmVJbml0KSB7XG4gICAgICAgIHRoaXMubW92ZUluaXQgPSB0cnVlO1xuICAgICAgICB0aGlzLnggPSAwO1xuICAgICAgICB0aGlzLnkgPSAyMDA7XG4gICAgfVxuICAgIHRoaXMueCArPSAyNTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgdGhpcy55ICs9IDIwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcbm1vZHVsZS5leHBvcnRzID0gW3NwbGluZTEsIHNwbGluZTIsIHNwbGluZTMsIHNwbGluZTQsIGRpdmVib21iLCBhcmNVcFJpZ2h0LFxuICAgIGFyY1VwTGVmdCwgZHVja0Rvd25VcCwgc21vb3RoQXJjUmlnaHRMZWZ0LCBsaW5lTGVmdERvd24sIGxpbmVSaWdodERvd24sXG4gICAgc3BsaW5lNSwgc3BsaW5lNiwgc3BsaW5lNywgc3BsaW5lOCwgc3BsaW5lOSwgc3BsaW5lMTAsIGxpbmVMZWZ0RG93bjIsXG4gICAgbGluZVJpZ2h0RG93bjJcbl07IiwiLyogZ2xvYmFsIHNobXVwLCBnYW1lICovXG5cbnZhciBTSE9UX0JPRFlfU0NBTEUgPSAuNztcblxudmFyIHN0cmFpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG90VGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA+IC43NSAmJiBnYW1lLnJuZC5mcmFjKCkgPCAuMDUpIHtcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICB2YXIgc2hvdCA9IHNobXVwLmVuZW15QnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3Qud2lkdGggPSBzaG90LmhlaWdodCA9IDMwO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmMDAwMDtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBzaG90LmJvZHkudmVsb2NpdHkueCA9IDA7XG4gICAgICAgIHNob3QuYm9keS52ZWxvY2l0eS55ID0gMjUwO1xuICAgIH1cbn07XG52YXIgYWltZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3RUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyID4gMS41ICYmIGdhbWUucm5kLmZyYWMoKSA8IC4wMikge1xuICAgICAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgICAgIHZhciBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmYTBmZjtcbiAgICAgICAgc2hvdC5oZWlnaHQgPSBzaG90LndpZHRoID0gMjU7XG4gICAgICAgIHNob3QueCA9IHRoaXMueDtcbiAgICAgICAgc2hvdC55ID0gdGhpcy55O1xuICAgICAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgICAgICBzaG90LmJvZHkuc2V0U2l6ZShzaG90LndpZHRoICogU0hPVF9CT0RZX1NDQUxFLCBzaG90LmhlaWdodCAqIFNIT1RfQk9EWV9TQ0FMRSk7XG4gICAgICAgIHNob3QucmV2aXZlKCk7XG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUubW92ZVRvT2JqZWN0KHNob3QsIHNobXVwLnBsYXllciwgMzAwKTtcbiAgICB9XG59O1xudmFyIGZhdEFpbWVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG90VGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA+IDEuNSAmJiBnYW1lLnJuZC5mcmFjKCkgPCAuMDUpIHtcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICB2YXIgc2hvdCA9IHNobXVwLmVuZW15QnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgc2hvdC50aW50ID0gMHhmZmZmMDA7XG4gICAgICAgIHNob3QuaGVpZ2h0ID0gMzA7XG4gICAgICAgIHNob3Qud2lkdGggPSAzMDtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgIHNob3QuYm9keS5zZXRTaXplKHNob3Qud2lkdGggKiBTSE9UX0JPRFlfU0NBTEUsIHNob3QuaGVpZ2h0ICogU0hPVF9CT0RZX1NDQUxFKTtcbiAgICAgICAgc2hvdC5yZXZpdmUoKTtcbiAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS5tb3ZlVG9PYmplY3Qoc2hvdCwgc2htdXAucGxheWVyLCAyMDApO1xuICAgIH1cbn07XG52YXIgYnVyc3QgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3RUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyID4gMSAmJiBnYW1lLnJuZC5mcmFjKCkgPCAwLjAxKSB7XG4gICAgICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IC0yOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2hvdCA9IHNobXVwLmVuZW15QnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgICAgIHNob3QudGludCA9IDB4ZmY4MDgwO1xuICAgICAgICAgICAgc2hvdC5oZWlnaHQgPSBzaG90LndpZHRoID0gMTU7XG4gICAgICAgICAgICBzaG90LnggPSB0aGlzLng7XG4gICAgICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgICAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgICAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICAgICAgc2hvdC5yZXZpdmUoKTtcbiAgICAgICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUudmVsb2NpdHlGcm9tQW5nbGUoOTAgKyAoMTUgKiBpKSwgMjAwLCBzaG90LmJvZHkudmVsb2NpdHkpO1xuICAgICAgICB9XG4gICAgfVxufTtcbnZhciBkb3VibGVTdHJhaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2hvdFRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPiAuNzUgJiYgZ2FtZS5ybmQuZnJhYygpIDwgLjA1KSB7XG4gICAgICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICAgICAgdmFyIHNob3QgPSBzaG11cC5lbmVteUJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgICAgIHNob3QueCA9IHRoaXMueCAtIDIwO1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3Qud2lkdGggPSBzaG90LmhlaWdodCA9IDIwO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmMDAwMDtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBzaG90LmJvZHkudmVsb2NpdHkueCA9IDA7XG4gICAgICAgIHNob3QuYm9keS52ZWxvY2l0eS55ID0gMjUwO1xuICAgICAgICBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnggPSB0aGlzLnggKyAyMDtcbiAgICAgICAgc2hvdC55ID0gdGhpcy55O1xuICAgICAgICBzaG90LndpZHRoID0gc2hvdC5oZWlnaHQgPSAyMDtcbiAgICAgICAgc2hvdC50aW50ID0gMHhmZjAwMDA7XG4gICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgIHNob3QuYm9keS5zZXRTaXplKHNob3Qud2lkdGggKiBTSE9UX0JPRFlfU0NBTEUsIHNob3QuaGVpZ2h0ICogU0hPVF9CT0RZX1NDQUxFKTtcbiAgICAgICAgc2hvdC5yZXZpdmUoKTtcbiAgICAgICAgc2hvdC5ib2R5LnZlbG9jaXR5LnggPSAwO1xuICAgICAgICBzaG90LmJvZHkudmVsb2NpdHkueSA9IDI1MDtcbiAgICB9XG59O1xudmFyIHNtYWxsQWltZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3RUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyID4gMC41ICYmIGdhbWUucm5kLmZyYWMoKSA8IC4wMikge1xuICAgICAgICAvLyBhZGQgc2hvdHNcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICB2YXIgc2hvdCA9IHNobXVwLmVuZW15QnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgc2hvdC50aW50ID0gMHhmZjgwZmY7XG4gICAgICAgIHNob3QueCA9IHRoaXMueDtcbiAgICAgICAgc2hvdC55ID0gdGhpcy55O1xuICAgICAgICBzaG90LmhlaWdodCA9IHNob3Qud2lkdGggPSAyMDtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm1vdmVUb09iamVjdChzaG90LCBzaG11cC5wbGF5ZXIsIDMwMCk7XG4gICAgfVxufTtcbnZhciBjaXJjbGVCdXJzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2hvdFRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPiAzICYmIGdhbWUucm5kLmZyYWMoKSA8IDAuMDUpIHtcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDEyOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICAgICAgc2hvdC50aW50ID0gMHhmZjgwODA7XG4gICAgICAgICAgICBzaG90LmhlaWdodCA9IHNob3Qud2lkdGggPSAxNTtcbiAgICAgICAgICAgIHNob3QueCA9IHRoaXMueDtcbiAgICAgICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgICAgICBzaG90LmJvZHkuc2V0U2l6ZShzaG90LndpZHRoICogU0hPVF9CT0RZX1NDQUxFLCBzaG90LmhlaWdodCAqIFNIT1RfQk9EWV9TQ0FMRSk7XG4gICAgICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS52ZWxvY2l0eUZyb21BbmdsZSg5MCArICgzMCAqIGkpLCAxMjUsIHNob3QuYm9keS52ZWxvY2l0eSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xudmFyIHNpbmdsZVJhbmRvbSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2hvdFRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPiAuNzUgJiYgZ2FtZS5ybmQuZnJhYygpIDwgLjA1KSB7XG4gICAgICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICAgICAgdmFyIHNob3QgPSBzaG11cC5lbmVteUJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgICAgIHNob3QueCA9IHRoaXMueDtcbiAgICAgICAgc2hvdC55ID0gdGhpcy55O1xuICAgICAgICBzaG90LndpZHRoID0gc2hvdC5oZWlnaHQgPSAzMDtcbiAgICAgICAgc2hvdC50aW50ID0gMHhmZjAwMDA7XG4gICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgIHNob3QuYm9keS5zZXRTaXplKHNob3Qud2lkdGggKiBTSE9UX0JPRFlfU0NBTEUsIHNob3QuaGVpZ2h0ICogU0hPVF9CT0RZX1NDQUxFKTtcbiAgICAgICAgc2hvdC5yZXZpdmUoKTtcbiAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS52ZWxvY2l0eUZyb21BbmdsZSg5MCArIChnYW1lLnJuZC5iZXR3ZWVuKC0zMCwgMzApKSwgMjAwLCBzaG90LmJvZHkudmVsb2NpdHkpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGVuZW15U2hvdHM6IFtzdHJhaWdodCwgYWltZWQsIGZhdEFpbWVkLCBidXJzdCwgZG91YmxlU3RyYWlnaHRdLFxuICAgIGJvc3NTaG90czogW2FpbWVkLCBmYXRBaW1lZCwgYnVyc3QsIHNtYWxsQWltZWQsIGNpcmNsZUJ1cnN0LCBzaW5nbGVSYW5kb21dXG59OyIsIi8qIGdsb2JhbCBzaG11cCwgZ2FtZSwgUGhhc2VyICovXG52YXIgRW5lbXkgPSByZXF1aXJlKCcuLi9lbnRpdHkvZW5lbXknKTtcbnZhciBNb3ZlbWVudFR5cGVzID0gcmVxdWlyZSgnLi4vdXRpbC9tb3ZlbWVudCcpO1xudmFyIFNob3RUeXBlcyA9IHJlcXVpcmUoJy4uL3V0aWwvc2hvdCcpO1xudmFyIEJvc3MgPSByZXF1aXJlKCcuLi9lbnRpdHkvYm9zcycpO1xuXG52YXIgTVVTSUNfVFJBQ0tTID0gW1xuICAgICdidXJuaW5nX2VuZ2luZXMnLFxuICAgICdjaGFsbGVuZ2UnLFxuICAgICdkb3dudG93bicsXG4gICAgJ2Z0bCcsXG4gICAgJ2dyYW5kX3ByaXgnXG5dO1xudmFyIE1VU0lDX1ZPTFVNRSA9IDAuMTtcblxudmFyIElOVFJPX0xFTkdUSCA9IDUwMDtcbnZhciBPVVRST19MRU5HVEggPSA1MDA7XG52YXIgV0FSUF9TUEVFRCA9IDMwMDA7XG5cbi8vIFNlZWQgaXMgYSBzdHJpbmcgdGhhdCB3aWxsIGJlIHVzZWQgdG8gaW5pdCB0aGUgUk5HLlxuLy8gRGlmZmljdWx0eSBpcyBhIG51bWJlciAxLTUgZm9yIG5vcm1hbCBwbGF5LCBoaWdoZXIgZm9yIGNoYWxsZW5nZSBtb2Rlc1xudmFyIFN0YWdlID0gZnVuY3Rpb24oc2VlZCwgZGlmZmljdWx0eSkge1xuICAgIHZhciBzdGFnZU51bWJlciA9IHNobXVwLmRhdGEuZ2FtZS5jaGFsbGVuZ2UgPyBcIkNIQUxMRU5HRSBNT0RFXCIgOiBcIlNUQUdFIFwiICsgc2htdXAuZGF0YS5nYW1lLmhpc3RvcnkubGVuZ3RoO1xuICAgIHZhciBzdGFnZU51bWJlclRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMTUwLCAnZm9udCcsIHN0YWdlTnVtYmVyLCA0MCk7XG4gICAgc3RhZ2VOdW1iZXJUZXh0LmFuY2hvci5zZXQoMC41KTtcbiAgICB2YXIgc3RhZ2VOYW1lVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAyMDAsICdmb250JywgJ1wiJyArIHNobXVwLmRhdGEuc3RhZ2UubmFtZSArICdcIicsIDM2KTtcbiAgICBzdGFnZU5hbWVUZXh0LmFuY2hvci5zZXQoMC41KTtcbiAgICBzdGFnZU5hbWVUZXh0LmFscGhhID0gMDtcbiAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZChJTlRST19MRU5HVEggLyA0ICogMywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGdhbWUuYWRkLnR3ZWVuKHN0YWdlTnVtYmVyVGV4dCkudG8oe1xuICAgICAgICAgICAgYWxwaGE6IDBcbiAgICAgICAgfSwgSU5UUk9fTEVOR1RIIC8gNCwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgIGdhbWUuYWRkLnR3ZWVuKHN0YWdlTmFtZVRleHQpLnRvKHtcbiAgICAgICAgICAgIGFscGhhOiAwXG4gICAgICAgIH0sIElOVFJPX0xFTkdUSCAvIDQsIG51bGwsIHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5kaWZmaWN1bHR5ID0gZGlmZmljdWx0eTtcbiAgICBnYW1lLnJuZC5zb3coW3NlZWRdKTtcbiAgICB0aGlzLnRyYWNrTmFtZSA9IGdhbWUucm5kLnBpY2soTVVTSUNfVFJBQ0tTKTtcbiAgICB0aGlzLmJhY2tncm91bmQgPSBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIDgwMCwgNjAwLCAnc3RhcmZpZWxkJyk7XG4gICAgdGhpcy5iYWNrZ3JvdW5kLmZpeGVkVG9DYW1lcmEgPSB0cnVlO1xuICAgIHRoaXMuYmFja2dyb3VuZFNwZWVkID0gMDtcbiAgICB0aGlzLmJhY2tncm91bmQuYWxwaGEgPSAwLjQ7XG4gICAgdGhpcy53YXZlcyA9IFtdO1xuICAgIHZhciBudW1XYXZlcyA9IDkgKyAoZGlmZmljdWx0eSAqIDMpO1xuICAgIHRoaXMuc2Vjb25kc0JldHdlZW5XYXZlcyA9ICg2LjUgLSB0aGlzLmRpZmZpY3VsdHkgKiAwLjUpO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBudW1XYXZlczsgaSsrKVxuICAgICAgICB0aGlzLndhdmVzLnB1c2gobmV3IFdhdmUoZGlmZmljdWx0eSkpO1xuICAgIHRoaXMud2F2ZXMucHVzaChuZXcgQm9zc1dhdmUoZGlmZmljdWx0eSkpO1xuICAgIHNobXVwLmRhdGEuc3RhZ2UudG90YWxFbmVtaWVzID0gMDtcbiAgICBzaG11cC5kYXRhLnN0YWdlLnRvdGFsVWZvcyA9IDA7XG4gICAgc2htdXAuZGF0YS5zaGlwLnVmb3NLaWxsZWQgPSAwO1xuICAgIHRoaXMud2F2ZXMuZm9yRWFjaChmdW5jdGlvbih3YXZlKSB7XG4gICAgICAgIGlmICh3YXZlLm51bWJlckluV2F2ZSlcbiAgICAgICAgICAgIHNobXVwLmRhdGEuc3RhZ2UudG90YWxFbmVtaWVzICs9IE1hdGguY2VpbCh3YXZlLm51bWJlckluV2F2ZSk7XG4gICAgfSk7XG4gICAgLy8gQm9udXMgVUZPc1xuICAgIHZhciBzdGFnZUxlbmd0aFNlY29uZHMgPSBudW1XYXZlcyAqIHRoaXMuc2Vjb25kc0JldHdlZW5XYXZlcztcbiAgICBzaG11cC5kYXRhLnN0YWdlLnRvdGFsVWZvcyA9IHRoaXMubnVtVWZvcyA9IGRpZmZpY3VsdHk7XG4gICAgdGhpcy51Zm9zU2VlbiA9IDA7XG4gICAgdGhpcy50aW1lQmV0d2VlblVmb3MgPSBzdGFnZUxlbmd0aFNlY29uZHMgLyB0aGlzLm51bVVmb3M7XG5cbiAgICB0aGlzLnVwZGF0ZVRpbWVyID0gMDtcbiAgICB0aGlzLnVmb1RpbWVyID0gdGhpcy50aW1lQmV0d2VlblVmb3MgLyAyO1xuXG4gICAgdGhpcy5zdGFnZVN0YXRlID0gdGhpcy5JTlRSTztcbiAgICB0aGlzLnN0YXRlVHdlZW4gPSBudWxsO1xuICAgIGlmIChzaG11cC5tdXNpYykgc2htdXAubXVzaWMuc3RvcCgpO1xuICAgIHNobXVwLm11c2ljID0gZ2FtZS5zb3VuZC5wbGF5KHRoaXMudHJhY2tOYW1lLCBNVVNJQ19WT0xVTUUsIHRydWUpO1xufTtcblN0YWdlLnByb3RvdHlwZSA9IHt9O1xuU3RhZ2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3RhZ2U7XG5TdGFnZS5wcm90b3R5cGUuSU5UUk8gPSAwO1xuU3RhZ2UucHJvdG90eXBlLk1BSU4gPSAxO1xuU3RhZ2UucHJvdG90eXBlLk9VVFRSTyA9IDI7XG5TdGFnZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iYWNrZ3JvdW5kLnRpbGVQb3NpdGlvbi55ICs9IHRoaXMuYmFja2dyb3VuZFNwZWVkICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHN3aXRjaCAodGhpcy5zdGFnZVN0YXRlKSB7XG4gICAgICAgIGNhc2UgdGhpcy5JTlRSTzpcbiAgICAgICAgICAgIGlmICghdGhpcy5zdGF0ZVR3ZWVuKSB7XG4gICAgICAgICAgICAgICAgc2htdXAucGxheWVyLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2htdXAuaW5wdXQuaW5wdXREaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc2htdXAucGxheWVyLnggPSA0MDA7XG4gICAgICAgICAgICAgICAgc2htdXAucGxheWVyLnkgPSA2MDA7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVR3ZWVuID0gZ2FtZS5hZGQudHdlZW4oc2htdXAucGxheWVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4udG8oe1xuICAgICAgICAgICAgICAgICAgICB5OiAzMDBcbiAgICAgICAgICAgICAgICB9LCBJTlRST19MRU5HVEggLyAyLCBQaGFzZXIuRWFzaW5nLlNpbnVzb2lkYWwuT3V0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4udG8oe1xuICAgICAgICAgICAgICAgICAgICB5OiA1MDBcbiAgICAgICAgICAgICAgICB9LCBJTlRST19MRU5HVEggLyAyLCBQaGFzZXIuRWFzaW5nLlNpbnVzb2lkYWwuSW5PdXQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2Vlbi5vbkNvbXBsZXRlLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2htdXAucGxheWVyLmFsaXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgc2htdXAuaW5wdXQuaW5wdXREaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWdlU3RhdGUgPSB0aGlzLk1BSU47XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2VlbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVR3ZWVuLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgZ2FtZS5hZGQudHdlZW4odGhpcykudG8oe1xuICAgICAgICAgICAgICAgICAgICAvLyBiYWNrZ3JvdW5kU3BlZWQ6IDYwMFxuICAgICAgICAgICAgICAgIH0sIElOVFJPX0xFTkdUSCwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0aGlzLk1BSU46XG4gICAgICAgICAgICB0aGlzLndhdmVzWzBdLnVwZGF0ZSgpO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICAgICAgICAgIGlmICh0aGlzLndhdmVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNobXVwLmVuZW1pZXMudG90YWwgPT0gMCkgdGhpcy5zdGFnZVN0YXRlID0gdGhpcy5PVVRUUk87XG4gICAgICAgICAgICAgICAgZWxzZSByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lciA+IHRoaXMuc2Vjb25kc0JldHdlZW5XYXZlcykge1xuICAgICAgICAgICAgICAgIHRoaXMud2F2ZXMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy51Zm9UaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgICAgICAgICBpZiAodGhpcy51Zm9UaW1lciA+IHRoaXMudGltZUJldHdlZW5VZm9zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51Zm9UaW1lciAtPSB0aGlzLnRpbWVCZXR3ZWVuVWZvcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy51Zm9zU2VlbisrIDwgdGhpcy5udW1VZm9zKSBzaG11cC5lbmVtaWVzLmFkZChuZXcgVWZvKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdGhpcy5PVVRUUk86XG4gICAgICAgICAgICBpZiAoIXRoaXMuc3RhdGVUd2Vlbikge1xuICAgICAgICAgICAgICAgIHNobXVwLnBsYXllci5hbGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNobXVwLmVuZW15QnVsbGV0cy5jYWxsQWxsKCdraWxsJyk7XG4gICAgICAgICAgICAgICAgc2htdXAucGxheWVyLmJvZHkucmVzZXQoc2htdXAucGxheWVyLngsIHNobXVwLnBsYXllci55KTtcbiAgICAgICAgICAgICAgICBzaG11cC5pbnB1dC5pbnB1dERpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4gPSBnYW1lLmFkZC50d2VlbihzaG11cC5wbGF5ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2Vlbi50byh7XG4gICAgICAgICAgICAgICAgICAgIHg6IDQwMCxcbiAgICAgICAgICAgICAgICAgICAgeTogNTAwXG4gICAgICAgICAgICAgICAgfSwgT1VUUk9fTEVOR1RIIC8gMiwgUGhhc2VyLkVhc2luZy5TaW51c29pZGFsLk91dCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVR3ZWVuLnRvKHtcbiAgICAgICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgICAgIH0sIE9VVFJPX0xFTkdUSCAvIDIsIFBoYXNlci5FYXNpbmcuU2ludXNvaWRhbC5Jbik7XG4gICAgICAgICAgICAgICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoT1VUUk9fTEVOR1RIIC8gMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbWUuYWRkLnR3ZWVuKHRoaXMpLnRvKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJhY2tncm91bmRTcGVlZDogV0FSUF9TUEVFRFxuICAgICAgICAgICAgICAgICAgICB9LCBPVVRST19MRU5HVEggLyAyLCBudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4uc3RhcnQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4ub25Db21wbGV0ZS5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNobXVwLmRhdGEuZ2FtZS50aWVyKys7XG4gICAgICAgICAgICAgICAgICAgIHNobXVwLmRhdGEuZ2FtZS5pbmRleCA9IHNobXVwLmRhdGEuc3RhZ2UuaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ2NvbXBsZXRlJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG59O1xuXG52YXIgV2F2ZSA9IGZ1bmN0aW9uKGRpZmZpY3VsdHkpIHtcbiAgICB0aGlzLmlzQ29tcGxldGUgPSBmYWxzZTtcbiAgICB0aGlzLnRpbWVUb0FkZCA9IDA7XG4gICAgdGhpcy5udW1iZXJBZGRlZCA9IDA7XG4gICAgdGhpcy5lbmVtaWVzID0gW107XG4gICAgLy8gc2V0IHVwIHNpbmdsZSBiYXRjaCBvZiBlbmVtaWVzXG4gICAgdmFyIGVuZW15VHlwZSA9IGdhbWUucm5kLmJldHdlZW4oMSwgMyk7XG4gICAgdGhpcy5oZWFsdGhSYXRpbmcgPSBlbmVteVR5cGUgKiAzO1xuICAgIHRoaXMubnVtYmVySW5XYXZlID0gOSAvIGVuZW15VHlwZTtcbiAgICB0aGlzLnRpbWVCZXR3ZWVuQWRkaW5nID0gMC4zNSAqIGVuZW15VHlwZTtcbiAgICB0aGlzLm1vdmVtZW50UGF0dGVybiA9IGdhbWUucm5kLnBpY2soTW92ZW1lbnRUeXBlcyk7XG4gICAgdGhpcy5zaG90UGF0dGVybiA9IGdhbWUucm5kLnBpY2soU2hvdFR5cGVzLmVuZW15U2hvdHMpO1xuICAgIHRoaXMuaW1hZ2VLZXkgPSBnYW1lLnJuZC5waWNrKEVuZW15LnByb3RvdHlwZS5JTUFHRV9LRVlTKTtcbn07XG5XYXZlLnByb3RvdHlwZSA9IHt9O1xuV2F2ZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBXYXZlO1xuV2F2ZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50aW1lVG9BZGQgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnRpbWVUb0FkZCA+IHRoaXMudGltZUJldHdlZW5BZGRpbmcgJiYgdGhpcy5udW1iZXJBZGRlZCA8IHRoaXMubnVtYmVySW5XYXZlKSB7XG4gICAgICAgIHRoaXMudGltZVRvQWRkID0gMDtcbiAgICAgICAgdGhpcy5udW1iZXJBZGRlZCsrO1xuICAgICAgICB2YXIgZW5lbXkgPSBuZXcgRW5lbXkodGhpcy5pbWFnZUtleSwgdGhpcy5oZWFsdGhSYXRpbmcsXG4gICAgICAgICAgICB0aGlzLm1vdmVtZW50UGF0dGVybiwgdGhpcy5zaG90UGF0dGVybik7XG4gICAgICAgIHNobXVwLmVuZW1pZXMuYWRkKGVuZW15KTtcbiAgICAgICAgdGhpcy5lbmVtaWVzLnB1c2goZW5lbXkpO1xuICAgIH1cbn07XG5cbnZhciBCb3NzV2F2ZSA9IGZ1bmN0aW9uKGRpZmZpY3VsdHkpIHtcbiAgICB0aGlzLmluaXQgPSBmYWxzZTtcbiAgICB0aGlzLmJvc3MgPSBuZXcgQm9zcyhkaWZmaWN1bHR5KTtcbn07XG5Cb3NzV2F2ZS5wcm90b3R5cGUgPSB7fTtcbkJvc3NXYXZlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJvc3NXYXZlO1xuQm9zc1dhdmUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5pbml0KSB7XG4gICAgICAgIHRoaXMuaW5pdCA9IHRydWU7XG4gICAgICAgIHNobXVwLmVuZW1pZXMuYWRkKHRoaXMuYm9zcyk7XG4gICAgICAgIHNobXVwLmh1ZC5zZXRCb3NzKHRoaXMuYm9zcyk7XG4gICAgfVxufTtcblxudmFyIFVGT19JTUFHRV9LRVlTID0gWyd1Zm9CbHVlJywgJ3Vmb0dyZWVuJywgJ3Vmb1JlZCcsICd1Zm9ZZWxsb3cnXTtcbnZhciBVZm8gPSBmdW5jdGlvbigpIHtcbiAgICBQaGFzZXIuU3ByaXRlLmNhbGwodGhpcywgZ2FtZSwgMCwgNjAsIGdhbWUucm5kLnBpY2soVUZPX0lNQUdFX0tFWVMpKTtcbiAgICB0aGlzLmFuY2hvci5zZXQoMC41KTtcbiAgICB0aGlzLmFscGhhID0gMDtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZSh0aGlzKTtcbiAgICB0aGlzLmJvZHkuc2V0U2l6ZSh0aGlzLmJvZHkud2lkdGggKiAuOCwgdGhpcy5ib2R5LmhlaWdodCAqIC44KTtcbiAgICB0aGlzLmNoZWNrV29ybGRCb3VuZHMgPSB0cnVlO1xuICAgIHRoaXMub3V0T2ZCb3VuZHNLaWxsID0gdHJ1ZTtcbiAgICB0aGlzLmhlYWx0aCA9IDUwMDtcbiAgICB0aGlzLmJvZHkudmVsb2NpdHkueCA9IDE2MDtcbiAgICB0aGlzLmV2ZW50cy5vbktpbGxlZC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmhlYWx0aCA+IDApIHJldHVybjtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLnVmb3NLaWxsZWQrKztcbiAgICAgICAgLy8gc2htdXAuZW1pdHRlci5idXJzdCh0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIHNobXVwLmRhdGEuc2hpcC5zY29yZSArPSAxMDAwMDtcbiAgICAgICAgLy8gZ2FtZS5zb3VuZC5wbGF5KCdleHBsb2RlJyArIGdhbWUucm5kLmJldHdlZW4oMSwgNiksIDAuMik7XG4gICAgfSwgdGhpcyk7XG59O1xuVWZvLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLlNwcml0ZS5wcm90b3R5cGUpO1xuVWZvLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFVmbztcblVmby5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhpcy5hbmdsZSArPSAxMjAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0YWdlOyJdfQ==
