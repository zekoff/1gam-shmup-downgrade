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