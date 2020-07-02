let ctx = null;
let canvas = null;

let game = null;
let hud = null;
let menu = null;
let ball = null;
let player = null;
let player2 = null;

// Mai Functions ********************************************
function main() {
    //Canvas
    canvas = document.querySelector("#ballCanvas");
    ctx = canvas.getContext("2d");
    ctx.font = "25px Helvetica";
    // Make the objects
    game = new Game();
    hud = new Hud();
    menu = new Menu();
    ball = new Sphere('salmon', canvas.width / 2, canvas.height / 2);
    player = new Paddle(20, canvas.height / 2, 15, 80);
    player2 = new Paddle(canvas.width - 35, canvas.height / 2, 15, 80);
    //Events
    menuEvents(menu);
    ballState(ball)
    // Update and Draw
    _update();
    _draw();
}

function _update() {
    requestAnimationFrame(() => _update());
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Game States
    if (game.state == "menu") {
        menu.update();
    } else if (game.state == "game") {
        ball.update(canvas.width, canvas.height);
        player.update(canvas.width, canvas.height);
        player2.update(canvas.width, canvas.height);
        if (game.changeHud) hud.update()
    }
}

function _draw() {
    requestAnimationFrame(() => _draw());
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Game States
    if (game.state == "menu") {
        menu.draw();
    } else if (game.state == "game") {
        ball.draw();
        player.draw();
        player2.draw();
        hud.draw();
    }
}

// Objects ********************************************
class Game {
    constructor() {
        this.state = "menu";
        this.p1Score = 0;
        this.p2Score = 0;
        this.inGamePlayers = 0; //How much payers in the game (0 means 2 bots)
        this.changeHud = false;
        this.mousePos = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        } //w & h to make it compatible with overlap function(helpers.js) 
    }

    setBall() {
        this.changeHud = true
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.stiky = true;
    }

    startGame(gameType){
        switch (gameType) {
            case 0:
                movePlayer(player);
                break;
            case 1:
                movePlayer(player);
                movePlayer(player2);
                break;
            case 2:
                break;
            default: //Error default case 1 player
                movePlayer(player);
                break;
        }
        this.state = "game";
    }

    startMatch() {
        ball.stiky = false;
        ball.dx = randomRange(0, 1) == 0 ? ball.speed : -ball.speed
        ball.dy = randomRange(0, 1) == 0 ? ball.speed : -ball.speed
    }

    gameOver(){
        this.state = "gameOver";
    }
}

class Sphere {
    constructor(color, x, y) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.dx = -3;
        this.dy = 3;
        this.radius = 10;
        this.stiky = true; //ball can't move
        this.speed = 3;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    update(xLimit, yLimit) {
        //Canvas bounce
        if ( /*this.x < this.radius || */ this.x + this.radius > xLimit) this.dx = -this.dx;
        if (this.y + this.radius > yLimit || this.y < this.radius) this.dy = -this.dy;
        // Paddle colission
        if (onCollideBall(this, player)) this.dx = -this.dx;
        if (onCollideBall(this, player2)) this.dx = -this.dx;

        //Game points
        if (this.x + this.radius < 0) {
            game.p2Score++;
            game.setBall();
        }

        //stick the ball
        if (this.stiky) {
            this.dx = 0;
            this.dy = 0;
        }
        //Update ball position
        this.x += this.dx;
        this.y += this.dy;
    }

}

class Paddle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y - (h / 2);
        this.w = w;
        this.h = h;
        this.dx = 0;
        this.dy = 0;
        this.speed = 3;
        this.color = "white";
        this.bot = true
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.closePath();
    }

    update(xLimit, yLimit) {
        //Update Paddle position
        this.x += this.dx;
        this.y += this.dy;
        this.y = clamp(this.y, 0, yLimit - this.h)

        if (this.bot) this.botMovement();
    }

    botMovement() {
        this.dy = ball.dy;
    }
}

class Hud {
    constructor() {
        this.p1 = game.p1Score;
        this.p2 = game.p2Score;
    }

    update() {
        console.log(game.p2Score)
        this.p1 = game.p1Score;
        this.p2 = game.p2Score;
        game.changeHud = false
    }

    draw() {
        ctx.font = "25px Helvetica";
        ctx.fillText(this.p1, (canvas.width / 2) - 80, 30);
        ctx.fillText(this.p2, (canvas.width / 2) + 80, 30);
    }
}

class Menu {
    constructor() {
        this.mainText = "PONG"
        this.activeButton = null;
        this.buttonsPos = {
            x: (canvas.width / 2) - 85,
            y: 165
        }
        this.margin = {
            x: 0,
            y: 60
        }
        this.buttons = [{
                id:0,
                text: "Player vs NPC",
                x: this.buttonsPos.x,
                y: this.buttonsPos.y,
                w: ctx.measureText("Player vs NPC").width,
                h: 25,
                color: "#e0e0e0"
            },
            {
                id:1,
                text: "Player vs Player",
                x: this.buttonsPos.x + (this.margin.x * 1),
                y: this.buttonsPos.y + (this.margin.y * 1),
                w: ctx.measureText("Player vs Player").width,
                h: 25,
                color: "#e0e0e0"
            },
            {
                id:2,
                text: "NPC vs NPC",
                x: this.buttonsPos.x + (this.margin.x * 2),
                y: this.buttonsPos.y + (this.margin.y * 2),
                w: ctx.measureText("Player vs Player").width,
                h: 25,
                color: "#e0e0e0"
            }
        ]
    }

    update() {
       let a = overlap(game.mousePos, this.buttons[0])
       let b = overlap(game.mousePos, this.buttons[1])
       let c = overlap(game.mousePos, this.buttons[2])

       if(a || b || c){
           if(a)this.activeButton=0;
           else if(b)this.activeButton=1;
           else if(c)this.activeButton=2;
       } else this.activeButton=null;
       //console.log(this.activeButton)
    }

    draw() {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "70px Helvetica";
        ctx.fillText(this.mainText, canvas.width / 2, 100);

        ctx.textAlign = "left";
        ctx.textBaseline = 'top';
        ctx.font = "100 25px Helvetica";
        this.buttons.forEach(btn => {
            ctx.fillStyle = btn.color;
            ctx.fillText(btn.text, btn.x, btn.y);
            //ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        });
        ctx.textBaseline = 'alphabetic';

        ctx.textAlign = "center";
        ctx.font = "10px Helvetica";
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText("antony999k", canvas.width / 2, canvas.height - 18);
    }
}