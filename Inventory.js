/**
 * 🎒 Inventory.js - 슬롯 기반 인벤토리 시스템
 * 
 * 핵심 철학:
 * - 스트레스 최소화: 무게/용량 제한 없음
 * - 슬롯 방식으로 직관적
 * - 자동 저장/로드
 */

/**
 * 인벤토리 관리 클래스
 */
class Inventory {
    constructor() {
        // 화폐
        this.gold = 100;  // 시작 골드

        // 씨앗 보유량
        this.seeds = {
            tomato: 5,
            sunflower: 3,
            tulip: 2,
            carrot: 3,
            basil: 4
        };

        // 수확한 작물
        this.crops = {
            tomato: 0,
            sunflower: 0,
            tulip: 0,
            carrot: 0,
            basil: 0
        };

        // UI 업데이트 콜백
        this.onUpdate = null;
    }

    /**
     * 씨앗 추가
     * @param {string} type - 씨앗 타입
     * @param {number} amount - 수량
     */
    addSeeds(type, amount = 1) {
        if (!this.seeds[type]) {
            this.seeds[type] = 0;
        }
        this.seeds[type] += amount;
        this.triggerUpdate();
        console.log(`🌱 ${PlantTypes[type]?.name || type} 씨앗 +${amount} (총 ${this.seeds[type]}개)`);
    }

    /**
     * 씨앗 사용 (심기)
     * @param {string} type - 씨앗 타입
     * @returns {boolean} 사용 성공 여부
     */
    useSeed(type) {
        if (!this.seeds[type] || this.seeds[type] <= 0) {
            console.log(`❌ ${PlantTypes[type]?.name || type} 씨앗이 없어요!`);
            return false;
        }

        this.seeds[type]--;
        this.triggerUpdate();
        return true;
    }

    /**
     * 씨앗 보유량 확인
     */
    getSeedCount(type) {
        return this.seeds[type] || 0;
    }

    /**
     * 작물 추가 (수확)
     * @param {string} type - 작물 타입
     * @param {number} amount - 수량
     */
    addCrop(type, amount = 1) {
        if (!this.crops[type]) {
            this.crops[type] = 0;
        }
        this.crops[type] += amount;
        this.triggerUpdate();
        console.log(`🌾 ${PlantTypes[type]?.name || type} 수확! +${amount} (총 ${this.crops[type]}개)`);
    }

    /**
     * 작물 보유량 확인
     */
    getCropCount(type) {
        return this.crops[type] || 0;
    }

    /**
     * 골드 추가
     * @param {number} amount - 금액
     */
    addGold(amount) {
        this.gold += amount;
        this.triggerUpdate();
        console.log(`💰 +${amount} 골드 (총 ${this.gold}G)`);
    }

    /**
     * 골드 사용
     * @param {number} amount - 금액
     * @returns {boolean} 사용 성공 여부
     */
    spendGold(amount) {
        if (this.gold < amount) {
            console.log(`❌ 골드가 부족해요! (보유: ${this.gold}G, 필요: ${amount}G)`);
            return false;
        }

        this.gold -= amount;
        this.triggerUpdate();
        return true;
    }

    /**
     * UI 업데이트 트리거
     */
    triggerUpdate() {
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }

    /**
     * 인벤토리 요약
     */
    getSummary() {
        const seedTotal = Object.values(this.seeds).reduce((a, b) => a + b, 0);
        const cropTotal = Object.values(this.crops).reduce((a, b) => a + b, 0);

        return {
            gold: this.gold,
            seedTotal,
            cropTotal,
            seeds: { ...this.seeds },
            crops: { ...this.crops }
        };
    }

    /**
     * 저장
     */
    save() {
        const data = {
            gold: this.gold,
            seeds: this.seeds,
            crops: this.crops
        };
        localStorage.setItem('cozy_garden_inventory', JSON.stringify(data));
    }

    /**
     * 로드
     */
    load() {
        const saved = localStorage.getItem('cozy_garden_inventory');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.gold = data.gold ?? 100;
                this.seeds = { ...this.seeds, ...data.seeds };
                this.crops = { ...this.crops, ...data.crops };
                this.triggerUpdate();
                return true;
            } catch (e) {
                console.error('인벤토리 로드 실패:', e);
            }
        }
        return false;
    }
}

// 전역 내보내기
window.Inventory = Inventory;
