
export class AudioService {
  private static synth = window.speechSynthesis;
  private static speaking = false;
  private static lastFeedbackTime = 0;

  static speak(text: string, priority: 'high' | 'low' = 'low') {
    if (!this.synth) return;

    // Throttle low priority feedback (e.g. "Go lower") to avoid spamming
    const now = Date.now();
    if (priority === 'low' && now - this.lastFeedbackTime < 3000) {
      return;
    }

    // High priority (reps) can interrupt, or we just queue normally. 
    // For simplicity, we just speak.
    
    // If high priority, cancel current to speak immediately
    if (priority === 'high') {
        this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Select a decent voice if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      this.speaking = false;
    };

    this.speaking = true;
    this.synth.speak(utterance);
    this.lastFeedbackTime = now;
  }

  static playPositiveTone() {
    // Simple audio context beep could go here, for now relying on speech
  }
}
