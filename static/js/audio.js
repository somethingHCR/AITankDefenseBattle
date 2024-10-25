class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {
            shoot: this.createSound(200, 0.1),
            place: this.createSound(300, 0.2),
            explode: this.createSound(100, 0.3)
        };
    }

    createSound(frequency, duration) {
        return () => {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01, this.context.currentTime + duration
            );
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + duration);
        };
    }

    playSound(name) {
        if (this.sounds[name]) {
            this.sounds[name]();
        }
    }
}
