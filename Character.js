/**
 * 🚶 Character.js - 플레이어 캐릭터 컨트롤러
 * 
 * 핵심 기능:
 * - WASD/화살표 키 이동
 * - 부드러운 그리드 이동 (픽셀 보간)
 * - 자동 파종 모드
 * - 흙먼지 발자국 파티클
 */

/**
 * 캐릭터 클래스
 */
class Character {
    /**
     * @param {number} startGridX - 시작 그리드 X 좌표
     * @param {number} startGridY - 시작 그리드 Y 좌표
     */
    constructor(startGridX = 12, startGridY = 8) {
        // 위치 (그리드 및 픽셀)
        this.gridX = startGridX;
        this.gridY = startGridY;
        this.pixelX = startGridX * 32;
        this.pixelY = startGridY * 32;

        // 이동 대상 위치
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;

        // 이동 속도
        this.moveSpeed = 160;  // 픽셀/초
        this.isMoving = false;

        // 방향 (렌더링용)
        this.direction = 'down';  // up, down, left, right

        // 자동 파종 모드
        this.autoPlantMode = false;
        this.selectedSeedForAutoPlant = null;

        // 입력 상태
        this.inputQueue = [];  // 다음 이동 방향 큐
        this.keysPressed = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        // 애니메이션
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 0.15;  // 프레임/초

        // 파티클 콜백
        this.onFootstep = null;

        // 키보드 이벤트 바인딩
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);

        this.setupInput();
    }

    /**
     * 입력 이벤트 설정
     */
    setupInput() {
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
    }

    /**
     * 키 다운 핸들러
     */
    handleKeyDown(e) {
        // 입력 필드에서는 무시
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        let direction = null;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = 'right';
                break;
            case 'p':
            case 'P':
                // 자동 파종 모드 토글
                this.toggleAutoPlantMode();
                return;
            case ' ':
                // 스페이스바: 상호작용 (수확/물주기)
                this.triggerInteraction();
                return;
        }

        if (direction) {
            e.preventDefault();
            this.keysPressed[direction] = true;

            // 이동 중이 아니면 즉시 이동
            if (!this.isMoving) {
                this.tryMove(direction);
            }
        }
    }

    /**
     * 키 업 핸들러
     */
    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keysPressed.up = false;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keysPressed.down = false;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keysPressed.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keysPressed.right = false;
                break;
        }
    }

    /**
     * 자동 파종 모드 토글
     */
    toggleAutoPlantMode() {
        this.autoPlantMode = !this.autoPlantMode;

        if (this.autoPlantMode) {
            console.log('🌱 자동 파종 모드 ON - 걸으면서 씨앗을 심어요!');
        } else {
            console.log('🚶 자동 파종 모드 OFF');
        }
    }

    /**
     * 상호작용 트리거 (스페이스바)
     */
    triggerInteraction() {
        // 게임에서 상호작용 처리하도록 이벤트 발생
        if (this.onInteraction) {
            this.onInteraction(this.gridX, this.gridY);
        }
    }

    /**
     * 이동 시도
     * @param {string} direction - 이동 방향
     * @param {Garden} garden - 정원 인스턴스 (충돌 체크용)
     * @returns {boolean} 이동 성공 여부
     */
    tryMove(direction, garden = null) {
        if (this.isMoving) return false;

        // 방향 업데이트
        this.direction = direction;

        // 다음 그리드 위치 계산
        let nextGridX = this.gridX;
        let nextGridY = this.gridY;

        switch (direction) {
            case 'up':
                nextGridY--;
                break;
            case 'down':
                nextGridY++;
                break;
            case 'left':
                nextGridX--;
                break;
            case 'right':
                nextGridX++;
                break;
        }

        // 경계 체크
        if (nextGridX < 0 || nextGridX >= 25 || nextGridY < 0 || nextGridY >= 17) {
            return false;
        }

        // 충돌 체크 (향후 확장: 울타리, 건물 등)
        // if (garden && !garden.isWalkable(nextGridX, nextGridY)) {
        //     return false;
        // }

        // 이동 시작
        this.isMoving = true;
        this.gridX = nextGridX;
        this.gridY = nextGridY;
        this.targetPixelX = nextGridX * 32;
        this.targetPixelY = nextGridY * 32;

        // 자동 파종 모드
        if (this.autoPlantMode && this.selectedSeedForAutoPlant && garden) {
            const oldGridX = direction === 'right' ? nextGridX - 1 :
                direction === 'left' ? nextGridX + 1 : nextGridX;
            const oldGridY = direction === 'down' ? nextGridY - 1 :
                direction === 'up' ? nextGridY + 1 : nextGridY;

            // 이전 위치에 심기 (씨앗 확인 필수)
            if (garden.isCellEmpty(oldGridX, oldGridY)) {
                // 인벤토리에서 씨앗 확인 및 사용
                const inventory = window.game?.inventory;
                if (inventory && inventory.getSeedCount(this.selectedSeedForAutoPlant) > 0) {
                    const planted = garden.plantSeed(this.selectedSeedForAutoPlant, oldGridX, oldGridY);
                    if (planted) {
                        inventory.useSeed(this.selectedSeedForAutoPlant);
                    }

                    // 씨앗이 모두 소진되면 자동 파종 모드 해제
                    if (inventory.getSeedCount(this.selectedSeedForAutoPlant) <= 0) {
                        this.autoPlantMode = false;
                        console.log(`🌱 ${this.selectedSeedForAutoPlant} 씨앗이 모두 소진되어 자동 파종 모드가 해제되었습니다.`);

                        // UI 토글도 업데이트
                        const autoPlantToggle = document.getElementById('auto-plant-toggle');
                        if (autoPlantToggle) autoPlantToggle.checked = false;
                    }
                }
            }
        }

        return true;
    }


    /**
     * 매 프레임 업데이트
     * @param {number} deltaTime - 초 단위 시간
     * @param {Garden} garden - 정원 인스턴스
     */
    update(deltaTime, garden = null) {
        // 이동 애니메이션
        if (this.isMoving) {
            const dx = this.targetPixelX - this.pixelX;
            const dy = this.targetPixelY - this.pixelY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 1) {
                // 이동 완료
                this.pixelX = this.targetPixelX;
                this.pixelY = this.targetPixelY;
                this.isMoving = false;

                // 발자국 파티클
                if (this.onFootstep) {
                    this.onFootstep(this.pixelX + 16, this.pixelY + 28);
                }

                // 연속 이동 체크
                if (this.keysPressed.up) this.tryMove('up', garden);
                else if (this.keysPressed.down) this.tryMove('down', garden);
                else if (this.keysPressed.left) this.tryMove('left', garden);
                else if (this.keysPressed.right) this.tryMove('right', garden);
            } else {
                // 부드러운 이동 (lerp)
                const moveAmount = this.moveSpeed * deltaTime;
                const ratio = Math.min(moveAmount / distance, 1);

                this.pixelX += dx * ratio;
                this.pixelY += dy * ratio;
            }

            // 걷기 애니메이션
            this.animationTimer += deltaTime;
            if (this.animationTimer >= this.animationSpeed) {
                this.animationTimer = 0;
                this.animationFrame = (this.animationFrame + 1) % 4;
            }
        } else {
            // 정지 시 애니메이션 리셋
            this.animationFrame = 0;
        }
    }

    /**
     * 캔버스에 렌더링
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const x = this.pixelX;
        const y = this.pixelY;

        ctx.save();

        // 캐릭터 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 30, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 캐릭터 본체 (32x32 픽셀 스타일)
        // 머리
        ctx.fillStyle = '#FFE4C4';  // 피부색
        ctx.beginPath();
        ctx.arc(x + 16, y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // 머리카락
        ctx.fillStyle = '#8B4513';  // 갈색
        ctx.beginPath();
        ctx.arc(x + 16, y + 7, 8, Math.PI, 0, true);
        ctx.fill();

        // 얼굴
        ctx.fillStyle = '#333';
        // 눈
        const eyeOffset = this.direction === 'left' ? -2 :
            this.direction === 'right' ? 2 : 0;
        ctx.fillRect(x + 12 + eyeOffset, y + 9, 2, 2);
        ctx.fillRect(x + 18 + eyeOffset, y + 9, 2, 2);

        // 몸통
        ctx.fillStyle = '#90EE90';  // 연두색 옷
        ctx.fillRect(x + 8, y + 18, 16, 10);

        // 다리 (걷기 애니메이션)
        ctx.fillStyle = '#4682B4';  // 청바지색
        const legOffset = this.isMoving ? Math.sin(this.animationFrame * Math.PI / 2) * 2 : 0;
        ctx.fillRect(x + 9, y + 28 + legOffset, 5, 4);
        ctx.fillRect(x + 18, y + 28 - legOffset, 5, 4);

        // 자동 파종 모드 표시
        if (this.autoPlantMode) {
            ctx.fillStyle = '#D3DB7F';  // lime-ice
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🌱', x + 16, y - 2);
        }

        ctx.restore();
    }

    /**
     * 현재 위치 아래의 타일 정보
     */
    getCurrentTile() {
        return { x: this.gridX, y: this.gridY };
    }

    /**
     * 정리
     */
    destroy() {
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
    }
}

// 전역 내보내기
window.Character = Character;
