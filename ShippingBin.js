/**
 * 📦 ShippingBin.js - 배송 상자 시스템
 * 
 * 핵심 기능:
 * - 작물을 배송 상자에 넣기
 * - 다음 날 아침(06:00)에 정산
 * - 반복 클릭 없이 일괄 판매
 */

/**
 * 배송 상자 클래스
 * 정원 입구 근처에 배치되어 작물을 수집하고 정산합니다.
 */
class ShippingBin {
    /**
     * @param {number} gridX - 배치 X 좌표
     * @param {number} gridY - 배치 Y 좌표
     */
    constructor(gridX = 1, gridY = 1) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.pixelX = gridX * 32;
        this.pixelY = gridY * 32;

        // 상자 내용물
        this.contents = {};

        // UI 상태
        this.isOpen = false;
        this.modalElement = null;

        // 콜백
        this.onSettle = null;  // 정산 시 호출

        // 저장 데이터 로드
        this.load();
    }

    /**
     * 작물 추가
     * @param {string} cropType - 작물 타입
     * @param {number} amount - 수량
     */
    addCrop(cropType, amount = 1) {
        if (!this.contents[cropType]) {
            this.contents[cropType] = 0;
        }
        this.contents[cropType] += amount;
        this.save();
        console.log(`📦 ${PlantTypes[cropType]?.name || cropType} ${amount}개를 상자에 넣었어요!`);
    }

    /**
     * 모든 판매 가능 작물 넣기
     * @param {Inventory} inventory - 인벤토리 인스턴스
     * @returns {number} 이동된 아이템 수
     */
    depositAllSellables(inventory) {
        let totalMoved = 0;

        for (const [cropType, count] of Object.entries(inventory.crops)) {
            if (count > 0) {
                this.addCrop(cropType, count);
                inventory.crops[cropType] = 0;
                totalMoved += count;
            }
        }

        if (totalMoved > 0) {
            inventory.triggerUpdate();
            console.log(`📦 ${totalMoved}개의 작물을 배송 상자에 넣었어요!`);
        }

        return totalMoved;
    }

    /**
     * 상자 총액 계산
     * @returns {number} 총 판매 금액
     */
    calculateTotal() {
        let total = 0;

        // MarketSystem이 있으면 동적 시세 적용
        const market = window.MarketSystem?.getInstance?.();

        for (const [cropType, count] of Object.entries(this.contents)) {
            const basePrice = ShopPrices.crops[cropType]?.sell || 10;
            let price = basePrice;

            // 인기 아이템이면 1.5배
            if (market && market.isTrending(cropType)) {
                price = Math.floor(basePrice * market.priceMultiplier);
            }

            // 도감 마스터리 보너스 적용
            const journal = window.PlantJournal?.getInstance?.();
            if (journal) {
                price = Math.floor(price * journal.getSellMultiplier(cropType));
            }

            total += price * count;
        }

        return total;
    }

    /**
     * 정산 실행
     * @param {Inventory} inventory - 인벤토리 인스턴스
     * @returns {number} 정산 금액
     */
    settle(inventory) {
        const total = this.calculateTotal();

        if (total > 0) {
            inventory.addGold(total);

            // 정산 내역 로그
            console.log(`💰 어제 배송 수익: +${total}G`);
            for (const [cropType, count] of Object.entries(this.contents)) {
                if (count > 0) {
                    console.log(`   - ${PlantTypes[cropType]?.name}: ${count}개`);
                }
            }

            // 콜백 호출
            if (this.onSettle) {
                this.onSettle(total, { ...this.contents });
            }

            // 상자 비우기
            this.contents = {};
            this.save();
        }

        return total;
    }

    /**
     * 상자에 아이템이 있는지 확인
     */
    hasItems() {
        return Object.values(this.contents).some(count => count > 0);
    }

    /**
     * UI 생성
     */
    createUI() {
        if (document.getElementById('shipping-bin-modal')) {
            this.modalElement = document.getElementById('shipping-bin-modal');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'shipping-bin-modal';
        modal.className = 'shipping-bin-modal hidden';
        modal.innerHTML = `
            <div class="shipping-bin-content">
                <div class="shipping-bin-header">
                    <h2>📦 배송 상자</h2>
                    <button class="shipping-bin-close-btn" id="shipping-bin-close">✕</button>
                </div>
                
                <div class="shipping-bin-info">
                    내일 아침 6시에 정산됩니다!
                </div>
                
                <div class="shipping-bin-items" id="shipping-bin-items">
                    <!-- 상자 내용물 -->
                </div>
                
                <div class="shipping-bin-total">
                    예상 수익: <span id="shipping-bin-total">0</span>G
                </div>
                
                <div class="shipping-bin-actions">
                    <button class="shipping-btn-deposit" id="shipping-deposit-all">
                        📥 모두 넣기
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;

        // 이벤트 바인딩
        this.setupEvents();
    }

    /**
     * 이벤트 설정
     */
    setupEvents() {
        document.getElementById('shipping-bin-close').addEventListener('click', () => {
            this.close();
        });

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
    }

    /**
     * UI 렌더링
     * @param {Inventory} inventory - 인벤토리 인스턴스
     */
    renderUI(inventory) {
        const itemsContainer = document.getElementById('shipping-bin-items');
        const totalDisplay = document.getElementById('shipping-bin-total');
        const depositBtn = document.getElementById('shipping-deposit-all');

        if (!itemsContainer) return;

        // 상자 내용물 렌더링
        let itemsHTML = '';

        for (const [cropType, count] of Object.entries(this.contents)) {
            if (count > 0) {
                const info = PlantTypes[cropType];
                itemsHTML += `
                    <div class="shipping-bin-item">
                        <span class="shipping-item-icon">${info?.emoji || '🌱'}</span>
                        <span class="shipping-item-name">${info?.name || cropType}</span>
                        <span class="shipping-item-count">×${count}</span>
                    </div>
                `;
            }
        }

        if (itemsHTML === '') {
            itemsHTML = '<div class="shipping-bin-empty">상자가 비어있어요</div>';
        }

        itemsContainer.innerHTML = itemsHTML;
        totalDisplay.textContent = this.calculateTotal();

        // 모두 넣기 버튼 업데이트
        depositBtn.onclick = () => {
            const moved = this.depositAllSellables(inventory);
            if (moved > 0) {
                this.renderUI(inventory);
                // 토스트 메시지
                ToastSystem.show(`📦 ${moved}개의 작물을 상자에 넣었어요!`, 2000, 'success');
            } else {
                ToastSystem.show('넣을 작물이 없어요!', 2000, 'info');
            }
        };
    }

    /**
     * UI 열기
     */
    open(inventory) {
        if (!this.modalElement) {
            this.createUI();
        }

        this.isOpen = true;
        this.modalElement.classList.remove('hidden');
        this.renderUI(inventory);
    }

    /**
     * UI 닫기
     */
    close() {
        this.isOpen = false;
        if (this.modalElement) {
            this.modalElement.classList.add('hidden');
        }
    }

    /**
     * 정원에 렌더링
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const x = this.pixelX;
        const y = this.pixelY;

        // 상자 배경
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 2, y + 8, 28, 20);

        // 상자 앞면
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(x + 2, y + 16, 28, 14);

        // 상자 테두리
        ctx.strokeStyle = '#5D4E37';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 8, 28, 22);

        // 상자 아이콘
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.fillText('📦', x + 16, y + 28);

        // 아이템이 있으면 표시
        if (this.hasItems()) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x + 26, y + 10, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5D4E37';
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText('!', x + 26, y + 13);
        }
    }

    /**
     * 충돌 체크 (상호작용 가능 여부)
     */
    isNear(gridX, gridY) {
        const dx = Math.abs(gridX - this.gridX);
        const dy = Math.abs(gridY - this.gridY);
        return dx <= 1 && dy <= 1;
    }

    /**
     * 저장
     */
    save() {
        localStorage.setItem('cozy_garden_shipping_bin', JSON.stringify(this.contents));
    }

    /**
     * 로드
     */
    load() {
        const saved = localStorage.getItem('cozy_garden_shipping_bin');
        if (saved) {
            try {
                this.contents = JSON.parse(saved);
            } catch (e) {
                console.error('배송 상자 로드 실패:', e);
            }
        }
    }
}

// 전역 내보내기
window.ShippingBin = ShippingBin;
