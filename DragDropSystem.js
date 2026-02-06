/**
 * ✋ DragDropSystem.js - 드래그 앤 드롭 시스템
 * 
 * 핵심 기능:
 * - 그리드/자유 배치 토글
 * - 드래그 중 오프셋 적용 (손가락 가림 방지)
 * - Z-index 관리
 */

/**
 * 드래그 앤 드롭 시스템 클래스
 */
class DragDropSystem {
    /**
     * @param {HTMLCanvasElement} canvas - 게임 캔버스
     * @param {Garden} garden - 정원 인스턴스
     */
    constructor(canvas, garden) {
        this.canvas = canvas;
        this.garden = garden;

        // 설정
        this.gridSnap = true;           // 그리드 스냅 활성화
        this.cellSize = 32;
        this.dragOffset = { x: 0, y: -20 };  // 손가락 위로 오프셋

        // 드래그 상태
        this.isDragging = false;
        this.dragItem = null;           // 드래그 중인 아이템 (식물 타입 또는 장식)
        this.dragPosition = { x: 0, y: 0 };
        this.dragValid = false;         // 배치 가능 여부

        // 호버 상태
        this.hoverCell = { x: -1, y: -1 };

        // 이벤트 바인딩
        this.boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this)
        };

        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
        this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseUp);

        // 터치 이벤트 (모바일)
        this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd);
    }

    /**
     * 그리드 스냅 토글
     */
    setGridSnap(enabled) {
        this.gridSnap = enabled;
        console.log(`📐 그리드 스냅: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * 캔버스 상대 좌표 구하기
     */
    getCanvasPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    /**
     * 그리드 좌표로 스냅
     */
    snapToGrid(x, y) {
        if (!this.gridSnap) {
            return { x, y };
        }

        return {
            x: Math.floor(x / this.cellSize) * this.cellSize,
            y: Math.floor(y / this.cellSize) * this.cellSize
        };
    }

    /**
     * 드래그 시작 (심을 식물 선택)
     */
    startDrag(plantType, x, y) {
        this.isDragging = true;
        this.dragItem = plantType;
        this.updateDragPosition(x, y);

        console.log(`🌱 ${PlantTypes[plantType].name} 드래그 시작`);
    }

    /**
     * 드래그 위치 업데이트
     */
    updateDragPosition(x, y) {
        // 오프셋 적용
        this.dragPosition = {
            x: x + this.dragOffset.x,
            y: y + this.dragOffset.y
        };

        // 그리드 좌표 계산
        const gridPos = this.garden.pixelToGrid(this.dragPosition.x, this.dragPosition.y);
        this.hoverCell = gridPos;

        // 배치 가능 여부 확인
        this.dragValid = this.garden.isCellEmpty(gridPos.x, gridPos.y);
    }

    /**
     * 드래그 종료 (배치)
     */
    endDrag() {
        if (this.isDragging && this.dragItem && this.dragValid) {
            // 식물 심기
            this.garden.plantSeed(this.dragItem, this.hoverCell.x, this.hoverCell.y);
        }

        this.isDragging = false;
        this.dragItem = null;
        this.hoverCell = { x: -1, y: -1 };
    }

    /**
     * 드래그 취소
     */
    cancelDrag() {
        this.isDragging = false;
        this.dragItem = null;
        this.hoverCell = { x: -1, y: -1 };
    }

    // ========== 마우스 이벤트 핸들러 ==========

    handleMouseDown(e) {
        const pos = this.getCanvasPosition(e.clientX, e.clientY);

        // 선택된 씨앗이 있으면 드래그 시작
        const selectedSeed = window.gameState?.selectedSeed;
        if (selectedSeed) {
            this.startDrag(selectedSeed, pos.x, pos.y);
        }
    }

    handleMouseMove(e) {
        const pos = this.getCanvasPosition(e.clientX, e.clientY);

        if (this.isDragging) {
            this.updateDragPosition(pos.x, pos.y);
        } else {
            // 호버 셀 업데이트
            const gridPos = this.garden.pixelToGrid(pos.x, pos.y);
            this.hoverCell = gridPos;
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.endDrag();
        }
    }

    // ========== 터치 이벤트 핸들러 ==========

    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const pos = this.getCanvasPosition(touch.clientX, touch.clientY);

            const selectedSeed = window.gameState?.selectedSeed;
            if (selectedSeed) {
                this.startDrag(selectedSeed, pos.x, pos.y);
            }
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0 && this.isDragging) {
            const touch = e.touches[0];
            const pos = this.getCanvasPosition(touch.clientX, touch.clientY);
            this.updateDragPosition(pos.x, pos.y);
        }
    }

    handleTouchEnd(e) {
        if (this.isDragging) {
            this.endDrag();
        }
    }

    /**
     * 드래그 미리보기 렌더링
     * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
     */
    render(ctx) {
        // 호버 셀 하이라이트
        if (this.hoverCell.x >= 0 && this.hoverCell.y >= 0) {
            const cellX = this.hoverCell.x * this.cellSize;
            const cellY = this.hoverCell.y * this.cellSize;

            // 퍼머컬처 시각화: 이웃 보너스 체크
            const selectedSeed = window.gameState?.selectedSeed;
            let hasNeighborBonus = false;
            let potentialBonus = 0;

            if (selectedSeed && this.garden.isCellEmpty(this.hoverCell.x, this.hoverCell.y)) {
                // 잠재적 이웃 보너스 계산
                const recommendations = this.garden.getRecommendedPositions(selectedSeed);
                const match = recommendations.find(r => r.x === this.hoverCell.x && r.y === this.hoverCell.y);
                if (match) {
                    hasNeighborBonus = true;
                    potentialBonus = match.bonus;
                }
            }

            if (this.isDragging) {
                // 배치 가능 여부에 따라 색상
                if (this.dragValid) {
                    if (hasNeighborBonus) {
                        // 금색 테두리 (이웃 보너스 있음)
                        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';  // 금색
                        ctx.strokeStyle = '#FFD700';
                        ctx.lineWidth = 3;
                    } else {
                        ctx.fillStyle = 'rgba(211, 219, 127, 0.4)';  // lime-ice
                        ctx.strokeStyle = 'rgba(211, 219, 127, 0.8)';
                        ctx.lineWidth = 2;
                    }
                } else {
                    ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';  // 붉은색
                    ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
                    ctx.lineWidth = 2;
                }
                ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
                ctx.strokeRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);

                // +Happy 텍스트 표시
                if (hasNeighborBonus && this.dragValid) {
                    ctx.save();
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#FFD700';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 2;
                    ctx.fillText(`+${potentialBonus} Happy`, cellX + 16, cellY - 5);
                    ctx.restore();
                }

                // 드래그 중인 아이템 미리보기
                if (this.dragItem && PlantTypes[this.dragItem]) {
                    ctx.globalAlpha = 0.7;
                    ctx.font = '24px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#000';
                    ctx.fillText('🌰', cellX + 16, cellY + 16);  // 씨앗 이모지
                    ctx.globalAlpha = 1;
                }
            } else {
                // 일반 호버 (씨앗 선택 시 금색/일반)
                if (hasNeighborBonus) {
                    ctx.strokeStyle = '#FFD700';  // 금색
                    ctx.lineWidth = 2;

                    // +Happy 힌트
                    ctx.save();
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 2;
                    ctx.fillText(`+${potentialBonus} Happy`, cellX + 16, cellY - 5);
                    ctx.restore();
                } else {
                    ctx.strokeStyle = 'rgba(165, 219, 248, 0.6)';  // fairy-sparkle
                    ctx.lineWidth = 2;
                }
                ctx.strokeRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);
            }
        }
    }

    /**
     * 정리 (이벤트 리스너 제거)
     */
    destroy() {
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
        this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
        this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseUp);
        this.canvas.removeEventListener('touchstart', this.boundHandlers.touchStart);
        this.canvas.removeEventListener('touchmove', this.boundHandlers.touchMove);
        this.canvas.removeEventListener('touchend', this.boundHandlers.touchEnd);
    }
}

// 전역 내보내기
window.DragDropSystem = DragDropSystem;
