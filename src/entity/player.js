/* global Phaser, game, shmup */
var Player = function() {
    Phaser.Sprite.call(this, game, 400, 500, 'ship');
    game.physics.arcade.enable(this);
    this.anchor.set(0.5);
    this.scale.set(0.5);
    this.shotTimer = 0;
    this.body.setSize(this.body.width * .4, this.body.height * .4, 0, 5);
    this.body.collideWorldBounds = true;

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
    shmup.emitter.burst(this.x, this.y);
    game.sound.play('boss_explode', 0.3);
    this.kill();
    shmup.data.ship.weaponLevels[shmup.data.ship.currentWeapon] = 1;
    this.invulnerable = true;
    if (shmup.data.ship.lives > 0)
        game.time.events.add(2000, function() {
            shmup.enemyBullets.callAll('kill');
            shmup.data.ship.lives--;
            this.x = 400;
            this.y = 500;
            this.alpha = 0.5;
            this.revive();
            game.time.events.add(3000, function() {
                this.alpha = 1;
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