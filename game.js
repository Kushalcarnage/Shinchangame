// --- DATABASE SETUP ---
const supabaseUrl = 'https://jqnfrlglroaqoiegxwgm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbmZybGdscm9hcW9pZWd4d2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTg2MjcsImV4cCI6MjA5MjIzNDYyN30.81N2orHjnq787crXEpfUl7Wqf9Pmz3YI2AWwMRkUwhQ';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Global State
let globalStartTime;
let isInvincible = false; 
let downPressCount = 0;

// --- LEVEL 1: THE NEIGHBORHOOD (UNCHANGED) ---
class Level1 extends Phaser.Scene {
    constructor() { super('Level1'); }
    preload() {
        this.load.image('bg_home', 'home.png');
        this.load.image('bg_apartments', 'apartments.png');
        this.load.image('bg_kindergarten', 'kindergarten.png');
        this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.image('card', 'card.png');
        this.load.spritesheet('shin', 'Shin_Walk.png', { frameWidth: 32, frameHeight: 36 });
        this.load.spritesheet('misae_walk', 'misae_walk.png', { frameWidth: 66, frameHeight: 99 });
        this.load.spritesheet('crow_fly', 'crow.png', { frameWidth: 18, frameHeight: 17 });
        this.load.spritesheet('enchou_walk', 'enchou_walk.png', { frameWidth: 171, frameHeight: 291 });
        this.load.audio('bg_music', 'theme.mp3');
        this.load.audio('boss_music', 'boss.mp3');
    }
    create() {
        this.score = 0; this.survivalTime = 30; this.isSurvival = false; this.gameStarted = false;
        this.physics.world.setBounds(0, 0, 4500, 600);
        this.add.image(0, 0, 'bg_home').setOrigin(0, 0).setDisplaySize(1500, 600).setDepth(-1);
        this.add.image(1500, 0, 'bg_apartments').setOrigin(0, 0).setDisplaySize(1500, 600).setDepth(-1);
        this.add.image(3000, 0, 'bg_kindergarten').setOrigin(0, 0).setDisplaySize(1500, 600).setDepth(-1);
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(2250, 580, 'ground').setDisplaySize(4500, 40).setTint(0xFFD700).refreshBody();
        const stairs = [{x: 1400, y: 480}, {x: 1800, y: 400}, {x: 2200, y: 320}, {x: 2600, y: 240}, {x: 3000, y: 350}, {x: 3500, y: 450}];
        stairs.forEach(pos => this.platforms.create(pos.x, pos.y, 'ground').setScale(0.5).setTint(0xFFD700).refreshBody());
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
        this.physics.add.collider(this.player, [this.misae, this.enchou, this.flyers], () => { if (!isInvincible) location.reload(); });
        this.cameras.main.setBounds(0, 0, 4500, 600);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.scoreText = this.add.text(16, 16, 'Cards: 0/15', { fontSize: '32px', fill: '#FFF' }).setScrollFactor(0).setDepth(20);
        this.gameTimerText = this.add.text(16, 55, 'Time: 0s', { fontSize: '24px', fill: '#FFF' }).setScrollFactor(0).setDepth(20);
        this.timerText = this.add.text(533, 80, '', { fontSize: '48px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
        this.cursors = this.input.keyboard.createCursorKeys();
        document.getElementById('start-btn').onclick = () => {
            document.getElementById('ui-layer').style.display = 'none';
            this.physics.resume(); this.gameStarted = true;
            globalStartTime = this.time.now; this.sound.play('bg_music', { loop: true, volume: 0.3 });
        };
    }
    startSurvival() {
        this.isSurvival = true;
        this.enchou.enableBody(true, 4200, 300, true, true).setTint(0xff0000);
        this.sound.stopAll(); this.sound.play('boss_music', { loop: true });
        this.time.addEvent({ delay: 1000, repeat: 29, callback: () => {
            this.survivalTime--; this.timerText.setText("SURVIVE: " + this.survivalTime);
            if (this.survivalTime <= 0) this.showProceed();
        }});
    }
    showProceed() {
        this.physics.pause();
        const ui = document.getElementById('custom-ui'); ui.style.display = 'flex';
        document.getElementById('ui-title').innerText = "LEVEL 1 CLEAR!";
        const btn = document.getElementById('ui-action-btn');
        btn.innerText = "PROCEED TO LEVEL 2";
        btn.onclick = () => { ui.style.display = 'none'; this.scene.start('Level2'); };
    }
    update() {
        if (!this.gameStarted) return;
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            downPressCount++; if (downPressCount === 5) { isInvincible = true; this.player.setTint(0xFFFF00); }
        }
        let elapsed = Math.floor((this.time.now - globalStartTime) / 1000);
        this.gameTimerText.setText('Time: ' + elapsed + 's');
        if (this.cursors.left.isDown) { this.player.setVelocityX(-320); this.player.flipX = false; this.player.anims.play('shin_walk', true); }
        else if (this.cursors.right.isDown) { this.player.setVelocityX(320); this.player.flipX = true; this.player.anims.play('shin_walk', true); }
        else { this.player.setVelocityX(0); this.player.setFrame(0); }
        if (this.cursors.up.isDown && this.player.body.touching.down) this.player.setVelocityY(-620);
        this.misae.setVelocityX(this.misae.x < this.player.x ? 180 : -180);
        if ((this.player.y < this.misae.y - 100 || this.misae.body.blocked.left) && this.misae.body.touching.down) this.misae.setVelocityY(-400);
        if (this.isSurvival) {
            this.enchou.setVelocityX(this.enchou.x < this.player.x ? 230 : -230);
            if (this.player.y < this.enchou.y - 100 && this.enchou.body.touching.down) this.enchou.setVelocityY(-650);
        }
        this.flyers.children.iterate(f => { if(f && f.active) { f.setVelocityX(f.x < this.player.x ? 130 : -130); f.setVelocityY(f.y < this.player.y ? 70 : -70); }});
    }
}

// --- LEVEL 2: FOREST ARENA (ELITE AI & CENTERED UI) ---
class Level2 extends Phaser.Scene {
    constructor() { super('Level2'); }
    preload() {
        this.load.image('forest', 'forest_bg.png');
        this.load.image('gun', 'gun.png');
        this.load.image('ground_f', 'https://labs.phaser.io/assets/sprites/platform.png');
        this.load.spritesheet('blast', 'blast.png', { frameWidth: 40, frameHeight: 37 });
        this.load.spritesheet('bats', 'bats.png', { frameWidth: 432, frameHeight: 163 });
        this.load.spritesheet('owl', 'owl.png', { frameWidth: 153, frameHeight: 136 });
        this.load.spritesheet('buri', 'buri.png', { frameWidth: 181, frameHeight: 229 });
    }

    create() {
        this.wave = 1; this.bossHP = 200; this.maxBossHP = 200; 
        this.isKamen = false; this.dropTimer = 15; this.isDashing = false;
        
        this.physics.world.setBounds(0, 0, 2500, 600);
        this.add.image(0, 0, 'forest').setOrigin(0, 0).setDisplaySize(2500, 600).setDepth(-1);
        this.staticPlatforms = this.physics.add.staticGroup();
        this.staticPlatforms.create(1250, 580, 'ground_f').setDisplaySize(2500, 40).setTint(0x228B22).refreshBody();

        this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
        this.platH = this.movingPlatforms.create(600, 380, 'ground_f').setScale(0.5).setTint(0x228B22);
        this.platV = this.movingPlatforms.create(1800, 380, 'ground_f').setScale(0.5).setTint(0x228B22);

        this.player = this.physics.add.sprite(200, 500, 'shin').setScale(1.8).setCollideWorldBounds(true).setDepth(10);
        if (isInvincible) this.player.setTint(0xFFFF00);
        this.physics.add.collider(this.player, [this.staticPlatforms, this.movingPlatforms]);

        // START WITH 1 BAT, 1 OWL
        this.flyers = this.physics.add.group({ allowGravity: false });
        this.flyers.create(1800, 150, 'bats').setScale(0.2).setDepth(5);
        this.flyers.create(2000, 100, 'owl').setScale(0.3).setDepth(5);

        this.physics.add.collider(this.player, this.flyers, () => { if (!isInvincible) location.reload(); }, null, this);

        if (!this.anims.exists('bat_fly')) {
            this.anims.create({ key: 'bat_fly', frames: this.anims.generateFrameNumbers('bats', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'owl_fly', frames: this.anims.generateFrameNumbers('owl', { start: 0, end: 9 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'buri_walk', frames: this.anims.generateFrameNumbers('buri', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: 'blast_anim', frames: this.anims.generateFrameNumbers('blast', { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
        }
        this.flyers.children.iterate(f => f.play(f.texture.key === 'bats' ? 'bat_fly' : 'owl_fly'));

        this.gun = this.physics.add.sprite(1250, -100, 'gun').setScale(2.5).setDepth(5).disableBody(true, true).setVisible(false);
        this.physics.add.collider(this.gun, [this.staticPlatforms, this.movingPlatforms]);
        this.physics.add.overlap(this.player, this.gun, () => { 
            this.gun.destroy(); this.isKamen = true; 
            if (!isInvincible) this.player.setTint(0x00ff00);
            this.spawnExtraMiniMobs();
        });

        this.blasts = this.physics.add.group();
        this.physics.add.overlap(this.blasts, this.flyers, (blast, flyer) => { 
            blast.destroy(); flyer.disableBody(true, true);
            if(this.flyers.countActive(true) === 0 && this.isKamen) this.spawnBuri(); 
        });

        this.cameras.main.setBounds(0, 0, 2500, 600);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.healthGraphics = this.add.graphics().setScrollFactor(0).setDepth(30); 
        this.cursors = this.input.keyboard.createCursorKeys();
        this.space = this.input.keyboard.addKey('SPACE');
        
        // --- CENTERED TOP UI ---
        this.infoText = this.add.text(533, 50, "PARKOUR TO SURVIVE: 15", { 
            fontSize: '32px', fill: '#FFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 
        }).setOrigin(0.5).setScrollFactor(0).setDepth(25);

        this.time.addEvent({ delay: 1000, repeat: 14, callback: () => {
            this.dropTimer--;
            if (this.dropTimer > 0) this.infoText.setText("PARKOUR PRACTICE: " + this.dropTimer);
            else { this.infoText.setText("PICK UP THE BLASTER!"); this.gun.enableBody(true, 1250, 0, true, true).setVisible(true).setGravityY(300); }
        }});
    }

    spawnExtraMiniMobs() {
        this.infoText.setText("UNLEASH CARNAGE!");
        for (let i = 0; i < 8; i++) { // EVEN MORE MOBS
            let b = this.flyers.create(1500 + (i * 300), 150, 'bats').setScale(0.2).setDepth(5);
            let o = this.flyers.create(1700 + (i * 300), 100, 'owl').setScale(0.3).setDepth(5);
            b.play('bat_fly'); o.play('owl_fly');
        }
    }

    spawnBuri() {
        if(this.wave === 2) return;
        this.wave = 2; this.infoText.setText("BOSS: BURIBURIZAEMON!");
        this.boss = this.physics.add.sprite(2200, 300, 'buri').setScale(0.7).setCollideWorldBounds(true).setDepth(10);
        this.physics.add.collider(this.boss, [this.staticPlatforms, this.movingPlatforms]);
        this.physics.add.collider(this.player, this.boss, () => { if (!isInvincible) location.reload(); }); 
        
        this.physics.add.overlap(this.blasts, this.boss, (boss, blast) => { 
            blast.destroy(); this.bossHP -= 10; boss.setTint(0xff0000);
            this.time.delayedCall(100, () => { if(boss.active) boss.clearTint(); });
            if(this.bossHP <= 0) { boss.destroy(); this.win(); }
        });

        // BOSS DASH & JUMP TIMERS
        this.time.addEvent({ delay: 3000, callback: () => { this.isDashing = true; this.time.delayedCall(1000, () => { this.isDashing = false; }); }, loop: true });
        this.time.addEvent({ delay: 2000, callback: () => { if(this.boss.body.touching.down) this.boss.setVelocityY(-700); }, loop: true });
    }

    update() {
        // --- FIXED PLATFORM MOVEMENT ---
        if (this.platH && this.platH.body) {
            if (this.platH.x >= 1200) this.platH.setVelocityX(-250); 
            else if (this.platH.x <= 200) this.platH.setVelocityX(250);
            else if (this.platH.body.velocity.x === 0) this.platH.setVelocityX(250);
        }
        if (this.platV && this.platV.body) {
            if (this.platV.y >= 520) this.platV.setVelocityY(-200); 
            else if (this.platV.y <= 150) this.platV.setVelocityY(200);
            else if (this.platV.body.velocity.y === 0) this.platV.setVelocityY(200);
        }

        if (this.cursors.left.isDown) { this.player.setVelocityX(-320); this.player.flipX = false; this.player.anims.play('shin_walk', true); }
        else if (this.cursors.right.isDown) { this.player.setVelocityX(320); this.player.flipX = true; this.player.anims.play('shin_walk', true); }
        else { this.player.setVelocityX(0); this.player.setFrame(0); }
        if (this.cursors.up.isDown && this.player.body.touching.down) this.player.setVelocityY(-620);
        
        if (Phaser.Input.Keyboard.JustDown(this.space) && this.isKamen) {
            let b = this.blasts.create(this.player.x, this.player.y, 'blast').play('blast_anim');
            b.body.allowGravity = false; b.setVelocityX(this.player.flipX ? 900 : -900); b.setScale(1.5);
            b.flipX = !this.player.flipX;
        }

        // AGGRESSIVE BOSS & FLYER AI
        if (this.wave === 2 && this.boss && this.boss.body) {
            let speed = this.isDashing ? 500 : 220; 
            if (this.bossHP < 100) speed += 100; // ENRAGE SPEED
            this.boss.setVelocityX(this.boss.x < this.player.x ? speed : -speed);
            this.boss.flipX = this.boss.x < this.player.x;
            this.boss.anims.play('buri_walk', true);
            this.drawHealth();
        }
        this.flyers.children.iterate(f => { if(f && f.active) { 
            f.setVelocityX(f.x < this.player.x ? 230 : -230); 
            f.setVelocityY(f.y < this.player.y ? 100 : -100); 
        }});
    }

    drawHealth() {
        this.healthGraphics.clear();
        this.healthGraphics.fillStyle(0x000000); this.healthGraphics.fillRect(433, 20, 204, 24); // Centered under text
        this.healthGraphics.fillStyle(0xff0000); this.healthGraphics.fillRect(435, 22, 200, 20);
        this.healthGraphics.fillStyle(0x00ff00); this.healthGraphics.fillRect(435, 22, (this.bossHP / this.maxBossHP) * 200, 20);
    }

    async win() {
        this.physics.pause();
        let finalTime = Math.floor((this.time.now - globalStartTime) / 1000);
        const ui = document.getElementById('custom-ui'); 
        ui.style.display = 'flex';
        document.getElementById('ui-title').innerText = "FOREST LIBERATED!";
        document.getElementById('input-section').style.display = 'block'; 
        document.getElementById('ui-action-btn').onclick = async () => {
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
        document.getElementById('ui-action-btn').innerText = "REPLAY MISSION";
        document.getElementById('ui-action-btn').onclick = () => location.reload();
    }
}

const config = { type: Phaser.AUTO, width: 1067, height: 600, parent: 'game-container', physics: { default: 'arcade', arcade: { gravity: { y: 800 } } }, scene: [Level1, Level2] };
const game = new Phaser.Game(config);
