const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player, cursors, platforms, misae, boss, cards, flyers, chocobi, goldenCard;
let score = 0;
let targetCards = 15;
let scoreText, timerText, bossText;
let gameStarted = false;
let isPoweredUp = false;
let isBossBattle = false;
let survivalTime = 30; 

function preload() {
    this.load.image('bg_home', 'home.png');
    this.load.image('bg_apartments', 'apartments.png');
    this.load.image('bg_kindergarten', 'kindergarten.png');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.image('card', 'card.png');
    this.load.image('spark', 'https://labs.phaser.io/assets/particles/yellow.png');
    this.load.image('chocobi', 'chocobi.png'); 
    this.load.spritesheet('shin', 'Shin_Walk.png', { frameWidth: 32, frameHeight: 36 });
    this.load.spritesheet('misae_walk', 'misae_walk.png', { frameWidth: 66, frameHeight: 99 });
    this.load.spritesheet('crow_fly', 'crow.png', { frameWidth: 18, frameHeight: 17 });
    this.load.spritesheet('enchou_walk', 'enchou_walk.png', { frameWidth: 171, frameHeight: 291 });
    this.load.audio('bg_music', 'theme.mp3');
    this.load.audio('boss_music', 'boss.mp3'); 
}

function create() {
    this.sound.stopAll();
    this.physics.pause();
    
    const startBtn = document.getElementById('start-btn');
    const uiLayer = document.getElementById('ui-layer');

    startBtn.onclick = () => {
        uiLayer.style.display = 'none';
        this.physics.resume();
        gameStarted = true;
        this.sound.play('bg_music', { loop: true, volume: 0.3 });
    };

    this.physics.world.setBounds(0, 0, 3000, 800);
    this.add.image(0, 0, 'bg_home').setOrigin(0, 0).setDisplaySize(1000, 600);
    this.add.image(1000, 0, 'bg_apartments').setOrigin(0, 0).setDisplaySize(1000, 600);
    this.add.image(2000, 0, 'bg_kindergarten').setOrigin(0, 0).setDisplaySize(1000, 600);

    platforms = this.physics.add.staticGroup();
    // THE SAFE GROUND
    platforms.create(500, 570, 'ground').setDisplaySize(1000, 60).refreshBody(); 
    platforms.create(1400, 450, 'ground');
    platforms.create(1800, 570, 'ground').setDisplaySize(400, 60).refreshBody();
    platforms.create(2300, 400, 'ground');
    platforms.create(2800, 570, 'ground').setDisplaySize(500, 60).refreshBody();

    player = this.physics.add.sprite(200, 300, 'shin').setScale(1.8).setCollideWorldBounds(true);
    misae = this.physics.add.sprite(750, 300, 'misae_walk').setCollideWorldBounds(true);
    
    // BOSS Setup (Spawned higher so he lands ON the platform)
    boss = this.physics.add.sprite(2200, 100, 'enchou_walk');
    boss.setScale(0.8).setCollideWorldBounds(true);
    boss.disableBody(true, true);

    cards = this.physics.add.group({
        key: 'card',
        repeat: targetCards - 1,
        setXY: { x: 500, y: 0, stepX: 160 }
    });
    cards.children.iterate(child => { child.setScale(0.12).setBounceY(0.4); });

    chocobi = this.physics.add.sprite(1400, 100, 'chocobi').setScale(0.08);

    flyers = this.physics.add.group({ allowGravity: false });
    flyers.create(1300, 200, 'crow_fly').setScale(2.5);
    flyers.create(2400, 180, 'crow_fly').setScale(2.5);

    // Animations
    this.anims.create({ key: 'shin_walk', frames: this.anims.generateFrameNumbers('shin', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'shin_idle', frames: [ { key: 'shin', frame: 0 } ], frameRate: 20 });
    this.anims.create({ key: 'misae_run', frames: this.anims.generateFrameNumbers('misae_walk', { start: 0, end: 9 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'crow_flap', frames: this.anims.generateFrameNumbers('crow_fly', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'enchou_run', frames: this.anims.generateFrameNumbers('enchou_walk', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });

    flyers.children.iterate(child => { child.play('crow_flap'); });

    // Colliders
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(misae, platforms);
    this.physics.add.collider(boss, platforms); // Crucial for boss staying up
    this.physics.add.collider(cards, platforms);
    this.physics.add.collider(chocobi, platforms);

    this.physics.add.collider(player, misae, gameOver, null, this);
    this.physics.add.collider(player, boss, gameOver, null, this);
    this.physics.add.collider(player, flyers, gameOver, null, this);
    this.physics.add.overlap(player, cards, collectCard, null, this);
    this.physics.add.overlap(player, chocobi, activatePowerUp, null, this);

    this.cameras.main.setBounds(0, 0, 3000, 600);
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    cursors = this.input.keyboard.createCursorKeys();

    scoreText = this.add.text(16, 16, 'Cards: 0/' + targetCards, { fontSize: '32px', fill: '#FFF', stroke: '#000', strokeThickness: 5 }).setScrollFactor(0);
    timerText = this.add.text(400, 60, '', { fontSize: '42px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);
    bossText = this.add.text(400, 120, '', { fontSize: '20px', fill: '#ffff00' }).setOrigin(0.5).setScrollFactor(0);
}

function update() {
    if (!gameStarted) return;

    let currentSpeed = isPoweredUp ? 450 : 250;

    if (cursors.left.isDown) {
        player.setVelocityX(-currentSpeed);
        player.anims.play('shin_walk', true);
        player.flipX = false;
    } else if (cursors.right.isDown) {
        player.setVelocityX(currentSpeed);
        player.anims.play('shin_walk', true);
        player.flipX = true;
    } else {
        player.setVelocityX(0);
        player.anims.play('shin_idle');
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-600);
    }

    if (player.y > 650) { gameOver.call(this, player); }

    // Misae AI
    misae.anims.play('misae_run', true);
    if (misae.x < player.x) { misae.setVelocityX(isBossBattle ? 120 : 100); misae.flipX = false; }
    else { misae.setVelocityX(isBossBattle ? -120 : -100); misae.flipX = true; }
    if (misae.body.touching.down && (misae.body.blocked.left || misae.body.blocked.right)) { misae.setVelocityY(-500); }

    // BOSS AI
    if (isBossBattle) {
        boss.anims.play('enchou_run', true);
        if (boss.x < player.x) { boss.setVelocityX(180); boss.flipX = true; }
        else { boss.setVelocityX(-180); boss.flipX = false; }
        if (boss.body.touching.down && (boss.body.blocked.left || boss.body.blocked.right || Phaser.Math.Between(0, 100) > 90)) {
            boss.setVelocityY(-580);
        }
    }

    flyers.children.iterate(flyer => {
        let fSpeed = isBossBattle ? 130 : 90;
        if (flyer.x < player.x) { flyer.setVelocityX(fSpeed); flyer.flipX = true; }
        else { flyer.setVelocityX(-fSpeed); flyer.flipX = false; }
        if (flyer.y < player.y - 65) { flyer.setVelocityY(isBossBattle ? 70 : 50); }
        else if (flyer.y > player.y + 65) { flyer.setVelocityY(isBossBattle ? -70 : -50); }
        else { flyer.setVelocityY(0); }
    });
}

function startBossBattle(scene) {
    isBossBattle = true;
    // Activate Boss ON A PLATFORM (X=2200 is Kindergarten area)
    boss.enableBody(true, 2200, 300, true, true); 
    boss.setScale(1.6).setTint(0xff0000); 

    scene.cameras.main.shake(1000, 0.02);
    scene.sound.stopAll();
    scene.sound.play('boss_music', { loop: true, volume: 0.4 });
    
    bossText.setText("FIND THE GOLDEN CARD AT THE TOP!");

    // SPAWN GOLDEN CARD HIGH UP (X=2600, Y=100)
    // We make it STATIC so it never falls
    goldenCard = scene.physics.add.staticSprite(2600, 100, 'card').setScale(0.3).setTint(0xffff00);
    scene.physics.add.overlap(player, goldenCard, () => winGame(scene, "GOLDEN CARD FOUND!"), null, scene);

    let timerEvent = scene.time.addEvent({
        delay: 1000,
        callback: () => {
            survivalTime--;
            timerText.setText("SURVIVE: " + survivalTime + "s");
            if (survivalTime <= 0) {
                timerEvent.remove();
                winGame(scene, "BOSS DEFEATED BY TIME!");
            }
        },
        loop: true
    });
}

function collectCard(player, card) {
    const particles = this.add.particles(card.x, card.y, 'spark', { speed: 150, scale: { start: 0.1, end: 0 }, lifespan: 400 });
    this.time.delayedCall(400, () => { particles.destroy(); });
    card.disableBody(true, true);
    score += 1;
    scoreText.setText('Cards: ' + score + '/' + targetCards);
    if (score === targetCards && !isBossBattle) { startBossBattle(this); }
}

function activatePowerUp(player, chocobiItem) {
    chocobiItem.disableBody(true, true); 
    isPoweredUp = true;
    player.setTint(0xffff00); 
    const p = this.add.particles(player.x, player.y, 'spark', { speed: 100, scale: { start: 0.1, end: 0 }, lifespan: 500, follow: player });
    this.time.delayedCall(5000, () => { isPoweredUp = false; player.clearTint(); p.destroy(); });
}

function winGame(scene, message) {
    scene.physics.pause();
    scene.sound.stopAll();
    alert(message + "\nKASUKABE IS SAFE!");
    location.reload();
}

function gameOver(player) {
    this.physics.pause();
    player.setTint(0xff0000);
    this.sound.stopAll();
    alert("MISSION FAILED!");
    location.reload();
}