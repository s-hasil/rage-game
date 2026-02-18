const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 600;

let player = {
    x: 180,
    y: 540,
    size: 35,
    speed: 8
};

let enemies = [];
let score = 0;
let gameOver = false;

document.addEventListener("keydown", move);

function move(e){
    if(e.key === "ArrowLeft" && player.x > 0)
        player.x -= player.speed;

    if(e.key === "ArrowRight" && player.x < canvas.width-player.size)
        player.x += player.speed;
}

function spawnEnemy(){
    enemies.push({
        x: Math.random()*360,
        y: -40,
        size:35,
        speed:3 + score*0.04
    });
}

setInterval(spawnEnemy, 850);

function drawPlayer(){
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(player.x, player.y, player.size, player.size);
}

function drawEnemies(){

    ctx.fillStyle = "#ff4d4d";

    for(let i=0;i<enemies.length;i++){
        let e = enemies[i];
        e.y += e.speed;

        ctx.fillRect(e.x,e.y,e.size,e.size);

        if(player.x < e.x+e.size &&
           player.x+player.size > e.x &&
           player.y < e.y+e.size &&
           player.y+player.size > e.y){

            gameOver = true;
            setTimeout(()=>{
                alert("💀 Skill Issue! Score: "+score);
                location.reload();
            },100);
        }

        if(e.y > canvas.height){
            enemies.splice(i,1);
            score++;
        }
    }
}

function drawScore(){
    ctx.fillStyle="white";
    ctx.font="18px Segoe UI";
    ctx.fillText("Score: "+score,10,25);
}

function update(){

    if(gameOver) return;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    drawPlayer();
    drawEnemies();
    drawScore();

    requestAnimationFrame(update);
}

update();
