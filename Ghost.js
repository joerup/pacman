import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export class Ghost {
    constructor(game, r, c, str, stc, color) {
        this.game = game;
        this.color = color;
        // Current integer coordinates on the grid
        this.r = r;
        this.c = c;

        // The static square they want to move to
        this.str = str;
        this.stc = stc;

        // The direction ghost wants to move in
        this.dr = null;
        this.dc = null;

        // If walking, where will they finish?
        this.nr = null;
        this.nc = null;

        // The target square they are trying to get to
        this.tr = null;
        this.tc = null;

        // Ghost scattered / chase / scared state
        this.state = 1; // 0 = scatter, 1 = chase, 2 = frightened

        // Are they currently walking?
        this.walking = false;
        this.walkingProgress = 0;
        this.walkingSpeed = 1;

        // Create mesh
        const tempGeometry = new THREE.BoxGeometry(1, 1, 1);
        const tempMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(tempGeometry, tempMaterial);
        Ghost.loadMesh(this, game.scene);
    }

    // Ghost will now move in the direction of dr, dc
    setDirection(dr, dc) {
        this.dr = dr;
        this.dc = dc;
        this.nr = this.r + dr;
        this.nc = this.c + dc;
    }

    // Set target (doesn't recalculate the dr, dc)
    setTarget(tr, tc) {
        this.tr = tr;
        this.tc = tc;
    }

    scatter() {
      // Only update target if in scatter mode
      if (this.state !== 0) return;
  
      let validPositionFound = false;
      let targetR, targetC;
  
      while (!validPositionFound) {
          targetR = Math.floor(Math.random() * this.game.maze.length);
          targetC = Math.floor(Math.random() * this.game.maze[0].length);
  
          const distance = (targetR - this.r) ** 2 + (targetC - this.c) ** 2;
  
          // Ensure the target is not a wall and is far enough from the current position
          if (!this.game.isWall(targetR, targetC) && distance > 4) {
              validPositionFound = true;
          }
      }
  
      this.setTarget(targetR, targetC);
  }

  chase() {
    if (this.state !== 1) return; // Only chase in chase mode

    // Set target to Pac-Man's position
    const pacman = this.game.player;
    this.setTarget(pacman.r, pacman.c);
    }

    frightened() {
        if (this.state !== 2) return; // Only frightened in frightened mode

        const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let bestDirection = [0, 0];
        let farthestDistance = -Infinity;

        // Evaluate all possible moves and choose the farthest from Pac-Man
        moves.forEach((move) => {
            const newR = this.r + move[0];
            const newC = this.c + move[1];

            if (!this.game.isWall(newR, newC)) {
                const distance = (newR - this.game.player.r) ** 2 + (newC - this.game.player.c) ** 2;
                if (distance > farthestDistance) {
                    farthestDistance = distance;
                    bestDirection = move;
                }
            }
        });

        this.setTarget(this.r + bestDirection[0], this.c + bestDirection[1]);
    }

    nextPosition() {
        const moves = new Map();

        // Helper function to check if a move is valid
        const isValidMove = (r, c) =>
            r >= 0 &&
            c >= 0 &&
            r < this.game.maze.length &&
            c < this.game.maze[0].length &&
            this.game.maze[r][c] !== 1;

        // Populate valid moves
        moves.set([0, 1].toString(), isValidMove(this.r, this.c + 1)); // Right
        moves.set([1, 0].toString(), isValidMove(this.r + 1, this.c)); // Down
        moves.set([0, -1].toString(), isValidMove(this.r, this.c - 1)); // Left
        moves.set([-1, 0].toString(), isValidMove(this.r - 1, this.c)); // Up

        let bestDirection = [0, 0];
        let bestDistance = Infinity;
        let hasValidMove = false;

        // Evaluate all possible moves
        [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach((key) => {
            if (moves.get(key.toString()) && !(key[0] === -this.dr && key[1] === -this.dc)) {
                hasValidMove = true;
                const tempDist = (key[0] + this.r - this.tr) ** 2 + (key[1] + this.c - this.tc) ** 2;
                if (tempDist < bestDistance) {
                    bestDirection = key;
                    bestDistance = tempDist;
                }
            }
        });

        // If no valid move exists, choose a random direction
        if (!hasValidMove) {
            console.warn(`Ghost @ (${this.r}, ${this.c}) is stuck. Choosing random move.`);
            const validMoves = Array.from(moves.entries()).filter(([_, valid]) => valid);
            if (validMoves.length > 0) {
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                bestDirection = randomMove[0].split(',').map(Number);
            } else {
                console.error(`Ghost @ (${this.r}, ${this.c}) has no valid moves.`);
                return [[this.r, this.c], [0, 0]];
            }
        }

        return [[bestDirection[0] + this.r, bestDirection[1] + this.c], bestDirection];
    }


    walk(dt) {
        // Attempted to walk without permission
        if (!this.walking) return;
        this.walkingProgress += dt * this.walkingSpeed;

        // If more than halfway we are effectively at the other cell
        if (this.walkingProgress >= 0.5) {
            this.r = this.nr;
            this.c = this.nc;
            this.game.ghostMoved(this);
        }

        // Fix to end location if reached
        if (this.walkingProgress >= 1) {
            this.r = this.nr;
            this.c = this.nc;
            this.r_ = this.nr;
            this.c_ = this.nc;

            this.walkingProgress = 0;
            this.walking = false;
        } else {
            this.r_ += dt * this.dr * this.walkingSpeed;
            this.c_ += dt * this.dc * this.walkingSpeed;
        }
    }

    frightenedChoice() {
        const moves = new Map();
        moves.set([0, 1].toString(), this.game.maze[this.r][this.c + 1] != 1);
        moves.set([1, 0].toString(), this.game.maze[this.r + 1][this.c] != 1);
        moves.set([0, -1].toString(), this.game.maze[this.r][this.c - 1] != 1);
        moves.set([-1, 0].toString(), this.game.maze[this.r - 1][this.c] != 1);

        const prefs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let index = Math.floor(Math.random() * 4 - 0.0001);
        for (let i = 0; i < 4; i++) {
            let j = (index + i) % 4;
            if (moves.get(prefs[j].toString()) && !(prefs[j][0] == -this.dr && prefs[j][1] == -this.dc)) {
                return [[prefs[j][0] + this.r, prefs[j][1] + this.c], prefs[j]];
            }
        }
        return [[this.r, this.c], [0, 0]];
    }

    static loadMesh(ghost, scene) {
        const loader = new OBJLoader();
        loader.load(
            './models/head.obj',
            (obj) => {
                const meshScaling = 0.05;
                obj.scale.set(meshScaling, meshScaling, meshScaling);
                obj.position.set(0, 0, 0);
                obj.rotation.x = -Math.PI / 2;
                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: ghost.color,
                            emissive: ghost.color,
                            emissiveIntensity: 0.8,
                            roughness: 0.5,
                            metalness: 0.2,
                        });
                    }
                });
                scene.remove(ghost.mesh);
                ghost.mesh = obj;
                scene.add(ghost.mesh);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.error('An error occurred while loading the OBJ file', error);
            }
        );
    }
}
