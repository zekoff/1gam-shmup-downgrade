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
        game.add.bitmapText(500, 300, 'font', 'downgrade', 50).anchor.set(0.5);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4yLjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZW50aXR5L2Jvc3MuanMiLCJzcmMvZW50aXR5L2VtaXR0ZXIuanMiLCJzcmMvZW50aXR5L2VuZW15LmpzIiwic3JjL2VudGl0eS9odWQuanMiLCJzcmMvZW50aXR5L3BpY2t1cC5qcyIsInNyYy9lbnRpdHkvcGxheWVyLmpzIiwic3JjL2VudGl0eS93ZWFwb25fZGlzcGxheS5qcyIsInNyYy9zdGFydHVwLmpzIiwic3JjL3N0YXRlL2NoYWxsZW5nZS5qcyIsInNyYy9zdGF0ZS9jb21wbGV0ZS5qcyIsInNyYy9zdGF0ZS9nYW1lb3Zlci5qcyIsInNyYy9zdGF0ZS9sZXZlbF9zZWxlY3QuanMiLCJzcmMvc3RhdGUvbG9hZC5qcyIsInNyYy9zdGF0ZS9tYWluLmpzIiwic3JjL3N0YXRlL3RpdGxlLmpzIiwic3JjL3N0YXRlL3dpbi5qcyIsInNyYy91dGlsL2J1bGxldHBvb2wuanMiLCJzcmMvdXRpbC9pbnB1dC5qcyIsInNyYy91dGlsL21vdmVtZW50LmpzIiwic3JjL3V0aWwvc2hvdC5qcyIsInNyYy91dGlsL3N0YWdlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCBnYW1lLCBQaGFzZXIsIHNobXVwICovXG52YXIgRW5lbXkgPSByZXF1aXJlKCcuL2VuZW15Jyk7XG52YXIgU2hvdFR5cGVzID0gcmVxdWlyZSgnLi4vdXRpbC9zaG90Jyk7XG5cbnZhciBjcmVhdGVSYW5kb21Mb2NhdGlvblR3ZWVuID0gZnVuY3Rpb24odGFyZ2V0LCB0d2Vlbikge1xuICAgIHR3ZWVuLnRvKHtcbiAgICAgICAgeDogZ2FtZS5ybmQuYmV0d2VlbigxMDAsIDcwMCksXG4gICAgICAgIHk6IGdhbWUucm5kLmJldHdlZW4oMjAsIDMwMClcbiAgICB9LCAyNTAwLCBudWxsLCB0cnVlKTtcbn07XG5cbnZhciBCb3NzID0gZnVuY3Rpb24oZGlmZmljdWx0eSkge1xuICAgIFBoYXNlci5TcHJpdGUuY2FsbCh0aGlzLCBnYW1lLCA0MDAsIDAsIGdhbWUucm5kLnBpY2soRW5lbXkucHJvdG90eXBlLklNQUdFX0tFWVMpKTtcbiAgICB0aGlzLmFuY2hvci5zZXQoMC41KTtcbiAgICB0aGlzLmFscGhhID0gMDtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZSh0aGlzKTtcbiAgICB0aGlzLmJvZHkuc2V0U2l6ZSh0aGlzLmJvZHkud2lkdGggKiAuNywgdGhpcy5ib2R5LmhlaWdodCAqIC43KTtcbiAgICB0aGlzLm1vdmVUaW1lciA9IDA7XG4gICAgdGhpcy5tb3ZlU3RhdGUgPSB0aGlzLklOSVQ7XG4gICAgdGhpcy5tb3ZlVHdlZW4gPSBudWxsO1xuICAgIC8vIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICB0aGlzLnNjYWxlLnNldCgxLjUpO1xuICAgIHRoaXMubWF4SGVhbHRoID0gdGhpcy5oZWFsdGggPSAzMDAwICsgZGlmZmljdWx0eSAqIDEwMDA7IC8vIHNob3QtaW4tdGhlLWRhcmsgZm9yIGJhbGFuY2VcbiAgICB0aGlzLmV2ZW50cy5vbktpbGxlZC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWN0ID0gbmV3IFBoYXNlci5SZWN0YW5nbGUodGhpcy5sZWZ0LCB0aGlzLnRvcCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB2YXIgcCA9IG5ldyBQaGFzZXIuUG9pbnQoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICAgICAgICByZWN0LnJhbmRvbShwKTtcbiAgICAgICAgICAgIC8vIHNobXVwLmVtaXR0ZXIuYnVyc3QocC54LCBwLnkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGdhbWUuc291bmQucGxheSgnYm9zc19leHBsb2RlJywgMC4zKTtcbiAgICAgICAgc2htdXAuaHVkLnNldEJvc3MobnVsbCk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICB0aGlzLndlYXBvbnMgPSBbXTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGlmZmljdWx0eSAqIDM7IGkrKykge1xuICAgICAgICB2YXIgd2VhcG9uID0ge1xuICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgIHk6IDAsXG4gICAgICAgICAgICBzaG90VGltZXI6IDAsXG4gICAgICAgIH07XG4gICAgICAgIHdlYXBvbi5zaG90VXBkYXRlID0gZ2FtZS5ybmQucGljayhTaG90VHlwZXMuYm9zc1Nob3RzKS5iaW5kKHdlYXBvbik7XG4gICAgICAgIHRoaXMud2VhcG9ucy5wdXNoKHdlYXBvbik7XG4gICAgfVxufTtcbkJvc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuU3ByaXRlLnByb3RvdHlwZSk7XG5Cb3NzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJvc3M7XG5Cb3NzLnByb3RvdHlwZS5JTklUID0gMDtcbkJvc3MucHJvdG90eXBlLlBBTiA9IDE7XG5Cb3NzLnByb3RvdHlwZS5SQU5ET00gPSAyO1xuQm9zcy5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmFsaXZlKSByZXR1cm47IC8vIHNlZW1zIGxpa2UgdGhpcyBzaG91bGQgYmUgdGhlIGRlZmF1bHQgYmVoYXZpb3IgaW4gUGhhc2VyLi4uXG4gICAgLy8gaGFuZGxlIG1vdmVtZW50IGJhc2VkIG9uIG1vdmUgc3RhdGUgLyBoZWFsdGhcbiAgICB2YXIgd2VhcG9uc0VuZ2FnZWQgPSAxO1xuICAgIHN3aXRjaCAodGhpcy5tb3ZlU3RhdGUpIHtcbiAgICAgICAgY2FzZSB0aGlzLklOSVQ6XG4gICAgICAgICAgICB3ZWFwb25zRW5nYWdlZCA9IE1hdGguY2VpbCh0aGlzLndlYXBvbnMubGVuZ3RoIC8gMyk7XG4gICAgICAgICAgICBpZiAodGhpcy55IDwgMTUwKSB0aGlzLnkgKz0gMzAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgICAgICAgICBpZiAodGhpcy5oZWFsdGggPCB0aGlzLm1heEhlYWx0aCAqIC43KSB0aGlzLm1vdmVTdGF0ZSA9IHRoaXMuUEFOO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdGhpcy5QQU46XG4gICAgICAgICAgICB3ZWFwb25zRW5nYWdlZCA9IE1hdGguY2VpbCh0aGlzLndlYXBvbnMubGVuZ3RoIC8gMykgKiAyO1xuICAgICAgICAgICAgaWYgKCF0aGlzLm1vdmVUd2Vlbikge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVR3ZWVuID0gZ2FtZS50d2VlbnMuY3JlYXRlKHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVR3ZWVuLnRvKHtcbiAgICAgICAgICAgICAgICAgICAgeDogNjUwXG4gICAgICAgICAgICAgICAgfSwgMzAwMCwgbnVsbCwgZmFsc2UsIDAsIC0xLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBnYW1lLmFkZC50d2Vlbih0aGlzKS50byh7XG4gICAgICAgICAgICAgICAgICAgIHg6IDE1MFxuICAgICAgICAgICAgICAgIH0sIDE1MDAsIG51bGwsIHRydWUpLmNoYWluKHRoaXMubW92ZVR3ZWVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmhlYWx0aCA8IHRoaXMubWF4SGVhbHRoICogLjM1KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlVHdlZW4uc3RvcCgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVR3ZWVuID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVTdGF0ZSA9IHRoaXMuUkFORE9NO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdGhpcy5SQU5ET006XG4gICAgICAgICAgICB3ZWFwb25zRW5nYWdlZCA9IHRoaXMud2VhcG9ucy5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoIXRoaXMubW92ZVR3ZWVuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlVHdlZW4gPSBnYW1lLmFkZC50d2Vlbih0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVUd2Vlbi5vbkNvbXBsZXRlLmFkZChjcmVhdGVSYW5kb21Mb2NhdGlvblR3ZWVuKTtcbiAgICAgICAgICAgICAgICBjcmVhdGVSYW5kb21Mb2NhdGlvblR3ZWVuKG51bGwsIHRoaXMubW92ZVR3ZWVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgd2VhcG9uc0VuZ2FnZWQ7IGkrKykge1xuICAgICAgICB0aGlzLndlYXBvbnNbaV0ueCA9IHRoaXMueDtcbiAgICAgICAgdGhpcy53ZWFwb25zW2ldLnkgPSB0aGlzLnk7XG4gICAgICAgIHRoaXMud2VhcG9uc1tpXS5zaG90VXBkYXRlKCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb3NzOyIsIi8qIGdsb2JhbCBnYW1lICovXG5cbnZhciBFbWl0dGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lbWl0dGVyID0gZ2FtZS5hZGQuZW1pdHRlcigwLCAwLCA0MDApO1xuICAgIHRoaXMuZW1pdHRlci5tYWtlUGFydGljbGVzKCdleHBsb3Npb24nKTtcbiAgICB0aGlzLmVtaXR0ZXIuc2V0U2NhbGUoMC4yLCAwLjQsIDAuMiwgMC40KTtcbn07XG5FbWl0dGVyLnByb3RvdHlwZSA9IHt9O1xuRW1pdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFbWl0dGVyO1xuRW1pdHRlci5wcm90b3R5cGUuYnVyc3QgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5lbWl0dGVyLnggPSB4O1xuICAgIHRoaXMuZW1pdHRlci55ID0geTtcbiAgICB0aGlzLmVtaXR0ZXIuc3RhcnQodHJ1ZSwgMzAwLCBudWxsLCAxMCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiLyogZ2xvYmFsIGdhbWUsIFBoYXNlciwgc2htdXAgKi9cbnZhciBQaWNrdXAgPSByZXF1aXJlKCcuL3BpY2t1cCcpO1xuXG52YXIgRW5lbXkgPSBmdW5jdGlvbihpbWFnZUtleSwgaGVhbHRoUmF0aW5nLCBtb3ZlbWVudEZ1bmN0aW9uLCBzaG90RnVuY3Rpb24pIHtcbiAgICBQaGFzZXIuU3ByaXRlLmNhbGwodGhpcywgZ2FtZSwgMCwgMCwgaW1hZ2VLZXkpO1xuICAgIHByaW50KHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICB0aGlzLmFuY2hvci5zZXQoMC41KTtcbiAgICB0aGlzLmFscGhhID0gMDtcbiAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLmVuYWJsZSh0aGlzKTtcbiAgICB0aGlzLmJvZHkuc2V0U2l6ZSh0aGlzLmJvZHkud2lkdGggKiAuOCwgdGhpcy5ib2R5LmhlaWdodCAqIC44KTtcbiAgICB0aGlzLmNoZWNrV29ybGRCb3VuZHMgPSB0cnVlO1xuICAgIHRoaXMub3V0T2ZCb3VuZHNLaWxsID0gdHJ1ZTtcbiAgICB0aGlzLm1vdmVUaW1lciA9IDA7XG4gICAgdGhpcy5zcGVlZEZhY3RvciA9IGhlYWx0aFJhdGluZyAvIDM7IC8vIGhpZ2hlciBzcGVlZCBmYWN0b3IgaXMgc2xvd2VyICg/KVxuICAgIHRoaXMuc3BlZWRGYWN0b3IgKj0gMC41O1xuICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICB0aGlzLnNjYWxlLnNldChoZWFsdGhSYXRpbmcgLyAxMCk7XG4gICAgdGhpcy5oZWFsdGggPSBoZWFsdGhSYXRpbmcgKiBoZWFsdGhSYXRpbmcgLyAyICogMTA7XG4gICAgdGhpcy5tb3ZlVXBkYXRlID0gbW92ZW1lbnRGdW5jdGlvbi5iaW5kKHRoaXMpO1xuICAgIGlmIChzaG90RnVuY3Rpb24pXG4gICAgICAgIHRoaXMuc2hvdFVwZGF0ZSA9IHNob3RGdW5jdGlvbi5iaW5kKHRoaXMpO1xuICAgIHRoaXMuZXZlbnRzLm9uS2lsbGVkLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuaGVhbHRoID4gMCkgcmV0dXJuO1xuICAgICAgICAvLyBzaG11cC5lbWl0dGVyLmJ1cnN0KHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLnNjb3JlICs9IGhlYWx0aFJhdGluZyAqIDEwMDtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLmVuZW1pZXNLaWxsZWQrKztcbiAgICAgICAgdmFyIHBpY2t1cENoYW5jZSA9IDAuOSAtIChzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYSArIGI7XG4gICAgICAgIH0pIC8gMjApO1xuICAgICAgICBpZiAoZ2FtZS5ybmQuZnJhYygpIDwgcGlja3VwQ2hhbmNlKSBzaG11cC5waWNrdXBzLmFkZChuZXcgUGlja3VwKHRoaXMueCwgdGhpcy55KSk7XG4gICAgICAgIC8vIGdhbWUuc291bmQucGxheSgnZXhwbG9kZScgKyBnYW1lLnJuZC5iZXR3ZWVuKDEsIDYpLCAwLjIpO1xuICAgIH0sIHRoaXMpO1xufTtcbkVuZW15LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLlNwcml0ZS5wcm90b3R5cGUpO1xuRW5lbXkucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW5lbXk7XG5FbmVteS5wcm90b3R5cGUuSU1BR0VfS0VZUyA9IFtdO1xuWydCbGFjaycsICdCbHVlJywgJ0dyZWVuJywgJ1JlZCddLmZvckVhY2goZnVuY3Rpb24oY29sb3IpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IDY7IGkrKykge1xuICAgICAgICBFbmVteS5wcm90b3R5cGUuSU1BR0VfS0VZUy5wdXNoKCdlbmVteScgKyBjb2xvciArIGkpO1xuICAgIH1cbn0pO1xuXG5FbmVteS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmFsaXZlKSByZXR1cm47XG4gICAgLy8gdGhpcy5yb3RhdGlvbiA9IFBoYXNlci5NYXRoLmFuZ2xlQmV0d2VlblBvaW50cyh0aGlzLnByZXZpb3VzUG9zaXRpb24sIHRoaXMpIC0gKE1hdGguUEkgLyAyKTtcbiAgICB0aGlzLm1vdmVVcGRhdGUoKTtcbiAgICBpZiAodGhpcy5zaG90VXBkYXRlKVxuICAgICAgICB0aGlzLnNob3RVcGRhdGUoKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBFbmVteTsiLCIvKiBnbG9iYWwgUGhhc2VyLCBnYW1lLCBzaG11cCAqL1xudmFyIFdlYXBvbkRpc3BsYXkgPSByZXF1aXJlKCcuL3dlYXBvbl9kaXNwbGF5Jyk7XG5cbnZhciBTVEFSU19GT1JfRVhUUkFfTElGRSA9IDIwO1xuXG52YXIgSHVkID0gZnVuY3Rpb24oKSB7XG4gICAgUGhhc2VyLkdyb3VwLmNhbGwodGhpcywgZ2FtZSk7XG4gICAgdGhpcy5zY29yZVRleHQgPSBnYW1lLm1ha2UuYml0bWFwVGV4dCg3OTAsIDYwMCwgJ2ZvbnQnLCAnU0NPUkU6ICcsIDI0KTtcbiAgICB0aGlzLnNjb3JlVGV4dC5hbmNob3Iuc2V0KDEsIDEpO1xuICAgIHRoaXMubGl2ZXNUZXh0ID0gZ2FtZS5tYWtlLmJpdG1hcFRleHQoMTIwLCA2MDAsICdmb250JywgJ0xJVkVTOiAnLCAyNCk7XG4gICAgdGhpcy5saXZlc1RleHQuYW5jaG9yLnNldCgwLCAxKTtcbiAgICB0aGlzLnN0YXJzVGV4dCA9IGdhbWUubWFrZS5iaXRtYXBUZXh0KDEyMCwgNTUwLCAnZm9udCcsICdTVEFSUzogJywgMTYpO1xuICAgIHRoaXMubGl2ZXNUZXh0LmFuY2hvci5zZXQoMCwgMSk7XG4gICAgdGhpcy5hZGQodGhpcy5zY29yZVRleHQpO1xuICAgIHRoaXMuYWRkKHRoaXMubGl2ZXNUZXh0KTtcbiAgICB0aGlzLmFkZCh0aGlzLnN0YXJzVGV4dCk7XG4gICAgdGhpcy5sYXN0RnJhbWVTY29yZSA9IHRoaXMuZGlzcGxheWVkU2NvcmUgPSBzaG11cC5kYXRhLnNoaXAuc2NvcmU7XG4gICAgdGhpcy5zY29yZVR3ZWVuID0gbnVsbDtcbiAgICB0aGlzLndlYXBvbkRpc3BsYXkgPSBuZXcgV2VhcG9uRGlzcGxheSgpO1xuICAgIHRoaXMuYm9zcyA9IG51bGw7XG4gICAgdGhpcy5ib3NzVGV4dCA9IGdhbWUubWFrZS5iaXRtYXBUZXh0KDQwMCwgNDAsICdmb250JywgXCJCT1NTXCIsIDMyKTtcbiAgICB0aGlzLmJvc3NUZXh0LmFuY2hvci5zZXQoMC41LCAwKTtcbiAgICB0aGlzLmJvc3NUZXh0LmV4aXN0cyA9IGZhbHNlO1xuICAgIHRoaXMuYWRkKHRoaXMuYm9zc1RleHQpO1xuICAgIHRoaXMuYm9zc0hlYWx0aEJhY2tncm91bmQgPSBnYW1lLm1ha2UuaW1hZ2UoNDAwLCAxMCwgJ3BpeCcpO1xuICAgIHRoaXMuYm9zc0hlYWx0aEJhY2tncm91bmQuYW5jaG9yLnNldCgwLjUsIDApO1xuICAgIHRoaXMuYm9zc0hlYWx0aEJhY2tncm91bmQud2lkdGggPSA0MDA7XG4gICAgdGhpcy5ib3NzSGVhbHRoQmFja2dyb3VuZC5oZWlnaHQgPSAyMDtcbiAgICB0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kLmV4aXN0cyA9IGZhbHNlO1xuICAgIHRoaXMuYm9zc0hlYWx0aEJhY2tncm91bmQudGludCA9IDB4NDA0MDQwO1xuICAgIHRoaXMuYWRkKHRoaXMuYm9zc0hlYWx0aEJhY2tncm91bmQpO1xuICAgIHRoaXMuYm9zc0hlYWx0aCA9IGdhbWUubWFrZS5pbWFnZSg0MDAsIDExLCAncGl4Jyk7XG4gICAgdGhpcy5ib3NzSGVhbHRoLmFuY2hvci5zZXQoMC41LCAwKTtcbiAgICB0aGlzLmJvc3NIZWFsdGgud2lkdGggPSAzOTg7XG4gICAgdGhpcy5ib3NzSGVhbHRoLmhlaWdodCA9IDE4O1xuICAgIHRoaXMuYm9zc0hlYWx0aC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmJvc3NIZWFsdGgudGludCA9IDB4Zjg5ZDAwO1xuICAgIHRoaXMuYWRkKHRoaXMuYm9zc0hlYWx0aCk7XG4gICAgdGhpcy5zY29yZVB1bHNlID0gbnVsbDtcbn07XG5IdWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuR3JvdXAucHJvdG90eXBlKTtcbkh1ZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBIdWQ7XG5IdWQucHJvdG90eXBlLnB1bHNlU2NvcmUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiAodGhpcy5zY29yZVB1bHNlKSB0aGlzLnNjb3JlUHVsc2Uuc3RvcCgpO1xuICAgIC8vIHRoaXMuc2NvcmVQdWxzZSA9IGdhbWUuYWRkLnR3ZWVuKHRoaXMuc2NvcmVUZXh0LnNjYWxlKTtcbiAgICAvLyB0aGlzLnNjb3JlUHVsc2UudG8oe1xuICAgIC8vICAgICB4OiAxLjMsXG4gICAgLy8gICAgIHk6IDEuM1xuICAgIC8vIH0sIDMwMCwgUGhhc2VyLkVhc2luZy5DdWJpYy5PdXQpO1xuICAgIC8vIHRoaXMuc2NvcmVQdWxzZS50byh7XG4gICAgLy8gICAgIHg6IDEsXG4gICAgLy8gICAgIHk6IDFcbiAgICAvLyB9LCA1MDAsIFBoYXNlci5FYXNpbmcuQ3ViaWMuSW4pO1xuICAgIC8vIHRoaXMuc2NvcmVQdWxzZS5zdGFydCgpO1xufTtcbkh1ZC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgKHRoaXMubGFzdEZyYW1lU2NvcmUgIT0gc2htdXAuZGF0YS5zaGlwLnNjb3JlKSB7XG4gICAgLy8gICAgIHRoaXMucHVsc2VTY29yZSgpO1xuICAgIC8vICAgICBpZiAodGhpcy5zY29yZVR3ZWVuKSB0aGlzLnNjb3JlVHdlZW4uc3RvcCgpO1xuICAgIC8vICAgICB0aGlzLnNjb3JlVHdlZW4gPSBnYW1lLmFkZC50d2Vlbih0aGlzKTtcbiAgICAvLyAgICAgdGhpcy5zY29yZVR3ZWVuLnRvKHtcbiAgICAvLyAgICAgICAgIGRpc3BsYXllZFNjb3JlOiBzaG11cC5kYXRhLnNoaXAuc2NvcmVcbiAgICAvLyAgICAgfSwgNzUwLCBudWxsLCB0cnVlKTtcbiAgICAvLyB9XG4gICAgaWYgKHNobXVwLmRhdGEuc2hpcC5zdGFycyA+PSBTVEFSU19GT1JfRVhUUkFfTElGRSkge1xuICAgICAgICBzaG11cC5kYXRhLnNoaXAuc3RhcnMgLT0gU1RBUlNfRk9SX0VYVFJBX0xJRkU7XG4gICAgICAgIHNobXVwLmRhdGEuc2hpcC5saXZlcysrO1xuICAgIH1cbiAgICB0aGlzLmxhc3RGcmFtZVNjb3JlID0gc2htdXAuZGF0YS5zaGlwLnNjb3JlO1xuICAgIHRoaXMuc2NvcmVUZXh0LnNldFRleHQoXCJTQ09SRTogXCIgKyBNYXRoLmZsb29yKHNobXVwLmRhdGEuc2hpcC5zY29yZSkpO1xuICAgIHRoaXMubGl2ZXNUZXh0LnNldFRleHQoXCJMSVZFUzogXCIgKyBzaG11cC5kYXRhLnNoaXAubGl2ZXMpO1xuICAgIHRoaXMuc3RhcnNUZXh0LnNldFRleHQoXCJTVEFSUzogXCIgKyBzaG11cC5kYXRhLnNoaXAuc3RhcnMgKyBcIi9cIiArIFNUQVJTX0ZPUl9FWFRSQV9MSUZFKTtcbiAgICBpZiAodGhpcy5ib3NzKVxuICAgICAgICB0aGlzLmJvc3NIZWFsdGgud2lkdGggPSAzOTggKiAodGhpcy5ib3NzLmhlYWx0aCAvIHRoaXMuYm9zcy5tYXhIZWFsdGgpO1xufTtcbkh1ZC5wcm90b3R5cGUuc2V0Qm9zcyA9IGZ1bmN0aW9uKGJvc3MpIHtcbiAgICB0aGlzLmJvc3MgPSBib3NzO1xuICAgIHZhciBib3NzRXhpc3RzID0gYm9zcyB8fCAwO1xuICAgIHRoaXMuYm9zc1RleHQuZXhpc3RzID0gYm9zc0V4aXN0cztcbiAgICB0aGlzLmJvc3NIZWFsdGhCYWNrZ3JvdW5kLmV4aXN0cyA9IGJvc3NFeGlzdHM7XG4gICAgdGhpcy5ib3NzSGVhbHRoLmV4aXN0cyA9IGJvc3NFeGlzdHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEh1ZDsiLCIvKiBnbG9iYWwgUGhhc2VyLCBzaG11cCwgZ2FtZSAqL1xudmFyIFBpY2t1cCA9IGZ1bmN0aW9uKHgsIHksIHBpY2t1cFR5cGUpIHtcbiAgICBpZiAoIXBpY2t1cFR5cGUpIHtcbiAgICAgICAgaWYgKGdhbWUucm5kLmZyYWMoKSA8IDAuOCkgcGlja3VwVHlwZSA9ICdzdGFyJztcbiAgICAgICAgZWxzZSBwaWNrdXBUeXBlID0gZ2FtZS5ybmQucGljayhbJ3Bvd2VydXBfcmVkJywgJ3Bvd2VydXBfZ3JlZW4nLCAncG93ZXJ1cF9ibHVlJ10pO1xuICAgIH1cbiAgICB2YXIgZGlzcGxheUNoYXJhY3Rlck1hcCA9IHtcbiAgICAgICAgJ3N0YXInOiAnKicsXG4gICAgICAgICdwb3dlcnVwX3JlZCc6ICdHJyxcbiAgICAgICAgJ3Bvd2VydXBfZ3JlZW4nOiAnUycsXG4gICAgICAgICdwb3dlcnVwX2JsdWUnOiAnTSdcbiAgICB9O1xuICAgIFBoYXNlci5CaXRtYXBUZXh0LmNhbGwodGhpcywgZ2FtZSwgeCwgeSwgJ2ZvbnQnLCBkaXNwbGF5Q2hhcmFjdGVyTWFwW3BpY2t1cFR5cGVdKTtcbiAgICB0aGlzLnBpY2t1cFR5cGUgPSBwaWNrdXBUeXBlO1xuICAgIHRoaXMuY2hlY2tXb3JsZEJvdW5kcyA9IHRydWU7XG4gICAgdGhpcy5vdXRPZkJvdW5kc0tpbGwgPSB0cnVlO1xuICAgIHRoaXMuYW5jaG9yLnNldCgwLjUpO1xuICAgIGdhbWUucGh5c2ljcy5hcmNhZGUuZW5hYmxlKHRoaXMpO1xuICAgIHRoaXMuYm9keS5hY2NlbGVyYXRpb24ueSA9IDUwO1xuICAgIHN3aXRjaCAocGlja3VwVHlwZSkge1xuICAgICAgICBjYXNlICdwb3dlcnVwX3JlZCc6XG4gICAgICAgICAgICB0aGlzLnBvd2VydXBUeXBlID0gMTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwb3dlcnVwX2dyZWVuJzpcbiAgICAgICAgICAgIHRoaXMucG93ZXJ1cFR5cGUgPSAwO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3Bvd2VydXBfYmx1ZSc6XG4gICAgICAgICAgICB0aGlzLnBvd2VydXBUeXBlID0gMjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzdGFyJzpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5QaWNrdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuQml0bWFwVGV4dC5wcm90b3R5cGUpO1xuUGlja3VwLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBpY2t1cDtcblBpY2t1cC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgKHRoaXMucGlja3VwVHlwZSA9PSAnc3RhcicpIHRoaXMuYW5nbGUgKz0gOTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xuUGlja3VwLnByb3RvdHlwZS5waWNrZWRVcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBpY2t1cFR5cGUgIT0gJ3N0YXInKSB7XG4gICAgICAgIHNobXVwLnBsYXllci5ib29zdFdlYXBvbih0aGlzLnBvd2VydXBUeXBlKTtcbiAgICAgICAgLy8gZ2FtZS5zb3VuZC5wbGF5KCdwaWNrdXBfc3RhcicsIDAuNSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzaG11cC5kYXRhLnNoaXAuc2NvcmUgKz0gMjAwMDtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLnN0YXJzKys7XG4gICAgICAgIC8vIGdhbWUuc291bmQucGxheSgncGlja3VwX3Bvd2VydXAnLCAwLjUpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGlja3VwOyIsIi8qIGdsb2JhbCBQaGFzZXIsIGdhbWUsIHNobXVwICovXG52YXIgUGxheWVyID0gZnVuY3Rpb24oKSB7XG4gICAgUGhhc2VyLlNwcml0ZS5jYWxsKHRoaXMsIGdhbWUsIDQwMCwgNTAwLCAnc2hpcCcpO1xuICAgIGdhbWUucGh5c2ljcy5hcmNhZGUuZW5hYmxlKHRoaXMpO1xuICAgIHRoaXMuYW5jaG9yLnNldCgwLjUpO1xuICAgIHRoaXMuc2NhbGUuc2V0KDAuNSk7XG4gICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgIHRoaXMuYm9keS5zZXRTaXplKHRoaXMuYm9keS53aWR0aCAqIC40LCB0aGlzLmJvZHkuaGVpZ2h0ICogLjQsIDAsIDUpO1xuICAgIHRoaXMuYm9keS5jb2xsaWRlV29ybGRCb3VuZHMgPSB0cnVlO1xuICAgIHRoaXMuYWxwaGEgPSAwO1xuXG4gICAgdGhpcy53ZWFwb25zID0gW3Nob3RndW4sIGdhdGxpbmcsIG1pc3NpbGVdO1xuICAgIHNobXVwLmRhdGEuc2hpcC5jdXJyZW50V2VhcG9uID0gMDtcbiAgICB0aGlzLndlYXBvblVwZGF0ZSA9IHRoaXMud2VhcG9uc1tzaG11cC5kYXRhLnNoaXAuY3VycmVudFdlYXBvbl0uYmluZCh0aGlzKTtcbiAgICB0aGlzLmNoYXJnZVRpbWUgPSAwO1xuICAgIHRoaXMubGFzdEZyYW1lQ2hhcmdpbmcgPSBmYWxzZTtcbn07XG5QbGF5ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuU3ByaXRlLnByb3RvdHlwZSk7XG5QbGF5ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGxheWVyO1xuUGxheWVyLnByb3RvdHlwZS5GQVNUX1NQRUVEID0gMzUwO1xuUGxheWVyLnByb3RvdHlwZS5TTE9XX1NQRUVEID0gMTUwO1xuUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuYWxpdmUpIHJldHVybjtcbiAgICB0aGlzLnNob3RUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgdGhpcy53ZWFwb25VcGRhdGUodGhpcy5hbHRlcm5hdGVGaXJlKTtcbn07XG5QbGF5ZXIucHJvdG90eXBlLmN5Y2xlV2VhcG9uID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCsrc2htdXAuZGF0YS5zaGlwLmN1cnJlbnRXZWFwb24gPiAyKSBzaG11cC5kYXRhLnNoaXAuY3VycmVudFdlYXBvbiA9IDA7XG4gICAgdGhpcy53ZWFwb25VcGRhdGUgPSB0aGlzLndlYXBvbnNbc2htdXAuZGF0YS5zaGlwLmN1cnJlbnRXZWFwb25dLmJpbmQodGhpcyk7XG59O1xuUGxheWVyLnByb3RvdHlwZS5ib29zdFdlYXBvbiA9IGZ1bmN0aW9uKHdlYXBvbk51bWJlcikge1xuICAgIGlmIChzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzW3dlYXBvbk51bWJlcl0gPCA0KSBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzW3dlYXBvbk51bWJlcl0rKztcbn07XG5QbGF5ZXIucHJvdG90eXBlLmhpdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmludnVsbmVyYWJsZSkgcmV0dXJuO1xuICAgIC8vIHNobXVwLmVtaXR0ZXIuYnVyc3QodGhpcy54LCB0aGlzLnkpO1xuICAgIC8vIGdhbWUuc291bmQucGxheSgnYm9zc19leHBsb2RlJywgMC4zKTtcbiAgICB0aGlzLmtpbGwoKTtcbiAgICBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzW3NobXVwLmRhdGEuc2hpcC5jdXJyZW50V2VhcG9uXSA9IDE7XG4gICAgdGhpcy5pbnZ1bG5lcmFibGUgPSB0cnVlO1xuICAgIGlmIChzaG11cC5kYXRhLnNoaXAubGl2ZXMgPiAwKVxuICAgICAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgyMDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNobXVwLmVuZW15QnVsbGV0cy5jYWxsQWxsKCdraWxsJyk7XG4gICAgICAgICAgICBzaG11cC5kYXRhLnNoaXAubGl2ZXMtLTtcbiAgICAgICAgICAgIHRoaXMueCA9IDQwMDtcbiAgICAgICAgICAgIHRoaXMueSA9IDUwMDtcbiAgICAgICAgICAgIC8vIHRoaXMuYWxwaGEgPSAwLjU7XG4gICAgICAgICAgICB0aGlzLnJldml2ZSgpO1xuICAgICAgICAgICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoMzAwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcy5hbHBoYSA9IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnZ1bG5lcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICBlbHNlIGdhbWUudGltZS5ldmVudHMuYWRkKDIwMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCdnYW1lb3ZlcicpO1xuICAgIH0pO1xufTtcblxuLy8gU3ByZWFkIHdlYXBvbi4gQWx0ZXJuYXRlIGZpcmUgbmFycm93cyBzcHJlYWQuXG4vLyBQb3dlcnVwIGluY3JlYXNlcyBudW1iZXIgb2Ygc2hvdHMgaW4gYmxhc3RcbnZhciBzaG90Z3VuID0gZnVuY3Rpb24oYWx0ZXJuYXRlKSB7XG4gICAgdmFyIGZpcmVTcGVlZCA9IC4xODtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPCBmaXJlU3BlZWQpIHJldHVybjtcbiAgICB0aGlzLnNob3RUaW1lciAtPSBmaXJlU3BlZWQ7XG4gICAgdmFyIHNob3QsIGk7XG4gICAgdmFyIHNwcmVhZCA9IGFsdGVybmF0ZSA/IDMwIDogOTA7XG4gICAgdmFyIG51bVNob3RzID0gMyArIHNobXVwLmRhdGEuc2hpcC53ZWFwb25MZXZlbHNbMF07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1TaG90czsgaSsrKSB7XG4gICAgICAgIHNob3QgPSBzaG11cC5wbGF5ZXJCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnggPSB0aGlzLng7XG4gICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnZlbG9jaXR5LnggPSBzcHJlYWQgKiBpO1xuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLnZlbG9jaXR5RnJvbUFuZ2xlKC05MCArICgoLXNwcmVhZCAvIDIpICsgKHNwcmVhZCAvIG51bVNob3RzKSAqIGkgKyBzcHJlYWQgLyBudW1TaG90cyAvIDIpLFxuICAgICAgICAgICAgNDAwLCBzaG90LmJvZHkudmVsb2NpdHkpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBzaG90LmZyYW1lID0gMTtcbiAgICAgICAgc2hvdC5wb3dlciA9IDEwO1xuICAgICAgICBzaG90LnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5yb3RhdGlvbiA9IFBoYXNlci5NYXRoLmFuZ2xlQmV0d2VlblBvaW50cyh0aGlzLnByZXZpb3VzUG9zaXRpb24sIHRoaXMpIC0gKE1hdGguUEkgLyAyKTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG4vLyBGYXN0IGZyb250YWwgd2VhcG9uLiBBbHRlcm5hdGUgZmlyZSBjaGFyZ2VzIGEgYmlnIHNob3QuXG4vLyBQb3dlcnVwIGRlY3JlYXNlcyB0aW1lIGJldHdlZW4gc2hvdHNcbnZhciBnYXRsaW5nID0gZnVuY3Rpb24oYWx0ZXJuYXRlKSB7XG4gICAgdmFyIHNob3Q7XG4gICAgaWYgKCFhbHRlcm5hdGUgJiYgdGhpcy5sYXN0RnJhbWVDaGFyZ2luZykge1xuICAgICAgICB0aGlzLmxhc3RGcmFtZUNoYXJnaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmNoYXJnZVRpbWUgPiAxLjUpIHRoaXMuY2hhcmdlVGltZSA9IDEuNTtcbiAgICAgICAgc2hvdCA9IHNobXVwLnBsYXllckJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgICAgIHNob3QueCA9IHRoaXMueDtcbiAgICAgICAgc2hvdC55ID0gdGhpcy55O1xuICAgICAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgICAgICBzaG90LmJvZHkudmVsb2NpdHkueSA9IC04MDA7XG4gICAgICAgIHNob3QucmV2aXZlKCk7XG4gICAgICAgIHNob3Qucm90YXRpb24gPSAwO1xuICAgICAgICBzaG90LnVwZGF0ZSA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgIHNob3QuZnJhbWUgPSAyO1xuICAgICAgICBzaG90LnBvd2VyID0gdGhpcy5jaGFyZ2VUaW1lICogMTUwICsgKHNobXVwLmRhdGEuc2hpcC53ZWFwb25MZXZlbHNbMV0gKiA1MCk7XG4gICAgICAgIHNob3QuaGVpZ2h0ID0gOTYgKiB0aGlzLmNoYXJnZVRpbWU7XG4gICAgICAgIHNob3Qud2lkdGggPSA0OCAqIHRoaXMuY2hhcmdlVGltZTtcbiAgICAgICAgdGhpcy5jaGFyZ2VUaW1lID0gMDtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoYWx0ZXJuYXRlKSB7XG4gICAgICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5jaGFyZ2VUaW1lICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICAgICAgdGhpcy5sYXN0RnJhbWVDaGFyZ2luZyA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5sYXN0RnJhbWVDaGFyZ2luZyA9IGZhbHNlO1xuICAgIHZhciBmaXJlU3BlZWQgPSAuMSAtIHNobXVwLmRhdGEuc2hpcC53ZWFwb25MZXZlbHNbMV0gLyAxMDAgKiAyO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA8IGZpcmVTcGVlZCkgcmV0dXJuO1xuICAgIHRoaXMuc2hvdFRpbWVyIC09IGZpcmVTcGVlZDtcbiAgICBzaG90ID0gc2htdXAucGxheWVyQnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICBzaG90LnggPSB0aGlzLnggKyAoZ2FtZS5ybmQuYmV0d2VlbigtMjAsIDIwKSk7XG4gICAgc2hvdC55ID0gdGhpcy55O1xuICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgc2hvdC5ib2R5LnZlbG9jaXR5LnkgPSAtODAwO1xuICAgIHNob3QucmV2aXZlKCk7XG4gICAgc2hvdC5yb3RhdGlvbiA9IDA7XG4gICAgc2hvdC51cGRhdGUgPSBmdW5jdGlvbigpIHt9O1xuICAgIHNob3QuZnJhbWUgPSAyO1xuICAgIHNob3QucG93ZXIgPSAxMjtcbn07XG5cbi8vIFNlZWtpbmcgd2VhcG9uLiBBbHRlcm5hdGUgZmlyZSBpbmNyZWFzZXMgc3BlZWQgYnV0IGRlYWN0aXZhdGVzIHNlZWtpbmdcbi8vIFBvd2VydXAgaW5jcmVhc2VzIHBheWxvYWRcbnZhciBtaXNzaWxlID0gZnVuY3Rpb24oYWx0ZXJuYXRlKSB7XG4gICAgdmFyIGZpcmVTcGVlZCA9IGFsdGVybmF0ZSA/IC4xIDogLjI7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyIDwgZmlyZVNwZWVkKSByZXR1cm47XG4gICAgdGhpcy5zaG90VGltZXIgLT0gZmlyZVNwZWVkO1xuICAgIHZhciBzaG90ID0gc2htdXAucGxheWVyQnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICBzaG90LnggPSB0aGlzLng7XG4gICAgc2hvdC55ID0gdGhpcy55O1xuICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgc2hvdC5yZXZpdmUoKTtcbiAgICBzaG90LnJvdGF0aW9uID0gMDtcbiAgICBzaG90LmZyYW1lID0gMDtcbiAgICBzaG90LnBvd2VyID0gc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1syXSAqIDE2O1xuICAgIHNob3Quc2NhbGUuc2V0KDAuMzUgKiBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzWzJdKTtcbiAgICBzaG90LnVwZGF0ZSA9IGZ1bmN0aW9uKCkge307XG4gICAgaWYgKGFsdGVybmF0ZSkge1xuICAgICAgICBzaG90LmFuZ2xlID0gZ2FtZS5ybmQuYmV0d2VlbigtMTUsIDE1KTtcbiAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS52ZWxvY2l0eUZyb21BbmdsZSgtOTAgKyBzaG90LmFuZ2xlLCAzMDAsIHNob3QuYm9keS52ZWxvY2l0eSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzaG90LmFuZ2xlID0gZ2FtZS5ybmQuYmV0d2VlbigtMzAsIDMwKTtcbiAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS52ZWxvY2l0eUZyb21BbmdsZSgtOTAgKyBzaG90LmFuZ2xlLCAzMDAsIHNob3QuYm9keS52ZWxvY2l0eSk7XG4gICAgICAgIHNob3QudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgdHVyblJhdGUgPSBNYXRoLlBJIC8gMjtcbiAgICAgICAgICAgIHZhciBjbG9zZXN0RGlzdGFuY2UgPSAxMDAwMDtcbiAgICAgICAgICAgIHZhciBjbG9zZXN0RW5lbXkgPSBudWxsO1xuICAgICAgICAgICAgc2htdXAuZW5lbWllcy5mb3JFYWNoQWxpdmUoZnVuY3Rpb24oZW5lbXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2Vla0Rpc3RhbmNlID0gMzAwO1xuICAgICAgICAgICAgICAgIHZhciBkaXN0ID0gZ2FtZS5waHlzaWNzLmFyY2FkZS5kaXN0YW5jZUJldHdlZW4oZW5lbXksIHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChkaXN0IDwgc2Vla0Rpc3RhbmNlICYmIGRpc3QgPCBjbG9zZXN0RGlzdGFuY2UpXG4gICAgICAgICAgICAgICAgICAgIGNsb3Nlc3RFbmVteSA9IGVuZW15O1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICBpZiAoY2xvc2VzdEVuZW15KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldFJvdGF0aW9uID0gLU1hdGguUEkgLyAyICsgZ2FtZS5waHlzaWNzLmFyY2FkZS5hbmdsZUJldHdlZW4oY2xvc2VzdEVuZW15LCB0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yb3RhdGlvbiAhPT0gdGFyZ2V0Um90YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gdGFyZ2V0Um90YXRpb24gLSB0aGlzLnJvdGF0aW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVsdGEgPiAwKSB0aGlzLnJvdGF0aW9uICs9IHR1cm5SYXRlICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIHRoaXMucm90YXRpb24gLT0gdHVyblJhdGUgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPCB0dXJuUmF0ZSAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCkgdGhpcy5yb3RhdGlvbiA9IHRhcmdldFJvdGF0aW9uO1xuICAgICAgICAgICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUudmVsb2NpdHlGcm9tUm90YXRpb24oLU1hdGguUEkgLyAyICsgdGhpcy5yb3RhdGlvbiwgMzAwLCB0aGlzLmJvZHkudmVsb2NpdHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGxheWVyOyIsIi8qIGdsb2JhbCBnYW1lLCBQaGFzZXIsIHNobXVwICovXG5cbnZhciBXZWFwb25EaXNwbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgUGhhc2VyLkdyb3VwLmNhbGwodGhpcywgZ2FtZSk7XG4gICAgdGhpcy54ID0gMTA7XG4gICAgdGhpcy55ID0gNDkwO1xuICAgIHZhciBiYWNrZ3JvdW5kID0gZ2FtZS5tYWtlLmltYWdlKDAsIDAsICdwaXgnKTtcbiAgICBiYWNrZ3JvdW5kLmFscGhhID0gMC41O1xuICAgIGJhY2tncm91bmQud2lkdGggPSAxMDA7XG4gICAgYmFja2dyb3VuZC5oZWlnaHQgPSAxMDA7XG4gICAgdGhpcy5hZGQoYmFja2dyb3VuZCk7XG4gICAgLy8gaWNvbiBiYWNrZ3JvdW5kc1xuICAgIHRoaXMucmVkQmFja2dyb3VuZCA9IGdhbWUubWFrZS5pbWFnZSgzOSwgNjksICdwaXgnKTtcbiAgICB0aGlzLnJlZEJhY2tncm91bmQud2lkdGggPSB0aGlzLnJlZEJhY2tncm91bmQuaGVpZ2h0ID0gMjI7XG4gICAgdGhpcy5yZWRCYWNrZ3JvdW5kLmV4aXN0cyA9IGZhbHNlO1xuICAgIHRoaXMuYWRkKHRoaXMucmVkQmFja2dyb3VuZCk7XG4gICAgdGhpcy5ncmVlbkJhY2tncm91bmQgPSBnYW1lLm1ha2UuaW1hZ2UoOSwgNjksICdwaXgnKTtcbiAgICB0aGlzLmdyZWVuQmFja2dyb3VuZC53aWR0aCA9IHRoaXMuZ3JlZW5CYWNrZ3JvdW5kLmhlaWdodCA9IDIyO1xuICAgIHRoaXMuZ3JlZW5CYWNrZ3JvdW5kLmV4aXN0cyA9IGZhbHNlO1xuICAgIHRoaXMuYWRkKHRoaXMuZ3JlZW5CYWNrZ3JvdW5kKTtcbiAgICB0aGlzLmJsdWVCYWNrZ3JvdW5kID0gZ2FtZS5tYWtlLmltYWdlKDY5LCA2OSwgJ3BpeCcpO1xuICAgIHRoaXMuYmx1ZUJhY2tncm91bmQud2lkdGggPSB0aGlzLmJsdWVCYWNrZ3JvdW5kLmhlaWdodCA9IDIyO1xuICAgIHRoaXMuYmx1ZUJhY2tncm91bmQuZXhpc3RzID0gZmFsc2U7XG4gICAgdGhpcy5hZGQodGhpcy5ibHVlQmFja2dyb3VuZCk7XG4gICAgLy8gaWNvbnNcbiAgICB0aGlzLnJlZEljb24gPSBnYW1lLm1ha2UuYml0bWFwVGV4dCg0MCwgNzAsICdmb250JywgJ0cnKTtcbiAgICB0aGlzLnJlZEljb24ud2lkdGggPSAyMDtcbiAgICB0aGlzLnJlZEljb24uaGVpZ2h0ID0gMjA7XG4gICAgdGhpcy5hZGQodGhpcy5yZWRJY29uKTtcbiAgICB0aGlzLmdyZWVuSWNvbiA9IGdhbWUubWFrZS5iaXRtYXBUZXh0KDEwLCA3MCwgJ2ZvbnQnLCAnUycpO1xuICAgIHRoaXMuZ3JlZW5JY29uLndpZHRoID0gMjA7XG4gICAgdGhpcy5ncmVlbkljb24uaGVpZ2h0ID0gMjA7XG4gICAgdGhpcy5hZGQodGhpcy5ncmVlbkljb24pO1xuICAgIHRoaXMuYmx1ZUljb24gPSBnYW1lLm1ha2UuYml0bWFwVGV4dCg3MCwgNzAsICdmb250JywgJ00nKTtcbiAgICB0aGlzLmJsdWVJY29uLndpZHRoID0gMjA7XG4gICAgdGhpcy5ibHVlSWNvbi5oZWlnaHQgPSAyMDtcbiAgICB0aGlzLmFkZCh0aGlzLmJsdWVJY29uKTtcbiAgICAvLyBiYXJzXG4gICAgdGhpcy5yZWRCYXJzID0gW107XG4gICAgdGhpcy5ncmVlbkJhcnMgPSBbXTtcbiAgICB0aGlzLmJsdWVCYXJzID0gW107XG4gICAgdmFyIGksIGJhcjtcbiAgICBmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGJhciA9IGdhbWUubWFrZS5pbWFnZSg0MCwgMTAgKyAoMTUgKiAoMyAtIGkpKSwgJ3BpeCcpO1xuICAgICAgICBiYXIuaGVpZ2h0ID0gMTA7XG4gICAgICAgIGJhci53aWR0aCA9IDIwO1xuICAgICAgICBiYXIudGludCA9IDB4ZmZmZmZmO1xuICAgICAgICB0aGlzLnJlZEJhcnMucHVzaChiYXIpO1xuICAgICAgICB0aGlzLmFkZChiYXIpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGJhciA9IGdhbWUubWFrZS5pbWFnZSgxMCwgMTAgKyAoMTUgKiAoMyAtIGkpKSwgJ3BpeCcpO1xuICAgICAgICBiYXIuaGVpZ2h0ID0gMTA7XG4gICAgICAgIGJhci53aWR0aCA9IDIwO1xuICAgICAgICBiYXIudGludCA9IDB4ZmZmZmZmO1xuICAgICAgICB0aGlzLmdyZWVuQmFycy5wdXNoKGJhcik7XG4gICAgICAgIHRoaXMuYWRkKGJhcik7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgYmFyID0gZ2FtZS5tYWtlLmltYWdlKDcwLCAxMCArICgxNSAqICgzIC0gaSkpLCAncGl4Jyk7XG4gICAgICAgIGJhci5oZWlnaHQgPSAxMDtcbiAgICAgICAgYmFyLndpZHRoID0gMjA7XG4gICAgICAgIGJhci50aW50ID0gMHhmZmZmZmY7XG4gICAgICAgIHRoaXMuYmx1ZUJhcnMucHVzaChiYXIpO1xuICAgICAgICB0aGlzLmFkZChiYXIpO1xuICAgIH1cbn07XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGhhc2VyLkdyb3VwLnByb3RvdHlwZSk7XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFdlYXBvbkRpc3BsYXk7XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZS5SRUQgPSAweGZmZmZmZjtcbldlYXBvbkRpc3BsYXkucHJvdG90eXBlLkdSRUVOID0gMHhmZmZmZmY7XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZS5CTFVFID0gMHhmZmZmZmY7XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZS5HUkVZID0gMHg0MDQwNDA7XG5XZWFwb25EaXNwbGF5LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlZEJhcnMuZm9yRWFjaChmdW5jdGlvbihiYXIpIHtcbiAgICAgICAgYmFyLnRpbnQgPSB0aGlzLkdSRVk7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5ncmVlbkJhcnMuZm9yRWFjaChmdW5jdGlvbihiYXIpIHtcbiAgICAgICAgYmFyLnRpbnQgPSB0aGlzLkdSRVk7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5ibHVlQmFycy5mb3JFYWNoKGZ1bmN0aW9uKGJhcikge1xuICAgICAgICBiYXIudGludCA9IHRoaXMuR1JFWTtcbiAgICB9LCB0aGlzKTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgc2htdXAuZGF0YS5zaGlwLndlYXBvbkxldmVsc1sxXTsgaSsrKSB0aGlzLnJlZEJhcnNbaV0udGludCA9IHRoaXMuUkVEO1xuICAgIGZvciAoaSA9IDA7IGkgPCBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzWzBdOyBpKyspIHRoaXMuZ3JlZW5CYXJzW2ldLnRpbnQgPSB0aGlzLkdSRUVOO1xuICAgIGZvciAoaSA9IDA7IGkgPCBzaG11cC5kYXRhLnNoaXAud2VhcG9uTGV2ZWxzWzJdOyBpKyspIHRoaXMuYmx1ZUJhcnNbaV0udGludCA9IHRoaXMuQkxVRTtcbiAgICB0aGlzLnJlZEJhY2tncm91bmQuZXhpc3RzID0gZmFsc2U7XG4gICAgdGhpcy5yZWRJY29uLnRpbnQgPSAweDQwNDA0MDtcbiAgICB0aGlzLmdyZWVuQmFja2dyb3VuZC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmdyZWVuSWNvbi50aW50ID0gMHg0MDQwNDA7XG4gICAgdGhpcy5ibHVlQmFja2dyb3VuZC5leGlzdHMgPSBmYWxzZTtcbiAgICB0aGlzLmJsdWVJY29uLnRpbnQgPSAweDQwNDA0MDtcbiAgICBzd2l0Y2ggKHNobXVwLmRhdGEuc2hpcC5jdXJyZW50V2VhcG9uKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIC8vIHRoaXMuZ3JlZW5CYWNrZ3JvdW5kLmV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmdyZWVuSWNvbi50aW50ID0gMHhmZmZmZmY7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgLy8gdGhpcy5yZWRCYWNrZ3JvdW5kLmV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnJlZEljb24udGludCA9IDB4ZmZmZmZmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIC8vIHRoaXMuYmx1ZUJhY2tncm91bmQuZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuYmx1ZUljb24udGludCA9IDB4ZmZmZmZmO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBXZWFwb25EaXNwbGF5OyIsIi8qIGdsb2JhbCBQaGFzZXIsIGdhbWUgKi9cbmdsb2JhbC5zaG11cCA9IHt9O1xuZ2xvYmFsLmdhbWUgPSBuZXcgUGhhc2VyLkdhbWUoKTtcbmdsb2JhbC5wcmludCA9IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG5nYW1lLnN0YXRlLmFkZCgnbG9hZCcsIHJlcXVpcmUoJy4vc3RhdGUvbG9hZCcpKTtcbmdhbWUuc3RhdGUuYWRkKCd0aXRsZScsIHJlcXVpcmUoJy4vc3RhdGUvdGl0bGUnKSk7XG5nYW1lLnN0YXRlLmFkZCgnbWFpbicsIHJlcXVpcmUoJy4vc3RhdGUvbWFpbicpKTtcbmdhbWUuc3RhdGUuYWRkKCdsZXZlbF9zZWxlY3QnLCByZXF1aXJlKCcuL3N0YXRlL2xldmVsX3NlbGVjdCcpKTtcbmdhbWUuc3RhdGUuYWRkKCdnYW1lb3ZlcicsIHJlcXVpcmUoJy4vc3RhdGUvZ2FtZW92ZXInKSk7XG5nYW1lLnN0YXRlLmFkZCgnY29tcGxldGUnLCByZXF1aXJlKCcuL3N0YXRlL2NvbXBsZXRlJykpO1xuZ2FtZS5zdGF0ZS5hZGQoJ3dpbicsIHJlcXVpcmUoJy4vc3RhdGUvd2luJykpO1xuZ2FtZS5zdGF0ZS5hZGQoJ2NoYWxsZW5nZScsIHJlcXVpcmUoJy4vc3RhdGUvY2hhbGxlbmdlJykpO1xuZ2FtZS5zdGF0ZS5zdGFydCgnbG9hZCcpOyIsIi8qIGdsb2JhbCBnYW1lLCBzaG11cCAqL1xudmFyIHN0YXRlID0ge307XG5cbnZhciBTVEFHRV9OQU1FUyA9IFsnSUREUUQnLCAnSURLRkEnLCAnVVVERExSTFJCQVNTJ107XG52YXIgU1RBR0VfRElGRklDVUxUSUVTID0gWzYsIDYsIDddO1xuXG5zdGF0ZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQgPSBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIDgwMCwgNjAwLCAnc3RhcmZpZWxkJyk7XG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDEwMCwgJ2ZvbnQnLCBcIkNIQUxMRU5HRSBNT0RFXCIsIDY0KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgdmFyIGRlc2NyaXB0aW9uID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDIwMCwgJ2ZvbnQnLCBcIlRyeSBmb3IgYSBoaWdoIHNjb3JlIG9uXFxudGhlc2UgdmVyeSBkaWZmaWN1bHQgc3RhZ2VzLlwiKTtcbiAgICBkZXNjcmlwdGlvbi5hbmNob3Iuc2V0KDAuNSk7XG4gICAgZGVzY3JpcHRpb24uYWxpZ24gPSAnY2VudGVyJztcblxuICAgIHZhciBiYWNrQnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoNDAwLCA1NTAsICdtZXRhbFBhbmVsJyk7XG4gICAgYmFja0J1dHRvbi5oZWlnaHQgPSA1MDtcbiAgICBiYWNrQnV0dG9uLndpZHRoID0gMTAwO1xuICAgIGJhY2tCdXR0b24uYW5jaG9yLnNldCgwLjUpO1xuICAgIGJhY2tCdXR0b24uaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICBiYWNrQnV0dG9uLmV2ZW50cy5vbklucHV0VXAuYWRkKGZ1bmN0aW9uKCkge1xuICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpO1xuICAgIH0pO1xuICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCA1NTAsICdmb250JywgJ0JBQ0snLCAyNCkuYW5jaG9yLnNldCgwLjUpO1xuXG4gICAgdmFyIGk7XG4gICAgdmFyIGxlZnRDb2x1bW4gPSAyNTA7XG4gICAgdmFyIHJpZ2h0Q29sdW1uID0gNTMwO1xuICAgIGZvciAoaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgdmFyIHlMb2NhdGlvbiA9IDMwMCArIDcwICogaTtcbiAgICAgICAgdmFyIGJ1dHRvbiA9IGdhbWUuYWRkLmltYWdlKGxlZnRDb2x1bW4sIHlMb2NhdGlvbiwgJ21ldGFsUGFuZWwnKTtcbiAgICAgICAgYnV0dG9uLmhlaWdodCA9IDUwO1xuICAgICAgICBidXR0b24ud2lkdGggPSAzMDA7XG4gICAgICAgIGJ1dHRvbi50aW50ID0gMHhhYzM5Mzk7XG4gICAgICAgIGJ1dHRvbi5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGJ1dHRvbi5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBidXR0b24uZXZlbnRzLm9uSW5wdXRVcC5hZGQoZnVuY3Rpb24oc291cmNlLCBwb2ludGVyLCBzb21lQm9vbGVhbiwgaW5kZXgpIHtcbiAgICAgICAgICAgIHNobXVwLmRhdGEuZ2FtZS5jaGFsbGVuZ2UgPSB0cnVlO1xuICAgICAgICAgICAgc2htdXAuZGF0YS5zdGFnZSA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBTVEFHRV9OQU1FU1tpbmRleF0sXG4gICAgICAgICAgICAgICAgZGlmZmljdWx0eTogU1RBR0VfRElGRklDVUxUSUVTW2luZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNobXVwLmRhdGEuc2hpcC5lbmVtaWVzS2lsbGVkID0gMDtcbiAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ21haW4nKTtcbiAgICAgICAgfSwgdGhpcywgMCwgaSk7XG4gICAgICAgIGdhbWUuYWRkLmJpdG1hcFRleHQobGVmdENvbHVtbiwgeUxvY2F0aW9uLCAnZm9udCcsIFNUQUdFX05BTUVTW2ldLCAyNCkuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KHJpZ2h0Q29sdW1uLCB5TG9jYXRpb24sICdmb250JywgXCJEaWZmaWN1bHR5OiBcIiArIFNUQUdFX0RJRkZJQ1VMVElFU1tpXSwgMjQpLmFuY2hvci5zZXQoMC41KTtcbiAgICB9XG59O1xuXG5zdGF0ZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQudGlsZVBvc2l0aW9uLnkgKz0gMTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlOyIsIi8qIGdsb2JhbCBnYW1lLCBzaG11cCAqL1xudmFyIHN0YXRlID0ge307XG5cbnN0YXRlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmFja2dyb3VuZCA9IGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgODAwLCA2MDAsICdzdGFyZmllbGQnKTtcbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMTUwLCAnZm9udCcsIFwiUkVTVUxUU1wiLCA0OCkuYW5jaG9yLnNldCgwLjUpO1xuICAgIHZhciBraWxsZWQgPSBzaG11cC5kYXRhLnNoaXAuZW5lbWllc0tpbGxlZDtcbiAgICB2YXIgdG90YWwgPSBzaG11cC5kYXRhLnN0YWdlLnRvdGFsRW5lbWllcztcbiAgICB2YXIgdWZvS2lsbGVkID0gc2htdXAuZGF0YS5zaGlwLnVmb3NLaWxsZWQ7XG4gICAgdmFyIHVmb1RvdGFsID0gc2htdXAuZGF0YS5zdGFnZS50b3RhbFVmb3M7XG4gICAgdmFyIHN0YWdlTnVtYmVyID0gc2htdXAuZGF0YS5nYW1lLmNoYWxsZW5nZSA/IFwiQ0hBTExFTkdFIE1PREVcIiA6IFwiU1RBR0UgXCIgKyBzaG11cC5kYXRhLmdhbWUuaGlzdG9yeS5sZW5ndGg7XG4gICAgdmFyIHRvRGlzcGxheSA9IFtcbiAgICAgICAgc3RhZ2VOdW1iZXIsXG4gICAgICAgICdcIicgKyBzaG11cC5kYXRhLnN0YWdlLm5hbWUgKyAnXCInLFxuICAgICAgICAnRGlmZmljdWx0eTogJyArIHNobXVwLmRhdGEuc3RhZ2UuZGlmZmljdWx0eSxcbiAgICAgICAgJ0VuZW1pZXMgZGVzdHJveWVkOiAnICsga2lsbGVkICsgJy8nICsgdG90YWwgKyAnICgnICsgTWF0aC5mbG9vcihraWxsZWQgLyB0b3RhbCAqIDEwMCkgKyBcIiUpXCIsXG4gICAgICAgICdVRk9zIGRlc3Ryb3llZDogJyArIHVmb0tpbGxlZCArICcvJyArIHVmb1RvdGFsICsgJyAoJyArIE1hdGguZmxvb3IodWZvS2lsbGVkIC8gdWZvVG90YWwgKiAxMDApICsgXCIlKVwiLFxuICAgICAgICAnVG90YWwgU2NvcmU6ICcgKyBzaG11cC5kYXRhLnNoaXAuc2NvcmVcbiAgICBdO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDE7IGkgPD0gdG9EaXNwbGF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGdhbWUudGltZS5ldmVudHMuYWRkKDUwMCAqIGksIGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMTgwICsgaW5kZXggKiA0MCwgJ2ZvbnQnLCB0b0Rpc3BsYXlbaW5kZXggLSAxXSwgMjQpLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgfSwgdGhpcywgaSk7XG4gICAgfVxuICAgIGdhbWUudGltZS5ldmVudHMuYWRkKCh0b0Rpc3BsYXkubGVuZ3RoICsgMikgKiA1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgNTUwLCAnZm9udCcsIFwiKGNsaWNrIHRvIGNvbnRpbnVlKVwiLCAxNikuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBnYW1lLmlucHV0Lm9uVXAuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChzaG11cC5kYXRhLmdhbWUuY2hhbGxlbmdlKSBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpO1xuICAgICAgICAgICAgZWxzZSBpZiAoc2htdXAuZGF0YS5nYW1lLmhpc3RvcnkubGVuZ3RoIDwgNSlcbiAgICAgICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCdsZXZlbF9zZWxlY3QnKTtcbiAgICAgICAgICAgIGVsc2UgZ2FtZS5zdGF0ZS5zdGFydCgnd2luJyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuc3RhdGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iYWNrZ3JvdW5kLnRpbGVQb3NpdGlvbi55ICs9IDEwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTsiLCIvKiBnbG9iYWwgZ2FtZSwgc2htdXAgKi9cblxudmFyIHN0YXRlID0ge307XG5cbnN0YXRlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmFja2dyb3VuZCA9IGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgODAwLCA2MDAsICdzdGFyZmllbGQnKTtcbiAgICBpZiAoc2htdXAuZGF0YS5nYW1lLmNoYWxsZW5nZSkge1xuICAgICAgICB2YXIgZ2FtZW92ZXJUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDMwMCwgJ2ZvbnQnLCAnR0FNRSBPVkVSJywgNjQpO1xuICAgICAgICBnYW1lb3ZlclRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgzMDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ3RpdGxlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBjb250aW51ZVRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMjUwLCAnZm9udCcsIFwiQ09OVElOVUU/XCIsIDQ4KTtcbiAgICBjb250aW51ZVRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgIHRoaXMudGltZVRvQ29udGludWUgPSA5Ljk5O1xuICAgIGdhbWUudGltZS5ldmVudHMuYWRkKDEwMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRpbWVyVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAzMDAsICdmb250JywgXCJcIiwgNDgpO1xuICAgICAgICB0aGlzLnRpbWVyVGV4dC5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGdhbWUuYWRkLnR3ZWVuKHRoaXMpLnRvKHtcbiAgICAgICAgICAgIHRpbWVUb0NvbnRpbnVlOiAwXG4gICAgICAgIH0sIDEwMDAwLCBudWxsLCB0cnVlKS5vbkNvbXBsZXRlLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJUZXh0LmV4aXN0cyA9IGZhbHNlO1xuICAgICAgICAgICAgY29udGludWVUZXh0LmV4aXN0cyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGdhbWVvdmVyVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAzMDAsICdmb250JywgJ0dBTUUgT1ZFUicsIDY0KTtcbiAgICAgICAgICAgIGdhbWVvdmVyVGV4dC5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgICAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgzMDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBnYW1lLmlucHV0Lm9uVXAuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNobXVwLmRhdGEuc2hpcCA9IHtcbiAgICAgICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgICAgICB3ZWFwb25MZXZlbHM6IFsxLCAxLCAxXSxcbiAgICAgICAgICAgICAgICBjdXJyZW50V2VhcG9uOiAwLFxuICAgICAgICAgICAgICAgIHN0YXJzOiAwLFxuICAgICAgICAgICAgICAgIGxpdmVzOiAyLFxuICAgICAgICAgICAgICAgIGVuZW1pZXNLaWxsZWQ6IDAsXG4gICAgICAgICAgICAgICAgdWZvc0tpbGxlZDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ21haW4nKTtcbiAgICAgICAgfSk7XG4gICAgfSwgdGhpcyk7XG59O1xuXG5zdGF0ZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQudGlsZVBvc2l0aW9uLnkgKz0gMTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMudGltZXJUZXh0KVxuICAgICAgICB0aGlzLnRpbWVyVGV4dC5zZXRUZXh0KE1hdGguZmxvb3IodGhpcy50aW1lVG9Db250aW51ZSkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTsiLCIvKiBnbG9iYWwgUGhhc2VyLCBnYW1lLCBzaG11cCAqL1xudmFyIFdlYXBvbkRpc3BsYXkgPSByZXF1aXJlKCcuLi9lbnRpdHkvd2VhcG9uX2Rpc3BsYXknKTtcblxudmFyIHN0YXRlID0ge307XG5cbnZhciBCTFVFID0gMHgzNmJiZjU7XG52YXIgR1JFRU4gPSAweDcxYzkzNztcbnZhciBZRUxMT1cgPSAweDM2YmJmNTtcbnZhciBPUkFOR0UgPSAweDM2YmJmNTtcbnZhciBSRUQgPSAweGFjMzkzOTtcbnZhciBEQVJLX1JFRCA9IDB4MzZiYmY1O1xudmFyIEdSRVkgPSAweDQwNDA0MDtcbnZhciBESUZGSUNVTFRZX0NPTE9SUyA9IFtCTFVFLCBCTFVFLCBCTFVFLCBCTFVFLCBCTFVFXTtcbnZhciBNVVNJQ19WT0xVTUUgPSAwLjE7XG5cbnZhciBTdGFnZSA9IGZ1bmN0aW9uKG5hbWUsIHgpIHtcbiAgICBQaGFzZXIuU3ByaXRlLmNhbGwodGhpcywgZ2FtZSwgeCwgMCwgJ2RvdFdoaXRlJyk7XG4gICAgdGhpcy5zdGFnZU5hbWUgPSBuYW1lO1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy5oZWlnaHQgPSB0aGlzLndpZHRoID0gMzA7XG4gICAgdGhpcy5hbmNob3Iuc2V0KDAuNSk7XG59O1xuU3RhZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuU3ByaXRlLnByb3RvdHlwZSk7XG5TdGFnZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdGFnZTtcblxuc3RhdGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHNobXVwLm11c2ljKSBzaG11cC5tdXNpYy5zdG9wKCk7XG4gICAgc2htdXAubXVzaWMgPSBnYW1lLnNvdW5kLnBsYXkoJ2RpZ2l0YWxfZnJvbnRpZXInLCBNVVNJQ19WT0xVTUUsIHRydWUpO1xuICAgIHRoaXMuYmFja2dyb3VuZCA9IGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgODAwLCA2MDAsICdzdGFyZmllbGQnKTtcbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgNjAsICdmb250JywgXCJTVEFHRSBTRUxFQ1RcIiwgNDgpLmFuY2hvci5zZXQoMC41KTtcblxuICAgIHRoaXMuc3RhZ2VUaWVycyA9IFtdO1xuICAgIC8vIHRpZXIgMVxuICAgIHZhciB0aWVyMSA9IFtdO1xuICAgIHRpZXIxLnB1c2gobmV3IFN0YWdlKFwiSXQgSXMgQSBHb29kIERheSBUbyBEaWVcIiwgNDAwKSk7XG4gICAgdGhpcy5zdGFnZVRpZXJzLnB1c2godGllcjEpO1xuICAgIC8vIHRpZXIgMlxuICAgIHZhciB0aWVyMiA9IFtdO1xuICAgIHRpZXIyLnB1c2gobmV3IFN0YWdlKFwiR2xpdHRlcmluZyBQcml6ZXNcIiwgMzI1KSk7XG4gICAgdGllcjIucHVzaChuZXcgU3RhZ2UoXCJPbnNjcmVlblwiLCA0NzUpKTtcbiAgICB0aGlzLnN0YWdlVGllcnMucHVzaCh0aWVyMik7XG4gICAgLy8gdGllciAzXG4gICAgdmFyIHRpZXIzID0gW107XG4gICAgdGllcjMucHVzaChuZXcgU3RhZ2UoXCJNYWtlIEl0IFNvXCIsIDI1MCkpO1xuICAgIHRpZXIzLnB1c2gobmV3IFN0YWdlKFwiRGVjayBNZSBPdXRcIiwgNDAwKSk7XG4gICAgdGllcjMucHVzaChuZXcgU3RhZ2UoXCJCbGFjayBTaGVlcCBXYWxsXCIsIDU1MCkpO1xuICAgIHRoaXMuc3RhZ2VUaWVycy5wdXNoKHRpZXIzKTtcbiAgICAvLyB0aWVyIDRcbiAgICB2YXIgdGllcjQgPSBbXTtcbiAgICB0aWVyNC5wdXNoKG5ldyBTdGFnZShcIlNvbWV0aGluZyBGb3IgTm90aGluZ1wiLCAxNzUpKTtcbiAgICB0aWVyNC5wdXNoKG5ldyBTdGFnZShcIk9waGVsaWFcIiwgMzI1KSk7XG4gICAgdGllcjQucHVzaChuZXcgU3RhZ2UoXCJVbml0ZSBUaGUgQ2xhbnNcIiwgNDc1KSk7XG4gICAgdGllcjQucHVzaChuZXcgU3RhZ2UoXCJQb3dlciBPdmVyd2hlbG1pbmdcIiwgNjI1KSk7XG4gICAgdGhpcy5zdGFnZVRpZXJzLnB1c2godGllcjQpO1xuICAgIC8vIHRpZXIgNVxuICAgIHZhciB0aWVyNSA9IFtdO1xuICAgIHRpZXI1LnB1c2gobmV3IFN0YWdlKFwiVGhlcmUgQ2FuIE9ubHkgQmUgT25lXCIsIDEwMCkpO1xuICAgIHRpZXI1LnB1c2gobmV3IFN0YWdlKFwiVGhlcmUgSXMgTm8gQ293IExldmVsXCIsIDI1MCkpO1xuICAgIHRpZXI1LnB1c2gobmV3IFN0YWdlKFwiRXZlcnkgTGl0dGxlIFRoaW5nIFNoZSBEb2VzXCIsIDQwMCkpO1xuICAgIHRpZXI1LnB1c2gobmV3IFN0YWdlKFwiTW9kaWZ5IFRoZSBQaGFzZSBWYXJpYW5jZVwiLCA1NTApKTtcbiAgICB0aWVyNS5wdXNoKG5ldyBTdGFnZShcIk1lZGlldmFsIE1hblwiLCA3MDApKTtcbiAgICB0aGlzLnN0YWdlVGllcnMucHVzaCh0aWVyNSk7XG4gICAgLy8gcHJvZ3JhbW1hdGljYWxseSBzZXQgdHJhaXRzXG4gICAgdmFyIGksIGo7XG4gICAgZm9yIChpID0gMDsgaSA8IDU7IGkrKykge1xuICAgICAgICB0aGlzLnN0YWdlVGllcnNbaV0uZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgICAgICAgICAgc3RhZ2UueSA9IDQ1MCAtICg4MCAqIGkpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRpZmZpY3VsdHkgPSB0aGlzLnN0YWdlVGllcnNbaV0ubGVuZ3RoO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgdGhpcy5zdGFnZVRpZXJzW2ldLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMuc3RhZ2VUaWVyc1tpXVtqXTtcbiAgICAgICAgICAgIG5vZGUuaW5kZXggPSBqO1xuICAgICAgICAgICAgbm9kZS5kaWZmaWN1bHR5ID0gZGlmZmljdWx0eS0tO1xuICAgICAgICAgICAgbm9kZS50aW50ID0gRElGRklDVUxUWV9DT0xPUlNbbm9kZS5kaWZmaWN1bHR5IC0gMV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gbGluZS1kcmF3aW5nIHBhc3NcbiAgICBmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIHRoaXMuc3RhZ2VUaWVyc1tpXS5mb3JFYWNoKGZ1bmN0aW9uKHN0YWdlKSB7XG4gICAgICAgICAgICB2YXIgbGVmdFN0YWdlID0gdGhpcy5zdGFnZVRpZXJzW2kgKyAxXVtzdGFnZS5pbmRleF07XG4gICAgICAgICAgICB2YXIgcmlnaHRTdGFnZSA9IHRoaXMuc3RhZ2VUaWVyc1tpICsgMV1bc3RhZ2UuaW5kZXggKyAxXTtcbiAgICAgICAgICAgIHN0YWdlLmxlZnRMaW5lID0gZ2FtZS5tYWtlLmltYWdlKHN0YWdlLngsIHN0YWdlLnksICdwaXgnKTtcbiAgICAgICAgICAgIHN0YWdlLmxlZnRMaW5lLmFuY2hvci5zZXQoMCwgMC41KTtcbiAgICAgICAgICAgIHN0YWdlLmxlZnRMaW5lLnRpbnQgPSBSRUQ7XG4gICAgICAgICAgICBzdGFnZS5sZWZ0TGluZS53aWR0aCA9IGdhbWUucGh5c2ljcy5hcmNhZGUuZGlzdGFuY2VCZXR3ZWVuKHN0YWdlLCBsZWZ0U3RhZ2UpO1xuICAgICAgICAgICAgc3RhZ2UubGVmdExpbmUuaGVpZ2h0ID0gMjtcbiAgICAgICAgICAgIHN0YWdlLmxlZnRMaW5lLnJvdGF0aW9uID0gZ2FtZS5waHlzaWNzLmFyY2FkZS5hbmdsZUJldHdlZW4oc3RhZ2UsIGxlZnRTdGFnZSk7XG4gICAgICAgICAgICBzdGFnZS5yaWdodExpbmUgPSBnYW1lLm1ha2UuaW1hZ2Uoc3RhZ2UueCwgc3RhZ2UueSwgJ3BpeCcpO1xuICAgICAgICAgICAgc3RhZ2UucmlnaHRMaW5lLmFuY2hvci5zZXQoMCwgMC41KTtcbiAgICAgICAgICAgIHN0YWdlLnJpZ2h0TGluZS50aW50ID0gR1JFRU47XG4gICAgICAgICAgICBzdGFnZS5yaWdodExpbmUud2lkdGggPSBnYW1lLnBoeXNpY3MuYXJjYWRlLmRpc3RhbmNlQmV0d2VlbihzdGFnZSwgcmlnaHRTdGFnZSk7XG4gICAgICAgICAgICBzdGFnZS5yaWdodExpbmUuaGVpZ2h0ID0gMjtcbiAgICAgICAgICAgIHN0YWdlLnJpZ2h0TGluZS5yb3RhdGlvbiA9IGdhbWUucGh5c2ljcy5hcmNhZGUuYW5nbGVCZXR3ZWVuKHN0YWdlLCByaWdodFN0YWdlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdmFyIGxpbmVHcm91cCA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgZm9yIChpID0gMDsgaSA8IDQ7IGkrKylcbiAgICAgICAgdGhpcy5zdGFnZVRpZXJzW2ldLmZvckVhY2goZnVuY3Rpb24oc3RhZ2UpIHtcbiAgICAgICAgICAgIGxpbmVHcm91cC5hZGQoc3RhZ2UubGVmdExpbmUpO1xuICAgICAgICAgICAgbGluZUdyb3VwLmFkZChzdGFnZS5yaWdodExpbmUpO1xuICAgICAgICB9KTtcbiAgICB2YXIgbm9kZUdyb3VwID0gZ2FtZS5hZGQuZ3JvdXAoKTtcbiAgICB0aGlzLnN0YWdlVGllcnMuZm9yRWFjaChmdW5jdGlvbih0aWVyKSB7XG4gICAgICAgIHRpZXIuZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgICAgICAgICAgbm9kZUdyb3VwLmFkZChzdGFnZSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBzdGFydE5vZGUgPSBnYW1lLm1ha2UuaW1hZ2UoNDAwLCA1MzAsICdwaXgnKTtcbiAgICBzdGFydE5vZGUuaGVpZ2h0ID0gc3RhcnROb2RlLndpZHRoID0gMTU7XG4gICAgc3RhcnROb2RlLmFuY2hvci5zZXQoMC41KTtcbiAgICBub2RlR3JvdXAuYWRkKHN0YXJ0Tm9kZSk7XG4gICAgdmFyIHN0YXJ0TGluZSA9IGdhbWUubWFrZS5pbWFnZSg0MDAsIDUzMCwgJ3BpeCcpO1xuICAgIHN0YXJ0TGluZS53aWR0aCA9IGdhbWUucGh5c2ljcy5hcmNhZGUuZGlzdGFuY2VCZXR3ZWVuKHN0YXJ0TGluZSwgdGhpcy5zdGFnZVRpZXJzWzBdWzBdKTtcbiAgICBzdGFydExpbmUuaGVpZ2h0ID0gMjtcbiAgICBzdGFydExpbmUuYW5jaG9yLnNldCgwLCAwLjUpO1xuICAgIHN0YXJ0TGluZS50aW50ID0gR1JFRU47XG4gICAgc3RhcnRMaW5lLnJvdGF0aW9uID0gZ2FtZS5waHlzaWNzLmFyY2FkZS5hbmdsZUJldHdlZW4oc3RhcnRMaW5lLCB0aGlzLnN0YWdlVGllcnNbMF1bMF0pO1xuICAgIGxpbmVHcm91cC5hZGQoc3RhcnRMaW5lKTtcblxuICAgIC8vIHNldCBzaGlwIGJhc2VkIG9uIHRpZXIgYW5kIGluZGV4XG4gICAgdmFyIGN1cnJlbnRMb2NhdGlvbiA9IHNobXVwLmRhdGEuZ2FtZS50aWVyID09IDAgPyBzdGFydE5vZGUgOlxuICAgICAgICB0aGlzLnN0YWdlVGllcnNbc2htdXAuZGF0YS5nYW1lLnRpZXIgLSAxXVtzaG11cC5kYXRhLmdhbWUuaW5kZXhdO1xuICAgIHRoaXMuc2hpcCA9IGdhbWUuYWRkLmltYWdlKGN1cnJlbnRMb2NhdGlvbi54LCBjdXJyZW50TG9jYXRpb24ueSwgJ3NoaXAnKTtcbiAgICB0aGlzLnNoaXAuc2NhbGUuc2V0KDAuNSk7XG4gICAgdGhpcy5zaGlwLmFuY2hvci5zZXQoMC41KTtcblxuICAgIC8vIGFkZCB0ZXh0XG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCgxMCwgNDUwLCAnZm9udCcsIFwiU1RBVFVTXCIsIDQwKTtcbiAgICBnYW1lLmFkZC5leGlzdGluZyhuZXcgV2VhcG9uRGlzcGxheSgpKTtcbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDEyMCwgNTEwLCAnZm9udCcsIFwiU0NPUkU6IFwiICsgc2htdXAuZGF0YS5zaGlwLnNjb3JlLCAyMCk7XG4gICAgZ2FtZS5hZGQuYml0bWFwVGV4dCgxMjAsIDU0MCwgJ2ZvbnQnLCBcIkxJVkVTOiBcIiArIHNobXVwLmRhdGEuc2hpcC5saXZlcywgMjApO1xuICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoMTIwLCA1NzAsICdmb250JywgXCJTVEFSUzogXCIgKyBzaG11cC5kYXRhLnNoaXAuc3RhcnMgKyBcIi8yMFwiLCAyMCk7XG5cbiAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDc5MCwgNDUwLCAnZm9udCcsIFwiU1RBR0UgSU5GT1wiLCA0MCkuYW5jaG9yLnNldCgxLCAwKTtcbiAgICB0aGlzLnN0YWdlTmFtZVRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDc5MCwgNTcwLCAnZm9udCcsICdOQU1FOiAtLS0nLCAyMCk7XG4gICAgdGhpcy5zdGFnZU5hbWVUZXh0LmFuY2hvci5zZXQoMSwgMCk7XG4gICAgdGhpcy5zdGFnZURpZmZpY3VsdHlUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg3OTAsIDU0MCwgJ2ZvbnQnLCAnRElGRklDVUxUWTogLScsIDIwKTtcbiAgICB0aGlzLnN0YWdlRGlmZmljdWx0eVRleHQuYW5jaG9yLnNldCgxLCAwKTtcbiAgICB0aGlzLnN0YWdlID0gbnVsbDtcbiAgICAvLyBjcmVhdGUgTEFVTkNIIGJ1dHRvblxuICAgIHRoaXMubGF1bmNoQnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoNzkwLCA0ODgsICdtZXRhbFBhbmVsJyk7XG4gICAgdGhpcy5sYXVuY2hUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg2OTAsIDQ5NywgJ2ZvbnQnLCBcIkxBVU5DSFwiLCAzMik7XG4gICAgdGhpcy5sYXVuY2hUZXh0LmFuY2hvci5zZXQoMC41LCAwKTtcbiAgICB0aGlzLmxhdW5jaFRleHQudGludCA9IDB4MjAyMDIwO1xuICAgIHRoaXMubGF1bmNoQnV0dG9uLmFuY2hvci5zZXQoMSwgMCk7XG4gICAgdGhpcy5sYXVuY2hCdXR0b24ud2lkdGggPSAyMTA7XG4gICAgdGhpcy5sYXVuY2hCdXR0b24uaGVpZ2h0ID0gMzk7XG4gICAgdGhpcy5sYXVuY2hCdXR0b24udGludCA9IEdSRVk7XG4gICAgdGhpcy5sYXVuY2hCdXR0b24uaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICB0aGlzLmxhdW5jaEJ1dHRvbi5ldmVudHMub25JbnB1dFVwLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLnNlbGVjdGVkU3RhZ2UpIHJldHVybjtcbiAgICAgICAgdGhpcy5sYXVuY2hCdXR0b24uZXZlbnRzLm9uSW5wdXRVcC5yZW1vdmVBbGwoKTtcbiAgICAgICAgdGhpcy5zaGlwLnJvdGF0aW9uID0gTWF0aC5QSSAvIDIgK1xuICAgICAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS5hbmdsZUJldHdlZW4odGhpcy5zaGlwLCB0aGlzLnNlbGVjdGVkU3RhZ2UpO1xuICAgICAgICBzaG11cC5kYXRhLnN0YWdlID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5zZWxlY3RlZFN0YWdlLnN0YWdlTmFtZSxcbiAgICAgICAgICAgIGRpZmZpY3VsdHk6IHRoaXMuc2VsZWN0ZWRTdGFnZS5kaWZmaWN1bHR5LFxuICAgICAgICAgICAgaW5kZXg6IHRoaXMuc2VsZWN0ZWRTdGFnZS5pbmRleFxuICAgICAgICB9O1xuICAgICAgICBzaG11cC5kYXRhLnNoaXAuZW5lbWllc0tpbGxlZCA9IDA7XG4gICAgICAgIHNobXVwLmRhdGEuZ2FtZS5oaXN0b3J5LnB1c2goc2htdXAuZGF0YS5zdGFnZSk7XG4gICAgICAgIHZhciB0d2VlbiA9IGdhbWUuYWRkLnR3ZWVuKHRoaXMuc2hpcCk7XG4gICAgICAgIHR3ZWVuLnRvKHtcbiAgICAgICAgICAgIHg6IHRoaXMuc2VsZWN0ZWRTdGFnZS54LFxuICAgICAgICAgICAgeTogdGhpcy5zZWxlY3RlZFN0YWdlLnlcbiAgICAgICAgfSwgMSk7XG4gICAgICAgIHR3ZWVuLm9uQ29tcGxldGUuYWRkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgnbWFpbicpO1xuICAgICAgICB9KTtcbiAgICAgICAgdHdlZW4uc3RhcnQoKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIC8vIHNldCByZWFjaGFibGUgc3RhZ2VzXG4gICAgaWYgKHNobXVwLmRhdGEuZ2FtZS50aWVyID09IDApIHtcbiAgICAgICAgdGhpcy5zdGFnZVRpZXJzWzBdWzBdLnJlYWNoYWJsZSA9IHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnN0YWdlVGllcnNbc2htdXAuZGF0YS5nYW1lLnRpZXJdW3NobXVwLmRhdGEuZ2FtZS5pbmRleF0ucmVhY2hhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zdGFnZVRpZXJzW3NobXVwLmRhdGEuZ2FtZS50aWVyXVtzaG11cC5kYXRhLmdhbWUuaW5kZXggKyAxXS5yZWFjaGFibGUgPSB0cnVlO1xuICAgIH1cblxuXG4gICAgLy8gZW5hYmxlIGlucHV0IGZvciBub2Rlc1xuICAgIHRoaXMuc3RhZ2VUaWVycy5mb3JFYWNoKGZ1bmN0aW9uKHRpZXIpIHtcbiAgICAgICAgdGllci5mb3JFYWNoKGZ1bmN0aW9uKHN0YWdlKSB7XG4gICAgICAgICAgICBzdGFnZS5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgc3RhZ2UuZXZlbnRzLm9uSW5wdXRVcC5hZGQoZnVuY3Rpb24oc3RhZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWdlTmFtZVRleHQuc2V0VGV4dChcIk5BTUU6IFwiICsgc3RhZ2Uuc3RhZ2VOYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWdlRGlmZmljdWx0eVRleHQuc2V0VGV4dChcIkRJRkZJQ1VMVFk6IFwiICsgc3RhZ2UuZGlmZmljdWx0eSk7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHNlbGVjdGVkIHN0YWdlIG9ubHkgaWYgcmVhY2hhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFN0YWdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLmxhdW5jaEJ1dHRvbi5pbnB1dEVuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxhdW5jaEJ1dHRvbi50aW50ID0gR1JFWTtcbiAgICAgICAgICAgICAgICB0aGlzLmxhdW5jaFRleHQudGludCA9IDB4MjAyMDIwO1xuICAgICAgICAgICAgICAgIGlmIChzdGFnZS5yZWFjaGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFN0YWdlID0gc3RhZ2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF1bmNoQnV0dG9uLmlucHV0RW5hYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF1bmNoQnV0dG9uLnRpbnQgPSBSRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGF1bmNoVGV4dC50aW50ID0gMHhmZmZmZmY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGRvIHB1bHNlIHR3ZWVuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHVsc2VUd2VlbikgdGhpcy5wdWxzZVR3ZWVuLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YWdlVGllcnMuZm9yRWFjaChmdW5jdGlvbih0aWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpZXIuZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhZ2UuaGVpZ2h0ID0gc3RhZ2Uud2lkdGggPSAzMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3RhZ2Uud2lkdGggPSBzdGFnZS5oZWlnaHQgPSAzMDtcbiAgICAgICAgICAgICAgICB0aGlzLnB1bHNlVHdlZW4gPSBnYW1lLmFkZC50d2VlbihzdGFnZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wdWxzZVR3ZWVuLnRvKHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2lkdGg6IDYwLFxuICAgICAgICAgICAgICAgICAgICAvLyBoZWlnaHQ6IDYwXG4gICAgICAgICAgICAgICAgfSwgMTAwMCwgUGhhc2VyLkVhc2luZy5TaW51c29pZGFsLkluT3V0LCBmYWxzZSwgMCwgLTEsIHRydWUpO1xuICAgICAgICAgICAgICAgIHN0YWdlLndpZHRoID0gNjA7XG4gICAgICAgICAgICAgICAgc3RhZ2UuaGVpZ2h0ID0gNjA7XG4gICAgICAgICAgICAgICAgdGhpcy5wdWxzZVR3ZWVuLnN0YXJ0KCk7XG4gICAgICAgICAgICB9LCB0aGlzLCAwLCBzdGFnZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sIHRoaXMpO1xufTtcblxuc3RhdGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gdGhpcy5iYWNrZ3JvdW5kLnRpbGVQb3NpdGlvbi55ICs9IDEwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0ZTsiLCIvKiBnbG9iYWwgUGhhc2VyLCBnYW1lLCBzaG11cCAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJlbG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGdhbWUubG9hZC5iYXNlVVJMID0gJy4vYXNzZXRzLyc7XG4gICAgICAgIGdhbWUuc2NhbGUucGFnZUFsaWduSG9yaXpvbnRhbGx5ID0gdHJ1ZTtcbiAgICAgICAgZ2FtZS5zY2FsZS5wYWdlQWxpZ25WZXJ0aWNhbGx5ID0gdHJ1ZTtcbiAgICAgICAgZ2FtZS5zY2FsZS5mdWxsU2NyZWVuU2NhbGVNb2RlID0gUGhhc2VyLlNjYWxlTWFuYWdlci5TSE9XX0FMTDtcbiAgICAgICAgZ2FtZS5jYW52YXMub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdwaXgnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdzaGlwJyk7XG4gICAgICAgIGdhbWUuc3RhZ2UuYmFja2dyb3VuZENvbG9yID0gMHgxMDEwMTA7XG4gICAgfSxcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcHJlbG9hZFNwcml0ZSA9IGdhbWUuYWRkLnNwcml0ZSg0MDAsIDI1MCwgJ3NoaXAnKTtcbiAgICAgICAgcHJlbG9hZFNwcml0ZS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGdhbWUuYWRkLnRleHQoNDAwLCA1MDAsIFwiTE9BRElORy4uLlwiLCB7XG4gICAgICAgICAgICBmaWxsOiAnd2hpdGUnLFxuICAgICAgICAgICAgZm9udDogJzM2cHQgQXJpYWwnXG4gICAgICAgIH0pLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgZ2FtZS5sb2FkLnNldFByZWxvYWRTcHJpdGUocHJlbG9hZFNwcml0ZSwgMSk7XG5cbiAgICAgICAgc2htdXAuZGF0YSA9IHt9O1xuICAgICAgICBzaG11cC5kYXRhLmdsb2JhbCA9IHt9O1xuICAgICAgICBzaG11cC5kYXRhLmdsb2JhbC5nYW1lcGFkID0gdHJ1ZTtcblxuICAgICAgICBnYW1lLmxvYWQuYXVkaW8oJ2J1cm5pbmdfZW5naW5lcycsICdNdXNpYy9idXJuaW5nX2VuZ2luZXMub2dnJyk7XG4gICAgICAgIGdhbWUubG9hZC5hdWRpbygnY2hhbGxlbmdlJywgJ011c2ljL2NoYWxsZW5nZS5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdkb3dudG93bicsICdNdXNpYy9kb3dudG93bi5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdmdGwnLCAnTXVzaWMvZnRsLm9nZycpO1xuICAgICAgICBnYW1lLmxvYWQuYXVkaW8oJ2dyYW5kX3ByaXgnLCAnTXVzaWMvZ3JhbmRfcHJpeC5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdtb25vdG9saWMnLCAnTXVzaWMvbW9ub3RvbGljLm9nZycpO1xuICAgICAgICBnYW1lLmxvYWQuYXVkaW8oJ2RpZ2l0YWxfZnJvbnRpZXInLCAnTXVzaWMvZGlnaXRhbF9mcm9udGllci5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdzdGFyZmllbGQnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdleHBsb3Npb24nKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdsYXNlcicsICdMYXNlcnMvbGFzZXJHcmVlbjAyLnBuZycpO1xuICAgICAgICBnYW1lLmxvYWQuaW1hZ2UoJ3Bvd2VydXBfYmx1ZScsICdQb3dlci11cHMvcG93ZXJ1cEJsdWVfYm9sdC5wbmcnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdwb3dlcnVwX2dyZWVuJywgJ1Bvd2VyLXVwcy9wb3dlcnVwR3JlZW5fYm9sdC5wbmcnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdwb3dlcnVwX3JlZCcsICdQb3dlci11cHMvcG93ZXJ1cFJlZF9ib2x0LnBuZycpO1xuICAgICAgICBnYW1lLmxvYWQuaW1hZ2UoJ3N0YXInLCAnUG93ZXItdXBzL3N0YXJfZ29sZC5wbmcnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCd1Zm9CbHVlJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgndWZvR3JlZW4nKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCd1Zm9SZWQnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCd1Zm9ZZWxsb3cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCdtZXRhbFBhbmVsJyk7XG4gICAgICAgIGdhbWUubG9hZC5pbWFnZSgnZG90V2hpdGUnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmltYWdlKCd0aXRsZV9pbWFnZScpO1xuICAgICAgICBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ3BsYXllcl9sYXNlcnMnLCAncGxheWVyX2xhc2Vycy5wbmcnLCAxMywgMzcpO1xuICAgICAgICBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ2VuZW15X2xhc2VycycsICdlbmVteV9sYXNlcnMucG5nJywgNDgsIDQ2KTtcbiAgICAgICAgdmFyIGksIG5hbWU7XG4gICAgICAgIFsnQmxhY2snLCAnQmx1ZScsICdHcmVlbicsICdSZWQnXS5mb3JFYWNoKGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAxOyBpIDwgNjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9ICdlbmVteScgKyBjb2xvciArIGk7XG4gICAgICAgICAgICAgICAgZ2FtZS5sb2FkLmltYWdlKG5hbWUsICdFbmVtaWVzLycgKyBuYW1lICsgJy5wbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPD0gNjsgaSsrKSB7XG4gICAgICAgICAgICBuYW1lID0gJ2V4cGxvZGUnICsgaTtcbiAgICAgICAgICAgIGdhbWUubG9hZC5hdWRpbyhuYW1lLCAnU291bmRzLycgKyBuYW1lICsgJy5vZ2cnKTtcbiAgICAgICAgfVxuICAgICAgICBnYW1lLmxvYWQuYXVkaW8oJ2Jvc3NfZXhwbG9kZScsICdTb3VuZHMvYm9zc19leHBsb2RlLm9nZycpO1xuICAgICAgICBnYW1lLmxvYWQuYXVkaW8oJ3BpY2t1cF9zdGFyJywgJ1NvdW5kcy9zZnhfdHdvVG9uZS5vZ2cnKTtcbiAgICAgICAgZ2FtZS5sb2FkLmF1ZGlvKCdwaWNrdXBfcG93ZXJ1cCcsICdTb3VuZHMvc2Z4X3NoaWVsZFVwLm9nZycpO1xuICAgICAgICBnYW1lLmxvYWQuYml0bWFwRm9udCgnZm9udCcsICdmb250LnBuZycsICdmb250LmZudCcpO1xuICAgICAgICBnYW1lLmxvYWQuc3RhcnQoKTtcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChnYW1lLmxvYWQuaGFzTG9hZGVkKSB7XG4gICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpO1xuICAgICAgICB9XG4gICAgfVxufTsiLCIvKiBnbG9iYWwgZ2FtZSwgc2htdXAgKi9cbnZhciBTdGFnZSA9IHJlcXVpcmUoJy4uL3V0aWwvc3RhZ2UnKTtcbnZhciBQbGF5ZXIgPSByZXF1aXJlKCcuLi9lbnRpdHkvcGxheWVyJyk7XG52YXIgSW5wdXQgPSByZXF1aXJlKCcuLi91dGlsL2lucHV0Jyk7XG52YXIgQnVsbGV0UG9vbCA9IHJlcXVpcmUoJy4uL3V0aWwvYnVsbGV0cG9vbCcpO1xudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuLi9lbnRpdHkvZW1pdHRlcicpO1xudmFyIEh1ZCA9IHJlcXVpcmUoJy4uL2VudGl0eS9odWQnKTtcbnZhciBzdGF0ZSA9IHt9O1xuXG5zdGF0ZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBzaG11cC5lbWl0dGVyID0gbmV3IEVtaXR0ZXIoKTtcbiAgICBzaG11cC5lbmVteUJ1bGxldHMgPSBuZXcgQnVsbGV0UG9vbCgnZW5lbXlfbGFzZXJzJyk7XG4gICAgc2htdXAucGxheWVyQnVsbGV0cyA9IG5ldyBCdWxsZXRQb29sKCdwbGF5ZXJfbGFzZXJzJyk7XG4gICAgc2htdXAuZW5lbWllcyA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgc2htdXAucGlja3VwcyA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgc2htdXAuc3RhZ2UgPSBuZXcgU3RhZ2Uoc2htdXAuZGF0YS5zdGFnZS5uYW1lLCBzaG11cC5kYXRhLnN0YWdlLmRpZmZpY3VsdHkpO1xuICAgIHNobXVwLnBsYXllciA9IG5ldyBQbGF5ZXIoKTtcbiAgICBnYW1lLmFkZC5leGlzdGluZyhzaG11cC5wbGF5ZXIpO1xuICAgIHNobXVwLmlucHV0ID0gbmV3IElucHV0KHNobXVwLmRhdGEuZ2xvYmFsLmdhbWVwYWQpO1xuICAgIHNobXVwLmh1ZCA9IG5ldyBIdWQoKTtcbn07XG5cbnN0YXRlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHNobXVwLnN0YWdlLnVwZGF0ZSgpO1xuICAgIHNobXVwLmlucHV0LnVwZGF0ZSgpO1xuICAgIGdhbWUucGh5c2ljcy5hcmNhZGUub3ZlcmxhcChzaG11cC5lbmVtaWVzLCBzaG11cC5wbGF5ZXJCdWxsZXRzLCBmdW5jdGlvbihlbmVteSwgc2hvdCkge1xuICAgICAgICBlbmVteS5kYW1hZ2Uoc2hvdC5wb3dlcik7XG4gICAgICAgIHNob3Qua2lsbCgpO1xuICAgIH0pO1xuICAgIGdhbWUucGh5c2ljcy5hcmNhZGUub3ZlcmxhcChzaG11cC5wbGF5ZXIsIHNobXVwLmVuZW15QnVsbGV0cywgZnVuY3Rpb24ocGxheWVyLCBzaG90KSB7XG4gICAgICAgIHNob3Qua2lsbCgpO1xuICAgICAgICBwbGF5ZXIuaGl0KCk7XG4gICAgfSk7XG4gICAgZ2FtZS5waHlzaWNzLmFyY2FkZS5vdmVybGFwKHNobXVwLnBsYXllciwgc2htdXAucGlja3VwcywgZnVuY3Rpb24ocGxheWVyLCBwaWNrdXApIHtcbiAgICAgICAgcGlja3VwLnBpY2tlZFVwKCk7XG4gICAgICAgIHBpY2t1cC5raWxsKCk7XG4gICAgfSk7XG59O1xuXG5zdGF0ZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoc2htdXAucGxheWVyLmFsaXZlKVxuICAgICAgICBnYW1lLmRlYnVnLmJvZHkoc2htdXAucGxheWVyLCAnI2ZmZmYwMCcpO1xuICAgIHNobXVwLnBsYXllckJ1bGxldHMuZm9yRWFjaChmdW5jdGlvbihwbGF5ZXJCdWxsZXQpIHtcbiAgICAgICAgaWYgKHBsYXllckJ1bGxldC5hbGl2ZSlcbiAgICAgICAgICAgIGdhbWUuZGVidWcuYm9keShwbGF5ZXJCdWxsZXQsICcjMDA4MDgwJyk7XG4gICAgfSk7XG4gICAgc2htdXAuZW5lbWllcy5mb3JFYWNoKGZ1bmN0aW9uKGVuZW15KSB7XG4gICAgICAgIGlmIChlbmVteS5hbGl2ZSAmJiBlbmVteS5ib2R5LnggIT0gMCAmJiBlbmVteS5ib2R5LnkgIT0gMClcbiAgICAgICAgICAgIGdhbWUuZGVidWcuYm9keShlbmVteSwgJyNGRjAwMDAnKTtcbiAgICB9KTtcbiAgICBzaG11cC5lbmVteUJ1bGxldHMuZm9yRWFjaChmdW5jdGlvbihlbmVteUJ1bGxldCkge1xuICAgICAgICBpZiAoZW5lbXlCdWxsZXQuYWxpdmUpXG4gICAgICAgICAgICBnYW1lLmRlYnVnLmJvZHkoZW5lbXlCdWxsZXQsICcjZmY4MDAwJyk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YXRlOyIsIi8qIGdsb2JhbCBnYW1lLCBzaG11cCAqL1xudmFyIEJMVUUgPSAweDM2YmJmNTtcbnZhciBHUkVFTiA9IDB4NzFjOTM3O1xudmFyIFlFTExPVyA9IDB4YjFjOTM3O1xudmFyIE9SQU5HRSA9IDB4YWM4MDM5O1xudmFyIFJFRCA9IDB4YWMzOTM5O1xudmFyIERBUktfUkVEID0gMHhjYzI5Mjk7XG52YXIgR1JFWSA9IDB4NDA0MDQwO1xudmFyIE1VU0lDX1ZPTFVNRSA9IDAuMjtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGNyZWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzaG11cC5tdXNpYykgc2htdXAubXVzaWMuc3RvcCgpO1xuICAgICAgICBzaG11cC5tdXNpYyA9IGdhbWUuc291bmQucGxheSgnbW9ub3RvbGljJywgTVVTSUNfVk9MVU1FLCB0cnVlKTtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gZ2FtZS5hZGQudGlsZVNwcml0ZSgwLCAwLCA4MDAsIDYwMCwgJ3N0YXJmaWVsZCcpO1xuICAgICAgICBzaG11cC5kYXRhLmdhbWUgPSB7XG4gICAgICAgICAgICB0aWVyOiAwLFxuICAgICAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgICAgICBoaXN0b3J5OiBbXVxuICAgICAgICB9O1xuICAgICAgICBzaG11cC5kYXRhLnNoaXAgPSB7XG4gICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgIHdlYXBvbkxldmVsczogWzEsIDEsIDFdLFxuICAgICAgICAgICAgY3VycmVudFdlYXBvbjogMCxcbiAgICAgICAgICAgIHN0YXJzOiAwLFxuICAgICAgICAgICAgbGl2ZXM6IDJcbiAgICAgICAgfTtcbiAgICAgICAgLy8gY3JlYXRlIHRpdGxlIGltYWdlXG4gICAgICAgIGdhbWUuYWRkLmltYWdlKDAsIDAsICd0aXRsZV9pbWFnZScpO1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgMjMwLCAnZm9udCcsIFwiU0hNVVBcIiwgODApLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg1MDAsIDMwMCwgJ2ZvbnQnLCAnZG93bmdyYWRlJywgNTApLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgLy8gY3JlYXRlIG1haW4gXCJwbGF5XCIgYnV0dG9uXG4gICAgICAgIHZhciBwbGF5QnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoMjUwLCA0MDAsICdtZXRhbFBhbmVsJyk7XG4gICAgICAgIHBsYXlCdXR0b24ud2lkdGggPSAzMDA7XG4gICAgICAgIHBsYXlCdXR0b24uaGVpZ2h0ID0gMTUwO1xuICAgICAgICBwbGF5QnV0dG9uLnRpbnQgPSBCTFVFO1xuICAgICAgICBwbGF5QnV0dG9uLmlucHV0RW5hYmxlZCA9IHRydWU7XG4gICAgICAgIHBsYXlCdXR0b24uZXZlbnRzLm9uSW5wdXRVcC5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBnYW1lLnN0YXRlLnN0YXJ0KCdsZXZlbF9zZWxlY3QnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCA0NzksICdmb250JywgJ1BMQVkhJywgMzYpLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgLy8gY3JlYXRlIGNoYWxsZW5nZSBtb2RlIGJ1dHRvblxuICAgICAgICB2YXIgY2hhbGxlbmdlQnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoNTAsIDQwMCwgJ21ldGFsUGFuZWwnKTtcbiAgICAgICAgY2hhbGxlbmdlQnV0dG9uLndpZHRoID0gMTUwO1xuICAgICAgICBjaGFsbGVuZ2VCdXR0b24uaGVpZ2h0ID0gMTUwO1xuICAgICAgICBjaGFsbGVuZ2VCdXR0b24udGludCA9IFJFRDtcbiAgICAgICAgY2hhbGxlbmdlQnV0dG9uLmlucHV0RW5hYmxlZCA9IHRydWU7XG4gICAgICAgIGNoYWxsZW5nZUJ1dHRvbi5ldmVudHMub25JbnB1dFVwLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGdhbWUuc3RhdGUuc3RhcnQoJ2NoYWxsZW5nZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGNoYWxsZW5nZVRleHQgPSBnYW1lLmFkZC5iaXRtYXBUZXh0KDEyNSwgNDc5LCAnZm9udCcsICdDaGFsbGVuZ2VcXG5Nb2RlJywgMTYpO1xuICAgICAgICBjaGFsbGVuZ2VUZXh0LmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgY2hhbGxlbmdlVGV4dC5hbGlnbiA9ICdjZW50ZXInO1xuICAgICAgICAvLyBjcmVhdGUgZnVsbHNjcmVlbiBidXR0b25cbiAgICAgICAgdmFyIGZ1bGxzY3JlZW5CdXR0b24gPSBnYW1lLmFkZC5pbWFnZSg2MDAsIDQxMCwgJ21ldGFsUGFuZWwnKTtcbiAgICAgICAgZnVsbHNjcmVlbkJ1dHRvbi53aWR0aCA9IDE1MDtcbiAgICAgICAgZnVsbHNjcmVlbkJ1dHRvbi5oZWlnaHQgPSA1MDtcbiAgICAgICAgZnVsbHNjcmVlbkJ1dHRvbi50aW50ID0gR1JFRU47XG4gICAgICAgIGZ1bGxzY3JlZW5CdXR0b24uaW5wdXRFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgZnVsbHNjcmVlbkJ1dHRvbi5ldmVudHMub25JbnB1dFVwLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGdhbWUuc2NhbGUuc3RhcnRGdWxsU2NyZWVuKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDY3NSwgNDM5LCAnZm9udCcsICdGVUxMU0NSRUVOJywgMTYpLmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgLy8gY3JlYXRlIGdhbWVwYWQgYnV0dG9uXG4gICAgICAgIHZhciBnYW1lcGFkQnV0dG9uID0gZ2FtZS5hZGQuaW1hZ2UoNjAwLCA0OTAsICdtZXRhbFBhbmVsJyk7XG4gICAgICAgIHZhciBnYW1lcGFkVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNjc1LCA1MTksICdmb250JywgXCJHQU1FUEFEP1wiLCAxNik7XG4gICAgICAgIGdhbWVwYWRUZXh0LmFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgIHZhciBhY3RpdmF0ZUdhbWVwYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNobXVwLmRhdGEuZ2xvYmFsLmdhbWVwYWQgPSB0cnVlO1xuICAgICAgICAgICAgZ2FtZXBhZEJ1dHRvbi50aW50ID0gR1JFRU47XG4gICAgICAgICAgICBnYW1lcGFkQnV0dG9uLmV2ZW50cy5vbklucHV0VXAuYWRkT25jZShkZWFjdGl2YXRlR2FtZXBhZCk7XG4gICAgICAgICAgICBnYW1lcGFkVGV4dC5zZXRUZXh0KCdHQU1FUEFEXFxuQUNUSVZFJyk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBkZWFjdGl2YXRlR2FtZXBhZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2htdXAuZGF0YS5nbG9iYWwuZ2FtZXBhZCA9IGZhbHNlO1xuICAgICAgICAgICAgZ2FtZXBhZEJ1dHRvbi50aW50ID0gR1JFWTtcbiAgICAgICAgICAgIGdhbWVwYWRCdXR0b24uZXZlbnRzLm9uSW5wdXRVcC5hZGRPbmNlKGFjdGl2YXRlR2FtZXBhZCk7XG4gICAgICAgICAgICBnYW1lcGFkVGV4dC5zZXRUZXh0KFwiR0FNRVBBRD9cIik7XG4gICAgICAgIH07XG4gICAgICAgIGdhbWVwYWRUZXh0LmFuY2hvci5zZXQoMC41KTtcbiAgICAgICAgZ2FtZXBhZEJ1dHRvbi53aWR0aCA9IDE1MDtcbiAgICAgICAgZ2FtZXBhZEJ1dHRvbi5oZWlnaHQgPSA1MDtcbiAgICAgICAgZ2FtZXBhZEJ1dHRvbi5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBkZWFjdGl2YXRlR2FtZXBhZCgpO1xuICAgICAgICAvLyBjcmVhdGUgaGVscCBidXR0b25cbiAgICAgICAgdmFyIGhlbHBCdXR0b24gPSBnYW1lLmFkZC5pbWFnZSg3NDAsIDEwLCAnbWV0YWxQYW5lbCcpO1xuICAgICAgICBoZWxwQnV0dG9uLndpZHRoID0gaGVscEJ1dHRvbi5oZWlnaHQgPSA1MDtcbiAgICAgICAgaGVscEJ1dHRvbi5pbnB1dEVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBoZWxwQnV0dG9uLmV2ZW50cy5vbklucHV0VXAuYWRkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2luZG93Lm9wZW4oXCJodHRwczovL2dpdGh1Yi5jb20vemVrb2ZmLzFnYW0tc2htdXAvYmxvYi9tYXN0ZXIvUkVBRE1FLm1kXCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgZ2FtZS5hZGQuYml0bWFwVGV4dCg3NjcsIDQzLCAnZm9udCcsIFwiP1wiLCAzNikuYW5jaG9yLnNldCgwLjUpO1xuICAgIH0sXG4gICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5iYWNrZ3JvdW5kLnRpbGVQb3NpdGlvbi55ICs9IDEwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIH1cbn07IiwiLyogZ2xvYmFsIGdhbWUsIHNobXVwLCBQaGFzZXIgKi9cbnZhciBzdGF0ZSA9IHt9O1xuXG5zdGF0ZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQgPSBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIDgwMCwgNjAwLCAnc3RhcmZpZWxkJyk7XG4gICAgdmFyIHNoaXAgPSBnYW1lLmFkZC5zcHJpdGUoMjAwLCA1MDAsICdzaGlwJyk7XG4gICAgdmFyIGRpZmZpY3VsdHlNb2RpZmllciA9IDA7XG4gICAgdmFyIGxpdmVzQm9udXMgPSBzaG11cC5kYXRhLnNoaXAubGl2ZXMgKiAxMDAwMDtcbiAgICBzaG11cC5kYXRhLmdhbWUuaGlzdG9yeS5mb3JFYWNoKGZ1bmN0aW9uKHN0YWdlKSB7XG4gICAgICAgIGRpZmZpY3VsdHlNb2RpZmllciArPSBzdGFnZS5kaWZmaWN1bHR5O1xuICAgIH0pO1xuICAgIHZhciBmaW5hbFNjb3JlID0gKHNobXVwLmRhdGEuc2hpcC5zY29yZSArIGxpdmVzQm9udXMpICogZGlmZmljdWx0eU1vZGlmaWVyO1xuICAgIGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAxNTAsICdmb250JywgXCJNSVNTSU9OIENPTVBMRVRFIVwiLCA1NikuYW5jaG9yLnNldCgwLjUpO1xuICAgIHZhciB0b0Rpc3BsYXkgPSBbXG4gICAgICAgICdTY29yZTogJyArIHNobXVwLmRhdGEuc2hpcC5zY29yZSxcbiAgICAgICAgJ0JvbnVzIGZvciBsaXZlcyByZW1haW5pbmc6ICcgKyBsaXZlc0JvbnVzLFxuICAgICAgICAnRGlmZmljdWx0eSBNdWx0aXBsaWVyOiAnICsgZGlmZmljdWx0eU1vZGlmaWVyLFxuICAgICAgICAnRmluYWwgU2NvcmU6ICcgKyBmaW5hbFNjb3JlXG4gICAgXTtcbiAgICB2YXIgaSwgc2NvcmVUZXh0O1xuICAgIGZvciAoaSA9IDE7IGkgPD0gdG9EaXNwbGF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGdhbWUudGltZS5ldmVudHMuYWRkKDEwMDAgKiBpLCBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgc2NvcmVUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDIwMCArIGluZGV4ICogNTAsICdmb250JywgdG9EaXNwbGF5W2luZGV4IC0gMV0sIDI4KTtcbiAgICAgICAgICAgIHNjb3JlVGV4dC5hbmNob3Iuc2V0KDAuNSwgMCk7XG4gICAgICAgIH0sIHRoaXMsIGkpO1xuICAgIH1cbiAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZCgodG9EaXNwbGF5Lmxlbmd0aCkgKiAxNTAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5hZGQudHdlZW4oc2NvcmVUZXh0LnNjYWxlKS50byh7XG4gICAgICAgICAgICB4OiAxLjUsXG4gICAgICAgICAgICB5OiAxLjVcbiAgICAgICAgfSwgMTAwMCwgbnVsbCwgdHJ1ZSk7XG4gICAgfSk7XG4gICAgZ2FtZS50aW1lLmV2ZW50cy5hZGQoKHRvRGlzcGxheS5sZW5ndGggKyAyKSAqIDE1MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICBnYW1lLmFkZC5iaXRtYXBUZXh0KDQwMCwgNTUwLCAnZm9udCcsIFwiKGNsaWNrIHRvIHJldHVybiB0byB0aXRsZSBzY3JlZW4pXCIsIDE2KS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgIGdhbWUuaW5wdXQub25VcC5hZGRPbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgndGl0bGUnKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZ2FtZS5hZGQudHdlZW4oc2hpcCkudG8oe1xuICAgICAgICB4OiA2MDBcbiAgICB9LCA3MDAwLCBQaGFzZXIuRWFzaW5nLlNpbnVzb2lkYWwuSW5PdXQsIHRydWUsIDAsIC0xLCB0cnVlKTtcbn07XG5cbnN0YXRlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmFja2dyb3VuZC50aWxlUG9zaXRpb24ueSArPSAxMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhdGU7IiwiLyogZ2xvYmFsIFBoYXNlciwgZ2FtZSAqL1xuXG52YXIgQnVsbGV0UG9vbCA9IGZ1bmN0aW9uKGtleSkge1xuICAgIFBoYXNlci5Hcm91cC5jYWxsKHRoaXMsIGdhbWUsIGdhbWUud29ybGQsICdidWxsZXRwb29sJywgZmFsc2UsXG4gICAgICAgIHRydWUsIFBoYXNlci5QaHlzaWNzLkFSQ0FERSk7XG4gICAgdGhpcy5rZXkgPSBrZXk7XG59O1xuQnVsbGV0UG9vbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBoYXNlci5Hcm91cC5wcm90b3R5cGUpO1xuQnVsbGV0UG9vbC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCdWxsZXRQb29sO1xuQnVsbGV0UG9vbC5wcm90b3R5cGUuZ2V0QnVsbGV0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNob3QgPSB0aGlzLmdldEZpcnN0RGVhZCgpO1xuICAgIGlmICghc2hvdCkge1xuICAgICAgICBzaG90ID0gZ2FtZS5tYWtlLnNwcml0ZSh0aGlzLngsIHRoaXMueSwgdGhpcy5rZXkpO1xuICAgICAgICBzaG90LmFscGhhID0gMDtcbiAgICAgICAgc2hvdC5oZWlnaHQgPSAyNDtcbiAgICAgICAgc2hvdC53aWR0aCA9IDg7XG4gICAgICAgIHNob3QuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICBzaG90LnBvd2VyID0gMTA7XG4gICAgICAgIHNob3QuY2hlY2tXb3JsZEJvdW5kcyA9IHRydWU7XG4gICAgICAgIHNob3Qub3V0T2ZCb3VuZHNLaWxsID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hZGQoc2hvdCk7XG4gICAgfVxuICAgIHNob3QuaGVpZ2h0ID0gMjQ7XG4gICAgc2hvdC53aWR0aCA9IDg7XG4gICAgaWYgKHRoaXMua2V5ID09ICdlbmVteV9sYXNlcnMnKSBzaG90LnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyB0aGlzLmFuZ2xlICs9IDEyMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICB9O1xuICAgIHJldHVybiBzaG90O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWxsZXRQb29sOyIsIi8qIGdsb2JhbCBnYW1lLCBzaG11cCwgUGhhc2VyICovXG52YXIgREVBRFpPTkUgPSAuMTtcbnZhciBNT1VTRV9JTlBVVCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlucHV0RGlzYWJsZWQpIHJldHVybjtcbiAgICBpZiAoZ2FtZS5waHlzaWNzLmFyY2FkZS5kaXN0YW5jZVRvUG9pbnRlcihzaG11cC5wbGF5ZXIpID4gMTApXG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUubW92ZVRvUG9pbnRlcihzaG11cC5wbGF5ZXIsXG4gICAgICAgICAgICBnYW1lLmlucHV0LmFjdGl2ZVBvaW50ZXIuaXNEb3duID9cbiAgICAgICAgICAgIHNobXVwLnBsYXllci5TTE9XX1NQRUVEIDogc2htdXAucGxheWVyLkZBU1RfU1BFRUQpO1xuICAgIGVsc2Uge1xuICAgICAgICBzaG11cC5wbGF5ZXIuYm9keS52ZWxvY2l0eS5zZXQoMCk7XG4gICAgICAgIHNobXVwLnBsYXllci54ID0gZ2FtZS5pbnB1dC5hY3RpdmVQb2ludGVyLng7XG4gICAgICAgIHNobXVwLnBsYXllci55ID0gZ2FtZS5pbnB1dC5hY3RpdmVQb2ludGVyLnk7XG4gICAgfVxuICAgIHNobXVwLnBsYXllci5hbHRlcm5hdGVGaXJlID0gZ2FtZS5pbnB1dC5hY3RpdmVQb2ludGVyLmlzRG93bjtcbn07XG52YXIgR0FNRVBBRF9JTlBVVCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlucHV0RGlzYWJsZWQpIHJldHVybjtcbiAgICBzaG11cC5wbGF5ZXIuYWx0ZXJuYXRlRmlyZSA9IHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX0EpO1xuXG4gICAgaWYgKCFnYW1lLmlucHV0LmdhbWVwYWQuc3VwcG9ydGVkIHx8ICFnYW1lLmlucHV0LmdhbWVwYWQuYWN0aXZlIHx8XG4gICAgICAgICF0aGlzLnBhZC5jb25uZWN0ZWQpIHJldHVybjtcblxuICAgIHZhciBjeWNsZUJ1dHRvblRoaXNGcmFtZSA9IHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX1gpO1xuICAgIGlmICghdGhpcy5jeWNsZUJ1dHRvbkxhc3RGcmFtZSAmJiBjeWNsZUJ1dHRvblRoaXNGcmFtZSkgc2htdXAucGxheWVyLmN5Y2xlV2VhcG9uKCk7XG4gICAgdGhpcy5jeWNsZUJ1dHRvbkxhc3RGcmFtZSA9IGN5Y2xlQnV0dG9uVGhpc0ZyYW1lO1xuXG4gICAgc2htdXAucGxheWVyLmJvZHkudmVsb2NpdHkuc2V0KDApO1xuICAgIHZhciB4RGlyID0gMCxcbiAgICAgICAgeURpciA9IDA7XG5cbiAgICAvLyBkLXBhZCBjb250cm9sXG4gICAgaWYgKHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX0RQQURfTEVGVCkpIHhEaXIgPSAtMTtcbiAgICBlbHNlIGlmICh0aGlzLnBhZC5pc0Rvd24oUGhhc2VyLkdhbWVwYWQuWEJPWDM2MF9EUEFEX1JJR0hUKSkgeERpciA9IDE7XG4gICAgaWYgKHRoaXMucGFkLmlzRG93bihQaGFzZXIuR2FtZXBhZC5YQk9YMzYwX0RQQURfVVApKSB5RGlyID0gLTE7XG4gICAgZWxzZSBpZiAodGhpcy5wYWQuaXNEb3duKFBoYXNlci5HYW1lcGFkLlhCT1gzNjBfRFBBRF9ET1dOKSkgeURpciA9IDE7XG4gICAgdGhpcy5kdW1teVBvaW50LmNvcHlGcm9tKHNobXVwLnBsYXllcik7XG4gICAgdGhpcy5kdW1teVBvaW50LnggKz0geERpcjtcbiAgICB0aGlzLmR1bW15UG9pbnQueSArPSB5RGlyO1xuICAgIGlmICh4RGlyIHx8IHlEaXIpXG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUubW92ZVRvT2JqZWN0KHNobXVwLnBsYXllciwgdGhpcy5kdW1teVBvaW50LFxuICAgICAgICAgICAgdGhpcy5wYWQuaXNEb3duKFBoYXNlci5HYW1lcGFkLlhCT1gzNjBfQSkgP1xuICAgICAgICAgICAgc2htdXAucGxheWVyLlNMT1dfU1BFRUQgOiBzaG11cC5wbGF5ZXIuRkFTVF9TUEVFRCk7XG5cbiAgICAvLyB0aHVtYnN0aWNrIGNvbnRyb2xcbiAgICB2YXIgeEF4aXMgPSB0aGlzLnBhZC5heGlzKFBoYXNlci5HYW1lcGFkLlhCT1gzNjBfU1RJQ0tfTEVGVF9YKTtcbiAgICB2YXIgeUF4aXMgPSB0aGlzLnBhZC5heGlzKFBoYXNlci5HYW1lcGFkLlhCT1gzNjBfU1RJQ0tfTEVGVF9ZKTtcbiAgICBpZiAoTWF0aC5hYnMoeEF4aXMpIDwgREVBRFpPTkUpIHhBeGlzID0gMDtcbiAgICBpZiAoTWF0aC5hYnMoeUF4aXMpIDwgREVBRFpPTkUpIHlBeGlzID0gMDtcbiAgICB0aGlzLmR1bW15UG9pbnQuY29weUZyb20oc2htdXAucGxheWVyKTtcbiAgICB0aGlzLmR1bW15UG9pbnQueCArPSB4QXhpcyAqIDEwMDtcbiAgICB0aGlzLmR1bW15UG9pbnQueSArPSB5QXhpcyAqIDEwMDtcbiAgICBpZiAoeEF4aXMgfHwgeUF4aXMpXG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUubW92ZVRvT2JqZWN0KHNobXVwLnBsYXllciwgdGhpcy5kdW1teVBvaW50LFxuICAgICAgICAgICAgdGhpcy5wYWQuaXNEb3duKFBoYXNlci5HYW1lcGFkLlhCT1gzNjBfQSkgP1xuICAgICAgICAgICAgc2htdXAucGxheWVyLlNMT1dfU1BFRUQgOiBzaG11cC5wbGF5ZXIuRkFTVF9TUEVFRCk7XG59O1xuXG52YXIgSW5wdXQgPSBmdW5jdGlvbih1c2VHYW1lcGFkKSB7XG4gICAgZ2FtZS5pbnB1dC5nYW1lcGFkLnN0YXJ0KCk7XG4gICAgdGhpcy5wYWQgPSBnYW1lLmlucHV0LmdhbWVwYWQucGFkMTtcbiAgICB0aGlzLmR1bW15UG9pbnQgPSBuZXcgUGhhc2VyLlBvaW50KCk7XG4gICAgaWYgKHVzZUdhbWVwYWQpIHtcbiAgICAgICAgdGhpcy51cGRhdGUgPSBHQU1FUEFEX0lOUFVULmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY3ljbGVCdXR0b25MYXN0RnJhbWUgPSBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMudXBkYXRlID0gTU9VU0VfSU5QVVQuYmluZCh0aGlzKTtcbiAgICAgICAgZ2FtZS5pbnB1dC5tb3VzZVBvaW50ZXIucmlnaHRCdXR0b24ub25Eb3duLnJlbW92ZUFsbCgpO1xuICAgICAgICBnYW1lLmlucHV0Lm1vdXNlUG9pbnRlci5yaWdodEJ1dHRvbi5vbkRvd24uYWRkKHNobXVwLnBsYXllci5jeWNsZVdlYXBvbiwgc2htdXAucGxheWVyKTtcbiAgICB9XG59O1xuSW5wdXQucHJvdG90eXBlID0ge307XG5JbnB1dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBJbnB1dDtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dDsiLCIvKiBnbG9iYWwgUGhhc2VyLCBnYW1lICovXG52YXIgc3BsaW5lMSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBQQVRIX1ggPSBbMCwgMjAwLCA0MDAsIDUwMCwgNTUwLCA0MDAsIDIwMCwgLTUwXTtcbiAgICB2YXIgUEFUSF9ZID0gWzUwLCA3NSwgMTUwLCAzMDAsIDIwMCwgMzUwLCAxMDAsIDUwXTtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA0IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1gsIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1ksIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgc3BsaW5lMiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBQQVRIX1ggPSBbMCwgNDAwLCA2MDAsIDcwMCwgNDAwLCAyMDAsIDYwMCwgODUwXTtcbiAgICB2YXIgUEFUSF9ZID0gWzMwMCwgNTAsIDEwMCwgMTUwLCAyMDBdO1xuICAgIHRoaXMubW92ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCAvIDkgLyB0aGlzLnNwZWVkRmFjdG9yO1xuICAgIHRoaXMueCA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFBBVEhfWCwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFBBVEhfWSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzcGxpbmUzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIFBBVEhfWCA9IFs0MDAsIDIwMCwgNDAwLCA2MDAsIDQwMCwgNDAwXTtcbiAgICB2YXIgUEFUSF9ZID0gWzAsIDEwMCwgMTAwLCAxMDAsIDIwMCwgLTUwXTtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA1IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1gsIHRoaXMubW92ZVRpbWVyKTtcbiAgICB0aGlzLnkgPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihQQVRIX1ksIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgc3BsaW5lNCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBQQVRIX1ggPSBbODAwLCAxMDAsIDIwMCwgMzUwLCA1MDAsIDYwMCwgODUwXTtcbiAgICB2YXIgUEFUSF9ZID0gWzQwMCwgMTAwLCAyMDAsIDE1MCwgMTAwLCA1MCwgNTBdO1xuICAgIHRoaXMubW92ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCAvIDcgLyB0aGlzLnNwZWVkRmFjdG9yO1xuICAgIHRoaXMueCA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFBBVEhfWCwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFBBVEhfWSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBkaXZlYm9tYiA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy54KSB0aGlzLnggPSBnYW1lLnJuZC5iZXR3ZWVuKDEwMCwgNzAwKTtcbiAgICB0aGlzLnkgKz0gMjAwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcbnZhciBhcmNVcFJpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm1vdmVJbml0KSB7XG4gICAgICAgIHRoaXMubW92ZUluaXQgPSB0cnVlO1xuICAgICAgICB0aGlzLnggPSAwO1xuICAgICAgICB0aGlzLnkgPSA0MDA7XG4gICAgfVxuICAgIHRoaXMueCArPSAyNTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgdGhpcy55IC09IDYwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcbnZhciBhcmNVcExlZnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMubW92ZUluaXQpIHtcbiAgICAgICAgdGhpcy5tb3ZlSW5pdCA9IHRydWU7XG4gICAgICAgIHRoaXMueCA9IDgwMDtcbiAgICAgICAgdGhpcy55ID0gNDAwO1xuICAgIH1cbiAgICB0aGlzLnggLT0gMjUwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHRoaXMueSAtPSA2MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG52YXIgZHVja0Rvd25VcCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubW92ZVRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZCAvIDQgLyB0aGlzLnNwZWVkRmFjdG9yO1xuICAgIHRoaXMueCA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFsxMDAsIDQwMCwgNzAwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFswLCAxMDAsIDEwNSwgMTEwLCAxMDUsIDEwMCwgLTUwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzbW9vdGhBcmNSaWdodExlZnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA0IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbODAwLCA2MDAsIDQwMCwgMjAwLCAwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFs2MDAsIDMwMCwgMjAwLCAzMDAsIDY1MF0sIHRoaXMubW92ZVRpbWVyKTtcbn07XG52YXIgbGluZUxlZnREb3duID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm1vdmVJbml0KSB7XG4gICAgICAgIHRoaXMubW92ZUluaXQgPSB0cnVlO1xuICAgICAgICB0aGlzLnggPSA4MDA7XG4gICAgICAgIHRoaXMueSA9IDUwO1xuICAgIH1cbiAgICB0aGlzLnggLT0gMjUwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHRoaXMueSArPSA2MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG52YXIgbGluZVJpZ2h0RG93biA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5tb3ZlSW5pdCkge1xuICAgICAgICB0aGlzLm1vdmVJbml0ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy54ID0gMDtcbiAgICAgICAgdGhpcy55ID0gNTA7XG4gICAgfVxuICAgIHRoaXMueCArPSAyNTAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgdGhpcy55ICs9IDYwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xufTtcbnZhciBzcGxpbmU1ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzgwMCwgNDAwLCAxMDAsIDQwMCwgODUwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFs1MCwgMjUsIDUwLCAyNSwgNTBdLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIHNwbGluZTYgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA1IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbMCwgMzAwLCA1MDAsIDIwMCwgNTAwLCA3MDBdLCB0aGlzLm1vdmVUaW1lcik7XG4gICAgdGhpcy55ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzEwMCwgMzAwLCAyMDAsIDEwMCwgMzAwLCAtNTBdLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIHNwbGluZTcgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA1IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbNDAwLCA3MDAsIDIwMCwgNDAwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFswLCAzMDAsIDMwMCwgLTUwXSwgdGhpcy5tb3ZlVGltZXIpO1xufTtcbnZhciBzcGxpbmU4ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzIwMCwgNjAwXSwgdGhpcy5tb3ZlVGltZXIpO1xuICAgIHRoaXMueSA9IFBoYXNlci5NYXRoLmNhdG11bGxSb21JbnRlcnBvbGF0aW9uKFswLCAyMDAsIDMwMCwgMjAwLCAwLCAtNTBdLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIHNwbGluZTkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm1vdmVUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQgLyA1IC8gdGhpcy5zcGVlZEZhY3RvcjtcbiAgICB0aGlzLnggPSBQaGFzZXIuTWF0aC5jYXRtdWxsUm9tSW50ZXJwb2xhdGlvbihbMCwgNzAwLCAxMDAsIDQwMCwgMzAwLCA4NTBdLCB0aGlzLm1vdmVUaW1lcik7XG4gICAgdGhpcy55ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzUwLCAxMDAsIDE1MCwgMjAwLCAyNTBdLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIHNwbGluZTEwID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb3ZlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkIC8gNSAvIHRoaXMuc3BlZWRGYWN0b3I7XG4gICAgdGhpcy54ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzgwMCwgNDAwLCAtNTBdLCB0aGlzLm1vdmVUaW1lcik7XG4gICAgdGhpcy55ID0gUGhhc2VyLk1hdGguY2F0bXVsbFJvbUludGVycG9sYXRpb24oWzMwMCwgMjAwLCAzMDBdLCB0aGlzLm1vdmVUaW1lcik7XG59O1xudmFyIGxpbmVMZWZ0RG93bjIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMubW92ZUluaXQpIHtcbiAgICAgICAgdGhpcy5tb3ZlSW5pdCA9IHRydWU7XG4gICAgICAgIHRoaXMueCA9IDgwMDtcbiAgICAgICAgdGhpcy55ID0gMjAwO1xuICAgIH1cbiAgICB0aGlzLnggLT0gMjUwICogZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIHRoaXMueSArPSAyMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG52YXIgbGluZVJpZ2h0RG93bjIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMubW92ZUluaXQpIHtcbiAgICAgICAgdGhpcy5tb3ZlSW5pdCA9IHRydWU7XG4gICAgICAgIHRoaXMueCA9IDA7XG4gICAgICAgIHRoaXMueSA9IDIwMDtcbiAgICB9XG4gICAgdGhpcy54ICs9IDI1MCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICB0aGlzLnkgKz0gMjAgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBbc3BsaW5lMSwgc3BsaW5lMiwgc3BsaW5lMywgc3BsaW5lNCwgZGl2ZWJvbWIsIGFyY1VwUmlnaHQsXG4gICAgYXJjVXBMZWZ0LCBkdWNrRG93blVwLCBzbW9vdGhBcmNSaWdodExlZnQsIGxpbmVMZWZ0RG93biwgbGluZVJpZ2h0RG93bixcbiAgICBzcGxpbmU1LCBzcGxpbmU2LCBzcGxpbmU3LCBzcGxpbmU4LCBzcGxpbmU5LCBzcGxpbmUxMCwgbGluZUxlZnREb3duMixcbiAgICBsaW5lUmlnaHREb3duMlxuXTsiLCIvKiBnbG9iYWwgc2htdXAsIGdhbWUgKi9cblxudmFyIFNIT1RfQk9EWV9TQ0FMRSA9IC43O1xuXG52YXIgc3RyYWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3RUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyID4gLjc1ICYmIGdhbWUucm5kLmZyYWMoKSA8IC4wNSkge1xuICAgICAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgICAgIHZhciBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnggPSB0aGlzLng7XG4gICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgc2hvdC53aWR0aCA9IHNob3QuaGVpZ2h0ID0gMzA7XG4gICAgICAgIHNob3QudGludCA9IDB4ZmYwMDAwO1xuICAgICAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgICAgICBzaG90LmJvZHkuc2V0U2l6ZShzaG90LndpZHRoICogU0hPVF9CT0RZX1NDQUxFLCBzaG90LmhlaWdodCAqIFNIT1RfQk9EWV9TQ0FMRSk7XG4gICAgICAgIHNob3QucmV2aXZlKCk7XG4gICAgICAgIHNob3QuYm9keS52ZWxvY2l0eS54ID0gMDtcbiAgICAgICAgc2hvdC5ib2R5LnZlbG9jaXR5LnkgPSAyNTA7XG4gICAgfVxufTtcbnZhciBhaW1lZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2hvdFRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPiAxLjUgJiYgZ2FtZS5ybmQuZnJhYygpIDwgLjAyKSB7XG4gICAgICAgIHRoaXMuc2hvdFRpbWVyID0gMDtcbiAgICAgICAgdmFyIHNob3QgPSBzaG11cC5lbmVteUJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgICAgIHNob3QudGludCA9IDB4ZmZhMGZmO1xuICAgICAgICBzaG90LmhlaWdodCA9IHNob3Qud2lkdGggPSAyNTtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgIHNob3QuYm9keS5zZXRTaXplKHNob3Qud2lkdGggKiBTSE9UX0JPRFlfU0NBTEUsIHNob3QuaGVpZ2h0ICogU0hPVF9CT0RZX1NDQUxFKTtcbiAgICAgICAgc2hvdC5yZXZpdmUoKTtcbiAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS5tb3ZlVG9PYmplY3Qoc2hvdCwgc2htdXAucGxheWVyLCAzMDApO1xuICAgIH1cbn07XG52YXIgZmF0QWltZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3RUaW1lciArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMuc2hvdFRpbWVyID4gMS41ICYmIGdhbWUucm5kLmZyYWMoKSA8IC4wNSkge1xuICAgICAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgICAgIHZhciBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmZmYwMDtcbiAgICAgICAgc2hvdC5oZWlnaHQgPSAzMDtcbiAgICAgICAgc2hvdC53aWR0aCA9IDMwO1xuICAgICAgICBzaG90LnggPSB0aGlzLng7XG4gICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLm1vdmVUb09iamVjdChzaG90LCBzaG11cC5wbGF5ZXIsIDIwMCk7XG4gICAgfVxufTtcbnZhciBidXJzdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2hvdFRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPiAxICYmIGdhbWUucm5kLmZyYWMoKSA8IDAuMDEpIHtcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gLTI7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICAgICAgc2hvdC50aW50ID0gMHhmZjgwODA7XG4gICAgICAgICAgICBzaG90LmhlaWdodCA9IHNob3Qud2lkdGggPSAxNTtcbiAgICAgICAgICAgIHNob3QueCA9IHRoaXMueDtcbiAgICAgICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgICAgIHNob3QuYm9keS5yZXNldChzaG90LngsIHNob3QueSk7XG4gICAgICAgICAgICBzaG90LmJvZHkuc2V0U2l6ZShzaG90LndpZHRoICogU0hPVF9CT0RZX1NDQUxFLCBzaG90LmhlaWdodCAqIFNIT1RfQk9EWV9TQ0FMRSk7XG4gICAgICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICAgICAgZ2FtZS5waHlzaWNzLmFyY2FkZS52ZWxvY2l0eUZyb21BbmdsZSg5MCArICgxNSAqIGkpLCAyMDAsIHNob3QuYm9keS52ZWxvY2l0eSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xudmFyIGRvdWJsZVN0cmFpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG90VGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA+IC43NSAmJiBnYW1lLnJuZC5mcmFjKCkgPCAuMDUpIHtcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICB2YXIgc2hvdCA9IHNobXVwLmVuZW15QnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54IC0gMjA7XG4gICAgICAgIHNob3QueSA9IHRoaXMueTtcbiAgICAgICAgc2hvdC53aWR0aCA9IHNob3QuaGVpZ2h0ID0gMjA7XG4gICAgICAgIHNob3QudGludCA9IDB4ZmYwMDAwO1xuICAgICAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgICAgICBzaG90LmJvZHkuc2V0U2l6ZShzaG90LndpZHRoICogU0hPVF9CT0RZX1NDQUxFLCBzaG90LmhlaWdodCAqIFNIT1RfQk9EWV9TQ0FMRSk7XG4gICAgICAgIHNob3QucmV2aXZlKCk7XG4gICAgICAgIHNob3QuYm9keS52ZWxvY2l0eS54ID0gMDtcbiAgICAgICAgc2hvdC5ib2R5LnZlbG9jaXR5LnkgPSAyNTA7XG4gICAgICAgIHNob3QgPSBzaG11cC5lbmVteUJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgICAgIHNob3QueCA9IHRoaXMueCArIDIwO1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3Qud2lkdGggPSBzaG90LmhlaWdodCA9IDIwO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmMDAwMDtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBzaG90LmJvZHkudmVsb2NpdHkueCA9IDA7XG4gICAgICAgIHNob3QuYm9keS52ZWxvY2l0eS55ID0gMjUwO1xuICAgIH1cbn07XG52YXIgc21hbGxBaW1lZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2hvdFRpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICBpZiAodGhpcy5zaG90VGltZXIgPiAwLjUgJiYgZ2FtZS5ybmQuZnJhYygpIDwgLjAyKSB7XG4gICAgICAgIC8vIGFkZCBzaG90c1xuICAgICAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgICAgIHZhciBzaG90ID0gc2htdXAuZW5lbXlCdWxsZXRzLmdldEJ1bGxldCgpO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmODBmZjtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3QuaGVpZ2h0ID0gc2hvdC53aWR0aCA9IDIwO1xuICAgICAgICBzaG90LmJvZHkucmVzZXQoc2hvdC54LCBzaG90LnkpO1xuICAgICAgICBzaG90LmJvZHkuc2V0U2l6ZShzaG90LndpZHRoICogU0hPVF9CT0RZX1NDQUxFLCBzaG90LmhlaWdodCAqIFNIT1RfQk9EWV9TQ0FMRSk7XG4gICAgICAgIHNob3QucmV2aXZlKCk7XG4gICAgICAgIGdhbWUucGh5c2ljcy5hcmNhZGUubW92ZVRvT2JqZWN0KHNob3QsIHNobXVwLnBsYXllciwgMzAwKTtcbiAgICB9XG59O1xudmFyIGNpcmNsZUJ1cnN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG90VGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA+IDMgJiYgZ2FtZS5ybmQuZnJhYygpIDwgMC4wNSkge1xuICAgICAgICB0aGlzLnNob3RUaW1lciA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgICAgICAgICAgdmFyIHNob3QgPSBzaG11cC5lbmVteUJ1bGxldHMuZ2V0QnVsbGV0KCk7XG4gICAgICAgICAgICBzaG90LnRpbnQgPSAweGZmODA4MDtcbiAgICAgICAgICAgIHNob3QuaGVpZ2h0ID0gc2hvdC53aWR0aCA9IDE1O1xuICAgICAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICAgICAgc2hvdC55ID0gdGhpcy55O1xuICAgICAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgICAgIHNob3QuYm9keS5zZXRTaXplKHNob3Qud2lkdGggKiBTSE9UX0JPRFlfU0NBTEUsIHNob3QuaGVpZ2h0ICogU0hPVF9CT0RZX1NDQUxFKTtcbiAgICAgICAgICAgIHNob3QucmV2aXZlKCk7XG4gICAgICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLnZlbG9jaXR5RnJvbUFuZ2xlKDkwICsgKDMwICogaSksIDEyNSwgc2hvdC5ib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG52YXIgc2luZ2xlUmFuZG9tID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG90VGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgIGlmICh0aGlzLnNob3RUaW1lciA+IC43NSAmJiBnYW1lLnJuZC5mcmFjKCkgPCAuMDUpIHtcbiAgICAgICAgdGhpcy5zaG90VGltZXIgPSAwO1xuICAgICAgICB2YXIgc2hvdCA9IHNobXVwLmVuZW15QnVsbGV0cy5nZXRCdWxsZXQoKTtcbiAgICAgICAgc2hvdC54ID0gdGhpcy54O1xuICAgICAgICBzaG90LnkgPSB0aGlzLnk7XG4gICAgICAgIHNob3Qud2lkdGggPSBzaG90LmhlaWdodCA9IDMwO1xuICAgICAgICBzaG90LnRpbnQgPSAweGZmMDAwMDtcbiAgICAgICAgc2hvdC5ib2R5LnJlc2V0KHNob3QueCwgc2hvdC55KTtcbiAgICAgICAgc2hvdC5ib2R5LnNldFNpemUoc2hvdC53aWR0aCAqIFNIT1RfQk9EWV9TQ0FMRSwgc2hvdC5oZWlnaHQgKiBTSE9UX0JPRFlfU0NBTEUpO1xuICAgICAgICBzaG90LnJldml2ZSgpO1xuICAgICAgICBnYW1lLnBoeXNpY3MuYXJjYWRlLnZlbG9jaXR5RnJvbUFuZ2xlKDkwICsgKGdhbWUucm5kLmJldHdlZW4oLTMwLCAzMCkpLCAyMDAsIHNob3QuYm9keS52ZWxvY2l0eSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZW5lbXlTaG90czogW3N0cmFpZ2h0LCBhaW1lZCwgZmF0QWltZWQsIGJ1cnN0LCBkb3VibGVTdHJhaWdodF0sXG4gICAgYm9zc1Nob3RzOiBbYWltZWQsIGZhdEFpbWVkLCBidXJzdCwgc21hbGxBaW1lZCwgY2lyY2xlQnVyc3QsIHNpbmdsZVJhbmRvbV1cbn07IiwiLyogZ2xvYmFsIHNobXVwLCBnYW1lLCBQaGFzZXIgKi9cbnZhciBFbmVteSA9IHJlcXVpcmUoJy4uL2VudGl0eS9lbmVteScpO1xudmFyIE1vdmVtZW50VHlwZXMgPSByZXF1aXJlKCcuLi91dGlsL21vdmVtZW50Jyk7XG52YXIgU2hvdFR5cGVzID0gcmVxdWlyZSgnLi4vdXRpbC9zaG90Jyk7XG52YXIgQm9zcyA9IHJlcXVpcmUoJy4uL2VudGl0eS9ib3NzJyk7XG5cbnZhciBNVVNJQ19UUkFDS1MgPSBbXG4gICAgJ2J1cm5pbmdfZW5naW5lcycsXG4gICAgJ2NoYWxsZW5nZScsXG4gICAgJ2Rvd250b3duJyxcbiAgICAnZnRsJyxcbiAgICAnZ3JhbmRfcHJpeCdcbl07XG52YXIgTVVTSUNfVk9MVU1FID0gMC4xO1xuXG52YXIgSU5UUk9fTEVOR1RIID0gNTAwO1xudmFyIE9VVFJPX0xFTkdUSCA9IDUwMDtcbnZhciBXQVJQX1NQRUVEID0gMzAwMDtcblxuLy8gU2VlZCBpcyBhIHN0cmluZyB0aGF0IHdpbGwgYmUgdXNlZCB0byBpbml0IHRoZSBSTkcuXG4vLyBEaWZmaWN1bHR5IGlzIGEgbnVtYmVyIDEtNSBmb3Igbm9ybWFsIHBsYXksIGhpZ2hlciBmb3IgY2hhbGxlbmdlIG1vZGVzXG52YXIgU3RhZ2UgPSBmdW5jdGlvbihzZWVkLCBkaWZmaWN1bHR5KSB7XG4gICAgdmFyIHN0YWdlTnVtYmVyID0gc2htdXAuZGF0YS5nYW1lLmNoYWxsZW5nZSA/IFwiQ0hBTExFTkdFIE1PREVcIiA6IFwiU1RBR0UgXCIgKyBzaG11cC5kYXRhLmdhbWUuaGlzdG9yeS5sZW5ndGg7XG4gICAgdmFyIHN0YWdlTnVtYmVyVGV4dCA9IGdhbWUuYWRkLmJpdG1hcFRleHQoNDAwLCAxNTAsICdmb250Jywgc3RhZ2VOdW1iZXIsIDQwKTtcbiAgICBzdGFnZU51bWJlclRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgIHZhciBzdGFnZU5hbWVUZXh0ID0gZ2FtZS5hZGQuYml0bWFwVGV4dCg0MDAsIDIwMCwgJ2ZvbnQnLCAnXCInICsgc2htdXAuZGF0YS5zdGFnZS5uYW1lICsgJ1wiJywgMzYpO1xuICAgIHN0YWdlTmFtZVRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgIHN0YWdlTmFtZVRleHQuYWxwaGEgPSAwO1xuICAgIGdhbWUudGltZS5ldmVudHMuYWRkKElOVFJPX0xFTkdUSCAvIDQgKiAzLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5hZGQudHdlZW4oc3RhZ2VOdW1iZXJUZXh0KS50byh7XG4gICAgICAgICAgICBhbHBoYTogMFxuICAgICAgICB9LCBJTlRST19MRU5HVEggLyA0LCBudWxsLCB0cnVlKTtcbiAgICAgICAgZ2FtZS5hZGQudHdlZW4oc3RhZ2VOYW1lVGV4dCkudG8oe1xuICAgICAgICAgICAgYWxwaGE6IDBcbiAgICAgICAgfSwgSU5UUk9fTEVOR1RIIC8gNCwgbnVsbCwgdHJ1ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmRpZmZpY3VsdHkgPSBkaWZmaWN1bHR5O1xuICAgIGdhbWUucm5kLnNvdyhbc2VlZF0pO1xuICAgIHRoaXMudHJhY2tOYW1lID0gZ2FtZS5ybmQucGljayhNVVNJQ19UUkFDS1MpO1xuICAgIHRoaXMuYmFja2dyb3VuZCA9IGdhbWUuYWRkLnRpbGVTcHJpdGUoMCwgMCwgODAwLCA2MDAsICdzdGFyZmllbGQnKTtcbiAgICB0aGlzLmJhY2tncm91bmQuZml4ZWRUb0NhbWVyYSA9IHRydWU7XG4gICAgdGhpcy5iYWNrZ3JvdW5kU3BlZWQgPSAwO1xuICAgIHRoaXMuYmFja2dyb3VuZC5hbHBoYSA9IDAuNDtcbiAgICB0aGlzLndhdmVzID0gW107XG4gICAgdmFyIG51bVdhdmVzID0gOSArIChkaWZmaWN1bHR5ICogMyk7XG4gICAgdGhpcy5zZWNvbmRzQmV0d2VlbldhdmVzID0gKDYuNSAtIHRoaXMuZGlmZmljdWx0eSAqIDAuNSk7XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IG51bVdhdmVzOyBpKyspXG4gICAgICAgIHRoaXMud2F2ZXMucHVzaChuZXcgV2F2ZShkaWZmaWN1bHR5KSk7XG4gICAgdGhpcy53YXZlcy5wdXNoKG5ldyBCb3NzV2F2ZShkaWZmaWN1bHR5KSk7XG4gICAgc2htdXAuZGF0YS5zdGFnZS50b3RhbEVuZW1pZXMgPSAwO1xuICAgIHNobXVwLmRhdGEuc3RhZ2UudG90YWxVZm9zID0gMDtcbiAgICBzaG11cC5kYXRhLnNoaXAudWZvc0tpbGxlZCA9IDA7XG4gICAgdGhpcy53YXZlcy5mb3JFYWNoKGZ1bmN0aW9uKHdhdmUpIHtcbiAgICAgICAgaWYgKHdhdmUubnVtYmVySW5XYXZlKVxuICAgICAgICAgICAgc2htdXAuZGF0YS5zdGFnZS50b3RhbEVuZW1pZXMgKz0gTWF0aC5jZWlsKHdhdmUubnVtYmVySW5XYXZlKTtcbiAgICB9KTtcbiAgICAvLyBCb251cyBVRk9zXG4gICAgdmFyIHN0YWdlTGVuZ3RoU2Vjb25kcyA9IG51bVdhdmVzICogdGhpcy5zZWNvbmRzQmV0d2VlbldhdmVzO1xuICAgIHNobXVwLmRhdGEuc3RhZ2UudG90YWxVZm9zID0gdGhpcy5udW1VZm9zID0gZGlmZmljdWx0eTtcbiAgICB0aGlzLnVmb3NTZWVuID0gMDtcbiAgICB0aGlzLnRpbWVCZXR3ZWVuVWZvcyA9IHN0YWdlTGVuZ3RoU2Vjb25kcyAvIHRoaXMubnVtVWZvcztcblxuICAgIHRoaXMudXBkYXRlVGltZXIgPSAwO1xuICAgIHRoaXMudWZvVGltZXIgPSB0aGlzLnRpbWVCZXR3ZWVuVWZvcyAvIDI7XG5cbiAgICB0aGlzLnN0YWdlU3RhdGUgPSB0aGlzLklOVFJPO1xuICAgIHRoaXMuc3RhdGVUd2VlbiA9IG51bGw7XG4gICAgaWYgKHNobXVwLm11c2ljKSBzaG11cC5tdXNpYy5zdG9wKCk7XG4gICAgc2htdXAubXVzaWMgPSBnYW1lLnNvdW5kLnBsYXkodGhpcy50cmFja05hbWUsIE1VU0lDX1ZPTFVNRSwgdHJ1ZSk7XG59O1xuU3RhZ2UucHJvdG90eXBlID0ge307XG5TdGFnZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdGFnZTtcblN0YWdlLnByb3RvdHlwZS5JTlRSTyA9IDA7XG5TdGFnZS5wcm90b3R5cGUuTUFJTiA9IDE7XG5TdGFnZS5wcm90b3R5cGUuT1VUVFJPID0gMjtcblN0YWdlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJhY2tncm91bmQudGlsZVBvc2l0aW9uLnkgKz0gdGhpcy5iYWNrZ3JvdW5kU3BlZWQgKiBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgc3dpdGNoICh0aGlzLnN0YWdlU3RhdGUpIHtcbiAgICAgICAgY2FzZSB0aGlzLklOVFJPOlxuICAgICAgICAgICAgaWYgKCF0aGlzLnN0YXRlVHdlZW4pIHtcbiAgICAgICAgICAgICAgICBzaG11cC5wbGF5ZXIuYWxpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzaG11cC5pbnB1dC5pbnB1dERpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzaG11cC5wbGF5ZXIueCA9IDQwMDtcbiAgICAgICAgICAgICAgICBzaG11cC5wbGF5ZXIueSA9IDYwMDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4gPSBnYW1lLmFkZC50d2VlbihzaG11cC5wbGF5ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2Vlbi50byh7XG4gICAgICAgICAgICAgICAgICAgIHk6IDMwMFxuICAgICAgICAgICAgICAgIH0sIElOVFJPX0xFTkdUSCAvIDIsIFBoYXNlci5FYXNpbmcuU2ludXNvaWRhbC5PdXQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2Vlbi50byh7XG4gICAgICAgICAgICAgICAgICAgIHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sIElOVFJPX0xFTkdUSCAvIDIsIFBoYXNlci5FYXNpbmcuU2ludXNvaWRhbC5Jbk91dCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVR3ZWVuLm9uQ29tcGxldGUuYWRkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzaG11cC5wbGF5ZXIuYWxpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzaG11cC5pbnB1dC5pbnB1dERpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhZ2VTdGF0ZSA9IHRoaXMuTUFJTjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVR3ZWVuID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4uc3RhcnQoKTtcbiAgICAgICAgICAgICAgICBnYW1lLmFkZC50d2Vlbih0aGlzKS50byh7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJhY2tncm91bmRTcGVlZDogNjAwXG4gICAgICAgICAgICAgICAgfSwgSU5UUk9fTEVOR1RILCBudWxsLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRoaXMuTUFJTjpcbiAgICAgICAgICAgIHRoaXMud2F2ZXNbMF0udXBkYXRlKCk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlVGltZXIgKz0gZ2FtZS50aW1lLnBoeXNpY3NFbGFwc2VkO1xuICAgICAgICAgICAgaWYgKHRoaXMud2F2ZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2htdXAuZW5lbWllcy50b3RhbCA9PSAwKSB0aGlzLnN0YWdlU3RhdGUgPSB0aGlzLk9VVFRSTztcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyID4gdGhpcy5zZWNvbmRzQmV0d2VlbldhdmVzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53YXZlcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnVmb1RpbWVyICs9IGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbiAgICAgICAgICAgIGlmICh0aGlzLnVmb1RpbWVyID4gdGhpcy50aW1lQmV0d2VlblVmb3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVmb1RpbWVyIC09IHRoaXMudGltZUJldHdlZW5VZm9zO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVmb3NTZWVuKysgPCB0aGlzLm51bVVmb3MpIHNobXVwLmVuZW1pZXMuYWRkKG5ldyBVZm8oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0aGlzLk9VVFRSTzpcbiAgICAgICAgICAgIGlmICghdGhpcy5zdGF0ZVR3ZWVuKSB7XG4gICAgICAgICAgICAgICAgc2htdXAucGxheWVyLmFsaXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2htdXAuZW5lbXlCdWxsZXRzLmNhbGxBbGwoJ2tpbGwnKTtcbiAgICAgICAgICAgICAgICBzaG11cC5wbGF5ZXIuYm9keS5yZXNldChzaG11cC5wbGF5ZXIueCwgc2htdXAucGxheWVyLnkpO1xuICAgICAgICAgICAgICAgIHNobXVwLmlucHV0LmlucHV0RGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2VlbiA9IGdhbWUuYWRkLnR3ZWVuKHNobXVwLnBsYXllcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVR3ZWVuLnRvKHtcbiAgICAgICAgICAgICAgICAgICAgeDogNDAwLFxuICAgICAgICAgICAgICAgICAgICB5OiA1MDBcbiAgICAgICAgICAgICAgICB9LCBPVVRST19MRU5HVEggLyAyLCBQaGFzZXIuRWFzaW5nLlNpbnVzb2lkYWwuT3V0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlVHdlZW4udG8oe1xuICAgICAgICAgICAgICAgICAgICB5OiAwXG4gICAgICAgICAgICAgICAgfSwgT1VUUk9fTEVOR1RIIC8gMiwgUGhhc2VyLkVhc2luZy5TaW51c29pZGFsLkluKTtcbiAgICAgICAgICAgICAgICBnYW1lLnRpbWUuZXZlbnRzLmFkZChPVVRST19MRU5HVEggLyAyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2FtZS5hZGQudHdlZW4odGhpcykudG8oe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmFja2dyb3VuZFNwZWVkOiBXQVJQX1NQRUVEXG4gICAgICAgICAgICAgICAgICAgIH0sIE9VVFJPX0xFTkdUSCAvIDIsIG51bGwsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2Vlbi5zdGFydCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVUd2Vlbi5vbkNvbXBsZXRlLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2htdXAuZGF0YS5nYW1lLnRpZXIrKztcbiAgICAgICAgICAgICAgICAgICAgc2htdXAuZGF0YS5nYW1lLmluZGV4ID0gc2htdXAuZGF0YS5zdGFnZS5pbmRleDtcbiAgICAgICAgICAgICAgICAgICAgZ2FtZS5zdGF0ZS5zdGFydCgnY29tcGxldGUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5cbnZhciBXYXZlID0gZnVuY3Rpb24oZGlmZmljdWx0eSkge1xuICAgIHRoaXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgIHRoaXMudGltZVRvQWRkID0gMDtcbiAgICB0aGlzLm51bWJlckFkZGVkID0gMDtcbiAgICB0aGlzLmVuZW1pZXMgPSBbXTtcbiAgICAvLyBzZXQgdXAgc2luZ2xlIGJhdGNoIG9mIGVuZW1pZXNcbiAgICB2YXIgZW5lbXlUeXBlID0gZ2FtZS5ybmQuYmV0d2VlbigxLCAzKTtcbiAgICB0aGlzLmhlYWx0aFJhdGluZyA9IGVuZW15VHlwZSAqIDM7XG4gICAgdGhpcy5udW1iZXJJbldhdmUgPSA5IC8gZW5lbXlUeXBlO1xuICAgIHRoaXMudGltZUJldHdlZW5BZGRpbmcgPSAwLjM1ICogZW5lbXlUeXBlO1xuICAgIHRoaXMubW92ZW1lbnRQYXR0ZXJuID0gZ2FtZS5ybmQucGljayhNb3ZlbWVudFR5cGVzKTtcbiAgICB0aGlzLnNob3RQYXR0ZXJuID0gZ2FtZS5ybmQucGljayhTaG90VHlwZXMuZW5lbXlTaG90cyk7XG4gICAgdGhpcy5pbWFnZUtleSA9IGdhbWUucm5kLnBpY2soRW5lbXkucHJvdG90eXBlLklNQUdFX0tFWVMpO1xufTtcbldhdmUucHJvdG90eXBlID0ge307XG5XYXZlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFdhdmU7XG5XYXZlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRpbWVUb0FkZCArPSBnYW1lLnRpbWUucGh5c2ljc0VsYXBzZWQ7XG4gICAgaWYgKHRoaXMudGltZVRvQWRkID4gdGhpcy50aW1lQmV0d2VlbkFkZGluZyAmJiB0aGlzLm51bWJlckFkZGVkIDwgdGhpcy5udW1iZXJJbldhdmUpIHtcbiAgICAgICAgdGhpcy50aW1lVG9BZGQgPSAwO1xuICAgICAgICB0aGlzLm51bWJlckFkZGVkKys7XG4gICAgICAgIHZhciBlbmVteSA9IG5ldyBFbmVteSh0aGlzLmltYWdlS2V5LCB0aGlzLmhlYWx0aFJhdGluZyxcbiAgICAgICAgICAgIHRoaXMubW92ZW1lbnRQYXR0ZXJuLCB0aGlzLnNob3RQYXR0ZXJuKTtcbiAgICAgICAgc2htdXAuZW5lbWllcy5hZGQoZW5lbXkpO1xuICAgICAgICB0aGlzLmVuZW1pZXMucHVzaChlbmVteSk7XG4gICAgfVxufTtcblxudmFyIEJvc3NXYXZlID0gZnVuY3Rpb24oZGlmZmljdWx0eSkge1xuICAgIHRoaXMuaW5pdCA9IGZhbHNlO1xuICAgIHRoaXMuYm9zcyA9IG5ldyBCb3NzKGRpZmZpY3VsdHkpO1xufTtcbkJvc3NXYXZlLnByb3RvdHlwZSA9IHt9O1xuQm9zc1dhdmUucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQm9zc1dhdmU7XG5Cb3NzV2F2ZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmluaXQpIHtcbiAgICAgICAgdGhpcy5pbml0ID0gdHJ1ZTtcbiAgICAgICAgc2htdXAuZW5lbWllcy5hZGQodGhpcy5ib3NzKTtcbiAgICAgICAgc2htdXAuaHVkLnNldEJvc3ModGhpcy5ib3NzKTtcbiAgICB9XG59O1xuXG52YXIgVUZPX0lNQUdFX0tFWVMgPSBbJ3Vmb0JsdWUnLCAndWZvR3JlZW4nLCAndWZvUmVkJywgJ3Vmb1llbGxvdyddO1xudmFyIFVmbyA9IGZ1bmN0aW9uKCkge1xuICAgIFBoYXNlci5TcHJpdGUuY2FsbCh0aGlzLCBnYW1lLCAwLCA2MCwgZ2FtZS5ybmQucGljayhVRk9fSU1BR0VfS0VZUykpO1xuICAgIHRoaXMuYW5jaG9yLnNldCgwLjUpO1xuICAgIHRoaXMuYWxwaGEgPSAwO1xuICAgIGdhbWUucGh5c2ljcy5hcmNhZGUuZW5hYmxlKHRoaXMpO1xuICAgIHRoaXMuYm9keS5zZXRTaXplKHRoaXMuYm9keS53aWR0aCAqIC44LCB0aGlzLmJvZHkuaGVpZ2h0ICogLjgpO1xuICAgIHRoaXMuY2hlY2tXb3JsZEJvdW5kcyA9IHRydWU7XG4gICAgdGhpcy5vdXRPZkJvdW5kc0tpbGwgPSB0cnVlO1xuICAgIHRoaXMuaGVhbHRoID0gNTAwO1xuICAgIHRoaXMuYm9keS52ZWxvY2l0eS54ID0gMTYwO1xuICAgIHRoaXMuZXZlbnRzLm9uS2lsbGVkLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuaGVhbHRoID4gMCkgcmV0dXJuO1xuICAgICAgICBzaG11cC5kYXRhLnNoaXAudWZvc0tpbGxlZCsrO1xuICAgICAgICAvLyBzaG11cC5lbWl0dGVyLmJ1cnN0KHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgc2htdXAuZGF0YS5zaGlwLnNjb3JlICs9IDEwMDAwO1xuICAgICAgICAvLyBnYW1lLnNvdW5kLnBsYXkoJ2V4cGxvZGUnICsgZ2FtZS5ybmQuYmV0d2VlbigxLCA2KSwgMC4yKTtcbiAgICB9LCB0aGlzKTtcbn07XG5VZm8ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQaGFzZXIuU3ByaXRlLnByb3RvdHlwZSk7XG5VZm8ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVWZvO1xuVWZvLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyB0aGlzLmFuZ2xlICs9IDEyMCAqIGdhbWUudGltZS5waHlzaWNzRWxhcHNlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RhZ2U7Il19
