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