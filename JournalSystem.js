/**
 * 📖 JournalSystem.js - 식물 도감 및 마스터리 시스템
 * 
 * 핵심 기능:
 * - 수확한 작물의 종류와 수량을 기록
 * - 마스터리 레벨에 따른 보너스 적용
 * - RPG식 진행 시스템 (Progression System)
 */

// ============ 마스터리 레벨 정의 ============
const MasteryLevels = {
    0: { threshold: 0, sellBonus: 1.0, growthBonus: 1.0, mutationBonus: 1.0, description: '초보 농부' },
    1: { threshold: 10, sellBonus: 1.1, growthBonus: 1.0, mutationBonus: 1.0, description: '이 식물의 가치를 알게 되었습니다.' },
    2: { threshold: 50, sellBonus: 1.1, growthBonus: 1.2, mutationBonus: 1.0, description: '더 효율적으로 키우는 법을 깨달았습니다.' },
    3: { threshold: 100, sellBonus: 1.1, growthBonus: 1.2, mutationBonus: 2.0, description: '🌟 마스터 농부! 황금 테두리 획득!' }
};

/**
 * 식물 도감 (싱글톤)
 * 플레이어의 수확 기록과 숙련도를 관리합니다.
 */
class PlantJournal {
    static instance = null;

    /**
     * 싱글톤 인스턴스 가져오기
     */
    static getInstance() {
        if (!PlantJournal.instance) {
            PlantJournal.instance = new PlantJournal();
        }
        return PlantJournal.instance;
    }

    constructor() {
        if (PlantJournal.instance) {
            return PlantJournal.instance;
        }

        // 도감 데이터 (Map 사용)
        this.entries = new Map();

        // UI 상태
        this.isOpen = false;
        this.modalElement = null;

        // 콜백
        this.onMasteryUp = null;  // 마스터리 레벨업 시 호출

        // 저장 데이터 로드
        this.load();

        PlantJournal.instance = this;
    }

    /**
     * 식물 항목 가져오기 (없으면 생성)
     * @param {string} plantId - 식물 타입 ID
     * @returns {Object} 도감 항목
     */
    getEntry(plantId) {
        if (!this.entries.has(plantId)) {
            this.entries.set(plantId, {
                timesHarvested: 0,
                masteryLevel: 0,
                firstDiscovered: null,
                lastHarvested: null
            });
        }
        return this.entries.get(plantId);
    }

    /**
     * 수확 기록
     * @param {string} plantId - 식물 타입 ID
     * @param {number} amount - 수확량
     * @returns {Object|null} 레벨업 정보 (레벨업 시)
     */
    recordHarvest(plantId, amount = 1) {
        const entry = this.getEntry(plantId);

        // 최초 발견 기록
        if (!entry.firstDiscovered) {
            entry.firstDiscovered = new Date().toISOString();
            console.log(`📖 도감에 ${PlantTypes[plantId]?.name || plantId}이(가) 등록되었습니다!`);
        }

        // 수확 기록 업데이트
        entry.timesHarvested += amount;
        entry.lastHarvested = new Date().toISOString();

        // 마스터리 레벨 체크
        const levelUpResult = this.checkMastery(plantId);

        // 자동 저장
        this.save();

        return levelUpResult;
    }

    /**
     * 마스터리 레벨 체크 및 업데이트
     * @param {string} plantId - 식물 타입 ID
     * @returns {Object|null} 레벨업 정보
     */
    checkMastery(plantId) {
        const entry = this.getEntry(plantId);
        const currentLevel = entry.masteryLevel;

        // 다음 레벨 확인
        for (let level = 3; level >= 0; level--) {
            if (entry.timesHarvested >= MasteryLevels[level].threshold) {
                if (level > currentLevel) {
                    // 레벨업!
                    entry.masteryLevel = level;
                    const levelInfo = MasteryLevels[level];

                    console.log(`🎉 ${PlantTypes[plantId]?.name || plantId} 마스터리 레벨 ${level} 달성!`);
                    console.log(`   → ${levelInfo.description}`);

                    if (this.onMasteryUp) {
                        this.onMasteryUp(plantId, level, levelInfo);
                    }

                    return {
                        plantId,
                        newLevel: level,
                        info: levelInfo
                    };
                }
                break;
            }
        }

        return null;
    }

    /**
     * 현재 마스터리 레벨 가져오기
     * @param {string} plantId - 식물 타입 ID
     * @returns {number} 마스터리 레벨 (0-3)
     */
    getMasteryLevel(plantId) {
        return this.getEntry(plantId).masteryLevel;
    }

    /**
     * 판매가 배율 가져오기
     * @param {string} plantId - 식물 타입 ID
     * @returns {number} 판매가 배율
     */
    getSellMultiplier(plantId) {
        const level = this.getMasteryLevel(plantId);
        return MasteryLevels[level].sellBonus;
    }

    /**
     * 성장 속도 배율 가져오기
     * @param {string} plantId - 식물 타입 ID
     * @returns {number} 성장 속도 배율
     */
    getGrowthMultiplier(plantId) {
        const level = this.getMasteryLevel(plantId);
        return MasteryLevels[level].growthBonus;
    }

    /**
     * 변종 확률 배율 가져오기
     * @param {string} plantId - 식물 타입 ID
     * @returns {number} 변종 확률 배율
     */
    getMutationMultiplier(plantId) {
        const level = this.getMasteryLevel(plantId);
        return MasteryLevels[level].mutationBonus;
    }

    /**
     * 도감 UI 생성
     */
    createJournalUI() {
        if (document.getElementById('journal-modal')) {
            this.modalElement = document.getElementById('journal-modal');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'journal-modal';
        modal.className = 'journal-modal hidden';
        modal.innerHTML = `
            <div class="journal-content">
                <div class="journal-header">
                    <h2>📖 식물 도감</h2>
                    <button class="journal-close-btn" id="journal-close">✕</button>
                </div>
                
                <div class="journal-entries" id="journal-entries-container">
                    <!-- 도감 항목들이 동적으로 추가됨 -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;

        // 이벤트 바인딩
        document.getElementById('journal-close').addEventListener('click', () => {
            this.close();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });
    }

    /**
     * 도감 항목 렌더링
     */
    renderEntries() {
        const container = document.getElementById('journal-entries-container');
        if (!container) return;

        container.innerHTML = '';

        // 모든 식물 타입에 대해 렌더링
        for (const [plantId, typeInfo] of Object.entries(PlantTypes)) {
            const entry = this.getEntry(plantId);
            const levelInfo = MasteryLevels[entry.masteryLevel];
            const isMastered = entry.masteryLevel >= 3;

            const div = document.createElement('div');
            div.className = `journal-entry ${isMastered ? 'mastered' : ''} ${entry.timesHarvested === 0 ? 'undiscovered' : ''}`;

            div.innerHTML = `
                <div class="journal-entry-icon">${typeInfo.emoji}</div>
                <div class="journal-entry-info">
                    <div class="journal-entry-name">
                        ${typeInfo.name}
                        ${isMastered ? '🌟' : ''}
                    </div>
                    <div class="journal-entry-stats">
                        수확: ${entry.timesHarvested}회 | 레벨: ${entry.masteryLevel}/3
                    </div>
                    <div class="journal-entry-bonus">
                        ${levelInfo.description}
                    </div>
                    <div class="journal-entry-progress">
                        <div class="progress-bar" style="width: ${this.getProgressToNextLevel(plantId)}%"></div>
                    </div>
                </div>
            `;

            container.appendChild(div);
        }
    }

    /**
     * 다음 레벨까지의 진행도 계산
     * @param {string} plantId - 식물 타입 ID
     * @returns {number} 진행도 (0-100)
     */
    getProgressToNextLevel(plantId) {
        const entry = this.getEntry(plantId);
        const currentLevel = entry.masteryLevel;

        if (currentLevel >= 3) return 100;

        const currentThreshold = MasteryLevels[currentLevel].threshold;
        const nextThreshold = MasteryLevels[currentLevel + 1].threshold;
        const progress = (entry.timesHarvested - currentThreshold) / (nextThreshold - currentThreshold);

        return Math.min(100, Math.max(0, progress * 100));
    }

    /**
     * 도감 열기
     */
    open() {
        if (!this.modalElement) {
            this.createJournalUI();
        }

        this.isOpen = true;
        this.modalElement.classList.remove('hidden');
        this.renderEntries();
    }

    /**
     * 도감 닫기
     */
    close() {
        this.isOpen = false;
        if (this.modalElement) {
            this.modalElement.classList.add('hidden');
        }
    }

    /**
     * 도감 토글
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * 저장 (localStorage)
     */
    save() {
        const data = {};
        for (const [key, value] of this.entries) {
            data[key] = value;
        }
        localStorage.setItem('cozy_garden_journal', JSON.stringify(data));
    }

    /**
     * 로드 (localStorage)
     */
    load() {
        const saved = localStorage.getItem('cozy_garden_journal');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                for (const [key, value] of Object.entries(data)) {
                    this.entries.set(key, value);
                }
                console.log('📖 도감 데이터를 불러왔어요!');
            } catch (e) {
                console.error('도감 로드 실패:', e);
            }
        }
    }

    /**
     * 도감 요약
     */
    getSummary() {
        let totalHarvests = 0;
        let discoveredCount = 0;
        let masteredCount = 0;

        for (const entry of this.entries.values()) {
            totalHarvests += entry.timesHarvested;
            if (entry.timesHarvested > 0) discoveredCount++;
            if (entry.masteryLevel >= 3) masteredCount++;
        }

        return {
            totalHarvests,
            discoveredCount,
            masteredCount,
            totalPlantTypes: Object.keys(PlantTypes).length
        };
    }
}

// 전역 내보내기
window.PlantJournal = PlantJournal;
window.MasteryLevels = MasteryLevels;
