/**
 * 🧬 MutationManager.js - 변종 교배 시스템
 * 
 * 핵심 기능:
 * - 인접한 식물의 색상 조합에 따라 새로운 종자 탄생
 * - Moore Neighborhood (8방향) 기반 감지
 * - 마스터리 레벨에 따른 확률 보정
 */

// ============ 변종 규칙 테이블 ============
const MutationRules = {
    // 형식: 'parent1+parent2': { result: 'variant_id', baseChance: 확률, rarity: '등급' }
    'tomato+basil': {
        result: 'tomato_golden',
        baseChance: 0.10,
        rarity: 'rare',
        description: '황금빛 토마토 - 바질과 함께 자라면 특별해져요!'
    },
    'tulip+tulip': {
        result: 'tulip_purple',
        baseChance: 0.10,
        rarity: 'rare',
        description: '보라색 튤립 - 같은 종끼리의 특별한 교배'
    },
    'sunflower+tulip': {
        result: 'sunflower_pink',
        baseChance: 0.08,
        rarity: 'epic',
        description: '핑크 해바라기 - 매우 희귀한 변종!'
    },
    'carrot+basil': {
        result: 'carrot_rainbow',
        baseChance: 0.08,
        rarity: 'epic',
        description: '무지개 당근 - 허브의 힘으로 색이 변했어요'
    },
    'basil+sunflower': {
        result: 'basil_golden',
        baseChance: 0.10,
        rarity: 'rare',
        description: '황금 바질 - 햇빛을 가득 머금은 바질'
    }
};

// ============ 변종 식물 타입 추가 정의 ============
const VariantPlantTypes = {
    tomato_golden: {
        name: '황금 토마토',
        emoji: '🍅',
        baseId: 'tomato',
        growthTime: 4500,
        color: '#FFD700',  // 황금색
        companions: ['basil', 'sunflower'],
        bonusMultiplier: 1.3,
        harvestYield: 2,
        rarity: 'rare',
        tintColor: '#FFD700'  // 렌더링 시 틴트 컬러
    },
    tulip_purple: {
        name: '보라 튤립',
        emoji: '🌷',
        baseId: 'tulip',
        growthTime: 4000,
        color: '#9B59B6',  // 보라색
        companions: ['tulip', '*'],
        bonusMultiplier: 1.25,
        harvestYield: 2,
        rarity: 'rare',
        tintColor: '#9B59B6'
    },
    sunflower_pink: {
        name: '핑크 해바라기',
        emoji: '🌻',
        baseId: 'sunflower',
        growthTime: 3500,
        color: '#F2C8DD',  // Minimal Rose (체리 블라썸 팔레트)
        companions: ['*'],
        bonusMultiplier: 1.4,
        harvestYield: 3,
        rarity: 'epic',
        tintColor: '#F2C8DD'
    },
    carrot_rainbow: {
        name: '무지개 당근',
        emoji: '🥕',
        baseId: 'carrot',
        growthTime: 5000,
        color: '#A5DBF8',  // Fairy Sparkle (체리 블라썸 팔레트)
        companions: ['*'],
        bonusMultiplier: 1.5,
        harvestYield: 3,
        rarity: 'epic',
        tintColor: '#A5DBF8'
    },
    basil_golden: {
        name: '황금 바질',
        emoji: '🌿',
        baseId: 'basil',
        growthTime: 3000,
        color: '#D3DB7F',  // Lime Ice
        companions: ['tomato', 'sunflower'],
        bonusMultiplier: 1.3,
        harvestYield: 2,
        rarity: 'rare',
        tintColor: '#D3DB7F'
    }
};

/**
 * 변종 교배 관리자 (싱글톤)
 */
class MutationManager {
    static instance = null;

    static getInstance() {
        if (!MutationManager.instance) {
            MutationManager.instance = new MutationManager();
        }
        return MutationManager.instance;
    }

    constructor() {
        if (MutationManager.instance) {
            return MutationManager.instance;
        }

        // 변종 식물 타입을 전역 PlantTypes에 병합
        this.registerVariantTypes();

        // 콜백
        this.onMutationSuccess = null;  // 교배 성공 시 호출

        MutationManager.instance = this;
    }

    /**
     * 변종 식물 타입을 전역에 등록
     */
    registerVariantTypes() {
        for (const [variantId, typeInfo] of Object.entries(VariantPlantTypes)) {
            if (!PlantTypes[variantId]) {
                PlantTypes[variantId] = typeInfo;
            }
        }
        console.log('🧬 변종 식물 타입이 등록되었습니다!');
    }

    /**
     * 교배 가능한 조합 키 생성
     * @param {string} type1 - 첫 번째 식물 타입
     * @param {string} type2 - 두 번째 식물 타입
     * @returns {string} 조합 키
     */
    getCombinationKey(type1, type2) {
        // 알파벳 순으로 정렬하여 일관된 키 생성
        return [type1, type2].sort().join('+');
    }

    /**
     * 교배 체크 (수확 시 호출)
     * @param {number} gridX - 수확한 식물의 X 좌표
     * @param {number} gridY - 수확한 식물의 Y 좌표
     * @param {string} plantType - 수확한 식물 타입
     * @param {Garden} garden - 정원 인스턴스
     * @returns {Object|null} 교배 결과 {variantSeed, rule}
     */
    checkForMutation(gridX, gridY, plantType, garden) {
        // 이미 변종인 경우 스킵
        if (VariantPlantTypes[plantType]) {
            return null;
        }

        // 도감에서 마스터리 배율 가져오기
        const journal = PlantJournal.getInstance();
        const mutationMultiplier = journal.getMutationMultiplier(plantType);

        // 이웃 식물 가져오기 (Moore Neighborhood)
        const neighbors = garden.getNeighbors(gridX, gridY);

        if (neighbors.length === 0) {
            return null;
        }

        // 각 이웃과의 조합 체크
        for (const neighbor of neighbors) {
            // 이웃도 변종이면 스킵
            if (VariantPlantTypes[neighbor.type]) {
                continue;
            }

            const combinationKey = this.getCombinationKey(plantType, neighbor.type);
            const rule = MutationRules[combinationKey];

            if (rule) {
                // 확률 계산 (기본 확률 x 마스터리 배율)
                const finalChance = rule.baseChance * mutationMultiplier;

                if (Math.random() < finalChance) {
                    // 교배 성공!
                    console.log(`✨ 교배 성공! ${rule.description}`);
                    console.log(`   → ${PlantTypes[rule.result]?.name} 씨앗 획득!`);

                    if (this.onMutationSuccess) {
                        this.onMutationSuccess(rule.result, rule);
                    }

                    return {
                        variantSeed: rule.result,
                        rule: rule
                    };
                }
            }
        }

        return null;
    }

    /**
     * 마법 가루 파티클 생성 데이터 반환
     * @param {number} x - 중심 X 좌표
     * @param {number} y - 중심 Y 좌표
     * @returns {Array} 파티클 배열
     */
    createMagicSparkleParticles(x, y) {
        const particles = [];
        const colors = ['#A5DBF8', '#F2C8DD', '#FFD93D', '#D3DB7F'];  // 체리 블라썸 팔레트

        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4 - 2,
                life: 1.5,
                type: 'magic_sparkle',
                color: colors[i % colors.length],
                size: 4 + Math.random() * 3
            });
        }

        // 중앙에 큰 별 파티클
        particles.push({
            x: x,
            y: y - 10,
            vx: 0,
            vy: -3,
            life: 2,
            type: 'magic_star',
            color: '#FFD700',
            size: 8
        });

        return particles;
    }

    /**
     * 변종 여부 확인
     * @param {string} plantType - 식물 타입
     * @returns {boolean}
     */
    isVariant(plantType) {
        return !!VariantPlantTypes[plantType];
    }

    /**
     * 변종의 기본 타입 가져오기
     * @param {string} variantType - 변종 타입
     * @returns {string|null}
     */
    getBaseType(variantType) {
        return VariantPlantTypes[variantType]?.baseId || null;
    }

    /**
     * 희귀도에 따른 테두리 색상 반환
     * @param {string} rarity - 희귀도
     * @returns {string} 색상 코드
     */
    getRarityBorderColor(rarity) {
        const colors = {
            common: '#8B7355',
            rare: '#FFD700',     // 금색
            epic: '#A5DBF8',     // 요정 빛
            legendary: '#FF69B4' // 핫핑크
        };
        return colors[rarity] || colors.common;
    }
}

// 전역 내보내기
window.MutationManager = MutationManager;
window.MutationRules = MutationRules;
window.VariantPlantTypes = VariantPlantTypes;
