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