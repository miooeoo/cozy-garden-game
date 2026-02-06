/**
 * 🐾 AnimalController.js - 동물 방문 시스템
 * 
 * 고양이, 개, 양이 정원에 놀러와서 활기를 더합니다.
 * 클릭하면 쓰다듬기 상호작용!
 */

/**
 * 동물 클래스
 */
class Animal {
    constructor(type, startX, startY) {
        this.type = type;
        this.x = startX;
        this.y = startY;

        // 이동
        this.targetX = startX;
        this.targetY = startY;
        this.speed = 0.5 + Math.random() * 0.5;
        this.isMoving = false;

        // 행동 상태
        this.state = 'walking';  // walking, sitting, eating
        this.stateTimer = 0;
        this.direction = 'right';

        // 애니메이션
        this.animFrame = 0;
        this.animTimer = 0;

        // 쓰다듬기
        this.isPetted = false;
        this.petTimer = 0;

        // 수명 (화면에 머무는 시간)
        this.lifetime = 30 + Math.random() * 60;  // 30-90초
        this.age = 0;

        // 동물 속성
        this.info = AnimalTypes[type];
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.animTimer += deltaTime;
        this.stateTimer += deltaTime;

        // 수명 초과
        if (this.age > this.lifetime) {
            return false;  // 제거 신호
        }

        // 애니메이션 프레임
        if (this.animTimer > 0.2) {
            this.animFrame = (this.animFrame + 1) % 4;
            this.animTimer = 0;
        }

        // 쓰다듬기 효과
        if (this.isPetted) {
            this.petTimer -= deltaTime;
            if (this.petTimer <= 0) {
                this.isPetted = false;
            }
        }

        // 상태 전환
        if (this.stateTimer > 3 + Math.random() * 5) {
            this.changeState();
            this.stateTimer = 0;
        }

        // 이동
        if (this.state === 'walking') {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.setRandomTarget();
            }
        }

        return true;  // 계속 유지
    }

    changeState() {
        const states = ['walking', 'sitting', 'walking'];
        if (this.type === 'sheep') states.push('eating');
        this.state = states[Math.floor(Math.random() * states.length)];

        if (this.state === 'walking') {
            this.setRandomTarget();
        }
    }

    setRandomTarget() {
        this.targetX = 50 + Math.random() * 700;
        this.targetY = 50 + Math.random() * 450;
    }

    pet() {
        this.isPetted = true;
        this.petTimer = 1.5;
        this.state = 'sitting';

        // 효과음 (콘솔 로그로 대체)
        console.log(`${this.info.sound} ${this.info.name}을(를) 쓰다듬었어요!`);

        return true;
    }

    render(ctx) {
        const x = this.x;
        const y = this.y;
        const flip = this.direction === 'left';

        ctx.save();

        if (flip) {
            ctx.translate(x + 16, y);
            ctx.scale(-1, 1);
            ctx.translate(-16, 0);
        } else {
            ctx.translate(x, y);
        }

        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(16, 30, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 동물 렌더링
        switch (this.type) {
            case 'cat':
                this.renderCat(ctx);
                break;
            case 'dog':
                this.renderDog(ctx);
                break;
            case 'sheep':
                this.renderSheep(ctx);
                break;
        }

        // 쓰다듬기 하트
        if (this.isPetted) {
            const heartY = -5 - Math.sin(this.petTimer * 5) * 5;
            ctx.fillStyle = '#FF6B6B';
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillText('❤️', 16, heartY);
        }

        ctx.restore();
    }

    renderCat(ctx) {
        const bob = this.state === 'walking' ? Math.sin(this.animFrame * Math.PI / 2) * 2 : 0;
        const purr = this.isPetted ? Math.sin(Date.now() / 50) * 1 : 0;

        // === 🐱 귀여운 측면 고양이 ===

        // 꼬리 (위로 우아하게)
        ctx.strokeStyle = '#F5A623';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2, 18 - bob);
        ctx.quadraticCurveTo(-6, 8, 2, 0 - bob + Math.sin(Date.now() / 300) * 3);
        ctx.stroke();

        // 뒷다리
        ctx.fillStyle = '#F5A623';
        const legOffset = this.state === 'walking' ? Math.sin(this.animFrame * Math.PI) * 4 : 0;
        ctx.beginPath();
        ctx.ellipse(8, 28 - bob + legOffset, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 몸통 (통통하고 둥글게)
        ctx.fillStyle = '#FFB84D';
        ctx.beginPath();
        ctx.ellipse(16, 18 - bob + purr, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 줄무늬 (귀여운 호랑이 무늬)
        ctx.strokeStyle = '#E5942D';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(12 + i * 5, 18 - bob, 6, -0.5, 0.5);
            ctx.stroke();
        }

        // 앞다리
        ctx.fillStyle = '#F5A623';
        ctx.beginPath();
        ctx.ellipse(22, 28 - bob - legOffset, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 머리 (크고 둥글게!)
        ctx.fillStyle = '#FFB84D';
        ctx.beginPath();
        ctx.arc(30, 12 - bob + purr, 10, 0, Math.PI * 2);
        ctx.fill();

        // 귀 (귀여운 삼각형)
        ctx.fillStyle = '#F5A623';
        ctx.beginPath();
        ctx.moveTo(24, 6 - bob);
        ctx.lineTo(22, -4 - bob);
        ctx.lineTo(28, 2 - bob);
        ctx.closePath();
        ctx.fill();
        // 귀 안쪽 (핑크)
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.moveTo(24, 4 - bob);
        ctx.lineTo(23, -1 - bob);
        ctx.lineTo(26, 2 - bob);
        ctx.closePath();
        ctx.fill();

        // 눈 (크고 반짝반짝)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(33, 11 - bob + purr, 5, 6, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // 눈동자
        ctx.fillStyle = '#2D5A27';
        ctx.beginPath();
        ctx.ellipse(34, 11 - bob + purr, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 동공
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(35, 11 - bob + purr, 1.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // 눈 하이라이트 (반짝!)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(36, 9 - bob + purr, 2, 0, Math.PI * 2);
        ctx.fill();

        // 볼터치 (핑크핑크)
        ctx.fillStyle = 'rgba(255, 150, 180, 0.6)';
        ctx.beginPath();
        ctx.ellipse(37, 16 - bob + purr, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 코 (하트 모양 느낌)
        ctx.fillStyle = '#FF8B9A';
        ctx.beginPath();
        ctx.moveTo(39, 14 - bob + purr);
        ctx.lineTo(38, 13 - bob + purr);
        ctx.lineTo(39, 12 - bob + purr);
        ctx.lineTo(40, 13 - bob + purr);
        ctx.closePath();
        ctx.fill();

        // 입 (^ω^)
        ctx.strokeStyle = '#D4845A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(38, 17 - bob + purr, 2, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // 수염 (귀엽게 세 개)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(38, 14 - bob);
        ctx.lineTo(45, 12 - bob);
        ctx.moveTo(38, 15 - bob);
        ctx.lineTo(46, 15 - bob);
        ctx.moveTo(38, 16 - bob);
        ctx.lineTo(45, 18 - bob);
        ctx.stroke();
    }

    renderDog(ctx) {
        const bob = this.state === 'walking' ? Math.sin(this.animFrame * Math.PI / 2) * 2 : 0;
        const tailWag = Math.sin(Date.now() / 80) * 20;
        const happy = this.isPetted ? Math.sin(Date.now() / 100) * 2 : 0;

        // === 🐕 귀여운 측면 강아지 ===

        // 꼬리 (신나게 흔들림!)
        ctx.fillStyle = '#E8B86D';
        ctx.save();
        ctx.translate(2, 14 - bob);
        ctx.rotate(tailWag * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(-2, -6, 5, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 뒷다리 (통통)
        ctx.fillStyle = '#D4A56A';
        const legOffset = this.state === 'walking' ? Math.sin(this.animFrame * Math.PI) * 5 : 0;
        ctx.beginPath();
        ctx.ellipse(8, 28 - bob + legOffset, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 몸통 (통통하고 푹신)
        ctx.fillStyle = '#E8B86D';
        ctx.beginPath();
        ctx.ellipse(16, 18 - bob + happy, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 앞다리
        ctx.fillStyle = '#D4A56A';
        ctx.beginPath();
        ctx.ellipse(24, 28 - bob - legOffset, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 머리 (크고 둥글게!)
        ctx.fillStyle = '#E8B86D';
        ctx.beginPath();
        ctx.arc(32, 12 - bob + happy, 11, 0, Math.PI * 2);
        ctx.fill();

        // 귀 (늘어진 플로피 귀)
        ctx.fillStyle = '#C4915A';
        ctx.beginPath();
        ctx.ellipse(26, 18 - bob + happy, 6, 10, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // 주둥이
        ctx.fillStyle = '#F5D5A8';
        ctx.beginPath();
        ctx.ellipse(40, 15 - bob + happy, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 눈 (크고 촉촉하게)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(35, 10 - bob + happy, 5, 6, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // 눈동자
        ctx.fillStyle = '#3D2914';
        ctx.beginPath();
        ctx.arc(36, 10 - bob + happy, 3, 0, Math.PI * 2);
        ctx.fill();
        // 반짝!
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(37, 8 - bob + happy, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 코 (검고 촉촉)
        ctx.fillStyle = '#2D1810';
        ctx.beginPath();
        ctx.ellipse(45, 14 - bob + happy, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 코 하이라이트
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(44, 13 - bob + happy, 1, 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 혀 (핥핥!)
        if (this.isPetted || this.state === 'sitting') {
            ctx.fillStyle = '#FF8A9A';
            ctx.beginPath();
            ctx.ellipse(43, 22 - bob + happy, 4, 7 + Math.sin(Date.now() / 150) * 2, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 볼터치
        ctx.fillStyle = 'rgba(255, 150, 180, 0.5)';
        ctx.beginPath();
        ctx.ellipse(40, 18 - bob + happy, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 입 (웃는 입)
        ctx.strokeStyle = '#8B6B4A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(42, 17 - bob + happy, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();
    }

    renderSheep(ctx) {
        const bob = this.state === 'walking' ? Math.sin(this.animFrame * Math.PI / 2) * 1 : 0;
        const eatBob = this.state === 'eating' ? Math.abs(Math.sin(Date.now() / 200)) * 5 : 0;
        const fluff = Math.sin(Date.now() / 500) * 1;

        // === 🐑 귀여운 측면 양 ===

        // 몸통 (폭신폭신 구름!)
        ctx.fillStyle = '#FFFEF5';
        for (let i = 0; i < 8; i++) {
            const ox = 4 + i * 4;
            const oy = 16 + Math.sin(i + Date.now() / 300) * 2 - bob;
            const size = 6 + Math.sin(i * 2) * 2;
            ctx.beginPath();
            ctx.arc(ox, oy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        // 위쪽 털
        for (let i = 0; i < 5; i++) {
            const ox = 8 + i * 5;
            const oy = 10 + fluff - bob;
            ctx.beginPath();
            ctx.arc(ox, oy, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 다리 (귀여운 검은 다리)
        ctx.fillStyle = '#3D3D3D';
        const legOffset = this.state === 'walking' ? Math.sin(this.animFrame * Math.PI) * 3 : 0;
        ctx.beginPath();
        ctx.roundRect(6, 22 - bob + legOffset, 5, 10, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(22, 22 - bob - legOffset, 5, 10, 2);
        ctx.fill();

        // 머리 (귀여운 검은 얼굴)
        ctx.fillStyle = '#3D3D3D';
        ctx.beginPath();
        ctx.arc(34, 12 - bob + eatBob, 8, 0, Math.PI * 2);
        ctx.fill();

        // 귀 (옆으로 삐죽)
        ctx.beginPath();
        ctx.ellipse(28, 10 - bob + eatBob, 4, 6, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // 눈 (크고 순한 눈)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(37, 10 - bob + eatBob, 4, 5, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // 눈동자
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(38, 10 - bob + eatBob, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // 반짝!
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(39, 8 - bob + eatBob, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // 볼터치 (핑크)
        ctx.fillStyle = 'rgba(255, 180, 200, 0.6)';
        ctx.beginPath();
        ctx.ellipse(40, 14 - bob + eatBob, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 코
        ctx.fillStyle = '#2A2A2A';
        ctx.beginPath();
        ctx.ellipse(41, 13 - bob + eatBob, 2, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 입 (메에~ 하는 입)
        ctx.strokeStyle = '#5A5A5A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(40, 16 - bob + eatBob, 2, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // 머리 위 털 (폭신)
        ctx.fillStyle = '#FFFEF5';
        ctx.beginPath();
        ctx.arc(30, 6 - bob + eatBob, 4, 0, Math.PI * 2);
        ctx.arc(34, 4 - bob + eatBob, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    isClickedAt(clickX, clickY) {
        const dx = clickX - this.x - 16;
        const dy = clickY - this.y - 16;
        return Math.sqrt(dx * dx + dy * dy) < 20;
    }
}

/**
 * 동물 타입 정의
 */
const AnimalTypes = {
    cat: {
        name: '고양이',
        sound: '🐱 야옹~',
        emoji: '🐱'
    },
    dog: {
        name: '강아지',
        sound: '🐶 멍멍!',
        emoji: '🐕'
    },
    sheep: {
        name: '양',
        sound: '🐑 메에~',
        emoji: '🐑'
    }
};

/**
 * 동물 컨트롤러 (싱글톤)
 */
class AnimalController {
    static instance = null;

    static getInstance() {
        if (!AnimalController.instance) {
            AnimalController.instance = new AnimalController();
        }
        return AnimalController.instance;
    }

    constructor() {
        if (AnimalController.instance) {
            return AnimalController.instance;
        }

        this.animals = [];
        this.spawnTimer = 0;
        this.spawnInterval = 15 + Math.random() * 15;  // 15-30초마다 스폰
        this.maxAnimals = 3;

        // 하트 파티클
        this.hearts = [];

        AnimalController.instance = this;
    }

    update(deltaTime) {
        // 스폰 타이머
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > this.spawnInterval && this.animals.length < this.maxAnimals) {
            this.spawnAnimal();
            this.spawnTimer = 0;
            this.spawnInterval = 15 + Math.random() * 15;
        }

        // 동물 업데이트
        for (let i = this.animals.length - 1; i >= 0; i--) {
            const alive = this.animals[i].update(deltaTime);
            if (!alive) {
                this.animals.splice(i, 1);
            }
        }

        // 하트 파티클 업데이트
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            const h = this.hearts[i];
            h.y -= 30 * deltaTime;
            h.life -= deltaTime;
            if (h.life <= 0) {
                this.hearts.splice(i, 1);
            }
        }
    }

    spawnAnimal() {
        const types = ['cat', 'dog', 'sheep'];
        const type = types[Math.floor(Math.random() * types.length)];

        // 화면 밖에서 스폰
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch (side) {
            case 0: x = -32; y = Math.random() * 544; break;  // 왼쪽
            case 1: x = 832; y = Math.random() * 544; break;  // 오른쪽
            case 2: x = Math.random() * 800; y = -32; break;  // 위
            case 3: x = Math.random() * 800; y = 576; break;  // 아래
        }

        const animal = new Animal(type, x, y);
        animal.setRandomTarget();
        this.animals.push(animal);

        if (typeof ToastSystem !== 'undefined') {
            ToastSystem.show(`${animal.info.emoji} ${animal.info.name}이(가) 놀러왔어요!`, 2000, 'info');
        }
    }

    handleClick(x, y) {
        for (const animal of this.animals) {
            if (animal.isClickedAt(x, y)) {
                animal.pet();

                // 하트 파티클 생성
                for (let i = 0; i < 3; i++) {
                    this.hearts.push({
                        x: animal.x + 16 + (Math.random() - 0.5) * 20,
                        y: animal.y,
                        life: 1 + Math.random() * 0.5
                    });
                }

                return true;
            }
        }
        return false;
    }

    render(ctx) {
        // 동물 렌더링
        for (const animal of this.animals) {
            animal.render(ctx);
        }

        // 하트 파티클
        for (const h of this.hearts) {
            ctx.globalAlpha = h.life;
            ctx.font = '14px serif';
            ctx.fillText('❤️', h.x, h.y);
        }
        ctx.globalAlpha = 1;
    }
}

// 전역 내보내기
window.Animal = Animal;
window.AnimalTypes = AnimalTypes;
window.AnimalController = AnimalController;
