/**
 * 🍞 ToastSystem.js - 알림 메시지 시스템
 */
class ToastSystem {
    static show(message, duration = 3000, type = 'info') {
        const container = document.getElementById('toast-container') || ToastSystem.createContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;

        container.appendChild(toast);

        // 등장 애니메이션
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 퇴장 및 제거
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    static createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
}

// 전역 내보내기
window.ToastSystem = ToastSystem;
