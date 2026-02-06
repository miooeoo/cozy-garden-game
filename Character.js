/**
 * 🧑‍🌾 Character.js - 하이엔드 픽셀 아트 농부 (V4.0)
 * 
 * Stardew Valley/Eastward 수준의 32x32 밀도 높은 디자인
 * - 밀짚모자: 엮임 패턴 + 리본
 * - 오버올: 데님 스티치 + 헤짐
 * - 반다나: 목에 두른 빨간 천
 * - 표정: 흰자위 + 속눈썹
 * - 머리카락 물리 애니메이션
 */

class Character {
    constructor(startGridX = 12, startGridY = 8) {
        // 위치
        this.gridX = startGridX;
        this.gridY = startGridY;
        this.pixelX = startGridX * 32;
        this.pixelY = startGridY * 32;

        // 클릭 투 무브
        this.targetGridX = startGridX;
        this.targetGridY = startGridY;
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;

        // 이동
        this.moveSpeed = 120;
        this.isMoving = false;
        this.direction = 'down';

        // 파종
        this.plantOnArrival = false;
        this.plantTypeOnArrival = null;

        // 자동 파종
        this.autoPlantMode = false;
        this.selectedSeedForAutoPlant = null;
        this.garden = null;  // garden 참조 저장용

        // 심기 애니메이션
        this.isPlanting = false;
        this.plantingTimer = 0;
        this.plantingDuration = 0.5;

        // 현재 도구 상태
        this.currentTool = 'none';  // none, watering_can, basket, trowel

        // 입력
        this.keysPressed = { up: false, down: false, left: false, right: false };

        // 걷기 애니메이션
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 0.12;

        // 머리카락 물리
        this.hairBounce = 0;
        this.hairVelocity = 0;

        // 콜백
        this.onFootstep = null;
        this.onInteraction = null;
        this.onPlantComplete = null;

        // 이벤트
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.setupInput();
    }

    setupInput() {
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
    }

    handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        let direction = null;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': direction = 'up'; break;
            case 'ArrowDown': case 's': case 'S': direction = 'down'; break;
            case 'ArrowLeft': case 'a': case 'A': direction = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': direction = 'right'; break;
            case 'p': case 'P': this.toggleAutoPlantMode(); return;
            case ' ': this.triggerInteraction(); return;
        }

        if (direction) {
            e.preventDefault();
            this.keysPressed[direction] = true;
            this.plantOnArrival = false;
            if (!this.isMoving && !this.isPlanting) this.tryMove(direction, this.garden);
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': this.keysPressed.up = false; break;
            case 'ArrowDown': case 's': case 'S': this.keysPressed.down = false; break;
            case 'ArrowLeft': case 'a': case 'A': this.keysPressed.left = false; break;
            case 'ArrowRight': case 'd': case 'D': this.keysPressed.right = false; break;
        }
    }

    toggleAutoPlantMode() {
        this.autoPlantMode = !this.autoPlantMode;
        const toggle = document.getElementById('auto-plant-toggle');
        if (toggle) toggle.checked = this.autoPlantMode;
        console.log(this.autoPlantMode ? '🌱 자동 파종 ON' : '🚶 자동 파종 OFF');
    }

    triggerInteraction() {
        if (this.onInteraction) this.onInteraction(this.gridX, this.gridY);
    }

    moveToClick(targetGridX, targetGridY, plantType = null) {
        if (this.isPlanting) return;

        this.targetGridX = targetGridX;
        this.targetGridY = targetGridY;
        this.plantOnArrival = !!plantType;
        this.plantTypeOnArrival = plantType;

        const dx = targetGridX - this.gridX;
        const dy = targetGridY - this.gridY;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 'right' : 'left';
        } else if (dy !== 0) {
            this.direction = dy > 0 ? 'down' : 'up';
        }

        this.targetPixelX = targetGridX * 32;
        this.targetPixelY = targetGridY * 32;
        this.isMoving = true;
    }

    tryMove(direction, garden = null) {
        if (this.isMoving || this.isPlanting) return false;

        this.direction = direction;
        let nextGridX = this.gridX;
        let nextGridY = this.gridY;

        switch (direction) {
            case 'up': nextGridY--; break;
            case 'down': nextGridY++; break;
            case 'left': nextGridX--; break;
            case 'right': nextGridX++; break;
        }

        // 경계 체크
        if (nextGridX < 0 || nextGridX >= 25 || nextGridY < 0 || nextGridY >= 17) return false;

        // 바위 체크 - 바위가 있는 칸으로는 이동 불가
        const obstacles = window.game?.obstacles;
        if (obstacles && obstacles.hasRockAt(nextGridX, nextGridY)) {
            if (typeof ToastSystem !== 'undefined') {
                ToastSystem.show('🪨 바위가 있어요!', 1000, 'info');
            }
            return false;
        }

        // 이동 시작
        this.isMoving = true;
        this.targetGridX = nextGridX;
        this.targetGridY = nextGridY;
        this.gridX = nextGridX;
        this.gridY = nextGridY;
        this.targetPixelX = nextGridX * 32;
        this.targetPixelY = nextGridY * 32;

        // 자동 파종 - 캐릭터가 떠난 자리에 심기
        if (this.autoPlantMode && this.selectedSeedForAutoPlant && garden) {
            // 이전 위치 계산 (방금 떠난 자리)
            const oldGridX = direction === 'right' ? nextGridX - 1 :
                direction === 'left' ? nextGridX + 1 : nextGridX;
            const oldGridY = direction === 'down' ? nextGridY - 1 :
                direction === 'up' ? nextGridY + 1 : nextGridY;

            // 바위가 없고 빈 칸인 경우에만 심기
            const hasRock = obstacles && obstacles.hasRockAt(oldGridX, oldGridY);
            if (!hasRock && garden.isCellEmpty(oldGridX, oldGridY)) {
                const inventory = window.game?.inventory;
                const seedCount = inventory?.getSeedCount(this.selectedSeedForAutoPlant) || 0;

                if (inventory && seedCount > 0) {
                    const planted = garden.plantSeed(this.selectedSeedForAutoPlant, oldGridX, oldGridY);
                    if (planted) inventory.useSeed(this.selectedSeedForAutoPlant);

                    if (inventory.getSeedCount(this.selectedSeedForAutoPlant) <= 0) {
                        this.autoPlantMode = false;
                        const toggle = document.getElementById('auto-plant-toggle');
                        if (toggle) toggle.checked = false;
                    }
                }
            }
        }

        return true;
    }

    startPlanting(plantType) {
        this.isPlanting = true;
        this.plantingTimer = 0;
        this.plantTypeOnArrival = plantType;
        this.currentTool = 'trowel';
    }

    setTool(toolName) {
        this.currentTool = toolName;
    }

    update(deltaTime, garden = null) {
        // garden 참조 저장 (키보드 이벤트에서 사용)
        if (garden) this.garden = garden;

        // 머리카락 물리
        if (this.isMoving) {
            this.hairVelocity += (Math.sin(this.animationFrame * Math.PI) * 0.5 - this.hairBounce) * 0.3;
        } else {
            this.hairVelocity += (0 - this.hairBounce) * 0.2;
        }
        this.hairVelocity *= 0.85;
        this.hairBounce += this.hairVelocity;

        // 심기
        if (this.isPlanting) {
            this.plantingTimer += deltaTime;
            if (this.plantingTimer >= this.plantingDuration) {
                this.isPlanting = false;
                this.currentTool = 'none';
                if (this.onPlantComplete) {
                    this.onPlantComplete(this.gridX, this.gridY, this.plantTypeOnArrival);
                }
            }
            return;
        }

        // 이동
        if (this.isMoving) {
            const dx = this.targetPixelX - this.pixelX;
            const dy = this.targetPixelY - this.pixelY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 3) {
                this.pixelX = this.targetPixelX;
                this.pixelY = this.targetPixelY;
                this.gridX = this.targetGridX;
                this.gridY = this.targetGridY;
                this.isMoving = false;

                if (this.onFootstep) this.onFootstep(this.pixelX + 16, this.pixelY + 28);

                if (this.plantOnArrival && this.plantTypeOnArrival) {
                    this.startPlanting(this.plantTypeOnArrival);
                    this.plantOnArrival = false;
                }

                if (!this.plantOnArrival) {
                    if (this.keysPressed.up) this.tryMove('up', garden);
                    else if (this.keysPressed.down) this.tryMove('down', garden);
                    else if (this.keysPressed.left) this.tryMove('left', garden);
                    else if (this.keysPressed.right) this.tryMove('right', garden);
                }
            } else {
                const moveAmount = this.moveSpeed * deltaTime;
                const ratio = Math.min(moveAmount / distance, 1);
                this.pixelX += dx * ratio;
                this.pixelY += dy * ratio;

                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
            }

            this.animationTimer += deltaTime;
            if (this.animationTimer >= this.animationSpeed) {
                this.animationTimer = 0;
                this.animationFrame = (this.animationFrame + 1) % 4;
            }
        } else {
            this.animationFrame = 0;
        }
    }

    /**
     * 하이엔드 픽셀 아트 농부 렌더링
     */
    render(ctx) {
        try {
            const x = this.pixelX;
            const y = this.pixelY;

            ctx.save();

            // 심기 애니메이션: 쪼그리기
            const plantingOffset = this.isPlanting ?
                Math.sin(this.plantingTimer * Math.PI / this.plantingDuration) * 8 : 0;

            // 걷기 바운스
            const walkBob = this.isMoving ? Math.sin(this.animationFrame * Math.PI / 2) * 2 : 0;

            // ===== 그림자 =====
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 30 + plantingOffset, 11, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== 다리 (데님 오버올 하의) =====
            const legOffset = this.isMoving ? Math.sin(this.animationFrame * Math.PI / 2) * 3 : 0;

            // 왼쪽 다리
            ctx.fillStyle = '#4A6FA5';  // 데님 블루
            ctx.fillRect(x + 9, y + 22 + plantingOffset + legOffset, 6, 9);
            // 스티치 디테일
            ctx.fillStyle = '#6B8FC4';
            ctx.fillRect(x + 9, y + 22 + plantingOffset + legOffset, 1, 9);
            ctx.fillRect(x + 14, y + 22 + plantingOffset + legOffset, 1, 9);

            // 오른쪽 다리
            ctx.fillStyle = '#4A6FA5';
            ctx.fillRect(x + 17, y + 22 + plantingOffset - legOffset, 6, 9);
            ctx.fillStyle = '#6B8FC4';
            ctx.fillRect(x + 17, y + 22 + plantingOffset - legOffset, 1, 9);
            ctx.fillRect(x + 22, y + 22 + plantingOffset - legOffset, 1, 9);

            // 무릎 헤짐/흙 효과
            ctx.fillStyle = '#3D5A80';
            ctx.fillRect(x + 11, y + 26 + plantingOffset, 2, 2);
            ctx.fillRect(x + 19, y + 27 + plantingOffset, 2, 2);

            // ===== 몸통 (멜빵 오버올) =====
            ctx.fillStyle = '#4A6FA5';
            ctx.fillRect(x + 8, y + 14 + plantingOffset - walkBob, 16, 10);

            // 가슴 포켓
            ctx.fillStyle = '#3D5A80';
            ctx.fillRect(x + 10, y + 16 + plantingOffset - walkBob, 4, 3);
            ctx.fillStyle = '#6B8FC4';
            ctx.fillRect(x + 10, y + 16 + plantingOffset - walkBob, 4, 1);

            // 멜빵 스트랩
            ctx.fillStyle = '#3D5A80';
            ctx.fillRect(x + 10, y + 12 + plantingOffset - walkBob, 3, 12);
            ctx.fillRect(x + 19, y + 12 + plantingOffset - walkBob, 3, 12);
            // 금속 버클
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(x + 10, y + 14 + plantingOffset - walkBob, 3, 2);
            ctx.fillRect(x + 19, y + 14 + plantingOffset - walkBob, 3, 2);

            // ===== 셔츠 (빨간 체크) =====
            ctx.fillStyle = '#C94C4C';
            ctx.fillRect(x + 9, y + 10 + plantingOffset - walkBob, 14, 5);
            // 체크 패턴
            ctx.fillStyle = '#A83232';
            ctx.fillRect(x + 11, y + 10 + plantingOffset - walkBob, 2, 5);
            ctx.fillRect(x + 15, y + 10 + plantingOffset - walkBob, 2, 5);
            ctx.fillRect(x + 19, y + 10 + plantingOffset - walkBob, 2, 5);

            // (반다나 제거됨)

            // ===== 머리 =====
            ctx.fillStyle = '#FFDAB9';  // 피부색
            ctx.beginPath();
            ctx.arc(x + 16, y + 6 + plantingOffset - walkBob, 7, 0, Math.PI * 2);
            ctx.fill();

            // ===== 머리카락 (갈색, 물리 애니메이션) =====
            const hairOffset = this.hairBounce;
            ctx.fillStyle = '#8B4513';
            // 앞머리
            ctx.fillRect(x + 10, y + 1 + plantingOffset - walkBob + hairOffset * 0.5, 12, 4);
            // 옆머리
            ctx.fillRect(x + 9, y + 3 + plantingOffset - walkBob + hairOffset * 0.3, 3, 5);
            ctx.fillRect(x + 20, y + 3 + plantingOffset - walkBob + hairOffset * 0.3, 3, 5);
            // 뒷머리 (찰랑거림)
            if (this.direction === 'up' || this.direction === 'left' || this.direction === 'right') {
                ctx.fillRect(x + 11, y + 8 + plantingOffset - walkBob + hairOffset, 10, 4);
            }

            // ===== 밀짚모자 (뒤로 젖힘 - 얼굴 가시성 향상) =====
            const hatTilt = 3;  // 모자를 뒤로 젖힘

            // 모자 챙 (뒤로 젖힘)
            ctx.fillStyle = '#D4A574';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + hatTilt + plantingOffset - walkBob, 12, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // 모자 본체 (뒤로 젖힘)
            ctx.fillStyle = '#C4956A';
            ctx.beginPath();
            ctx.arc(x + 16, y + hatTilt - 2 + plantingOffset - walkBob, 7, Math.PI, 0, true);
            ctx.fill();

            // 엮임 패턴
            ctx.strokeStyle = '#B8845A';
            ctx.lineWidth = 0.5;
            for (let i = -5; i <= 5; i += 3) {
                ctx.beginPath();
                ctx.moveTo(x + 16 + i, y + hatTilt - 7 + plantingOffset - walkBob);
                ctx.lineTo(x + 16 + i, y + hatTilt + plantingOffset - walkBob);
                ctx.stroke();
            }

            // 리본 띠
            ctx.fillStyle = '#E63946';
            ctx.fillRect(x + 9, y + hatTilt - 1 + plantingOffset - walkBob, 14, 2);
            // 리본 매듭
            ctx.beginPath();
            ctx.arc(x + 21, y + hatTilt + plantingOffset - walkBob, 2, 0, Math.PI * 2);
            ctx.fill();

            // ===== 얼굴 (더 잘 보이도록 아래로) =====
            const eyeOffsetX = this.direction === 'left' ? -2 : this.direction === 'right' ? 2 : 0;
            const eyeOffsetY = this.direction === 'up' ? -1 : this.direction === 'down' ? 1 : 0;
            const faceY = 7;  // 얼굴을 아래로 내림

            // 흰자위 (더 큼)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 11 + eyeOffsetX, y + faceY + plantingOffset - walkBob + eyeOffsetY, 4, 4);
            ctx.fillRect(x + 17 + eyeOffsetX, y + faceY + plantingOffset - walkBob + eyeOffsetY, 4, 4);

            // 눈동자 (더 또렷)
            ctx.fillStyle = '#4A3728';
            ctx.fillRect(x + 12 + eyeOffsetX, y + faceY + 1 + plantingOffset - walkBob + eyeOffsetY, 2, 2);
            ctx.fillRect(x + 18 + eyeOffsetX, y + faceY + 1 + plantingOffset - walkBob + eyeOffsetY, 2, 2);

            // 눈 하이라이트 (반짝임)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x + 12 + eyeOffsetX, y + faceY + plantingOffset - walkBob + eyeOffsetY, 1, 1);
            ctx.fillRect(x + 18 + eyeOffsetX, y + faceY + plantingOffset - walkBob + eyeOffsetY, 1, 1);

            // 볼터치 (더 선명)
            ctx.fillStyle = 'rgba(255, 130, 130, 0.6)';
            ctx.beginPath();
            ctx.arc(x + 10, y + faceY + 5 + plantingOffset - walkBob, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 22, y + faceY + 5 + plantingOffset - walkBob, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // 미소 (행복한 표정)
            ctx.strokeStyle = '#8B6B5C';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + 16, y + faceY + 6 + plantingOffset - walkBob, 3, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();

            // ===== 팔 =====
            ctx.fillStyle = '#FFDAB9';
            const armSwing = this.isMoving ? Math.sin(this.animationFrame * Math.PI / 2) * 2 : 0;

            // 왼팔
            ctx.fillRect(x + 4, y + 12 + plantingOffset - walkBob + armSwing, 5, 10);
            // 소매
            ctx.fillStyle = '#C94C4C';
            ctx.fillRect(x + 4, y + 12 + plantingOffset - walkBob + armSwing, 5, 3);

            // 오른팔
            ctx.fillStyle = '#FFDAB9';
            ctx.fillRect(x + 23, y + 12 + plantingOffset - walkBob - armSwing, 5, 10);
            ctx.fillStyle = '#C94C4C';
            ctx.fillRect(x + 23, y + 12 + plantingOffset - walkBob - armSwing, 5, 3);

            // ===== 도구 렌더링 =====
            this.renderTool(ctx, x, y, plantingOffset, walkBob, armSwing);

            // ===== 자동 파종 모드 표시 =====
            if (this.autoPlantMode) {
                ctx.fillStyle = 'rgba(139, 195, 74, 0.9)';
                ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🌱 AUTO', x + 16, y - 10);
            }

            ctx.restore();
        } catch (e) {
            console.error('Character Render Error:', e);
            ctx.restore(); // 에러 나도 restore는 해야 함
        }
    }

    /**
     * 도구 렌더링
     */
    renderTool(ctx, x, y, plantingOffset, walkBob, armSwing) {
        switch (this.currentTool) {
            case 'watering_can':
                // 물뿌리개
                ctx.fillStyle = '#4682B4';
                ctx.fillRect(x + 24, y + 18 + plantingOffset - walkBob - armSwing, 6, 4);
                ctx.fillStyle = '#5F9EA0';
                ctx.fillRect(x + 29, y + 17 + plantingOffset - walkBob - armSwing, 3, 2);
                break;

            case 'basket':
                // 바구니
                ctx.fillStyle = '#D2691E';
                ctx.beginPath();
                ctx.moveTo(x + 24, y + 18 + plantingOffset - walkBob - armSwing);
                ctx.lineTo(x + 32, y + 18 + plantingOffset - walkBob - armSwing);
                ctx.lineTo(x + 30, y + 24 + plantingOffset - walkBob - armSwing);
                ctx.lineTo(x + 26, y + 24 + plantingOffset - walkBob - armSwing);
                ctx.closePath();
                ctx.fill();
                // 손잡이
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x + 28, y + 16 + plantingOffset - walkBob - armSwing, 4, Math.PI, 0);
                ctx.stroke();
                break;

            case 'trowel':
                // 모종삽
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x + 25, y + 18 + plantingOffset - walkBob - armSwing, 2, 6);
                ctx.fillStyle = '#C0C0C0';
                ctx.beginPath();
                ctx.moveTo(x + 24, y + 24 + plantingOffset - walkBob - armSwing);
                ctx.lineTo(x + 28, y + 24 + plantingOffset - walkBob - armSwing);
                ctx.lineTo(x + 26, y + 30 + plantingOffset - walkBob - armSwing);
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    getCurrentTile() {
        return { x: this.gridX, y: this.gridY };
    }

    destroy() {
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
    }
}

window.Character = Character;
