import * as Phaser from 'phaser';
import { saveRanking, getRanking } from "./ranking";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../../firebase";

let gameover: boolean = false;
let gameclear: boolean = false;

enum EnemyType {
    right = 1,
    left = 2,
    down = 3,
    baikinman = 4,
    aim = 5
}

enum BulletType {
    up = 1
}

enum BossState {
    Appear = 1,
    LeftMove = 2,
    Attack = 3,
    RightMove = 4,
    BigAttack = 5,
    MiddleMove = 6,
    SinAttack = 7
}

class Enemy {
    protected scene: Phaser.Scene;
    protected enemyManager: EnemyManager;

    sprite: Phaser.GameObjects.Image;
    type: EnemyType;
    hp: number;
    maxhp: number;
    hpBar: Phaser.GameObjects.Image;

    constructor(
        scene: Phaser.Scene, 
        enemyManager: EnemyManager,
        type: EnemyType, 
        x: number, 
        y: number,
        texture: string,
        hp: number
    ) {
        this.scene = scene;
        this.enemyManager = enemyManager;

        this.type = type;
        this.sprite = scene.add.image(x, y, texture);
        this.hp = hp;
        this.maxhp = hp;
        this.hpBar = scene.add.image(x - 15, y + 16, "hpbar");
        this.hpBar.setOrigin(0, 0.5);
    }

    update() { // 親クラスにないが子クラスでmove()関数を作る。
        this.move();
    }

    move() {

    }

    damage() {
        this.hp--;
        if (this.hp <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.sprite.destroy();
        this.enemyManager.remove(this);
        this.hpBar.destroy();

        if (this instanceof BossEnemy) {
            this.scene.events.emit("bossClear");
        }
    }

    drawHpBar() {
        this.hpBar.x = this.sprite.x - 15;
        this.hpBar.y = this.sprite.y + 16;

        this.hpBar.setScale(this.hp / this.maxhp, 1);


    }
}

class MookEnemy extends Enemy {
    move() {
        switch (this.type) {
            case EnemyType.right:
                this.sprite.x += 3;
                if (this.sprite.x >= 1300) {
                    this.destroy();
                }
                break;
            case EnemyType.left:
                this.sprite.x -= 3;
                if (this.sprite.x <= -30) {
                    this.destroy();
                }
                break;
            case EnemyType.down:
                this.sprite.y += 3;
                if (this.sprite.y >= 700) {
                    this.destroy();
                }
                break;
            default:
                break;
        }
    }
}

class AimMookEnemy extends Enemy {
    angle: number;

    constructor(
        scene: Phaser.Scene, 
        enemyManager: EnemyManager,
        type: EnemyType, 
        x: number, 
        y: number,
        texture: string,
        hp: number,
        angle: number
    ) {
        super(scene, enemyManager, type, x, y, texture, hp);
        this.angle = angle;
    }

    move() {
        const speed = 3;

        this.sprite.x += Math.cos(this.angle) * speed;
        this.sprite.y += Math.sin(this.angle) * speed;

        if (this.sprite.x < 0 || this.sprite.x > 1300) {
            this.destroy();
        } else if (this.sprite.y < 0 || this.sprite.y > 700) {
            this.destroy();
        }
    }
}

class SinCurveEnemy extends Enemy {
    angle: number;
    size: number;

    playerx: number;
    playery: number;

    x: number;
    y: number;

    frame: number = 0;
    frequency: number;

    constructor(
        scene: Phaser.Scene, 
        enemyManager: EnemyManager,
        type: EnemyType, 
        x: number, 
        y: number,
        texture: string,
        hp: number,
        angle: number,
        size: number,
        frequency: number
    ) {
        super(scene, enemyManager, type, x, y, texture, hp);
        this.angle = angle;
        this.size = size;
        const pos = this.enemyManager.getPlayerPosition();
        this.playerx = pos.x;
        this.playery = pos.y;
        this.x = x;
        this.y = y;
        this.frequency = frequency
    }

    move() {
        this.frame++;
        const dx = this.playerx - this.x;
        const dy = this.playery - this.y;
        const speed = 3;
        const hittime = Math.sqrt(dx * dx + dy * dy) / speed;
        const offset = this.size * Math.sin(this.frequency * Math.PI * this.frame / hittime);

        this.sprite.x = this.x + this.frame * speed * Math.cos(this.angle) - offset * Math.sin(this.angle);
        this.sprite.y = this.y + this.frame * speed * Math.sin(this.angle) + offset * Math.cos(this.angle);

        if (this.sprite.x < 0 || this.sprite.x > 1300) {
            this.destroy();
        } else if (this.sprite.y < 0 || this.sprite.y > 700) {
            this.destroy();
        }
    }
}

class BossEnemy extends Enemy {
    state: BossState = BossState.Appear;
    timer: number = 0;

    move() {
        this.timer++;
        switch (this.type) {
            case EnemyType.baikinman:
                switch(this.state) {
                    case BossState.Appear:
                        this.appearMove();
                        break;
                    case BossState.RightMove:
                        this.rightMove();
                        break;
                    case BossState.Attack:
                        this.attack();
                        break;
                    case BossState.LeftMove:
                        this.leftMove();
                        break;
                    case BossState.BigAttack:
                        this.bigAttack();
                        break;
                    case BossState.MiddleMove:
                        this.middleMove();
                        break;
                    case BossState.SinAttack:
                        this.sinAttack();
                        break;
                }
                break;
        }
    }

    appearMove() {
        this.sprite.x += 2;

        if (this.sprite.x >= 800) {
            this.state = BossState.RightMove;
            this.timer = 0;
        }
    }
    rightMove() {
        this.sprite.x += 5;

        if (this.sprite.x >= 1000) {
            this.state = BossState.Attack;
            this.timer = 0;
        }
    }
    attack() {
        if (this.timer % 5 == 0) {
            for (let i: number = 0; i < 6; i ++) {
                const angle: number = this.timer + i;

                const aimmookEnemy = new AimMookEnemy (
                    this.scene,
                    this.enemyManager,
                    EnemyType.down,
                    this.sprite.x,
                    this.sprite.y,
                    "kabirunrun",
                    5,
                    angle
                );

                this.enemyManager.add(aimmookEnemy);
            }

        }

        if (this.timer >= 60) {
            this.state = BossState.LeftMove;
            this.timer = 0;
        }
    }
    leftMove() {
        this.sprite.x -= 5;
        if (this.sprite.x <= 200) {
            this.state = BossState.BigAttack;
            this.timer = 0;
        }
    }
    bigAttack() {

        const playerPos = this.enemyManager.getPlayerPosition();

        if (this.timer % 5 == 0) {
            for (let i: number = 0; i < 5; i ++) {
                const angle = Phaser.Math.Angle.Between(
                    this.sprite.x,
                    this.sprite.y,
                    playerPos.x,
                    playerPos.y
                ) + (-2 + i) / 3 + (this.timer - 30) / 100;

                const aimMookEnemy = new AimMookEnemy(
                    this.scene,
                    this.enemyManager,
                    EnemyType.aim,
                    this.sprite.x,
                    this.sprite.y,
                    "kabirunrun",
                    2,
                    angle
                )

                this.enemyManager.add(aimMookEnemy);
            }
        }


        if (this.timer > 60) {
            this.state = BossState.MiddleMove;
            this.timer = 0;
        }
    }
    middleMove() {
        this.sprite.x += 5;

        if (this.sprite.x >= 640) {
            this.state = BossState.SinAttack;
            this.timer = 0;
        }
    }
    sinAttack() {
        const playerPos = this.enemyManager.getPlayerPosition();
        if (this.timer % 10 == 0) {
            for (let i: number = 0; i < 5; i ++) {
                const angle = Phaser.Math.Angle.Between(
                    this.sprite.x,
                    this.sprite.y,
                    playerPos.x,
                    playerPos.y
                )
                const size: number = (i * 100 - 200) * this.timer / 20 + 10;

                const sinCurveEnemy = new SinCurveEnemy (
                    this.scene,
                    this.enemyManager,
                    EnemyType.down,
                    this.sprite.x,
                    this.sprite.y,
                    "kabirunrun",
                    2,
                    angle,
                    size,
                    2
                );

                this.enemyManager.add(sinCurveEnemy);
            }

        }

        if (this.timer >= 60) {
            this.state = BossState.RightMove;
            this.timer = 0;
        }
    }
}

class Player {
    scene: Phaser.Scene;
    sprite: Phaser.GameObjects.Image;
    bulletManager: BulletManager;
    timer: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, bulletManager: BulletManager) {
        this.scene = scene;
        this.sprite = scene.add.image(x, y, "anpanman");
        this.bulletManager = bulletManager;
    }

    getPosition() {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }

    update() {
        this.timer++;
        if (this.timer % 10 == 0) {
            const bullet = new Bullet(
                this.scene,
                this.bulletManager,
                BulletType.up,
                this.sprite.x,
                this.sprite.y,
                "anpanti"
            )

            this.bulletManager.add(bullet);
        }
    }
}

class EnemyManager {
    enemies: Enemy[] = [];
    player: Player;

    constructor(player: Player) {
        this.player = player;
    }

    add(enemy: Enemy) {
        this.enemies.push(enemy);
    }

    update() {
        const enemies = [...this.enemies];

        for (const enemy of enemies) {
            enemy.update();
            enemy.drawHpBar();
        }
    }

    remove(enemy: Enemy) {
        const index = this.enemies.indexOf(enemy);

        if (index !== -1) {
            this.enemies.splice(index, 1);
        }
    }

    getPlayerPosition() {
        return this.player.getPosition();
    }

    getEnemies() {
        return this.enemies;
    }
}

class Bullet {
    protected scene: Phaser.Scene;
    protected bulletManager: BulletManager;


    type: BulletType;
    sprite: Phaser.GameObjects.Image;

    constructor(
        scene: Phaser.Scene, 
        bulletManager: BulletManager, 
        type: BulletType,
        x: number,
        y: number,
        texture: string
    ) {
        this.scene = scene;
        this.bulletManager = bulletManager;

        this.type = type;
        this.sprite = scene.add.image(x, y, texture);
    }

    update() {
        this.move();
    }

    move() {
        if (this.type === BulletType.up) {
            this.sprite.y -= 5;
        }

        if (this.sprite.y <= -30) {
            this.destroy();
        }
    }

    destroy() {
        this.sprite.destroy();
        this.bulletManager.remove(this);
    }
}

class BulletManager {
    bullets: Bullet[] = [];

    add(bullet: Bullet) {
        this.bullets.push(bullet);
    }

    update() {
        const bullets = [...this.bullets];

        for (const bullet of bullets) {
            bullet.update();
        }
    }

    remove(bullet: Bullet) {
        const index = this.bullets.indexOf(bullet);

        if (index !== -1) {
            this.bullets.splice(index, 1);
        }
    }

    getBullets() {
        return this.bullets;
    }
}

class CollisionManager {
    player: Player;
    enemyManager: EnemyManager;
    bulletManager: BulletManager;

    constructor(
        player: Player,
        enemyManager: EnemyManager,
        bulletManager: BulletManager
    ) {
        this.player = player;
        this.enemyManager = enemyManager;
        this.bulletManager = bulletManager;
    }

    update() {
        this.checkEnemyBullet();
        this.checkPlayerBullet();
    }

    checkPlayerBullet() {
        for (const bullet of [...this.bulletManager.getBullets()]) {
            for (const enemy of [...this.enemyManager.getEnemies()]) {

                const dx = bullet.sprite.x - enemy.sprite.x;
                const dy = bullet.sprite.y - enemy.sprite.y;

                if (dx * dx + dy * dy < 20 * 20) {
                    bullet.destroy();
                    enemy.damage();
                }
            }
        }
    }

    checkEnemyBullet() {
        for (const enemy of this.enemyManager.getEnemies()) {

            const dx = enemy.sprite.x - this.player.sprite.x;
            const dy = enemy.sprite.y - this.player.sprite.y;

            if (dx * dx + dy * dy < 20 * 20) {
                enemy.destroy();
                gameover = true;
                logEvent(
                    analytics,
                    "game_over"
                );
                console.log("顔が汚れて力が出ない");
            }
        }
    }
}

export class Game extends Phaser.Scene
{
    constructor ()
    {
        super('Game');
    }

    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    player!: Player;
    
    enemyManager!: EnemyManager;
    bulletManager!: BulletManager;
    collisionManager!: CollisionManager;
    clearTime: number;
    startTime: number;
    clearText: Phaser.GameObjects.Text;
    gameoverText: Phaser.GameObjects.Text;

    preload ()
    {
        this.load.setPath('assets');
        
        this.load.image('anpanman', 'anpanman.png');
        this.load.image('baikinman', 'baikinman.png');
        this.load.image('kabirunrun', 'kabirunrun.png');
        this.load.image('anpanti', 'anpanti.png');
        this.load.image('hpbar', 'hpbar.png');
    }

    create ()
    {
        logEvent(
            analytics,
            "game_start"
        );
        this.bulletManager = new BulletManager();
        this.player = new Player(this, 400, 500, this.bulletManager);
        this.enemyManager = new EnemyManager(this.player);
        this.collisionManager = new CollisionManager(this.player, this.enemyManager, this.bulletManager);
        this.startTime = this.time.now;
        this.gameoverText = this.add.text(400, 300, "", {fontSize: "50px", color: "#ffffff"});

        this.enemyManager.add(
            new BossEnemy(
                this,
                this.enemyManager,
                EnemyType.baikinman,
                640,
                100,
                "baikinman",
                30
            )
        );
        

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.events.on("bossClear", async () => {

            this.clearTime = 
                (this.time.now - this.startTime) / 1000;

            logEvent(
                analytics,
                "game_clear",
                {
                    clear_time: this.clearTime
                }
            );

            let ranking = await getRanking(); //この一回だけ

            const isRankIn = 
                ranking.length < 10 ||
                this.clearTime < ranking[ranking.length - 1].time;
            
            if (isRankIn) {

                const name = prompt(
                    "ランキング入りしました！名前を入力してください"
                );

                if (name) {

                    await saveRanking(
                        name,
                        this.clearTime
                    );

                    ranking.push({
                        name: name,
                        time: this.clearTime
                    });

                    ranking.sort(
                        (a, b) => a.time - b.time
                    );

                    ranking = ranking.slice(0, 10);
                }
            }

            let text = 
                "clear time : " +
                this.clearTime.toFixed(3) +
                " sec\n\n";
            
            text += "ranking\n";

            ranking.forEach((data, index) => {

                text += 
                    `${index + 1}位 ${data.name} ${data.time.toFixed(3)}秒\n`;

            });

            this.clearText = this.add.text(
                350,
                150,
                text,
                {
                    fontSize: "28px",
                    color: "#ffffff"
                }
            );

            gameclear = true;
        })
    }

    update() {
        if (gameover) {
            this.gameoverText.text = "顔が汚れて力が出ない...\nページを再読み込みでリスタート";
        }else if (gameclear) {

        } else {
            if (this.cursors.right.isDown) {
                this.player.sprite.x += 3;
            }
            if (this.cursors.left.isDown) {
                this.player.sprite.x -= 3;
            }
            if (this.cursors.up.isDown) {
                this.player.sprite.y -= 3;
            }
            if (this.cursors.down.isDown) {
                this.player.sprite.y += 3;
            }
            this.player.sprite.x = Phaser.Math.Clamp(
                this.player.sprite.x,
                0,
                1280
            );

            this.player.sprite.y = Phaser.Math.Clamp(
                this.player.sprite.y,
                0,
                720
            );
            
            this.player.update();
            this.enemyManager.update();
            this.bulletManager.update();
            this.collisionManager.update();
        }

    }
}
