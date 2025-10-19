let game;

const gameOptions = {
    playerSpeed: 250,
    playerJump: 500,
    gravity: 1000,
    maxJumps: 3,
    coinPoints: { silver: 1, gold: 5 },
    dragonSpeed: 100,
    platformSpacing: 120
};

window.onload = function() {
    const gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#112233",
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: window.innerWidth,
            height: window.innerHeight
        },
        physics: {
            default: "arcade",
            arcade: {
                gravity: { y: gameOptions.gravity },
                debug: false
            }
        },
        scene: MainScene
    };

    game = new Phaser.Game(gameConfig);

    window.addEventListener("resize", () => {
        if (game && game.scale) game.scale.resize(window.innerWidth, window.innerHeight);
    });
};

class MainScene extends Phaser.Scene {
    constructor() {
        super("MainScene");
        this.score = 0;
        this.jumpCount = 0;
        this.highestCameraY = 0;
    }

    preload() {
        this.load.spritesheet("warrior", "assets/warrior.png", { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet("silverCoin", "assets/coin_silver.png", { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet("goldCoin", "assets/coin_gold.png", { frameWidth: 32, frameHeight: 32 });
        this.load.image("platform", "assets/platform.png");
        this.load.image("dragon", "assets/dragon.png");
    }

    create() {
        
        this.platforms = this.physics.add.group({
            immovable: true,
            allowGravity: false
        });

        this.platformY = this.scale.height - 50;

        for (let i = 0; i < 15; i++) {
            this.addPlatform();
        }

        this.player = this.physics.add.sprite(100, this.scale.height - 200, "warrior");
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms, this.resetJumps, null, this);

        this.silverCoins = this.physics.add.group();
        this.goldCoins = this.physics.add.group();
        this.createCoinAnimations();
        this.addCoinsToPlatform();

        this.dragons = this.physics.add.group();
        this.spawnRandomDragons();
        this.physics.add.collider(this.dragons, this.platforms);
        this.physics.add.collider(this.player, this.dragons, this.hitDragon, null, this);

        this.scoreText = this.add.text(16, 16, "Score: 0", { fontSize: "30px", fill: "#fff" })
            .setScrollFactor(0);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.createPlayerAnimations();

        const worldHeight = 20000;
        this.physics.world.setBounds(0, -worldHeight + this.scale.height, this.scale.width, worldHeight);
        this.cameras.main.setBounds(0, -worldHeight + this.scale.height, this.scale.width, worldHeight);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setLerp(0.08, 0.08);
        this.cameras.main.setDeadzone(this.scale.width * 0.2, this.scale.height * 0.25);

        this.highestCameraY = -Infinity
    }

    addPlatform() {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const platform = this.platforms.create(x, this.platformY, "platform");
        platform.setScale(0.8).refreshBody();
        this.platformY -= gameOptions.platformSpacing;
    }

    addCoinsToPlatform() {
        this.platforms.getChildren().forEach(platform => {
            if (Math.random() < 0.8) {
                const silver = this.silverCoins.create(platform.x, platform.y - 32, "silverCoin");
                silver.play("silverSpin");
                if (Math.random() < 0.4) {
                    const gold = this.goldCoins.create(platform.x + 40, platform.y - 32, "goldCoin");
                    gold.play("goldSpin");
                }
            }
        });

        this.physics.add.collider(this.silverCoins, this.platforms);
        this.physics.add.collider(this.goldCoins, this.platforms);
        this.physics.add.overlap(this.player, this.silverCoins, this.collectSilver, null, this);
        this.physics.add.overlap(this.player, this.goldCoins, this.collectGold, null, this);
    }

    createCoinAnimations() {
        this.anims.create({ key: "silverSpin", frames: this.anims.generateFrameNumbers("silverCoin", { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: "goldSpin", frames: this.anims.generateFrameNumbers("goldCoin", { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    }

    spawnRandomDragons() {
        this.platforms.getChildren().forEach(platform => {
            if (Math.random() < 0.25) {
                const dragon = this.dragons.create(platform.x, platform.y - 25, "dragon");
                dragon.setScale(0.4);
                dragon.setVelocityX(gameOptions.dragonSpeed);
                dragon.minX = platform.x - 80;
                dragon.maxX = platform.x + 80;
                dragon.setCollideWorldBounds(true);
                dragon.body.allowGravity = false;
            }
        });
    }

    createPlayerAnimations() {
        this.anims.create({ key: "runLeft", frames: this.anims.generateFrameNumbers("warrior", { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: "idleStraight", frames: [{ key: "warrior", frame: 4 }], frameRate: 1 });
        this.anims.create({ key: "runRight", frames: this.anims.generateFrameNumbers("warrior", { start: 6, end: 7 }), frameRate: 10, repeat: -1 });
    }

    update() {

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-gameOptions.playerSpeed);
            this.player.anims.play("runLeft", true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(gameOptions.playerSpeed);
            this.player.anims.play("runRight", true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play("idleStraight", true);
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && this.jumpCount < gameOptions.maxJumps) {
            this.player.setVelocityY(-gameOptions.playerJump);
            this.jumpCount++;
        }

        this.dragons.getChildren().forEach(dragon => {
            if (dragon.x <= dragon.minX) dragon.setVelocityX(gameOptions.dragonSpeed);
            if (dragon.x >= dragon.maxX) dragon.setVelocityX(-gameOptions.dragonSpeed);
        });

        if (this.player.y < this.platformY + 400) {
            for (let i = 0; i < 4; i++) this.addPlatform();
            this.addCoinsToPlatform();
            this.spawnRandomDragons();
        }
      
        const cameraTop = this.cameras.main.scrollY;
const cameraBottom = cameraTop + this.scale.height;
if (this.player.y > cameraBottom) {
    this.scene.start("MainScene");
}

    }
    resetJumps() {
        this.jumpCount = 0;
    }

    collectSilver(player, coin) {
        coin.destroy();
        this.score += gameOptions.coinPoints.silver;
        this.scoreText.setText("Score: " + this.score);
    }

    collectGold(player, coin) {
        coin.destroy();
        this.score += gameOptions.coinPoints.gold;
        this.scoreText.setText("Score: " + this.score);
    }

    hitDragon(player, dragon) {
        this.scene.restart();
    }
}

