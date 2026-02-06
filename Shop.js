/**
 * 🏪 Shop.js - 상점 UI 및 거래 시스템
 * 
 * 핵심 기능:
 * - 씨앗 구매
 * - 작물 판매
 * - 모달 UI
 */

// 상점 아이템 가격표
const ShopPrices = {
    // 씨앗 구매 가격
    seeds: {
        tomato: { buy: 10, name: '토마토 씨앗', emoji: '🍅' },
        sunflower: { buy: 8, name: '해바라기 씨앗', emoji: '🌻' },
        tulip: { buy: 12, name: '튤립 씨앗', emoji: '🌷' },
        carrot: { buy: 6, name: '당근 씨앗', emoji: '🥕' },
        basil: { buy: 5, name: '바질 씨앗', emoji: '🌿' }
    },
    // 작물 판매 가격
    crops: {
        tomato: { sell: 25, name: '토마토', emoji: '🍅' },
        sunflower: { sell: 20, name: '해바라기', emoji: '🌻' },
        tulip: { sell: 30, name: '튤립', emoji: '🌷' },
        carrot: { sell: 15, name: '당근', emoji: '🥕' },
        basil: { sell: 12, name: '바질', emoji: '🌿' }
    }
};

/**
 * 상점 클래스
 */
class Shop {
    /**
     * @param {Inventory} inventory - 인벤토리 인스턴스
     */
    constructor(inventory) {
        this.inventory = inventory;
        this.isOpen = false;
        this.activeTab = 'buy';  // 'buy' or 'sell'

        // 모달 요소
        this.modalElement = null;

        // 구매/판매 콜백
        this.onTransaction = null;
    }

    /**
     * 상점 UI 생성
     */
    createShopUI() {
        // 이미 있으면 스킵
        if (document.getElementById('shop-modal')) {
            this.modalElement = document.getElementById('shop-modal');
            return;
        }

        // 모달 HTML 생성
        const modal = document.createElement('div');
        modal.id = 'shop-modal';
        modal.className = 'shop-modal hidden';
        modal.innerHTML = `
            <div class="shop-content">
                <div class="shop-header">
                    <h2>🏪 코지 상점</h2>
                    <button class="shop-close-btn" id="shop-close">✕</button>
                </div>
                
                <div class="shop-tabs">
                    <button class="shop-tab active" data-tab="buy">🛒 씨앗</button>
                    <button class="shop-tab" data-tab="tools">⛏️ 도구</button>
                    <button class="shop-tab" data-tab="sell">💰 판매</button>
                </div>
                
                <div class="shop-gold">
                    💰 보유 골드: <span id="shop-gold-display">${this.inventory.gold}</span>G
                </div>
                
                <div class="shop-items" id="shop-items-container">
                    <!-- 아이템들이 여기에 동적으로 추가됨 -->
                </div>
                
                <!-- 보상형 광고 버튼 -->
                <div class="shop-ad-section">
                    <button class="shop-ad-btn" id="shop-ad-btn" title="광고를 보고 기적의 비구름을 소환하세요!">
                        🎬 광고 보기 → ☁️ 기적의 비구름
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;

        // 이벤트 바인딩
        this.setupShopEvents();
        this.renderItems();
    }

    /**
     * 상점 이벤트 설정
     */
    setupShopEvents() {
        // 닫기 버튼
        document.getElementById('shop-close').addEventListener('click', () => {
            this.close();
        });

        // 탭 전환
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.renderItems();
            });
        });

        // 모달 외부 클릭 시 닫기
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });

        // 보상형 광고 버튼
        const adBtn = document.getElementById('shop-ad-btn');
        if (adBtn) {
            adBtn.addEventListener('click', () => {
                this.watchAd();
            });
        }
    }

    /**
     * 광고 시청 (보상형 광고 모킹)
     */
    watchAd() {
        // RainCloudSystem이 있으면 비구름 소환
        if (window.game && window.game.rainCloud) {
            window.game.rainCloud.rainCloud(window.game.garden);
            this.close();
        } else {
            console.log('🎬 Ad Watched - RainCloudSystem not initialized');
        }
    }

    /**
     * 아이템 목록 렌더링
     */
    renderItems() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.activeTab === 'buy') {
            // 씨앗 구매
            for (const [type, info] of Object.entries(ShopPrices.seeds)) {
                const item = this.createItemElement(type, info, 'buy');
                container.appendChild(item);
            }
        } else if (this.activeTab === 'tools') {
            // 도구 구매
            this.renderToolsTab(container);
        } else {
            // 작물 판매
            let hasItems = false;
            const market = MarketSystem.getInstance();

            for (const [type, info] of Object.entries(ShopPrices.crops)) {
                const count = this.inventory.getCropCount(type);
                if (count > 0) {
                    const isTrending = market.isTrending(type);
                    const item = this.createItemElement(type, info, 'sell', count, isTrending);
                    container.appendChild(item);
                    hasItems = true;
                }
            }

            // 일괄 판매 버튼
            if (hasItems) {
                const sellAllDiv = document.createElement('div');
                sellAllDiv.className = 'shop-sell-all';
                sellAllDiv.innerHTML = `
                    <button class="shop-sell-all-btn" id="shop-sell-all-btn">
                        💰 모두 판매
                    </button>
                `;
                container.appendChild(sellAllDiv);

                document.getElementById('shop-sell-all-btn').addEventListener('click', () => {
                    this.sellAllCrops();
                });
            }

            // 판매할 작물이 없을 때
            if (!hasItems) {
                container.innerHTML = '<p class="shop-empty">판매할 작물이 없어요 🌱</p>';
            }
        }
    }

    /**
     * 도구 탭 렌더링 (V2.0)
     */
    renderToolsTab(container) {
        const obstacles = ObstacleManager.getInstance();
        const hasPickaxe = obstacles.hasPickaxe;

        const toolDiv = document.createElement('div');
        toolDiv.className = 'shop-item tool-item';

        if (hasPickaxe) {
            toolDiv.innerHTML = `
                <span class="shop-item-icon">⛏️</span>
                <span class="shop-item-name">곱괭이</span>
                <span class="shop-item-owned">✅ 보유 중</span>
            `;
        } else {
            toolDiv.innerHTML = `
                <span class="shop-item-icon">⛏️</span>
                <span class="shop-item-name">곱괭이</span>
                <span class="shop-item-desc">대형 바위를 깨요</span>
                <button class="shop-buy-btn" id="buy-pickaxe-btn">
                    구매 100,000G
                </button>
            `;

            setTimeout(() => {
                const btn = document.getElementById('buy-pickaxe-btn');
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (obstacles.buyPickaxe(this.inventory)) {
                            this.updateGoldDisplay();
                            this.renderItems();
                        }
                    });
                }
            }, 0);
        }

        container.appendChild(toolDiv);

        // 도구 설명
        const infoDiv = document.createElement('div');
        infoDiv.className = 'shop-tool-info';
        infoDiv.innerHTML = `
            <p style="color: #888; font-size: 0.85rem; margin-top: 16px;">
                🪨 바위는 5~10칸 크기로 나타나며, 곱괭이로 1칸씩 깨야 해요.
            </p>
        `;
        container.appendChild(infoDiv);
    }

    /**
     * 아이템 요소 생성
     * @param {boolean} isTrending - 인기 아이템 여부
     */
    createItemElement(type, info, mode, count = 0, isTrending = false) {
        const div = document.createElement('div');
        div.className = 'shop-item' + (isTrending ? ' trending' : '');

        // 동적 시세 적용
        const market = MarketSystem.getInstance();
        const price = mode === 'buy' ? info.buy : market.getPrice(type, 'sell');
        const basePrice = mode === 'buy' ? info.buy : info.sell;

        const trendingIcon = (isTrending && mode === 'sell') ? '🔥 ' : '';
        const buttonText = mode === 'buy'
            ? `구매 ${price}G`
            : `판매 ${price}G`;
        const buttonClass = mode === 'buy' ? 'shop-buy-btn' : 'shop-sell-btn';

        div.innerHTML = `
            <span class="shop-item-icon">${info.emoji}</span>
            <span class="shop-item-name">${trendingIcon}${info.name}</span>
            ${mode === 'sell' ? `<span class="shop-item-count">×${count}</span>` : ''}
            <button class="${buttonClass}" data-type="${type}" data-mode="${mode}">
                ${buttonText}
            </button>
        `;

        // 버튼 이벤트 (Shift+클릭 = 전체 수량)
        div.querySelector('button').addEventListener('click', (e) => {
            const sellAll = e.shiftKey;  // Shift 키 참고
            if (mode === 'buy') {
                this.buySeed(type, sellAll ? 10 : 1);
            } else {
                this.sellCrop(type, sellAll ? count : 1);
            }
        });

        return div;
    }

    /**
     * 씨앗 구매
     * @param {number} amount - 구매 수량
     */
    buySeed(type, amount = 1) {
        const price = ShopPrices.seeds[type].buy * amount;

        if (this.inventory.spendGold(price)) {
            this.inventory.addSeeds(type, amount);
            this.updateGoldDisplay();

            if (this.onTransaction) {
                this.onTransaction('buy', type, price);
            }

            console.log(`🛒 ${ShopPrices.seeds[type].name} ${amount}개 구매 완료!`);
        }
    }

    /**
     * 작물 판매
     * @param {number} amount - 판매 수량
     */
    sellCrop(type, amount = 1) {
        const count = this.inventory.getCropCount(type);
        if (count <= 0) {
            console.log('❌ 판매할 작물이 없어요!');
            return;
        }

        const actualAmount = Math.min(amount, count);
        const market = MarketSystem.getInstance();
        const price = market.getPrice(type, 'sell') * actualAmount;

        // 작물 제거
        this.inventory.crops[type] -= actualAmount;
        // 골드 추가
        this.inventory.addGold(price);

        this.updateGoldDisplay();
        this.renderItems();  // 목록 갱신

        if (this.onTransaction) {
            this.onTransaction('sell', type, price);
        }

        const trendingText = market.isTrending(type) ? ' 🔥인기!' : '';
        console.log(`💰 ${ShopPrices.crops[type].name} ${actualAmount}개 판매! +${price}G${trendingText}`);
    }

    /**
     * 모든 작물 판매
     */
    sellAllCrops() {
        let totalGold = 0;
        let totalItems = 0;
        const market = MarketSystem.getInstance();

        for (const [type, count] of Object.entries(this.inventory.crops)) {
            if (count > 0) {
                const price = market.getPrice(type, 'sell') * count;
                totalGold += price;
                totalItems += count;
                this.inventory.crops[type] = 0;
            }
        }

        if (totalItems > 0) {
            this.inventory.addGold(totalGold);
            this.updateGoldDisplay();
            this.renderItems();
            console.log(`💰 ${totalItems}개 작물 일괄 판매! +${totalGold}G`);
            ToastSystem.show(`💰 ${totalItems}개 판매 완료! +${totalGold}G`, 2500, 'success');
        }
    }

    /**
     * 골드 표시 업데이트
     */
    updateGoldDisplay() {
        const display = document.getElementById('shop-gold-display');
        if (display) {
            display.textContent = this.inventory.gold;
        }

        // HUD 골드도 업데이트
        const hudGold = document.getElementById('gold-display');
        if (hudGold) {
            hudGold.textContent = this.inventory.gold;
        }
    }

    /**
     * 상점 열기
     */
    open() {
        if (!this.modalElement) {
            this.createShopUI();
        }

        this.isOpen = true;
        this.modalElement.classList.remove('hidden');
        this.updateGoldDisplay();
        this.renderItems();
    }

    /**
     * 상점 닫기
     */
    close() {
        this.isOpen = false;
        if (this.modalElement) {
            this.modalElement.classList.add('hidden');
        }
    }

    /**
     * 토글
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * 특정 탭으로 상점 열기 (V3.0)
     * @param {string} tabName - 'buy' 또는 'sell'
     */
    openWithTab(tabName = 'sell') {
        this.open();
        this.activeTab = tabName;

        // 탭 UI 업데이트
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        this.renderItems();
    }
}


// 전역 내보내기
window.Shop = Shop;
window.ShopPrices = ShopPrices;
