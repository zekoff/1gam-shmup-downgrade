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