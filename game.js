/**
 * 🎮 game.js - 게임 초기화 및 메인 루프
 * 
 * 치유형 픽셀 아트 가드닝 시뮬레이션
 * 핵심 철학: 실패 없음, 풍요로움, 안전함
 * 
 * V2.0 - 캐릭터 조작형 RPG 확장
 */

// ============ 전역 게임 상태 ============
window.gameState = {
    selectedTool: 'water',      // 현재 선택된 도구
    selectedSeed: null,         // 현재 선택된 씨앗
    isPaused: false,
    timeOfDay: 'day',           // dawn, day, evening, night
    lastFrameTime: 0
};

// ============ 메인 게임 클래스 ============
class CozyGardenGame {
    constructor() {
        // 캔버스 설정
        this.canvas = document.getElementById('garden-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 픽셀 아트 선명도 설정
        this.ctx.imageSmoothingEnabled = false;

        // 게임 시스템 인스턴스
        this.garden = new Garden(25, 17);  // 800/32=25, 544/32=17
        this.dragDrop = new DragDropSystem(this.canvas, this.garden);

        // 새로운 시스템들
        this.character = new Character(12, 8);  // 중앙에서 시작
        this.inventory = new Inventory();
        this.shop = new Shop(this.inventory);

        // V3.0 신규 시스템들
        this.journal = PlantJournal.getInstance();
        this.mutation = MutationManager.getInstance();
        this.rainCloud = RainCloudSystem.getInstance();

        // V4.0 경제 시스템
        this.market = MarketSystem.getInstance();
        this.shippingBin = new ShippingBin(1, 1);  // 정원 입구

        // 시간 시스템
        this.gameStartTime = Date.now();
        this.dayDuration = 120000;  // 2분 = 하루
        this.gameDay = 0;           // 게임 일차
        this.lastHour = -1;         // 마지막 시간 (정산용)

        // 파티클 시스템 (물방울 등)
        this.particles = [];

        // 캐릭터 콜백 설정
        this.character.onFootstep = (x, y) => {
            this.createDustParticles(x, y);
        };

        this.character.onInteraction = (gridX, gridY) => {
            this.handleInteraction(gridX, gridY);
        };

        // 인벤토리 UI 업데이트 콜백
        this.inventory.onUpdate = (inv) => {
            this.updateInventoryUI(inv);
        };

        // UI 요소 설정
        this.setupUI();

        // 저장 데이터 로드
        this.garden.load();
        this.inventory.load();

        // 자동 저장 (30초마다)
        setInterval(() => {
            this.garden.save();
            this.inventory.save();
        }, 30000);

        console.log('🌸 코지 가든 V2.0에 오신 것을 환영합니다!');
        console.log('🎮 WASD: 이동 | SPACE: 상호작용 | P: 자동 파종');
    }

    /**
     * UI 이벤트 설정
     */
    setupUI() {
        // 도구 버튼
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                gameState.selectedTool = btn.dataset.tool;
                gameState.selectedSeed = null;

                // 씨앗 선택 해제
                document.querySelectorAll('.seed-btn').forEach(s => s.classList.remove('selected'));

                console.log(`🧰 도구 선택: ${gameState.selectedTool}`);
            });
        });

        // 씨앗 버튼
        document.querySelectorAll('.seed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plantType = btn.dataset.plant;

                // 씨앗이 있는지 확인
                if (this.inventory.getSeedCount(plantType) <= 0) {
                    console.log(`❌ ${PlantTypes[plantType]?.name} 씨앗이 없어요! 상점에서 구매하세요.`);
                    return;
                }

                document.querySelectorAll('.seed-btn').forEach(s => s.classList.remove('selected'));
                btn.classList.add('selected');

                gameState.selectedSeed = plantType;
                gameState.selectedTool = 'plant';

                // 캐릭터 자동 파종 설정
                this.character.selectedSeedForAutoPlant = plantType;

                // 심기 도구 활성화
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('[data-tool="plant"]')?.classList.add('active');

                console.log(`🌱 씨앗 선택: ${PlantTypes[plantType].name}`);
            });
        });

        // 그리드 토글
        const gridToggle = document.getElementById('grid-toggle');
        if (gridToggle) {
            gridToggle.addEventListener('change', (e) => {
                this.dragDrop.setGridSnap(e.target.checked);
            });
        }

        // 자동 파종 토글
        const autoPlantToggle = document.getElementById('auto-plant-toggle');
        if (autoPlantToggle) {
            autoPlantToggle.addEventListener('change', (e) => {
                this.character.autoPlantMode = e.target.checked;
                console.log(`🌱 자동 파종: ${e.target.checked ? 'ON' : 'OFF'}`);
            });
        }

        // 상점 버튼
        const shopButton = document.getElementById('shop-button');
        if (shopButton) {
            shopButton.addEventListener('click', () => {
                this.shop.toggle();
            });
        }

        // 도감 버튼
        const journalButton = document.getElementById('journal-button');
        if (journalButton) {
            journalButton.addEventListener('click', () => {
                this.journal.toggle();
            });
        }

        // 캔버스 클릭 (물주기/심기/수확)
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });

        // ===== Hold-to-Action: 드래그 중 연속 상호작용 =====
        this.isMouseDown = false;
        this.lastActionTile = { x: -1, y: -1 };

        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.lastActionTile = { x: -1, y: -1 };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            const gridPos = this.garden.pixelToGrid(x, y);

            // 같은 타일이면 스킵
            if (gridPos.x === this.lastActionTile.x && gridPos.y === this.lastActionTile.y) {
                return;
            }

            this.lastActionTile = { x: gridPos.x, y: gridPos.y };

            // 현재 도구에 따라 연속 액션
            switch (gameState.selectedTool) {
                case 'water':
                    this.waterAt(gridPos.x, gridPos.y, x, y);
                    break;
                case 'harvest':
                    this.harvestAt(gridPos.x, gridPos.y);
                    break;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.lastActionTile = { x: -1, y: -1 };
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
        });
        // ===== End Hold-to-Action =====

        // 초기 UI 업데이트
        this.updateInventoryUI(this.inventory);
    }

    /**
     * 인벤토리 UI 업데이트
     */
    updateInventoryUI(inv) {
        // 골드
        const goldDisplay = document.getElementById('gold-display');
        if (goldDisplay) goldDisplay.textContent = inv.gold;

        // 씨앗 수량
        for (const [type, count] of Object.entries(inv.seeds)) {
            const seedEl = document.getElementById(`seed-${type}`);
            if (seedEl) seedEl.textContent = count;
        }

        // 수확물 수량
        for (const [type, count] of Object.entries(inv.crops)) {
            const cropEl = document.getElementById(`crop-${type}`);
            if (cropEl) cropEl.textContent = count;
        }
    }

    /**
     * 스페이스바 상호작용 처리
     */
    handleInteraction(gridX, gridY) {
        // 배송 상자 상호작용 체크
        if (this.shippingBin.isNear(gridX, gridY)) {
            this.shippingBin.open(this.inventory);
            return;
        }

        const plant = this.garden.getPlantAt(gridX, gridY);

        if (plant) {
            if (plant.isReadyToHarvest) {
                // 수확
                this.harvestAt(gridX, gridY);
            } else if (plant.isPaused || plant.needsWater) {
                // 물주기
                this.waterAt(gridX, gridY, plant.pixelX + 16, plant.pixelY + 16);
            } else {
                // 정보 표시
                this.showPlantInfo(gridX, gridY);
            }
        } else {
            // 빈 곳이면 심기
            if (gameState.selectedSeed && this.inventory.getSeedCount(gameState.selectedSeed) > 0) {
                this.plantAt(gridX, gridY);
            }
        }
    }

    /**
     * 캔버스 클릭 처리
     */
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const gridPos = this.garden.pixelToGrid(x, y);

        switch (gameState.selectedTool) {
            case 'water':
                this.waterAt(gridPos.x, gridPos.y, x, y);
                break;

            case 'plant':
                if (gameState.selectedSeed) {
                    this.plantAt(gridPos.x, gridPos.y);
                }
                break;

            case 'harvest':
                this.harvestAt(gridPos.x, gridPos.y);
                break;

            default:
                this.showPlantInfo(gridPos.x, gridPos.y);
                break;
        }
    }

    /**
     * 물주기
     */
    waterAt(gridX, gridY, pixelX, pixelY) {
        const watered = this.garden.waterPlantAt(gridX, gridY);

        if (watered) {
            // 물방울 파티클 생성
            this.createWaterParticles(pixelX, pixelY);
        }
    }

    /**
     * 식물 심기
     */
    plantAt(gridX, gridY) {
        // 씨앗 확인
        if (!gameState.selectedSeed) return;

        if (this.inventory.getSeedCount(gameState.selectedSeed) <= 0) {
            console.log(`❌ ${PlantTypes[gameState.selectedSeed]?.name} 씨앗이 없어요!`);
            return;
        }

        const plant = this.garden.plantSeed(gameState.selectedSeed, gridX, gridY);

        if (plant) {
            // 씨앗 사용
            this.inventory.useSeed(gameState.selectedSeed);

            // 심기 파티클
            const pixel = this.garden.gridToPixel(gridX, gridY);
            this.createSparkleParticles(pixel.x + 16, pixel.y + 16);
        }
    }

    /**
     * 수확하기
     */
    harvestAt(gridX, gridY) {
        const plant = this.garden.getPlantAt(gridX, gridY);

        if (!plant || !plant.isReadyToHarvest) {
            console.log('🌱 아직 수확할 수 없어요!');
            return;
        }

        const result = plant.harvest();

        if (result) {
            // 인벤토리에 추가
            this.inventory.addCrop(result.type, result.amount);

            // 도감 기록 (마스터리 시스템)
            const masteryUp = this.journal.recordHarvest(result.type, result.amount);
            if (masteryUp) {
                // 마스터리 레벨업 파티클
                this.createSparkleParticles(plant.pixelX + 16, plant.pixelY - 10);
            }

            // 변종 교배 체크
            const mutationResult = this.mutation.checkForMutation(
                gridX, gridY, result.type, this.garden
            );
            if (mutationResult) {
                // 변종 씨앗 획득!
                this.inventory.addSeeds(mutationResult.variantSeed, 1);
                // 마법 가루 파티클
                const magicParticles = this.mutation.createMagicSparkleParticles(
                    plant.pixelX + 16, plant.pixelY + 16
                );
                this.particles.push(...magicParticles);
            }

            // 수확 파티클 (튀어오름)
            this.createHarvestParticles(plant.pixelX + 16, plant.pixelY + 16, plant.typeInfo.emoji);

            // 정원에서 제거
            this.garden.removePlant(gridX, gridY);

            console.log(`🌾 ${plant.typeInfo.name} 수확 완료! +${result.amount}`);
        }
    }

    /**
     * 정원에서 식물 제거 (Garden에 메서드 추가 필요)
     */

    /**
     * 식물 정보 표시
     */
    showPlantInfo(gridX, gridY) {
        const plant = this.garden.getPlantAt(gridX, gridY);
        const infoPanel = document.getElementById('plant-info');
        const hintText = document.getElementById('hint-text');

        if (plant) {
            document.getElementById('plant-name').textContent =
                `${plant.typeInfo.emoji} ${plant.typeInfo.name}`;
            document.getElementById('plant-stage').textContent =
                plant.getStageName();
            document.getElementById('neighbor-bonus').textContent =
                `이웃 보너스: +${plant.neighborBonus}`;

            infoPanel.classList.remove('hidden');
            hintText.classList.add('hidden');
        } else {
            infoPanel.classList.add('hidden');
            hintText.classList.remove('hidden');
        }
    }

    /**
     * 물방울 파티클 생성
     */
    createWaterParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * -3 - 1,
                life: 1,
                type: 'water'
            });
        }
    }

    /**
     * 반짝임 파티클 생성
     */
    createSparkleParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1,
                type: 'sparkle'
            });
        }
    }

    /**
     * 흙먼지 파티클 (발자국)
     */
    createDustParticles(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y,
                vx: (Math.random() - 0.5) * 1,
                vy: Math.random() * -1 - 0.5,
                life: 0.5,
                type: 'dust'
            });
        }
    }

    /**
     * 수확 파티클 (튀어오름)
     */
    createHarvestParticles(x, y, emoji) {
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: -8,
            life: 1,
            type: 'harvest',
            emoji: emoji
        });

        // 추가 반짝임
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 0.8,
                type: 'sparkle'
            });
        }
    }

    /**
     * 파티클 업데이트
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.vy += 0.15;  // 중력
            p.y += p.vy;
            p.life -= deltaTime * 2;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 파티클 렌더링
     */
    renderParticles() {
        for (const p of this.particles) {
            this.ctx.globalAlpha = Math.max(0, p.life);

            if (p.type === 'water') {
                this.ctx.fillStyle = '#A5DBF8';  // fairy-sparkle
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'sparkle') {
                this.ctx.fillStyle = '#FFD93D';  // 황금색
                this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            } else if (p.type === 'dust') {
                this.ctx.fillStyle = '#C4A77D';  // 흙색
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'harvest') {
                this.ctx.font = '20px serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(p.emoji, p.x, p.y);
            }

            this.ctx.globalAlpha = 1;
        }
    }

    /**
     * 시간대 업데이트
     */
    updateTimeOfDay() {
        const elapsed = Date.now() - this.gameStartTime;
        const dayProgress = (elapsed % this.dayDuration) / this.dayDuration;

        let timeOfDay;
        let timeEmoji;

        if (dayProgress < 0.1) {
            timeOfDay = 'dawn';
            timeEmoji = '🌅';
        } else if (dayProgress < 0.5) {
            timeOfDay = 'day';
            timeEmoji = '☀️';
        } else if (dayProgress < 0.6) {
            timeOfDay = 'evening';
            timeEmoji = '🌇';
        } else {
            timeOfDay = 'night';
            timeEmoji = '🌙';
        }

        gameState.timeOfDay = timeOfDay;

        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            const timeNames = {
                dawn: '새벽',
                day: '낮',
                evening: '해질녘',
                night: '밤'
            };
            timeDisplay.textContent = `${timeEmoji} ${timeNames[timeOfDay]}`;
        }
    }

    /**
     * 배경 렌더링 (시간대별 조명)
     */
    renderBackground() {
        // 기본 배경색
        const bgColors = {
            dawn: '#FFE4E1',    // 미스티 로즈
            day: '#FFECD2',     // 크림 피치
            evening: '#FFD4A3', // 따뜻한 오렌지
            night: '#E8E0F0'    // 라벤더 안개
        };

        this.ctx.fillStyle = bgColors[gameState.timeOfDay] || bgColors.day;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 밤에는 은은한 달빛 오버레이
        if (gameState.timeOfDay === 'night') {
            this.ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * 메인 업데이트 루프
     */
    update(currentTime) {
        // 델타 타임 계산
        const deltaTime = (currentTime - gameState.lastFrameTime) / 1000;
        gameState.lastFrameTime = currentTime;

        // 시간대 업데이트
        this.updateTimeOfDay();

        // 일일 정산 체크 (06:00 AM)
        this.checkDailySettlement();

        // 정원 업데이트
        this.garden.update(deltaTime);

        // 식물 수확 준비 체크
        for (const plant of this.garden.plants) {
            plant.checkHarvestReady();
        }

        // 캐릭터 업데이트
        this.character.update(deltaTime, this.garden);

        // 파티클 업데이트
        this.updateParticles(deltaTime);

        // 비구름 시스템 업데이트
        this.rainCloud.update(deltaTime, this.canvas.width, this.canvas.height);
    }

    /**
     * 일일 정산 체크 (06:00 AM)
     */
    checkDailySettlement() {
        const elapsed = Date.now() - this.gameStartTime;
        const currentDay = Math.floor(elapsed / this.dayDuration);
        const dayProgress = (elapsed % this.dayDuration) / this.dayDuration;
        const currentHour = Math.floor(dayProgress * 24);

        // 새로운 날로 넘어갔고, 6시가 되었을 때
        if (currentDay > this.gameDay || (currentHour >= 6 && this.lastHour < 6)) {
            this.gameDay = currentDay;

            // 배송 상자 정산
            if (this.shippingBin.hasItems()) {
                const earnings = this.shippingBin.settle(this.inventory);
                if (earnings > 0) {
                    ToastSystem.show(`💰 어제 배송 수익: +${earnings}G`, 4000, 'success');
                }
            }

            // 시장 인기 아이템 갱신
            this.market.updateDay(currentDay);

            const trendingInfo = this.market.getTrendingInfo();
            if (trendingInfo) {
                ToastSystem.show(`📈 오늘의 인기: ${trendingInfo.emoji} ${trendingInfo.name} (1.5배!)`, 3000, 'info');
            }
        }

        this.lastHour = currentHour;
    }

    /**
     * 메인 렌더 루프
     */
    render() {
        // 배경
        this.renderBackground();

        // 정원 (그리드 + 식물)
        this.garden.render(this.ctx);

        // 드래그 앤 드롭 미리보기
        this.dragDrop.render(this.ctx);

        // 캐릭터
        this.character.render(this.ctx);

        // 파티클
        this.renderParticles();

        // 배송 상자 렌더링
        this.shippingBin.render(this.ctx);

        // 비구름 시스템 렌더링 (최상위)
        this.rainCloud.render(this.ctx, this.canvas.width, this.canvas.height);
    }

    /**
     * 게임 루프 시작
     */
    start() {
        gameState.lastFrameTime = performance.now();

        const gameLoop = (currentTime) => {
            this.update(currentTime);
            this.render();
            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }
}

// ============ 게임 시작 ============
document.addEventListener('DOMContentLoaded', () => {
    const game = new CozyGardenGame();
    game.start();

    // 전역 접근 (디버깅용)
    window.game = game;
});
