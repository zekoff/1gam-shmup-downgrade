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