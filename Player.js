import * as THREE from 'three';

export class Player {
    static rotSpeed = 2;
    static moveSpeed = 4;
    static smoothingFactor = 8; // Higher value = smoother transition

    constructor(game, r, c, dir = 0) {
        this.game = game;

        // The grid position player occupies
        this.r = r;
        this.c = c;

        // The actual world position player occupies
        this.r_ = r;
        this.c_ = c;

        // The direction player is pointed in (in radians)
        this.dir = dir;

        // Set position and orientation
        this.position = new THREE.Vector2(r, c);
        this.orientation = 0;

        // Mouth animation properties
        this.mouthAngle = 0; // Current mouth angle
        this.mouthSpeed = 2; // Speed of mouth opening/closing
        this.mouthDirection = 1; // Direction of mouth animation (1 = opening, -1 = closing)
        
        // Target positions for smooth interpolation
        this.target_r_ = r;
        this.target_c_ = c;

        // Target direction for smooth rotation
        this.targetDir = dir;

        // Player mesh
        this.geometry = new THREE.SphereGeometry(0.3, 10, 10);
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1.45,
            roughness: 0.5,
            metalness: 0.3,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    gridCell(r, c) {
        return [Math.round(r), Math.round(c)];
    }


    createPacmanGeometry() {
        // Create a base sphere
        const radius = 0.3;
        const widthSegments = 32;
        const heightSegments = 32;
    
        const sphereGeometry = new THREE.SphereGeometry(
            radius,
            widthSegments,
            heightSegments,
            this.mouthAngle, // Start angle for mouth
            2 * Math.PI - this.mouthAngle * 2, // Angle to cut for the mouth
            0, // Vertical angle for top of mouth
            Math.PI // Vertical angle for bottom of mouth
        );
        sphereGeometry.rotateX(Math.PI / 2);
        return sphereGeometry;
    }
    

    updateMouthAnimation(dt) {
        // Update mouth angle
        this.mouthAngle += this.mouthDirection * this.mouthSpeed * dt;
        if (this.mouthAngle >= Math.PI / 6) {
            this.mouthAngle = Math.PI / 6;
            this.mouthDirection = -1; // Start closing
        } else if (this.mouthAngle <= 0) {
            this.mouthAngle = 0;
            this.mouthDirection = 1; // Start opening
        }

        // Update geometry
        this.geometry = this.createPacmanGeometry();
        this.mesh.geometry.dispose(); // Dispose of the old geometry
        this.mesh.geometry = this.geometry;
    }


    rotateLeft() {
        // Rotate 90 degrees counter-clockwise
        this.targetDir -= Math.PI / 2;
    
        // Normalize the direction to stay within 0 to 2π
        if (this.targetDir < 0) {
            this.targetDir += 2 * Math.PI;
        }
    }
    
    rotateRight() {
        // Rotate 90 degrees clockwise
        this.targetDir += Math.PI / 2;
    
        // Normalize the direction to stay within 0 to 2π
        if (this.targetDir >= 2 * Math.PI) {
            this.targetDir -= 2 * Math.PI;
        }
    }
    

    moveForward(dt) {
        const newTargetR_ = this.target_r_ + Math.sin(this.dir) * Player.moveSpeed * dt;
        const newTargetC_ = this.target_c_ + Math.cos(this.dir) * Player.moveSpeed * dt;
        const [newR, newC] = this.gridCell(newTargetR_, newTargetC_);

        if (this.game.isWall(newR, newC)) return;

        // Update target positions
        this.target_r_ = newTargetR_;
        this.target_c_ = newTargetC_;
    }

    moveBackward(dt) {
        const newTargetR_ = this.target_r_ - Math.sin(this.dir) * Player.moveSpeed * dt;
        const newTargetC_ = this.target_c_ - Math.cos(this.dir) * Player.moveSpeed * dt;
        const [newR, newC] = this.gridCell(newTargetR_, newTargetC_);

        if (this.game.isWall(newR, newC)) return;

        // Update target positions
        this.target_r_ = newTargetR_;
        this.target_c_ = newTargetC_;
    }

    updatePosition(dt) {
        // Smoothly interpolate positions
        this.r_ += (this.target_r_ - this.r_) * Player.smoothingFactor * dt;
        this.c_ += (this.target_c_ - this.c_) * Player.smoothingFactor * dt;

        // Snap to grid position if close enough
        const [gridR, gridC] = this.gridCell(this.r_, this.c_);
        if (Math.abs(this.r_ - gridR) < 0.05 && Math.abs(this.c_ - gridC) < 0.05) {
            this.r = gridR;
            this.c = gridC;
            this.r_ = gridR;
            this.c_ = gridC;
        }

        // Smoothly interpolate rotation
        this.dir += (this.targetDir - this.dir) * Player.smoothingFactor * dt;
    }
}
