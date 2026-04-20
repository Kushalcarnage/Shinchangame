// --- DATABASE INITIALIZATION ---
// I've plugged in your specific URL and Anon Key here
const supabaseUrl = 'https://jqnfrlglroaqoiegxwgm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbmZybGdscm9hcW9pZWd4d2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTg2MjcsImV4cCI6MjA5MjIzNDYyN30.81N2orHjnq787crXEpfUl7Wqf9Pmz3YI2AWwMRkUwhQ';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const config = {
    type: Phaser.AUTO,
    width: 1067, 
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player, cursors, platforms, misae, boss, cards, flyers;
let score = 0, targetCards = 15;
let scoreText, gameTimerText, timerText, bossText;
let gameStarted = false, isBossBattle = false, missionFinished = false;
let startTime, survivalTime = 30;

function preload() {
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

function create() {
    this.physics.pause();
    this.physics.world.setBounds(0, 0, 4500, 600);
    cursors = this.input.keyboard.createCursorKeys();

    this.add.image(0, 0, 'bg_home').setOrigin(0, 0).setDisplaySize(1500, 600);
    this.add.image(1500, 0, 'bg_apartments').setOrigin(0, 0).setDisplaySize(1500, 600);
    this.add.image(3000, 0, 'bg_kindergarten').setOrigin(0, 0).setDisplaySize(1500, 600);

    platforms = this.physics.add.staticGroup();
    let base = platforms.create(2250, 580, 'ground').setDisplaySize(4500, 40).refreshBody();
    base.setTint(0xFFD700); 

    const stairPositions = [
        {x: 1400, y: 480}, {x: 1800, y: 400}, {x: 2200, y: 320}, 
        {x: 2600, y: 240}, {x: 3000, y: 350}, {x: 3500, y: 450}
    ];
    stairPositions.forEach(pos => {
        let p = platforms.create(pos.x, pos.y, 'ground').setScale(0.5).refreshBody();
        p.setTint(0xFFD700); 
    });

    player = this.physics.add.sprite(200, 400, 'shin').setScale(1.8).setCollideWorldBounds(true);
    player.body.setSize(22, 30).setOffset(5, 5);

    misae = this.physics.add.sprite(800, 400, 'misae_walk').setCollideWorldBounds(true);
    misae.body.setSize(40, 85).setOffset(13, 10);

    boss = this.physics.add.sprite(4200, 300, 'enchou_walk').setScale(2.5).setCollideWorldBounds(true);
    boss.disableBody(true, true);

    cards = this.physics.add.group({ key: 'card', repeat: targetCards - 1, setXY: { x: 600, y: 0, stepX: 250 } });
    cards.children.iterate(child => { child.setScale(0.12).setBounceY(0.4); });

    flyers = this.physics.add.group({ allowGravity: false });
    flyers.create(1500, 200, 'crow_fly').setScale(2.5);
    flyers.create(3000, 150, 'crow_fly').setScale(2.5);

    if (!this.anims.exists('shin_walk')) {
        this.anims.create({ key: 'shin_walk', frames: this.anims.generateFrameNumbers('shin', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'misae_run', frames: this.anims.generateFrameNumbers('misae_walk', { start: 0, end: 9 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'crow_flap', frames: this.anims.generateFrameNumbers('crow_fly', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'enchou_run', frames: this.anims.generateFrameNumbers('enchou_walk', { start: 0, end: 4 }), frameRate: 10, repeat: -1 });
    }

    flyers.children.iterate(c => c.play('crow_flap'));

    this.physics.add.collider([player, misae, boss, cards], platforms);
    this.physics.add.collider(player, [misae, boss, flyers], triggerGameOver, null, this);
    this.physics.add.overlap(player, cards, collectCard, null, this);

    this.cameras.main.setBounds(0, 0, 4500, 600);
    this.cameras.main.startFollow(player, true, 0.08, 0.08);

    scoreText = this.add.text(16, 16, 'Cards: 0/15', { fontSize: '32px', fill: '#FFF', fontStyle: 'bold' }).setScrollFactor(0);
    gameTimerText = this.add.text(16, 55, 'Time: 0s', { fontSize: '24px', fill: '#FFF' }).setScrollFactor(0);
    timerText = this.add.text(533, 80, '', { fontSize: '48px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);
    bossText = this.add.text(533, 140, '', { fontSize: '24px', fill: '#ffff00', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);

    document.getElementById('start-btn').onclick = () => {
        document.getElementById('ui-layer').style.display = 'none';
        this.physics.resume();
        gameStarted = true;
        startTime = this.time.now;
        this.sound.play('bg_music', { loop: true, volume: 0.3 });
    };
}

function update() {
    if (!gameStarted || missionFinished) return;

    let elapsed = Math.floor((this.time.now - startTime) / 1000);
    gameTimerText.setText('Time: ' + elapsed + 's');

    if (cursors.left.isDown) { player.setVelocityX(-300); player.flipX = false; player.anims.play('shin_walk', true); }
    else if (cursors.right.isDown) { player.setVelocityX(300); player.flipX = true; player.anims.play('shin_walk', true); }
    else { player.setVelocityX(0); player.setFrame(0); }
    if (cursors.up.isDown && player.body.touching.down) player.setVelocityY(-620);

    misae.anims.play('misae_run', true);
    if (misae.x < player.x) { misae.setVelocityX(150); misae.flipX = true; }
    else { misae.setVelocityX(-150); misae.flipX = false; }
    if (misae.body.blocked.left || misae.body.blocked.right) misae.setVelocityY(-500);

    if (isBossBattle) {
        boss.anims.play('enchou_run', true);
        if (boss.x < player.x) { boss.setVelocityX(220); boss.flipX = true; }
        else { boss.setVelocityX(-220); boss.flipX = false; }
        if (boss.body.touching.down && (player.y < boss.y - 80 || boss.body.blocked.left || boss.body.blocked.right)) boss.setVelocityY(-600);
    }

    flyers.children.iterate(f => {
        f.setVelocityX(f.x < player.x ? 130 : -130);
        f.setVelocityY(f.y < player.y ? 70 : -70);
        f.flipX = f.body.velocity.x > 0;
    });
}

function triggerGameOver() {
    if (missionFinished) return;
    this.physics.pause();
    this.sound.stopAll();
    const ui = document.getElementById('custom-ui');
    ui.style.display = 'flex';
    document.getElementById('ui-title').innerText = "CAUGHT!";
    document.getElementById('ui-message').innerText = "Mission Failed. Try again!";
    document.getElementById('ui-action-btn').onclick = () => location.reload();
}

function collectCard(p, card) {
    card.disableBody(true, true);
    score++;
    scoreText.setText('Cards: ' + score + '/15');
    if (score === 15) startBossBattle(this);
}

function startBossBattle(scene) {
    isBossBattle = true;
    boss.enableBody(true, 4200, 300, true, true);
    boss.body.setSize(110, 260).setOffset(30, 15);
    boss.setScale(2.5).setTint(0xff0000);
    scene.sound.stopAll();
    scene.sound.play('boss_music', { loop: true });
    bossText.setText("SURVIVE THE PRINCIPAL!");

    scene.time.addEvent({
        delay: 1000,
        callback: () => {
            if (missionFinished) return;
            survivalTime--;
            if (survivalTime >= 0) timerText.setText("SURVIVE: " + survivalTime);
            if (survivalTime <= 0) triggerWin(scene);
        },
        loop: true
    });
}

async function triggerWin(scene) {
    missionFinished = true;
    scene.physics.pause();
    timerText.setText("SURVIVE: 0");

    const finalSecs = Math.floor((scene.time.now - startTime) / 1000);
    const ui = document.getElementById('custom-ui');
    ui.style.display = 'flex';
    document.getElementById('ui-title').innerText = "MISSION COMPLETE!";
    document.getElementById('ui-message').innerText = `Syncing Global Rank... Time: ${finalSecs}s`;
    
    document.getElementById('input-section').style.display = 'block';
    
    const btn = document.getElementById('ui-action-btn');
    btn.innerText = "SAVE TO CLOUD";
    btn.onclick = async () => {
        const name = document.getElementById('player-name').value || "SpeedyShin";
        await saveGlobalScore(name, finalSecs);
    };
}

async function saveGlobalScore(name, time) {
    const btn = document.getElementById('ui-action-btn');
    btn.disabled = true;
    btn.innerText = "SAVING...";

    const { error } = await supabaseClient
        .from('leaderboard')
        .insert([{ name: name, score: time }]);

    if (error) {
        console.error('Error saving:', error);
        alert("Cloud Save Failed. Check if table 'leaderboard' exists!");
    } else {
        await showGlobalLeaderboard();
    }
}

async function showGlobalLeaderboard() {
    document.getElementById('input-section').style.display = 'none';
    const board = document.getElementById('leaderboard-content');
    board.style.display = 'block';
    board.innerHTML = "Fetching Worldwide Rankings...";

    const { data, error } = await supabaseClient
        .from('leaderboard')
        .select('name, score')
        .order('score', { ascending: true })
        .limit(5);

    if (error) {
        board.innerHTML = "Failed to load global rankings.";
    } else {
        board.innerHTML = "<b>🌎 WORLDWIDE TOP 5 🏆</b><br>" + 
            data.map((e, i) => `${i+1}. ${e.name}: ${e.score}s`).join("<br>");
    }
    
    const btn = document.getElementById('ui-action-btn');
    btn.disabled = false;
    btn.innerText = "PLAY AGAIN";
    btn.onclick = () => location.reload();
}
