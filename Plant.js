/**
 * 🌱 Plant.js - 식물 성장 상태 머신
 * 
 * 핵심 철학:
 * - 식물은 절대 죽지 않습니다 (No Fail State)
 * - 물이 없으면 성장이 "일시 정지"됩니다
 * - 이웃 식물과의 보너스로 더 빨리 성장합니다
 */

// 성장 단계 열거형
const GrowthStage = {
    SEED: 'seed',
    SPROUT: 'sprout',
    GROWING: 'growing',
    BLOOMING: 'blooming',
    FULL_GROWN: 'full_grown',
    READY_TO_HARVEST: 'ready_to_harvest'  // 수확 가능 상태
};

// 물 상태 열거형
const WaterStatus = {
    WATERED: 'watered',     // 물을 받은 상태
    PAUSED: 'paused'        // 일시 정지 (물 필요)
};

// 식물 타입 정의
const PlantTypes = {
    tomato: {
        name: '토마토',
        emoji: '🍅',
        growthTime: 5000,  // 각 단계당 밀리초
        color: '#FF6B6B',
        companions: ['basil'],  // 동반 식물
        bonusMultiplier: 1.2     // 이웃 보너스 시 배율
    },
    sunflower: {
        name: '해바라기',
        emoji: '🌻',
        growthTime: 4000,
        color: '#FFD93D',
        companions: ['*'],  // 모든 식물과 친화
        bonusMultiplier: 1.1
    },
    tulip: {
        name: '튤립',
        emoji: '🌷',
        growthTime: 4500,
        color: '#FF69B4',
        companions: ['tulip'],  // 같은 종끼리 보너스
        bonusMultiplier: 1.15
    },
    carrot: {
        name: '당근',
        emoji: '🥕',
        growthTime: 6000,
        color: '#FF8C00',
        companions: ['onion'],
        bonusMultiplier: 1.15
    },
    basil: {
        name: '바질',
        emoji: '🌿',
        growthTime: 3500,
        color: '#228B22',
        companions: ['tomato'],
        bonusMultiplier: 1.2,
        harvestYield: 1  // 수확량
    }
};

/**
 * 식물 클래스
 * 상태 머신 패턴을 사용하여 성장 단계를 관리합니다.
 */
class Plant {
    /**
     * @param {string} type - 식물 타입 (tomato, sunflower 등)
     * @param {number} gridX - 그리드 X 좌표
     * @param {number} gridY - 그리드 Y 좌표
     */
    constructor(type, gridX, gridY) {
        // 기본 정보
        this.type = type;
        this.typeInfo = PlantTypes[type];
        this.id = `plant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 위치
        this.gridX = gridX;
        this.gridY = gridY;
        this.pixelX = gridX * 32;
        this.pixelY = gridY * 32;

        // 상태 머신
        this.stage = GrowthStage.SEED;
        this.waterStatus = WaterStatus.WATERED;  // 심으면 자동으로 물 줌

        // 성장 관련
        this.growthProgress = 0;           // 현재 단계 진행도 (0-100)
        this.baseGrowthRate = 100 / (this.typeInfo.growthTime / 1000);  // 초당 진행도
        this.neighborBonus = 0;            // 이웃 보너스 (+N)
        this.lastUpdateTime = Date.now();

        // 시각적 상태
        this.scale = 1;
        this.isWiggling = false;
        this.soilWetness = 1;  // 흙 습기 (0-1)
    }

    /**
     * 성장 단계 순서 가져오기
     */
    static get stageOrder() {
        return [
            GrowthStage.SEED,
            GrowthStage.SPROUT,
            GrowthStage.GROWING,
            GrowthStage.BLOOMING,
            GrowthStage.FULL_GROWN,
            GrowthStage.READY_TO_HARVEST
        ];
    }

    /**
     * 현재 단계 인덱스
     */
    get stageIndex() {
        return Plant.stageOrder.indexOf(this.stage);
    }

    /**
     * 최종 단계에 도달했는지
     */
    get isFullyGrown() {
        return this.stage === GrowthStage.FULL_GROWN ||
            this.stage === GrowthStage.READY_TO_HARVEST;
    }

    /**
     * 수확 가능한지
     */
    get isReadyToHarvest() {
        return this.stage === GrowthStage.READY_TO_HARVEST;
    }

    /**
     * 성장이 일시 정지되었는지
     */
    get isPaused() {
        return this.waterStatus === WaterStatus.PAUSED;
    }

    /**
     * 물이 필요한지
     */
    get needsWater() {
        return this.soilWetness < 0.3;
    }

    /**
     * 물주기
     * @returns {boolean} 물을 줬는지 여부
     */
    water() {
        if (this.isFullyGrown) {
            // 완전히 자란 식물도 물을 받으면 기분 좋은 애니메이션
            this.triggerWiggle();
            return true;
        }

        // 물 상태 업데이트
        this.waterStatus = WaterStatus.WATERED;
        this.soilWetness = 1;
        this.lastUpdateTime = Date.now();

        // 기분 좋은 피드백
        this.triggerWiggle();

        console.log(`💧 ${this.typeInfo.name}에게 물을 줬습니다!`);
        return true;
    }

    /**
     * 흔들림 애니메이션 트리거
     */
    triggerWiggle() {
        this.isWiggling = true;
        setTimeout(() => {
            this.isWiggling = false;
        }, 500);
    }

    /**
     * 이웃 보너스 설정
     * @param {number} bonus - 보너스 값
     */
    setNeighborBonus(bonus) {
        this.neighborBonus = bonus;
    }

    /**
     * 매 프레임 업데이트
     * @param {number} deltaTime - 이전 프레임과의 시간 차이 (초)
     */
    update(deltaTime) {
        // 일시 정지 상태면 성장하지 않음
        if (this.isPaused || this.isFullyGrown) {
            return;
        }

        // 흙 습기 감소 (천천히)
        this.soilWetness = Math.max(0, this.soilWetness - deltaTime * 0.02);

        // 물이 부족하면 일시 정지
        if (this.needsWater) {
            this.waterStatus = WaterStatus.PAUSED;
            console.log(`💤 ${this.typeInfo.name}이(가) 물을 기다리고 있어요...`);
            return;
        }

        // 성장률 계산 (이웃 보너스 적용)
        const bonusMultiplier = 1 + (this.neighborBonus * 0.1);  // 보너스당 10% 증가
        const effectiveGrowthRate = this.baseGrowthRate * bonusMultiplier;

        // 진행도 증가
        this.growthProgress += effectiveGrowthRate * deltaTime;

        // 단계 전이 체크
        if (this.growthProgress >= 100) {
            this.advanceStage();
        }
    }

    /**
     * 다음 성장 단계로 전이
     */
    advanceStage() {
        const currentIndex = this.stageIndex;

        if (currentIndex < Plant.stageOrder.length - 1) {
            this.stage = Plant.stageOrder[currentIndex + 1];
            this.growthProgress = 0;

            console.log(`🌱 ${this.typeInfo.name}이(가) ${this.getStageName()}(으)로 성장했어요!`);

            // 성장 시 스케일 애니메이션
            this.scale = 1.2;
            setTimeout(() => {
                this.scale = 1;
            }, 300);
        }
    }

    /**
     * 현재 단계 한글 이름
     */
    getStageName() {
        const stageNames = {
            [GrowthStage.SEED]: '씨앗',
            [GrowthStage.SPROUT]: '새싹',
            [GrowthStage.GROWING]: '성장 중',
            [GrowthStage.BLOOMING]: '개화',
            [GrowthStage.FULL_GROWN]: '완전 성장',
            [GrowthStage.READY_TO_HARVEST]: '🌟 수확 가능!'
        };
        return stageNames[this.stage];
    }

    /**
     * 수확하기
     * @returns {Object|null} 수확 결과 {type, amount} 또는 null
     */
    harvest() {
        if (!this.isReadyToHarvest) {
            return null;
        }

        const result = {
            type: this.type,
            amount: this.typeInfo.harvestYield || 1
        };

        console.log(`🌾 ${this.typeInfo.name} 수확! x${result.amount}`);

        return result;
    }

    /**
     * FULL_GROWN에서 일정 시간 후 READY_TO_HARVEST로 전이 체크
     * (update 내에서 호출됨)
     */
    checkHarvestReady() {
        if (this.stage === GrowthStage.FULL_GROWN) {
            // 완전 성장 후 바로 수확 가능 상태로 전이
            this.stage = GrowthStage.READY_TO_HARVEST;
            console.log(`✨ ${this.typeInfo.name}이(가) 수확 가능해졌어요!`);
        }
    }

    /**
     * 현재 상태를 이모지로 반환
     */
    getDisplayEmoji() {
        // 단계별 이모지
        switch (this.stage) {
            case GrowthStage.SEED:
                return '🌰';
            case GrowthStage.SPROUT:
                return '🌱';
            case GrowthStage.GROWING:
                return '🌿';
            case GrowthStage.BLOOMING:
            case GrowthStage.FULL_GROWN:
            case GrowthStage.READY_TO_HARVEST:
                return this.typeInfo.emoji;
            default:
                return '🌱';
        }
    }

    /**
     * 캔버스에 렌더링
     * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
     */
    render(ctx) {
        const x = this.pixelX;
        const y = this.pixelY;
        const size = 32;

        // 흙 렌더링 (습기에 따라 색상 변화)
        const dryColor = { r: 139, g: 115, b: 85 };   // #8B7355
        const wetColor = { r: 93, g: 78, b: 55 };     // #5D4E37

        const r = Math.round(dryColor.r + (wetColor.r - dryColor.r) * this.soilWetness);
        const g = Math.round(dryColor.g + (wetColor.g - dryColor.g) * this.soilWetness);
        const b = Math.round(dryColor.b + (wetColor.b - dryColor.b) * this.soilWetness);

        // 흙 베이스
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 28, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 수확 가능 Glow 효과
        if (this.isReadyToHarvest) {
            const glowIntensity = 0.3 + Math.sin(Date.now() / 300) * 0.2;
            ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(x + 16, y + 14, 18, 0, Math.PI * 2);
            ctx.fill();
        }

        // 식물 렌더링
        ctx.save();

        // 중심점 기준 스케일
        ctx.translate(x + 16, y + 16);
        ctx.scale(this.scale, this.scale);

        // 흔들림 효과 (수확 가능 시 지속적으로 흔들림)
        if (this.isWiggling || this.isReadyToHarvest) {
            const wiggleSpeed = this.isReadyToHarvest ? 100 : 50;
            const wiggle = Math.sin(Date.now() / wiggleSpeed) * 3;
            ctx.rotate(wiggle * Math.PI / 180);
        }

        // 이모지 렌더링 (픽셀 아트 스타일)
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getDisplayEmoji(), 0, -4);

        ctx.restore();

        // 일시 정지 인디케이터
        if (this.isPaused) {
            ctx.fillStyle = 'rgba(165, 219, 248, 0.7)';  // fairy-sparkle
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💧?', x + 16, y + 4);
        }

        // 이웃 보너스 표시
        if (this.neighborBonus > 0 && !this.isPaused) {
            ctx.fillStyle = '#D3DB7F';  // lime-ice
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`+${this.neighborBonus}`, x + 28, y + 6);
        }

        // 진행 바 (씨앗이 아니고 완전 성장이 아닐 때)
        if (this.stage !== GrowthStage.SEED && !this.isFullyGrown) {
            const barWidth = 24;
            const barHeight = 3;
            const barX = x + 4;
            const barY = y + 30;

            // 배경
            ctx.fillStyle = 'rgba(139, 115, 85, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // 진행
            ctx.fillStyle = '#D3DB7F';  // lime-ice
            ctx.fillRect(barX, barY, barWidth * (this.growthProgress / 100), barHeight);
        }
    }

    /**
     * 직렬화 (저장용)
     */
    toJSON() {
        return {
            type: this.type,
            gridX: this.gridX,
            gridY: this.gridY,
            stage: this.stage,
            waterStatus: this.waterStatus,
            growthProgress: this.growthProgress,
            soilWetness: this.soilWetness
        };
    }

    /**
     * 역직렬화 (불러오기용)
     */
    static fromJSON(data) {
        const plant = new Plant(data.type, data.gridX, data.gridY);
        plant.stage = data.stage;
        plant.waterStatus = data.waterStatus;
        plant.growthProgress = data.growthProgress;
        plant.soilWetness = data.soilWetness;
        return plant;
    }
}

// 전역 내보내기
window.Plant = Plant;
window.GrowthStage = GrowthStage;
window.WaterStatus = WaterStatus;
window.PlantTypes = PlantTypes;
