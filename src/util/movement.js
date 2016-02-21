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