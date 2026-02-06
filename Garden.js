/**
 * 🌻 Garden.js - 정원 관리 및 퍼머컬처 시스템
 * 
 * 핵심 기능:
 * - 그리드 기반 식물 배치
 * - 이웃 식물 감지 및 보너스 계산 (Moore Neighborhood)
 * - 콤패니언 플랜팅 상호작용
 */

/**
 * 정원 클래스
 * 모든 식물을 관리하고 이웃 보너스를 계산합니다.
 */
class Garden {
    /**
     * @param {number} gridWidth - 그리드 가로 셀 수
     * @param {number} gridHeight - 그리드 세로 셀 수
     */
    constructor(gridWidth = 25, gridHeight = 17) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.cellSize = 32;

        // 2D 그리드 배열 (null = 빈 칸)
        this.grid = [];
        for (let y = 0; y < gridHeight; y++) {
            this.grid[y] = new Array(gridWidth).fill(null);
        }

        // 식물 목록 (빠른 순회용)
        this.plants = [];

        // 장식품 목록 (자유 배치)
        this.decorations = [];

        // 통계
        this.stats = {
            totalPlants: 0,
            fullyGrown: 0,
            totalWaterGiven: 0
        };
    }

    /**
     * 그리드 좌표가 유효한지 확인
     */
    isValidCell(gridX, gridY) {
        return gridX >= 0 && gridX < this.gridWidth &&
            gridY >= 0 && gridY < this.gridHeight;
    }

    /**
     * 특정 셀이 비어있는지 확인
     */
    isCellEmpty(gridX, gridY) {
        if (!this.isValidCell(gridX, gridY)) return false;
        return this.grid[gridY][gridX] === null;
    }

    /**
     * 픽셀 좌표를 그리드 좌표로 변환
     */
    pixelToGrid(pixelX, pixelY) {
        return {
            x: Math.floor(pixelX / this.cellSize),
            y: Math.floor(pixelY / this.cellSize)
        };
    }

    /**
     * 그리드 좌표를 픽셀 좌표로 변환
     */
    gridToPixel(gridX, gridY) {
        return {
            x: gridX * this.cellSize,
            y: gridY * this.cellSize
        };
    }

    /**
     * 식물 심기
     * @param {string} plantType - 식물 타입
     * @param {number} gridX - 그리드 X 좌표
     * @param {number} gridY - 그리드 Y 좌표
     * @returns {Plant|null} 심은 식물 또는 null
     */
    plantSeed(plantType, gridX, gridY) {
        // 유효성 검사
        if (!this.isValidCell(gridX, gridY)) {
            console.log('❌ 유효하지 않은 위치입니다.');
            return null;
        }

        if (!this.isCellEmpty(gridX, gridY)) {
            console.log('❌ 이미 식물이 있는 곳이에요.');
            return null;
        }

        if (!PlantTypes[plantType]) {
            console.log('❌ 알 수 없는 식물 타입입니다.');
            return null;
        }

        // 식물 생성
        const plant = new Plant(plantType, gridX, gridY);

        // 그리드에 배치
        this.grid[gridY][gridX] = plant;
        this.plants.push(plant);

        // 통계 업데이트
        this.stats.totalPlants++;

        console.log(`🌱 ${plant.typeInfo.name}을(를) 심었어요! (${gridX}, ${gridY})`);

        // 모든 이웃 보너스 재계산
        this.recalculateAllNeighborBonuses();

        return plant;
    }

    /**
     * 특정 위치의 식물 가져오기
     */
    getPlantAt(gridX, gridY) {
        if (!this.isValidCell(gridX, gridY)) return null;
        return this.grid[gridY][gridX];
    }

    /**
     * 특정 위치의 식물 제거 (수확 시 사용)
     * @param {number} gridX - 그리드 X 좌표
     * @param {number} gridY - 그리드 Y 좌표
     * @returns {Plant|null} 제거된 식물 또는 null
     */
    removePlant(gridX, gridY) {
        if (!this.isValidCell(gridX, gridY)) return null;

        const plant = this.grid[gridY][gridX];
        if (!plant) return null;

        // 그리드에서 제거
        this.grid[gridY][gridX] = null;

        // 배열에서 제거
        const index = this.plants.indexOf(plant);
        if (index > -1) {
            this.plants.splice(index, 1);
        }

        // 이웃 보너스 재계산
        this.recalculateAllNeighborBonuses();

        console.log(`🌾 ${plant.typeInfo.name} 제거됨`);

        return plant;
    }

    /**
     * 특정 위치의 식물에 물주기
     * @returns {boolean} 물을 줬는지 여부
     */
    waterPlantAt(gridX, gridY) {
        const plant = this.getPlantAt(gridX, gridY);
        if (!plant) {
            console.log('💧 여기에는 식물이 없어요.');
            return false;
        }

        const watered = plant.water();
        if (watered) {
            this.stats.totalWaterGiven++;
        }
        return watered;
    }

    /**
     * 이웃 식물 가져오기 (Moore Neighborhood - 8방향)
     * @param {number} gridX - 중심 X 좌표
     * @param {number} gridY - 중심 Y 좌표
     * @returns {Plant[]} 이웃 식물 배열
     */
    getNeighbors(gridX, gridY) {
        const neighbors = [];

        // 8방향 오프셋
        const offsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0], [1, 0],
            [-1, 1], [0, 1], [1, 1]
        ];

        for (const [dx, dy] of offsets) {
            const nx = gridX + dx;
            const ny = gridY + dy;

            if (this.isValidCell(nx, ny) && this.grid[ny][nx]) {
                neighbors.push(this.grid[ny][nx]);
            }
        }

        return neighbors;
    }

    /**
     * 특정 식물의 이웃 보너스 계산
     * @param {Plant} plant - 대상 식물
     * @returns {number} 이웃 보너스 값
     */
    calculateNeighborBonus(plant) {
        const neighbors = this.getNeighbors(plant.gridX, plant.gridY);
        let bonus = 0;

        for (const neighbor of neighbors) {
            // 콤패니언 플랜팅 체크
            const companions = plant.typeInfo.companions;

            if (companions.includes('*') || companions.includes(neighbor.type)) {
                // 콤패니언이면 보너스 +1
                bonus++;
            } else if (neighbor.typeInfo.companions.includes(plant.type) ||
                neighbor.typeInfo.companions.includes('*')) {
                // 상대방이 나를 콤패니언으로 여기면 보너스 +1
                bonus++;
            }
        }

        return bonus;
    }

    /**
     * 특정 식물 타입을 심을 때 이웃 보너스가 있는 위치 추천
     * (퍼머컬처 시각화용)
     * @param {string} plantType - 심으려는 식물 타입
     * @returns {Array} 보너스가 있는 위치 배열 [{x, y, bonus}]
     */
    getRecommendedPositions(plantType) {
        const recommendations = [];
        const typeInfo = PlantTypes[plantType];

        if (!typeInfo) return recommendations;

        // 모든 빈 셀을 순회하며 보너스 계산
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (!this.isCellEmpty(x, y)) continue;

                // 이 위치에 심었을 때의 잠재적 보너스 계산
                const neighbors = this.getNeighbors(x, y);
                let bonus = 0;

                for (const neighbor of neighbors) {
                    const companions = typeInfo.companions;

                    // 내가 이웃을 콤패니언으로 여기는 경우
                    if (companions.includes('*') || companions.includes(neighbor.type)) {
                        bonus++;
                    }
                    // 이웃이 나를 콤패니언으로 여기는 경우
                    else if (neighbor.typeInfo.companions.includes(plantType) ||
                        neighbor.typeInfo.companions.includes('*')) {
                        bonus++;
                    }
                }

                if (bonus > 0) {
                    recommendations.push({ x, y, bonus });
                }
            }
        }

        return recommendations;
    }

    /**
     * 모든 식물의 이웃 보너스 재계산
     */
    recalculateAllNeighborBonuses() {
        for (const plant of this.plants) {
            const bonus = this.calculateNeighborBonus(plant);
            plant.setNeighborBonus(bonus);
        }
    }

    /**
     * 매 프레임 업데이트
     * @param {number} deltaTime - 이전 프레임과의 시간 차이 (초)
     */
    update(deltaTime) {
        let fullyGrownCount = 0;

        for (const plant of this.plants) {
            plant.update(deltaTime);

            if (plant.isFullyGrown) {
                fullyGrownCount++;
            }
        }

        this.stats.fullyGrown = fullyGrownCount;
    }

    /**
     * 정원 렌더링
     * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
     */
    render(ctx) {
        // 그리드 라인 (반투명)
        ctx.strokeStyle = 'rgba(139, 115, 85, 0.15)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, this.gridHeight * this.cellSize);
            ctx.stroke();
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(this.gridWidth * this.cellSize, y * this.cellSize);
            ctx.stroke();
        }

        // 모든 식물 렌더링
        for (const plant of this.plants) {
            plant.render(ctx);
        }
    }

    /**
     * 콤패니언 플랜팅 도우미 - 추천 위치 찾기
     * @param {string} plantType - 심으려는 식물 타입
     * @returns {Array} 추천 위치 배열 [{x, y, bonus}]
     */
    getRecommendedPositions(plantType) {
        const recommendations = [];
        const typeInfo = PlantTypes[plantType];

        if (!typeInfo) return recommendations;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (!this.isCellEmpty(x, y)) continue;

                const neighbors = this.getNeighbors(x, y);
                let potentialBonus = 0;

                for (const neighbor of neighbors) {
                    if (typeInfo.companions.includes('*') ||
                        typeInfo.companions.includes(neighbor.type)) {
                        potentialBonus++;
                    }
                }

                if (potentialBonus > 0) {
                    recommendations.push({ x, y, bonus: potentialBonus });
                }
            }
        }

        // 보너스 높은 순으로 정렬
        recommendations.sort((a, b) => b.bonus - a.bonus);

        return recommendations;
    }

    /**
     * 정원 상태 요약
     */
    getSummary() {
        return {
            totalPlants: this.stats.totalPlants,
            fullyGrown: this.stats.fullyGrown,
            waterGiven: this.stats.totalWaterGiven,
            gridSize: `${this.gridWidth}x${this.gridHeight}`,
            occupancy: `${this.plants.length}/${this.gridWidth * this.gridHeight}`
        };
    }

    /**
     * 정원 저장 (로컬 스토리지)
     */
    save() {
        const data = {
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            plants: this.plants.map(p => p.toJSON()),
            stats: this.stats
        };

        localStorage.setItem('cozy_garden_save', JSON.stringify(data));
        console.log('💾 정원이 저장되었어요!');
    }

    /**
     * 정원 불러오기
     */
    load() {
        const savedData = localStorage.getItem('cozy_garden_save');
        if (!savedData) {
            console.log('📂 저장된 정원이 없어요.');
            return false;
        }

        try {
            const data = JSON.parse(savedData);

            // 그리드 초기화
            this.gridWidth = data.gridWidth;
            this.gridHeight = data.gridHeight;
            this.grid = [];
            for (let y = 0; y < this.gridHeight; y++) {
                this.grid[y] = new Array(this.gridWidth).fill(null);
            }
            this.plants = [];

            // 식물 복원
            for (const plantData of data.plants) {
                const plant = Plant.fromJSON(plantData);
                this.grid[plant.gridY][plant.gridX] = plant;
                this.plants.push(plant);
            }

            // 통계 복원
            this.stats = data.stats;

            // 이웃 보너스 재계산
            this.recalculateAllNeighborBonuses();

            console.log('📂 정원을 불러왔어요!');
            return true;
        } catch (e) {
            console.error('❌ 저장 데이터 로드 실패:', e);
            return false;
        }
    }
}

// 전역 내보내기
window.Garden = Garden;
