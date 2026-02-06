/**
 * 🪨 ObstacleManager.js - 대형 바위 시스템 (V2.0)
 * 
 * 핵심 변경:
 * - 바위 크기: 5-10칸 (불규칙 형태)
 * - 곡괭이 아이템 필요 (10만 골드)
 * - 한 번 클릭당 1칸씩 제거
 */

/**
 * 장애물 관리자 (싱글톤)
 */
class ObstacleManager {
    static instance = null;

    static getInstance() {
        if (!ObstacleManager.instance) {
            ObstacleManager.instance = new ObstacleManager();
        }
        return ObstacleManager.instance;
    }

    constructor() {
        if (ObstacleManager.instance) {
            return ObstacleManager.instance;
        }

        // 바위 클러스터 목록 [{id, tiles: [{x, y}], createdAt}]
        this.rockClusters = [];
        this.nextClusterId = 1;

        // 설정
        this.spawnInterval = 120000;     // 2분마다 스폰 체크
        this.spawnChance = 0.4;          // 40% 확률로 스폰
        this.maxClusters = 3;            // 최대 바위 클러스터 수
        this.minClusterSize = 2;         // 최소 2칸
        this.maxClusterSize = 4;         // 최대 4칸
        this.clusterLifetime = 300000;   // 5분 후 자동 소멸

        // 스폰 타이머
        this.lastSpawnCheck = Date.now();

        // 파티클 콜백
        this.onDustParticle = null;

        // 곡괭이 보유 여부
        this.hasPickaxe = false;

        ObstacleManager.instance = this;
    }

    /**
     * 곡괭이 구매
     */
    buyPickaxe(inventory) {
        const price = 1000;  // 1천 골드
        if (inventory.gold >= price) {
            inventory.spendGold(price);
            this.hasPickaxe = true;
            console.log('⛏️ 곡괭이를 구매했습니다!');
            ToastSystem.show('⛏️ 곡괭이 구매 완료! 이제 바위를 깰 수 있어요!', 3000, 'success');
            return true;
        } else {
            ToastSystem.show(`💰 골드가 부족해요! (필요: ${price.toLocaleString()}G)`, 2500, 'warning');
            return false;
        }
    }

    /**
     * 매 프레임 업데이트
     */
    update(deltaTime, garden) {
        const now = Date.now();

        // 스폰 체크
        if (now - this.lastSpawnCheck >= this.spawnInterval) {
            this.lastSpawnCheck = now;
            this.trySpawnRockCluster(garden);
        }

        // 수명 체크 (자동 소멸)
        for (let i = this.rockClusters.length - 1; i >= 0; i--) {
            const cluster = this.rockClusters[i];
            if (now - cluster.createdAt >= this.clusterLifetime) {
                this.removeCluster(i, true);
            }
        }
    }

    /**
     * 바위 클러스터 스폰 시도
     */
    trySpawnRockCluster(garden) {
        if (this.rockClusters.length >= this.maxClusters) return;
        if (Math.random() > this.spawnChance) return;

        // 빈 타일 찾기
        const emptyTiles = [];
        for (let y = 0; y < garden.gridHeight; y++) {
            for (let x = 0; x < garden.gridWidth; x++) {
                if (garden.isCellEmpty(x, y) && !this.hasRockAt(x, y)) {
                    // 시작 위치 근처 제외 & 가장자리 제외
                    if (!(x >= 10 && x <= 14 && y >= 6 && y <= 10) &&
                        x > 2 && x < garden.gridWidth - 3 && y > 2 && y < garden.gridHeight - 3) {
                        emptyTiles.push({ x, y });
                    }
                }
            }
        }

        if (emptyTiles.length < this.minClusterSize) return;

        // 시작 위치 선택
        const startTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];

        // 클러스터 크기 결정
        const clusterSize = this.minClusterSize +
            Math.floor(Math.random() * (this.maxClusterSize - this.minClusterSize + 1));

        // BFS로 인접 빈 타일 확장
        const clusterTiles = [];
        const visited = new Set();
        const queue = [startTile];
        visited.add(`${startTile.x},${startTile.y}`);

        while (queue.length > 0 && clusterTiles.length < clusterSize) {
            const tile = queue.shift();

            // 유효한 타일인지 확인
            if (garden.isCellEmpty(tile.x, tile.y) && !this.hasRockAt(tile.x, tile.y)) {
                clusterTiles.push({ x: tile.x, y: tile.y });

                // 인접 타일 추가 (4방향)
                const neighbors = [
                    { x: tile.x - 1, y: tile.y },
                    { x: tile.x + 1, y: tile.y },
                    { x: tile.x, y: tile.y - 1 },
                    { x: tile.x, y: tile.y + 1 }
                ];

                for (const neighbor of neighbors) {
                    const key = `${neighbor.x},${neighbor.y}`;
                    if (!visited.has(key) &&
                        neighbor.x >= 0 && neighbor.x < garden.gridWidth &&
                        neighbor.y >= 0 && neighbor.y < garden.gridHeight &&
                        garden.isCellEmpty(neighbor.x, neighbor.y) &&
                        !this.hasRockAt(neighbor.x, neighbor.y) &&
                        Math.random() > 0.3) {  // 약간의 랜덤성
                        visited.add(key);
                        queue.push(neighbor);
                    }
                }
            }
        }

        if (clusterTiles.length < this.minClusterSize) return;

        const cluster = {
            id: this.nextClusterId++,
            tiles: clusterTiles,
            createdAt: Date.now(),
            scale: 0,
            targetScale: 1
        };

        this.rockClusters.push(cluster);

        console.log(`🪨 대형 바위(${clusterTiles.length}칸)가 나타났어요!`);

        // 먼지 파티클
        if (this.onDustParticle) {
            const centerX = clusterTiles.reduce((sum, t) => sum + t.x, 0) / clusterTiles.length;
            const centerY = clusterTiles.reduce((sum, t) => sum + t.y, 0) / clusterTiles.length;
            this.onDustParticle(centerX * 32 + 16, centerY * 32 + 16, 'spawn');
        }
    }

    /**
     * 특정 위치에 바위가 있는지 확인
     */
    hasRockAt(gridX, gridY) {
        for (const cluster of this.rockClusters) {
            if (cluster.tiles.some(t => t.x === gridX && t.y === gridY)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 클러스터 제거 (전체)
     */
    removeCluster(index, natural = false) {
        const cluster = this.rockClusters[index];
        if (!cluster) return;

        // 먼지 파티클
        if (this.onDustParticle && cluster.tiles.length > 0) {
            const t = cluster.tiles[0];
            this.onDustParticle(t.x * 32 + 16, t.y * 32 + 16, 'remove');
        }

        if (natural) {
            console.log(`💨 대형 바위가 자연 풍화되어 사라졌어요!`);
        }

        this.rockClusters.splice(index, 1);
    }

    /**
     * 클릭으로 바위 1칸 제거 시도 (곡괭이 필요)
     */
    tryRemoveRockAt(gridX, gridY) {
        // 먼저 해당 위치에 바위가 있는지 확인
        let foundCluster = null;
        let foundTileIndex = -1;

        for (let i = 0; i < this.rockClusters.length; i++) {
            const cluster = this.rockClusters[i];
            const tileIndex = cluster.tiles.findIndex(t => t.x === gridX && t.y === gridY);
            if (tileIndex !== -1) {
                foundCluster = { cluster, clusterIndex: i };
                foundTileIndex = tileIndex;
                break;
            }
        }

        // 바위가 없으면 아무것도 안 함 (메시지도 안 띄움)
        if (!foundCluster) {
            return false;
        }

        // 바위가 있는데 곡괭이가 없으면 메시지 표시
        if (!this.hasPickaxe) {
            ToastSystem.show('⛏️ 곡괭이가 필요해요! 상점에서 구매하세요.', 2000, 'warning');
            return true;  // 바위가 있으니 true 반환 (다른 동작 방지)
        }

        // 바위 제거
        const { cluster, clusterIndex } = foundCluster;
        cluster.tiles.splice(foundTileIndex, 1);

        // 먼지 파티클
        if (this.onDustParticle) {
            this.onDustParticle(gridX * 32 + 16, gridY * 32 + 16, 'remove');
        }

        console.log(`⛏️ 바위 1칸 제거! (남은 칸: ${cluster.tiles.length})`);

        // 클러스터가 비었으면 전체 제거
        if (cluster.tiles.length === 0) {
            this.rockClusters.splice(clusterIndex, 1);
            ToastSystem.show('🎉 바위를 완전히 부쉈어요!', 2000, 'success');
        }

        return true;
    }

    /**
     * 바위 렌더링
     */
    render(ctx) {
        for (const cluster of this.rockClusters) {
            // 등장 애니메이션
            if (cluster.scale < cluster.targetScale) {
                cluster.scale = Math.min(cluster.scale + 0.05, cluster.targetScale);
            }

            for (const tile of cluster.tiles) {
                const x = tile.x * 32 + 16;
                const y = tile.y * 32 + 16;
                const size = 14 * cluster.scale;

                ctx.save();

                // 그림자
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.beginPath();
                ctx.ellipse(x, y + 12, size * 0.9, size * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();

                // 바위 본체 (어두운 회색)
                const gradient = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, size);
                gradient.addColorStop(0, '#8D8D8D');
                gradient.addColorStop(0.5, '#6B6B6B');
                gradient.addColorStop(1, '#4A4A4A');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                // 불규칙한 바위 형태
                ctx.moveTo(x - size, y);
                ctx.lineTo(x - size * 0.7, y - size * 0.8);
                ctx.lineTo(x + size * 0.3, y - size * 0.9);
                ctx.lineTo(x + size * 0.9, y - size * 0.3);
                ctx.lineTo(x + size, y + size * 0.5);
                ctx.lineTo(x + size * 0.5, y + size * 0.7);
                ctx.lineTo(x - size * 0.6, y + size * 0.6);
                ctx.closePath();
                ctx.fill();

                // 하이라이트
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.beginPath();
                ctx.arc(x - 4, y - 5, size * 0.25, 0, Math.PI * 2);
                ctx.fill();

                // 균열 디테일
                ctx.strokeStyle = '#3A3A3A';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x - 2, y - size * 0.5);
                ctx.lineTo(x + 3, y + 2);
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    /**
     * 저장/로드용 데이터
     */
    getData() {
        return {
            clusters: this.rockClusters.map(c => ({
                id: c.id,
                tiles: c.tiles,
                createdAt: c.createdAt
            })),
            hasPickaxe: this.hasPickaxe
        };
    }

    loadData(data) {
        if (!data) return;
        if (data.clusters) {
            this.rockClusters = data.clusters.map(c => ({
                ...c,
                scale: 1,
                targetScale: 1
            }));
        }
        if (data.hasPickaxe !== undefined) {
            this.hasPickaxe = data.hasPickaxe;
        }
    }
}

// 전역 내보내기
window.ObstacleManager = ObstacleManager;
