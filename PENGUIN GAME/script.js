const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const startScreen = document.getElementById('start-screen');
const leaderboardEl = document.getElementById('leaderboard'); 

const canvasWidth = 800;
const canvasHeight = 400;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

const groundLevel = canvasHeight - 70;
const gravity = 0.7;
const jumpStrength = -17.6;

let gameSpeed = 6;
const initialGameSpeed = 6;
const gameSpeedIncrease = 0.003;

// Load images
const backgroundImg = new Image();
backgroundImg.src = 'assets/background.png';
const penguinImg = new Image();
penguinImg.src = 'assets/penguin.png';
const pillImg = new Image();
pillImg.src = 'assets/pill.png';
const rock1Img = new Image();
rock1Img.src = 'assets/ROCK1.png';
const rock2Img = new Image();
rock2Img.src = 'assets/ROCK2.png';
const obstacleImages = [rock1Img, rock2Img];
const powerupImg = new Image();
powerupImg.src = 'assets/powerup.png';


// Game objects
class Player {
  constructor() {
    this.width = 90; this.height = 90; this.x = 50; this.y = groundLevel - this.height; this.velocityY = 0; this.onGround = true;
  }
  draw() {
    ctx.drawImage(penguinImg, this.x, this.y, this.width, this.height);
  }
  update() {
    this.velocityY += gravity; this.y += this.velocityY;
    if (this.y + this.height > groundLevel) { this.y = groundLevel - this.height; this.velocityY = 0; this.onGround = true; }
    this.draw();
  }
  jump() {
    if (this.onGround) { this.velocityY = jumpStrength; this.onGround = false; }
  }
}

class Pill {
  constructor() {
    this.width = 53; this.height = 53; this.x = canvasWidth; this.y = groundLevel - (Math.random() * 150 + 40);
  }
  draw() { ctx.drawImage(pillImg, this.x, this.y, this.width, this.height); }
  update() { this.x -= gameSpeed; this.draw(); }
}

class Powerup {
  constructor() {
    this.width = 50; this.height = 50; this.x = canvasWidth; this.y = groundLevel - (Math.random() * 150 + 50);
  }
  draw() { ctx.drawImage(powerupImg, this.x, this.y, this.width, this.height); }
  update() { this.x -= gameSpeed; this.draw(); }
}

class Obstacle {
  constructor() {
    this.image = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
    this.width = 110; this.height = 90; this.x = canvasWidth; this.y = groundLevel - this.height + 25;
  }
  draw() { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); }
  update() { this.x -= gameSpeed; this.draw(); }
}

// Game state
let player, pills, powerups, obstacles;
let score; 
let lives; 
let frameCount;
let isGameRunning = false;
let animationFrameId;

// init() function RE-STARTS A RUN
function init() {
  isGameRunning = true;
  startScreen.style.display = 'none'; 
  player = new Player();
  pills = []; powerups = []; obstacles = [];
  frameCount = 0; 
  gameSpeed = initialGameSpeed; 
  scoreEl.textContent = score; 
  livesEl.textContent = lives; 
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  gameLoop();
}

// resetGame() is the "GAME OVER" function
function resetGame() {
  isGameRunning = false;
  startScreen.style.display = 'flex'; 
  cancelAnimationFrame(animationFrameId);
  
  // Check if it's a high score, and if so, ask for wallet
  updateLeaderboard(score); 
  
  // Display the updated leaderboard
  displayLeaderboard();
}

// ==========================================================
// LOCAL LEADERBOARD FUNCTIONS (WITH WALLET)
// ==========================================================
function getHighScores() {
  const scoresJSON = localStorage.getItem('penguinHighScores');
  // Returns an array of objects: [{score: 10, wallet: '...'}, ...]
  return scoresJSON ? JSON.parse(scoresJSON) : [];
}

function updateLeaderboard(newScore) {
  if (newScore === 0) return; 

  const highScores = getHighScores();
  const lowestHighScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1].score;

  // Check if the new score is a top 5 score
  if (newScore > lowestHighScore) {
    // Ask for wallet
    const wallet = prompt(`Congrats! You made the leaderboard with ${newScore} points! Enter your wallet address:`);
    
    let walletAddress = (wallet && wallet.trim() !== '') ? wallet.trim() : 'Anonymous';

    // Add new score
    highScores.push({ score: newScore, wallet: walletAddress });
    
    // Sort by score, highest first
    highScores.sort((a, b) => b.score - a.score); 
    
    // Keep only the top 5
    const topScores = highScores.slice(0, 5); 
    
    // Save back to localStorage
    localStorage.setItem('penguinHighScores', JSON.stringify(topScores));
  }
}

function displayLeaderboard() {
  const highScores = getHighScores();
  
  if (highScores.length === 0) {
    leaderboardEl.innerHTML = "<h2>No High Scores Yet!</h2>";
    return;
  }
  
  let html = '<h2>High Scores</h2><ol>';
  highScores.forEach((entry, index) => {
    // Shorten wallet address for display
    const displayWallet = entry.wallet.length > 10 
      ? `${entry.wallet.substring(0, 4)}...${entry.wallet.substring(entry.wallet.length - 4)}` 
      : entry.wallet;
    
    // Format: "1. 1500 - 0x12...5678"
    html += `<li>${index + 1}. ${entry.score} - ${displayWallet}</li>`;
  });
  html += '</ol>';
  
  leaderboardEl.innerHTML = html;
}
// ==========================================================


// Hitbox definitions
const playerHitbox = { xOffset: 20, yOffset: 20, widthReduce: 40, heightReduce: 30 };
const obstacleHitbox = { xOffset: 15, yOffset: 20, widthReduce: 30, heightReduce: 25 };
const powerupHitbox = { xOffset: 10, yOffset: 10, widthReduce: 20, heightReduce: 20 };
const pillHitbox = { xOffset: 10, yOffset: 10, widthReduce: 20, heightReduce: 20 };

function checkCollision(a, b, aHitbox, bHitbox) {
  const rectA = { x: a.x + aHitbox.xOffset, y: a.y + aHitbox.yOffset, width: a.width - aHitbox.widthReduce, height: a.height - aHitbox.heightReduce };
  
  // ==========================================================
  // THE TYPO IS NOW FIXED (was bHitbaox)
  // ==========================================================
  const rectB = { x: b.x + bHitbox.xOffset, y: b.y + bHitbox.yOffset, width: b.width - bHitbox.widthReduce, height: b.height - bHitbox.heightReduce };
  
  return ( rectA.x < rectB.x + rectB.width && rectA.x + rectA.width > rectB.x && rectA.y < rectB.y + rectB.height && rectA.y + rectA.height > rectB.y );
}

function drawBackground() {
  ctx.drawImage(backgroundImg, 0, 0, canvasWidth, canvasHeight);
}

function gameLoop() {
  animationFrameId = requestAnimationFrame(gameLoop);
  drawBackground();
  player.update();
  gameSpeed += gameSpeedIncrease;
  frameCount++;

  // Pills
  const spawnRate = Math.max(100 - Math.floor(gameSpeed * 5), 40);
  if (frameCount % spawnRate === 0) pills.push(new Pill());
  for (let i = pills.length - 1; i >= 0; i--) {
    const pill = pills[i];
    pill.update();
    if (checkCollision(player, pill, playerHitbox, pillHitbox)) {
      score += 100; scoreEl.textContent = score; pills.splice(i, 1); continue;
    }
    if (pill.x + pill.width < 0) pills.splice(i, 1);
  }

  // Powerups
  if (frameCount > 1500 && frameCount % 6000 === 0) { 
    powerups.push(new Powerup());
  }
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    powerup.update();
    if (checkCollision(player, powerup, playerHitbox, powerupHitbox)) {
      lives++; livesEl.textContent = lives; powerups.splice(i, 1); continue;
    }
    if (powerup.x + powerup.width < 0) powerups.splice(i, 1);
  }

  // Obstacles
  const obstacleSpawnRate = Math.max(200 - (gameSpeed * 8), 90);
  if (frameCount > 100 && frameCount % Math.floor(obstacleSpawnRate) === 0) {
      obstacles.push(new Obstacle());
  }
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.update();
    if (checkCollision(player, obstacle, playerHitbox, obstacleHitbox)) {
      lives--; 
      livesEl.textContent = lives;
      if (lives <= 0) {
        resetGame(); // GAME OVER
      } else {
        init(); // RESTART RUN
      }
      return; 
    }
    if (obstacle.x + obstacle.width < 0) obstacles.splice(i, 1);
  }
}

// Input
function handleInput(e) {
  if (e.code === 'Space' || e.type === 'touchstart') {
    if (!isGameRunning) {
      // STARTING A NEW GAME
      lives = 1; score = 0;
      init(); // Start the first run
    } else {
      player.jump();
    }
  }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('touchstart', handleInput);

// Show leaderboard when the page first loads
startScreen.style.display = 'flex';
displayLeaderboard();