// --- DATABASE SETUP ---
const supabaseUrl = 'https://jqnfrlglroaqoiegxwgm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbmZybGdscm9hcW9pZWd4d2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTg2MjcsImV4cCI6MjA5MjIzNDYyN30.81N2orHjnq787crXEpfUl7Wqf9Pmz3YI2AWwMRkUwhQ';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- GLOBAL STATE ---
let globalStartTime;
let isInvincible = false; 
let downPressCount = 0;
let playerLives = 3; 
let isRecovering = false; 

// --- SCENES ---
class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }
    preload() { 
        // --- ADD MAINMENU BACKGROUND ---
        this.load.image('shinchantheme', 'shinchantheme.png'); 
    }
    create() {
        this.add.image(533, 300, 'shinchantheme').setDisplaySize(1067, 600).setAlpha(0.6);
        document.getElementById('main-menu').style.display = 'flex';
        playerLives = 3; isInvincible = false; downPressCount = 0;
    }
}

class PauseScene extends Phaser.Scene {
    constructor() { super('PauseScene'); }
    create(data) {
        document.getElementById('pause-screen').style.display = 'flex';
        this.originScene = data.origin;
        this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    }
    resumeGame() {
        document.getElementById('pause-screen').style.display = 'none';
        this.scene.resume(this.originScene); this.scene.stop();
    }
}

function checkPause(scene) {
    if (Phaser.Input.Keyboard.JustDown(scene.input.keyboard.addKey('ESC'))) {
        scene.scene.pause();
        scene.scene.launch('PauseScene', { origin: scene.scene.key });
    }
}

function handleDamage(scene, player) {
    if (isInvincible || isRecovering) return;
    playerLives--;
    scene.events.emit('updateLives'); 
    if (playerLives <= 0) { location.reload(); }
    else {
        isRecovering = true; player.setAlpha(0.5);
        scene.time.delayedCall(2000, () => { isRecovering = false; player.setAlpha(1); });
    }
}

// --- LEVEL 1 ---
class Level1 extends Phaser.Scene {
    constructor() { super('Level1'); }
    preload() {
        this.load.image('bg_home', 'home.png');
        this.load.image('bg_apartments', 'apartments.png');
        this.load.image('bg_kindergarten', 'kindergarten.png');
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.image('card', 'card.png');
        this.load.image('chocobi', 'chocobi.png'); 
        this.load.spritesheet('shin', 'Shin_Walk.png', { frameWidth: 32, frameHeight: 36 });
        this.load.spritesheet('misae_walk', 'misae_walk.png', { frameWidth: 66, frameHeight: 99 });
        this.load.spritesheet('crow_fly', 'crow.png', { frameWidth: 18, frameHeight: 17 });
        this.load.spritesheet('enchou_walk', 'enchou_walk.png', { frameWidth: 171, frameHeight: 291 });
        this.load.audio('bg_music', 'theme.mp3');
        this.load.audio('boss_music', 'boss.mp3');
    }
    create() {
        this.score = 0; this.survivalTime = 30; this.isSurvival = false; this.canDash = true; this.isDashing = false;
        this.physics.world.setBounds(0, 0, 4500, 600);
        this.add.image(0, 0, 'bg_home').setOrigin(0, 0).setDisplaySize(1500, 600).setDepth(-1);
        this.add.image(1500, 0, 'bg_apartments').setOrigin(0, 0).setDisplaySize(1500, 600).setDepth(-1);
        this.add.image(3000, 0, 'bg_kindergarten').setOrigin(0, 0).setDisplaySize(1500, 600).setDepth(-1);
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(2250, 580, 'ground').setDisplaySize(4500, 40).setTint(0x556b2f).refreshBody();
        const stairs = [{x: 1400, y: 480}, {x: 1800, y: 400}, {x: 2200, y: 320}, {x: 2600, y: 240}, {x: 3000, y: 350}, {x: 3500, y: 450}];
        stairs.forEach(pos => this.platforms.create(pos.x, pos.y, 'ground').setScale(0.5).setTint(0x556b2f).refreshBody());
        this.player = this.physics.add.sprite(200, 400, 'shin').setScale(1.8).setCollideWorldBounds(true).setDepth(10);
        this.misae = this.physics.add.sprite(800, 400, 'misae_walk').setScale(1.2).setCollideWorldBounds(true);
        this.enchou = this.physics.add.sprite(4200, 300, 'enchou_walk').setScale(2.5).setCollideWorldBounds(true).disableBody(true, true);
        this.cards = this.physics.add.group({ key: 'card', repeat: 14, setXY: { x: 600, y: 0, stepX: 250 } });
        this.cards.children.iterate(c => c.setScale(0.15).setBounceY(0.3));
        this.flyers = this.physics.add.group({ allowGravity: false });
        this.flyers.create(1500, 200, 'crow_fly').setScale(2.5);
        this.flyers.create(3000, 150, 'crow_fly').setScale(2.5);
        if (!this.anims.exists('shin_walk')) {
            this.anims.create({ key: 'shin_walk', frames: this.anims.generateFrameNumbers('shin', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'misae_run', frames: this.anims.generateFrameNumbers('misae_walk', { start: 0, end: 9 }), frameRate: 12, repeat: -1 });
            this.anims.create({ key: 'crow_flap', frames: this.anims.generateFrameNumbers('crow_fly', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'enchou_run', frames: this.anims.generateFrameNumbers('enchou_walk', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
        }
        this.flyers.children.iterate(f => f.play('crow_flap'));
        this.physics.add.collider([this.player, this.misae, this.enchou, this.cards], this.platforms);
        this.physics.add.overlap(this.player, this.cards, (p, c) => {
            c.disableBody(true, true); this.score++;
            this.scoreText.setText('Cards: ' + this.score + '/15');
            if (this.score === 15) this.startSurvival();
        });
        this.physics.add.collider(this.player, [this.misae, this.enchou, this.flyers], () => handleDamage(this, this.player));
        this.cameras.main.setBounds(0, 0, 4500, 600);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.scoreText = this.add.text(16, 16, 'Cards: 0/15', { fontSize: '28px', fill: '#efead8' }).setScrollFactor(0).setDepth(20);
        this.gameTimerText = this.add.text(16, 50, 'Time: 0s', { fontSize: '22px', fill: '#efead8' }).setScrollFactor(0).setDepth(20);
        this.timerText = this.add.text(533, 80, '', { fontSize: '40px', fill: '#d32f2f', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
        this.hearts = this.add.group();
        this.updateHearts();
        this.events.on('updateLives', () => this.updateHearts());
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        globalStartTime = this.time.now; this.sound.play('bg_music', { loop: true, volume: 0.3 });
    }
    updateHearts() {
        this.hearts.clear(true, true);
        for (let i = 0; i < playerLives; i++) { this.hearts.create(20 + (i * 45), 100, 'chocobi').setScale(0.1).setScrollFactor(0).setDepth(20); }
    }
    startSurvival() {
        this.isSurvival = true;
        this.enchou.enableBody(true, 4200, 300, true, true).setTint(0x5d4037);
        this.sound.stopAll(); this.sound.play('boss_music', { loop: true });
        this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
            this.survivalTime--; this.timerText.setText("SURVIVE: " + this.survivalTime);
            if (this.survivalTime <= 0) this.showProceed();
        }});
    }
    showProceed() {
        this.physics.pause();
        const ui = document.getElementById('pause-screen'); 
        ui.style.display = 'flex'; document.getElementById('pause-title').innerText = "LEVEL 1 CLEAR!";
        ui.querySelector('button').innerText = "ENTER FOREST";
        ui.querySelector('button').onclick = () => { ui.style.display = 'none'; this.scene.start('Level2'); };
    }
    update() {
        checkPause(this);
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) { downPressCount++; if (downPressCount === 5) { isInvincible = true; this.player.setTint(0xFFFF00); } }
        if (Phaser.Input.Keyboard.JustDown(this.shift) && this.canDash) {
            this.isDashing = true; this.canDash = false; this.player.setTint(0xe0ffff);
            this.time.delayedCall(300, () => { this.isDashing = false; if (!isInvincible) this.player.clearTint(); });
            this.time.delayedCall(1000, () => { this.canDash = true; });
        }
        let elapsed = Math.floor((this.time.now - globalStartTime) / 1000);
        this.gameTimerText.setText('Time: ' + elapsed + 's');
        let speed = this.isDashing ? 800 : 320;
        if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); this.player.flipX = false; this.player.anims.play('shin_walk', true); }
        else if (this.cursors.right.isDown) { this.player.setVelocityX(speed); this.player.flipX = true; this.player.anims.play('shin_walk', true); }
        else { this.player.setVelocityX(0); this.player.anims.stop(); this.player.setFrame(0); }
        if (this.cursors.up.isDown && this.player.body.touching.down) this.player.setVelocityY(-620);
        this.misae.setVelocityX(this.misae.x < this.player.x ? 140 : -140);
        this.misae.flipX = this.misae.body.velocity.x > 0;
        this.misae.anims.play('misae_run', true);
        if ((this.player.y < this.misae.y - 100 || this.misae.body.blocked.left) && this.misae.body.touching.down) this.misae.setVelocityY(-320);
        if (this.isSurvival) {
            this.enchou.setVelocityX(this.enchou.x < this.player.x ? 230 : -230);
            this.enchou.flipX = this.enchou.body.velocity.x > 0;
            if (this.player.y < this.enchou.y - 100 && this.enchou.body.touching.down) this.enchou.setVelocityY(-650);
        }
        this.flyers.children.iterate(f => { if(f && f.active) { 
            f.setVelocityX(f.x < this.player.x ? 130 : -130); f.setVelocityY(f.y < this.player.y ? 70 : -70); f.flipX = f.body.velocity.x > 0;
        }});
    }
}

// --- LEVEL 2: FOREST ARENA (FIXED BACKGROUND & FLOATING) ---
class Level2 extends Phaser.Scene {
    constructor() { super('Level2'); }
    preload() {
        // --- FIXED BACKGROUND LOADING ---
        this.load.image('forest_bg', 'forest_bg.png'); 
        this.load.image('gun', 'gun.png');
        this.load.image('chocobi', 'chocobi.png');
        this.load.image('ground_f', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.spritesheet('blast', 'blast.png', { frameWidth: 40, frameHeight: 37 });
        this.load.spritesheet('bats', 'bats.png', { frameWidth: 432, frameHeight: 163 });
        this.load.spritesheet('owl', 'owl.png', { frameWidth: 153, frameHeight: 136 });
        this.load.spritesheet('buri', 'buri.png', { frameWidth: 181, frameHeight: 229 });
        this.load.spritesheet('action_suit', 'shinchanactionsuit.png', { frameWidth: 307, frameHeight: 1024 }); 
    }
    create() {
        this.wave = 1; this.bossHP = 200; this.maxBossHP = 200; this.isKamen = false; this.dropTimer = 15; this.jumpCount = 0;
        this.physics.world.setBounds(0, 0, 2500, 600);
        // --- APPLY CORRECT FOREST BACKGROUND THEME ---
        this.add.image(0, 0, 'forest_bg').setOrigin(0, 0).setDisplaySize(2500, 600).setDepth(-1);
        
        this.staticPlatforms = this.physics.add.staticGroup();
        this.staticPlatforms.create(1250, 580, 'ground_f').setDisplaySize(2500, 40).setTint(0x388e3c).refreshBody();
        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.platH = this.movingPlatforms.create(600, 380, 'ground_f').setScale(0.5).setTint(0x388e3c);
        this.platV = this.movingPlatforms.create(1800, 380, 'ground_f').setScale(0.5).setTint(0x388e3c);
        this.player = this.physics.add.sprite(200, 500, 'shin').setScale(1.8).setCollideWorldBounds(true).setDepth(10);
        if (isInvincible) this.player.setTint(0xFFFF00);
        this.physics.add.collider(this.player, [this.staticPlatforms, this.movingPlatforms]);
        this.flyers = this.physics.add.group({ allowGravity: false });
        this.flyers.create(1800, 150, 'bats').setScale(0.2).setDepth(5);
        this.flyers.create(2000, 100, 'owl').setScale(0.3).setDepth(5);
        this.physics.add.collider(this.player, this.flyers, () => handleDamage(this, this.player), null, this);
        if (!this.anims.exists('bat_fly')) {
            this.anims.create({ key: 'bat_fly', frames: this.anims.generateFrameNumbers('bats', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'owl_fly', frames: this.anims.generateFrameNumbers('owl', { start: 0, end: 9 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'buri_walk', frames: this.anims.generateFrameNumbers('buri', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: 'blast_anim', frames: this.anims.generateFrameNumbers('blast', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'action_run', frames: this.anims.generateFrameNumbers('action_suit', { start: 0, end: 4 }), frameRate: 12, repeat: -1 });
        }
        this.flyers.children.iterate(f => f.play(f.texture.key === 'bats' ? 'bat_fly' : 'owl_fly'));
        this.gun = this.physics.add.sprite(1250, -100, 'gun').setScale(2.5).setDepth(5).disableBody(true, true).setVisible(false);
        this.physics.add.collider(this.gun, [this.staticPlatforms, this.movingPlatforms]);
        
        // --- FIXED FLOATING ISSUE ---
        this.physics.add.overlap(this.player, this.gun, () => { 
            this.gun.destroy(); this.isKamen = true; 
            this.player.setTexture('action_suit').setScale(0.18); 
            // Shrink physics body and push offset to the visible feet
            this.player.body.setSize(200, 920); 
            this.player.body.setOffset(50, 80); 
            this.player.play('action_run');
            this.spawnExtraMiniMobs();
        });
        
        this.blasts = this.physics.add.group();
        this.physics.add.overlap(this.blasts, this.flyers, (blast, flyer) => { blast.destroy(); flyer.disableBody(true, true); if(this.flyers.countActive(true) === 0 && this.isKamen) this.spawnBuri(); });
        this.cameras.main.setBounds(0, 0, 2500, 600);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.healthGraphics = this.add.graphics().setScrollFactor(0).setDepth(30); 
        this.hearts = this.add.group();
        this.updateHearts();
        this.events.on('updateLives', () => this.updateHearts());
        this.cursors = this.input.keyboard.createCursorKeys();
        this.space = this.input.keyboard.addKey('SPACE');
        this.shift = this.input.keyboard.addKey('SHIFT');
        this.infoText = this.add.text(533, 40, "PARKOUR PRACTICE: 15", { fontSize: '28px', fill: '#efead8', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(25);
        this.gameTimerText = this.add.text(533, 75, 'Time: 0s', { fontSize: '20px', fill: '#efead8' }).setOrigin(0.5).setScrollFactor(0).setDepth(25);
        this.time.addEvent({ delay: 1000, repeat: 14, callback: () => {
            this.dropTimer--; if (this.dropTimer > 0) this.infoText.setText("PARKOUR PRACTICE: " + this.dropTimer);
            else { this.infoText.setText("PICK UP THE BLASTER!"); this.gun.enableBody(true, 1250, 0, true, true).setVisible(true).setGravityY(300); }
        }});
    }
    updateHearts() {
        this.hearts.clear(true, true);
        for (let i = 0; i < playerLives; i++) { this.hearts.create(20 + (i * 45), 90, 'chocobi').setScale(0.1).setScrollFactor(0).setDepth(30); }
    }
    spawnExtraMiniMobs() {
        for (let i = 0; i < 6; i++) { 
            this.flyers.create(1500 + (i * 400), 150, 'bats').setScale(0.2).setDepth(5).play('bat_fly');
            this.flyers.create(1700 + (i * 400), 100, 'owl').setScale(0.3).setDepth(5).play('owl_fly');
        }
    }
    spawnBuri() {
        if(this.wave === 2) return;
        this.wave = 2; this.infoText.setText("BOSS: BURIBURIZAEMON!");
        this.boss = this.physics.add.sprite(2200, 300, 'buri').setScale(0.7).setCollideWorldBounds(true).setDepth(10);
        this.physics.add.collider(this.boss, [this.staticPlatforms, this.movingPlatforms]);
        this.physics.add.collider(this.player, this.boss, () => handleDamage(this, this.player)); 
        this.physics.add.overlap(this.blasts, this.boss, (boss, blast) => { 
            blast.destroy(); this.bossHP -= 10; if(this.bossHP <= 0) { boss.destroy(); this.win(); }
        });
        this.time.addEvent({ delay: 2000, callback: () => { if(this.boss && this.boss.body && this.boss.body.touching.down) this.boss.setVelocityY(-700); }, loop: true });
    }
    update() {
        checkPause(this);
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) { downPressCount++; if (downPressCount === 5) { isInvincible = true; this.player.setTint(0xFFFF00); } }
        if (Phaser.Input.Keyboard.JustDown(this.shift) && this.canDash) {
            this.isDashing = true; this.canDash = false; this.player.setTint(0xe0ffff);
            this.time.delayedCall(300, () => { this.isDashing = false; if (!isInvincible) this.player.clearTint(); if(this.isKamen) this.player.setTint(0x00ff00); });
            this.time.delayedCall(1000, () => { this.canDash = true; });
        }
        let elapsed = Math.floor((this.time.now - globalStartTime) / 1000);
        this.gameTimerText.setText('Time: ' + elapsed + 's');
        if (this.platH && this.platH.body) { if (this.platH.x >= 1200) this.platH.setVelocityX(-250); else if (this.platH.x <= 200) this.platH.setVelocityX(250); else if (this.platH.body.velocity.x === 0) this.platH.setVelocityX(250); }
        if (this.platV && this.platV.body) { if (this.platV.y >= 520) this.platV.setVelocityY(-200); else if (this.platV.y <= 150) this.platV.setVelocityY(200); else if (this.platV.body.velocity.y === 0) this.platV.setVelocityY(200); }
        let speed = this.isDashing ? 850 : 320;
        if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); this.player.flipX = this.isKamen; this.isKamen ? this.player.play('action_run', true) : this.player.anims.play('shin_walk', true); }
        else if (this.cursors.right.isDown) { this.player.setVelocityX(speed); this.player.flipX = !this.isKamen; this.isKamen ? this.player.play('action_run', true) : this.player.anims.play('shin_walk', true); }
        else { this.player.setVelocityX(0); this.player.anims.stop(); this.player.setFrame(0); }
        const onGround = this.player.body.touching.down;
        if (onGround) { this.jumpCount = 0; }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            if (onGround) { this.player.setVelocityY(-620); this.jumpCount = 1; }
            else if (this.isKamen && this.jumpCount < 2) { this.player.setVelocityY(-620); this.jumpCount = 2; }
        }
        if (Phaser.Input.Keyboard.JustDown(this.space) && this.isKamen) {
            let b = this.blasts.create(this.player.x, this.player.y - 20, 'blast').play('blast_anim'); 
            b.body.allowGravity = false; b.setVelocityX(this.player.flipX ? -900 : 900); b.flipX = this.player.flipX;
        }
        if (this.wave === 2 && this.boss && this.boss.body) {
            this.boss.setVelocityX(this.boss.x < this.player.x ? 220 : -220); this.boss.flipX = this.boss.x < this.player.x; this.drawHealth();
        }
        this.flyers.children.iterate(f => { if(f && f.active) { 
            f.setVelocityX(f.x < this.player.x ? 230 : -230); f.setVelocityY(f.y < this.player.y ? 100 : -100); f.flipX = f.body.velocity.x > 0;
        }});
    }
    drawHealth() {
        this.healthGraphics.clear(); this.healthGraphics.fillStyle(0x000000); this.healthGraphics.fillRect(433, 110, 204, 24);
        this.healthGraphics.fillStyle(0x2e7d32); this.healthGraphics.fillRect(435, 112, (this.bossHP / this.maxBossHP) * 200, 20);
    }
    async win() {
        this.physics.pause();
        let finalTime = Math.floor((this.time.now - globalStartTime) / 1000);
        const ui = document.getElementById('custom-ui'); 
        ui.style.display = 'flex';
        document.getElementById('ui-message').innerText = "Hero, enter your name:";
        document.getElementById('input-section').style.display = 'block'; 
        const btn = document.getElementById('ui-action-btn');
        btn.onclick = async () => {
            const pName = document.getElementById('player-name').value || "Kushal";
            await supabaseClient.from('leaderboard').insert([{ name: pName, score: finalTime }]);
            this.showTop5(); 
        };
    }
    async showTop5() {
        const { data } = await supabaseClient.from('leaderboard').select('*').order('score', { ascending: true }).limit(5);
        let list = data.map((r, i) => `${i+1}. ${r.name}: ${r.score}s`).join('\n');
        document.getElementById('ui-title').innerText = "WORLD TOP 5";
        document.getElementById('ui-message').innerText = list;
        document.getElementById('input-section').style.display = 'none';
        document.getElementById('ui-action-btn').innerText = "REPLAY";
        document.getElementById('ui-action-btn').onclick = () => location.reload();
    }
}

const config = { type: Phaser.AUTO, width: 1067, height: 600, parent: 'game-container', physics: { default: 'arcade', arcade: { gravity: { y: 800 } } }, scene: [MainMenu, Level1, Level2, PauseScene] };
const game = new Phaser.Game(config);

function startGame() { document.getElementById('main-menu').style.display = 'none'; game.scene.stop('MainMenu'); game.scene.start('Level1'); }
function resumeFromButton() {
    document.getElementById('pause-screen').style.display = 'none';
    const active = game.scene.getScenes(true).find(s => s.scene.key.startsWith('Level'));
    game.scene.resume(active.scene.key); game.scene.stop('PauseScene');
}
