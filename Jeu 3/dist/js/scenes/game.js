class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    preload() {
        this.sky;
        this.clouds = [];
        this.grass;
        this.sounds;
        this.animations; // Renamed to avoid conflict with Phaser's `anims` manager
        this.coins = [];

        this.player;
        this.particles;
        this.steps;
        this.isJumping;

        this.cursors;

        // Load assets
        this.load.image('sky_23x23', 'dist/assets/img/sky.png');
        this.load.image('grass_23x23', 'dist/assets/img/grass.png');
        this.load.image('piece', 'dist/assets/img/ai-coin.png');
        this.load.image('cloud_300x159', 'dist/assets/img/cloud.png');
        this.load.spritesheet('player', 'dist/assets/img/spritesheet.png', { frameWidth: 300, frameHeight: 300, endFrame: 8 });

        this.load.audio('step_left_1', 'dist/assets/sounds/boots_step_left_1.wav');
        this.load.audio('step_left_2', 'dist/assets/sounds/boots_step_left_2.wav');
        this.load.audio('step_left_3', 'dist/assets/sounds/boots_step_left_3.wav');
        this.load.audio('step_right_1', 'dist/assets/sounds/boots_step_right_1.wav');
        this.load.audio('step_right_2', 'dist/assets/sounds/boots_step_right_2.wav');
        this.load.audio('step_right_3', 'dist/assets/sounds/boots_step_right_3.wav');

        this.load.audio('jump', 'dist/assets/sounds/boots_jump.wav');
        this.load.audio('land', 'dist/assets/sounds/boots_land.wav');
        this.load.audio('flying', 'dist/assets/sounds/flying.wav');
        this.load.audio('music', 'dist/assets/sounds/music.mp3');
        this.load.audio('collection', 'dist/assets/sounds/ding.mp3')
    }

    create() {
        // Sounds
        this.sounds = {
            step_left: [
                this.sound.add('step_left_1'),
                this.sound.add('step_left_2'),
                this.sound.add('step_left_3'),
            ],
            step_right: [
                this.sound.add('step_right_1'),
                this.sound.add('step_right_2'),
                this.sound.add('step_right_3'),
            ],
            jump: this.sound.add('jump'),
            land: this.sound.add('land', { volume: 2 }),
            flying: this.sound.add('flying', { volume: 1.5 }),
            music: this.sound.add('music', { volume: 0.5 }),
            piece: this.sound.add('collection', { volume: 1 }),
        };

        // Animations
        this.animations = {
            jumping: this.anims.create({
                key: 'jumping',
                frames: this.anims.generateFrameNumbers('player', { start: 7, end: 6 }),
                frameRate: 10,
                repeat: 0
            }),
            falling: this.anims.create({
                key: 'falling',
                frames: this.anims.generateFrameNumbers('player', { start: 4, end: 5 }),
                frameRate: 5,
                repeat: -1
            }),
            running: this.anims.create({
                key: 'running',
                frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            })
        };

        // Background and Ground
        this.sky = this.add.tileSprite(0, 0, window.config.width / 2, window.config.height / 2, "sky_23x23").setOrigin(0, 0).setScale(2);
        this.grass = this.add.tileSprite(0, window.config.height - 46, window.config.width / 2, window.config.height / 4, "grass_23x23").setOrigin(0, 0).setScale(2);

        // Clouds
        for (let couche = 1; couche <= 3; couche++) {
            for (let t = 0; t < 5; t++) {
                let cloud = this.add.image(
                    Math.random() * window.config.width - 300 * 0.2 * couche,
                    (Math.random() * window.config.height - 159 * 0.2 * couche) / 3,
                    'cloud_300x159',
                )
                    .setOrigin(0, 0)
                    .setScale((Math.random() * 0.05 + 0.05) * couche);
                cloud.alpha = 0.9;
                this.clouds.push(cloud);
            }
        }

        // Initialize the player first
        this.player = this.physics.add.sprite(300 * 0.4, window.config.height - 46 - 300 * 0.4, 'player').setScale(0.4);
        this.player.setCollideWorldBounds(true);
        
        // Initialize the particle effect for the player
        this.particles = this.add.particles('piece').createEmitter({
            speed: 1000,
            scale: { start: 0.05, end: 0.05 },
            lifespan: 1111,
            angle: { min: 110, max: 120 },
            quantity: { min: 10, max: 50 },
            tint: [0xcc0000, 0xcc5a00, 0xccab00],
            on: false,
        });

        this.particles.startFollow(this.player, -20, 15);
        this.player.anims.play('running', true);

        // Maximum Y-coordinate for coins to spawn
        const maxCoinY = window.config.height - 46 - 100; // Grass layer is at window.config.height - 46

        // Coins
        this.coinsGroup = this.physics.add.group();
        for (let g = 0; g < 5; g++) {
            let coin = this.coinsGroup.create(
                Math.random() * window.config.width,
                Math.random() * maxCoinY, // Limit the coin's Y position
                'piece'
            )
            .setOrigin(0, 0).setScale(0.15)
            .setImmovable(true);
            coin.body.allowGravity = false;
        }

        // Add overlap detection
        this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);

        // Ground and Collisions
        this.physics.add.existing(this.grass, true);
        this.physics.add.collider(this.player, this.grass);

        // Background Music
        this.sounds.music.loop = true;
        this.sounds.music.play();
        this.cursors = this.input.keyboard.createCursorKeys();

        // Player state variables
        this.steps = { leftStep: false, lastSoundTime: 0 };
        this.isJumping = false;
    }

    collectCoin(player, coin) {
        // Disable the collected coin (hide it and deactivate physics)
        coin.disableBody(true, true);
        this.sounds.piece.play();
    
        // Maximum Y-coordinate for new coins to spawn
        const maxCoinY = window.config.height - 46 - 100;

        // Create a new coin at random coordinates
        let newCoin = this.coinsGroup.create(
            Math.random() * window.config.width,
            Math.random() * maxCoinY, // Limit the coin's Y position
            'piece'
        )
        .setOrigin(0, 0).setScale(0.15)
        .setImmovable(true);
        
        // Disable gravity for the new coin
        newCoin.body.allowGravity = false;
    }

    update(time, delta) {
        // Parallax effect for background
        this.sky.tilePositionX = time / 20;
        this.grass.tilePositionX = time / 7.5;
        this.clouds.forEach((cloud) => {
            cloud.x -= (delta * 30) / 100 * cloud.scale;
            if (cloud.x < 0 - cloud.width) {
                cloud.x = window.config.width;
            }
        });

        // Move coins
        this.coinsGroup.children.iterate((coin) => {
            coin.x -= (delta * 177.5) / 100 * coin.scale;
            if (coin.x < 0 - coin.width) {
                coin.x = window.config.width;
            }
        });

        // Player physics and animations
        if (this.cursors.space.isDown || this.input.activePointer.isDown) {
            this.particles.start();
            this.player.body.velocity.y -= 20;
            this.player.anims.play('jumping', false);
            if (!this.sounds.flying.isPlaying) {
                this.sounds.flying.play();
            }
            if (!this.isJumping) {
                this.player.body.velocity.y = -100;
                this.sounds.jump.play();
                this.isJumping = true;
            }
        } else if (this.player.body.touching.down) {
            this.particles.stop();
            if (this.isJumping) {
                this.sounds.land.play();
                this.isJumping = false;
            }
            if (time / 400 > this.steps.lastSoundTime) {
                this.steps.lastSoundTime = time / 400 + 0.4;
                const rand = Math.floor(Math.random() * 3);
                this.sounds.step_right[rand].play();
                this.steps.leftStep ? this.sounds.step_left[rand].play() : this.sounds.step_right[rand].play();
                this.steps.leftStep = !this.steps.leftStep;
            }
            if (this.player.flipX === true) {
                this.player.x -= 0.5 * delta;
            }
            this.player.anims.play('running', true);
        } else {
            if (this.sounds.flying.isPlaying) {
                this.sounds.flying.stop();
            }
            this.particles.stop();
            if (this.player.body.velocity.y > 10) {
                this.player.anims.play('falling', true);
            } else {
                this.player.anims.play('jumping', false);
            }
        }

        // Left and right movement
        if (this.cursors.left.isDown) {
            this.player.flipX = true;
            this.player.x -= 0.3 * delta;
            this.particles.setAngle({ min: 30, max: 40 });
            this.particles.startFollow(this.player, 20, 15);
        } else if (this.cursors.right.isDown) {
            this.player.flipX = false;
            this.player.x += 0.3 * delta;
            this.particles.setAngle({ min: 110, max: 120 });
            this.particles.startFollow(this.player, -20, 15);
        }
    }
}

export default Game;
