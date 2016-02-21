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