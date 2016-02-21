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