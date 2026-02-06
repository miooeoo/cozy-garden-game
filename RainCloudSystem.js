/**
 * 🌧️ RainCloudSystem.js - 기적의 비구름 (보상형 광고 모킹)
 * 
 * 핵심 기능:
 * - 모든 식물에 물주기 (soilWetness = 1.0)
 * - 30초간 비 애니메이션 + 성장 속도 2배
 * - 무지개 피날레 효과
 * 
 * "쥬시니스(Juiciness)" 요소:
 * - 구름 등장 애니메이션 (easeOutBounce)
 * - 빗방울 파티클
 * - 식물 춤추기 효과
 * - 환경 조명 변화
 */

/**
 * 비구름 시스템 (싱글톤)
 */
class RainCloudSystem {
    static instance = null;

    static getInstance() {
        if (!RainCloudSystem.instance) {
            RainCloudSystem.instance = new RainCloudSystem();
        }
        return RainCloudSystem.instance;
    }

    constructor() {
        if (RainCloudSystem.instance) {
            return RainCloudSystem.instance;
        }

        // 상태
        this.isRaining = false;
        this.rainDuration = 30000;  // 30초
        this.rainStartTime = 0;

        // 구름 애니메이션
        this.cloudY = -100;
        this.cloudTargetY = 50;
        this.cloudScale = 1;

        // 파티클
        this.raindrops = [];
        this.ripples = [];

        // 무지개
        this.showRainbow = false;
        this.rainbowOpacity = 0;

        // 성장 배율
        this.growthMultiplier = 2.0;

        // 콜백
        this.onRainStart = null;
        this.onRainEnd = null;

        RainCloudSystem.instance = this;
    }

    /**
     * 비구름 시작 (광고 시청 완료 시 호출)
     * @param {Garden} garden - 정원 인스턴스
     */
    rainCloud(garden) {
        if (this.isRaining) {
            console.log('☔ 이미 비가 내리고 있어요!');
            return;
        }

        // 광고 시청 로그 (실제 광고 연동 전 목업)
        console.log('🎬 Ad Watched');
        console.log('☁️ 기적의 비구름이 나타났습니다!');

        this.isRaining = true;
        this.rainStartTime = Date.now();
        this.cloudY = -100;
        this.showRainbow = false;
        this.rainbowOpacity = 0;

        // 모든 식물에 물주기
        for (const plant of garden.plants) {
            plant.water();
            plant.soilWetness = 1.0;
        }

        // 콜백 호출
        if (this.onRainStart) {
            this.onRainStart();
        }

        // 30초 후 비 종료
        setTimeout(() => {
            this.endRain();
        }, this.rainDuration);
    }

    /**
     * 비 종료
     */
    endRain() {
        this.isRaining = false;
        this.showRainbow = true;
        this.rainbowOpacity = 1;

        console.log('🌈 비가 그치고 무지개가 떴어요!');

        // 5초 후 무지개 페이드 아웃
        setTimeout(() => {
            this.fadeOutRainbow();
        }, 5000);

        if (this.onRainEnd) {
            this.onRainEnd();
        }
    }

    /**
     * 무지개 페이드 아웃
     */
    fadeOutRainbow() {
        const fadeInterval = setInterval(() => {
            this.rainbowOpacity -= 0.05;
            if (this.rainbowOpacity <= 0) {
                this.rainbowOpacity = 0;
                this.showRainbow = false;
                clearInterval(fadeInterval);
            }
        }, 50);
    }

    /**
     * easeOutBounce 함수
     */
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    /**
     * 매 프레임 업데이트
     * @param {number} deltaTime - 초 단위 시간
     * @param {number} canvasWidth - 캔버스 너비
     * @param {number} canvasHeight - 캔버스 높이
     */
    update(deltaTime, canvasWidth, canvasHeight) {
        if (!this.isRaining) return;

        const elapsed = Date.now() - this.rainStartTime;
        const progress = Math.min(elapsed / 1000, 1);  // 1초에 걸쳐 구름 등장

        // 구름 등장 애니메이션
        if (progress < 1) {
            const bounceProgress = this.easeOutBounce(progress);
            this.cloudY = -100 + (this.cloudTargetY + 100) * bounceProgress;

            // Squash & Stretch
            this.cloudScale = 1 + Math.sin(progress * Math.PI) * 0.2;
        } else {
            this.cloudY = this.cloudTargetY;
            // 부드러운 흔들림
            this.cloudScale = 1 + Math.sin(Date.now() / 500) * 0.05;
        }

        // 빗방울 생성
        if (Math.random() < 0.3) {
            this.raindrops.push({
                x: Math.random() * canvasWidth,
                y: 80,
                vx: (Math.random() - 0.5) * 0.5,
                vy: 8 + Math.random() * 4,
                length: 10 + Math.random() * 10,
                opacity: 0.6 + Math.random() * 0.4
            });
        }

        // 빗방울 업데이트
        for (let i = this.raindrops.length - 1; i >= 0; i--) {
            const drop = this.raindrops[i];
            drop.x += drop.vx;
            drop.y += drop.vy;

            // 바닥에 닿으면 파동 생성
            if (drop.y > canvasHeight - 20) {
                this.ripples.push({
                    x: drop.x,
                    y: canvasHeight - 15,
                    radius: 2,
                    maxRadius: 8 + Math.random() * 4,
                    opacity: 0.8
                });
                this.raindrops.splice(i, 1);
            }
        }

        // 파동 업데이트
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            ripple.radius += 0.3;
            ripple.opacity -= 0.03;

            if (ripple.opacity <= 0 || ripple.radius >= ripple.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }
    }

    /**
     * 렌더링
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    render(ctx, canvasWidth, canvasHeight) {
        // 비 오버레이 (습기 찬 분위기)
        if (this.isRaining) {
            ctx.fillStyle = 'rgba(165, 219, 248, 0.15)';  // Fairy Sparkle 30%
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // 빗방울 렌더링
        ctx.strokeStyle = '#A5DBF8';
        ctx.lineWidth = 2;
        for (const drop of this.raindrops) {
            ctx.globalAlpha = drop.opacity;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x + drop.vx * 2, drop.y + drop.length);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 파동 렌더링
        ctx.strokeStyle = '#A5DBF8';
        ctx.lineWidth = 1;
        for (const ripple of this.ripples) {
            ctx.globalAlpha = ripple.opacity;
            ctx.beginPath();
            ctx.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 구름 렌더링
        if (this.isRaining || this.cloudY > -50) {
            this.renderCloud(ctx, canvasWidth / 2, this.cloudY);
        }

        // 무지개 렌더링
        if (this.showRainbow && this.rainbowOpacity > 0) {
            this.renderRainbow(ctx, canvasWidth, canvasHeight);
        }
    }

    /**
     * 구름 렌더링
     */
    renderCloud(ctx, centerX, y) {
        ctx.save();
        ctx.translate(centerX, y);
        ctx.scale(this.cloudScale, this.cloudScale * 0.8);

        // 구름 본체 (여러 원 조합)
        ctx.fillStyle = '#E8E8E8';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        ctx.beginPath();
        ctx.arc(-40, 0, 30, 0, Math.PI * 2);
        ctx.arc(0, -15, 40, 0, Math.PI * 2);
        ctx.arc(40, 0, 30, 0, Math.PI * 2);
        ctx.arc(0, 10, 35, 0, Math.PI * 2);
        ctx.fill();

        // 구름 하이라이트
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-30, -20, 15, 0, Math.PI * 2);
        ctx.arc(10, -30, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * 무지개 렌더링
     */
    renderRainbow(ctx, canvasWidth, canvasHeight) {
        ctx.save();
        ctx.globalAlpha = this.rainbowOpacity * 0.6;

        const colors = [
            '#FF6B6B',  // 빨강
            '#FFD93D',  // 주황/노랑
            '#D3DB7F',  // 라임
            '#A5DBF8',  // 파랑
            '#F2C8DD'   // 핑크/보라
        ];

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight + 100;
        const startRadius = 250;
        const bandWidth = 15;

        for (let i = 0; i < colors.length; i++) {
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = bandWidth;
            ctx.beginPath();
            ctx.arc(centerX, centerY, startRadius + i * bandWidth, Math.PI, 0, false);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 현재 성장 배율 반환
     * @returns {number}
     */
    getCurrentGrowthMultiplier() {
        return this.isRaining ? this.growthMultiplier : 1.0;
    }
}

// 전역 내보내기
window.RainCloudSystem = RainCloudSystem;
