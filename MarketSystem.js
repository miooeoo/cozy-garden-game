/**
 * 📈 MarketSystem.js - 동적 시세 시스템
 * 
 * 핵심 기능:
 * - 매일 무작위 인기 아이템 선정
 * - 인기 아이템 1.5배 가격
 * - 상점 UI에 🔥 아이콘 표시
 */

/**
 * 시장 시스템 (싱글톤)
 */
class MarketSystem {
    static instance = null;

    static getInstance() {
        if (!MarketSystem.instance) {
            MarketSystem.instance = new MarketSystem();
        }
        return MarketSystem.instance;
    }

    constructor() {
        if (MarketSystem.instance) {
            return MarketSystem.instance;
        }

        // 오늘의 인기 아이템
        this.trendingItem = null;

        // 가격 배율
        this.priceMultiplier = 1.5;

        // 마지막 업데이트 날짜 (게임 내 시간)
        this.lastUpdateDay = -1;

        // 가능한 인기 아이템 목록
        this.possibleItems = ['tomato', 'sunflower', 'tulip', 'carrot', 'basil'];

        // 저장 데이터 로드
        this.load();

        MarketSystem.instance = this;
    }

    /**
     * 게임 내 하루 업데이트 (06:00 AM에 호출)
     * @param {number} gameDay - 현재 게임 일차
     */
    updateDay(gameDay) {
        if (gameDay !== this.lastUpdateDay) {
            this.lastUpdateDay = gameDay;
            this.selectNewTrendingItem();
            this.save();
        }
    }

    /**
     * 새로운 인기 아이템 선정
     */
    selectNewTrendingItem() {
        const previousItem = this.trendingItem;

        // 이전과 다른 아이템 선정
        let attempts = 0;
        do {
            const index = Math.floor(Math.random() * this.possibleItems.length);
            this.trendingItem = this.possibleItems[index];
            attempts++;
        } while (this.trendingItem === previousItem && attempts < 10);

        const itemInfo = PlantTypes[this.trendingItem];
        console.log(`📈 오늘의 인기 상품: ${itemInfo?.emoji || ''} ${itemInfo?.name || this.trendingItem} (1.5배 가격!)`);
    }

    /**
     * 인기 아이템 여부 확인
     * @param {string} itemType - 아이템 타입
     * @returns {boolean}
     */
    isTrending(itemType) {
        return itemType === this.trendingItem;
    }

    /**
     * 아이템 가격 가져오기 (시세 반영)
     * @param {string} itemType - 아이템 타입
     * @param {string} priceType - 'buy' 또는 'sell'
     * @returns {number} 최종 가격
     */
    getPrice(itemType, priceType = 'sell') {
        let basePrice;

        if (priceType === 'buy') {
            basePrice = ShopPrices.seeds[itemType]?.buy || 10;
        } else {
            basePrice = ShopPrices.crops[itemType]?.sell || 10;
        }

        // 인기 아이템 배율 적용 (판매 시에만)
        if (priceType === 'sell' && this.isTrending(itemType)) {
            basePrice = Math.floor(basePrice * this.priceMultiplier);
        }

        // 도감 마스터리 보너스 (판매 시에만)
        if (priceType === 'sell') {
            const journal = window.PlantJournal?.getInstance?.();
            if (journal) {
                basePrice = Math.floor(basePrice * journal.getSellMultiplier(itemType));
            }
        }

        return basePrice;
    }

    /**
     * 오늘의 인기 아이템 정보
     * @returns {Object} { type, name, emoji, multiplier }
     */
    getTrendingInfo() {
        if (!this.trendingItem) return null;

        const info = PlantTypes[this.trendingItem];
        return {
            type: this.trendingItem,
            name: info?.name || this.trendingItem,
            emoji: info?.emoji || '🌱',
            multiplier: this.priceMultiplier
        };
    }

    /**
     * 저장
     */
    save() {
        const data = {
            trendingItem: this.trendingItem,
            lastUpdateDay: this.lastUpdateDay
        };
        localStorage.setItem('cozy_garden_market', JSON.stringify(data));
    }

    /**
     * 로드
     */
    load() {
        const saved = localStorage.getItem('cozy_garden_market');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.trendingItem = data.trendingItem;
                this.lastUpdateDay = data.lastUpdateDay ?? -1;
            } catch (e) {
                console.error('마켓 시스템 로드 실패:', e);
            }
        }

        // 첫 시작이면 인기 아이템 선정
        if (!this.trendingItem) {
            this.selectNewTrendingItem();
        }
    }
}

// 전역 내보내기
window.MarketSystem = MarketSystem;
