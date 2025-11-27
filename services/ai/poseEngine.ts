
import { ExerciseType, RepState, Keypoint } from '../../types';
import { calculateAngle } from './geometry';

export interface PoseFeedback {
    count: number;
    feedback: string;
    isRep: boolean;
    currentAngle: number;
    repState: RepState;
}

interface PoseEngineState {
  count: number;
  currentState: RepState;
  lastAngle: number;
  confidence: number;
  feedback: string;
}

export const THRESHOLDS = {
  SQUAT: { up: 165, down: 90, joint: 'Knee Angle', instruction: 'Side view. Bend knees.' },
  PUSHUP: { up: 160, down: 80, joint: 'Elbow Angle', instruction: 'Side view. Chest to floor.' },
  BICEP_CURL: { up: 150, down: 60, joint: 'Elbow Angle', instruction: 'Side view. Curl up.' }, 
  OVERHEAD_PRESS: { up: 160, down: 70, joint: 'Shoulder/Elbow', instruction: 'Front/Side. Push up.' } 
};

export class PoseEngine {
  private state: PoseEngineState = {
    count: 0,
    currentState: RepState.UP, 
    lastAngle: 180,
    confidence: 0,
    feedback: "Get into position"
  };

  private exerciseType: ExerciseType;
  private angleBuffer: number[] = [];
  private readonly BUFFER_SIZE = 5;
  private readonly MIN_CONFIDENCE = 0.3;

  constructor(exerciseType: ExerciseType) {
    this.exerciseType = exerciseType;
    if (exerciseType === 'BICEP_CURL') {
        this.state.currentState = RepState.UP; 
    } else if (exerciseType === 'OVERHEAD_PRESS') {
        this.state.currentState = RepState.DOWN; 
    }
  }

  public getTargetThresholds() {
      return THRESHOLDS[this.exerciseType];
  }

  private getSmoothedAngle(newAngle: number): number {
      this.angleBuffer.push(newAngle);
      if (this.angleBuffer.length > this.BUFFER_SIZE) {
          this.angleBuffer.shift();
      }
      const sum = this.angleBuffer.reduce((a, b) => a + b, 0);
      return sum / this.angleBuffer.length;
  }

  public processPose(landmarks: Keypoint[]): PoseFeedback {
    if (!landmarks || landmarks.length === 0) {
      return { 
          count: this.state.count, 
          feedback: "No pose detected", 
          isRep: false, 
          currentAngle: 0,
          repState: this.state.currentState 
        };
    }

    let rawAngle = 0;
    let config = THRESHOLDS.SQUAT; 
    let pointsVisible = false;

    // 1. Extract Landmarks & Calculate Angle based on Exercise Type
    if (this.exerciseType === 'SQUAT') {
        config = THRESHOLDS.SQUAT;
        const hip = this.getPoint(landmarks, 'left_hip');
        const knee = this.getPoint(landmarks, 'left_knee');
        const ankle = this.getPoint(landmarks, 'left_ankle');
        if (hip && knee && ankle) {
            rawAngle = calculateAngle(hip, knee, ankle);
            pointsVisible = true;
        }
    } 
    else if (this.exerciseType === 'PUSHUP' || this.exerciseType === 'BICEP_CURL') {
        config = this.exerciseType === 'PUSHUP' ? THRESHOLDS.PUSHUP : THRESHOLDS.BICEP_CURL;
        const shoulder = this.getPoint(landmarks, 'left_shoulder');
        const elbow = this.getPoint(landmarks, 'left_elbow');
        const wrist = this.getPoint(landmarks, 'left_wrist');
        if (shoulder && elbow && wrist) {
            rawAngle = calculateAngle(shoulder, elbow, wrist);
            pointsVisible = true;
        }
    }
    else if (this.exerciseType === 'OVERHEAD_PRESS') {
        config = THRESHOLDS.OVERHEAD_PRESS;
        const shoulder = this.getPoint(landmarks, 'left_shoulder');
        const elbow = this.getPoint(landmarks, 'left_elbow');
        const wrist = this.getPoint(landmarks, 'left_wrist');
        if (shoulder && elbow && wrist) {
            rawAngle = calculateAngle(shoulder, elbow, wrist);
            pointsVisible = true;
        }
    }

    // Filter noise
    if (!pointsVisible) {
        return { 
            count: this.state.count, 
            feedback: "Adjust Camera - Joints Hidden", 
            isRep: false, 
            currentAngle: 0,
            repState: this.state.currentState
        };
    }

    const angle = this.getSmoothedAngle(rawAngle);

    // 2. State Machine
    let isRep = false;
    let feedback = "";
    
    const isOHP = this.exerciseType === 'OVERHEAD_PRESS';
    
    if (isOHP) {
        if (this.state.currentState === RepState.DOWN) {
            if (angle > config.up) {
                this.state.currentState = RepState.UP;
                feedback = "Good extension!";
            }
        } else if (this.state.currentState === RepState.UP) {
            if (angle < config.down) {
                this.state.currentState = RepState.DOWN;
                this.state.count++;
                isRep = true;
                feedback = "Rep complete!";
            }
        }
    } else {
        if (this.state.currentState === RepState.UP) {
             if (angle < config.down) {
                 this.state.currentState = RepState.DOWN;
                 feedback = "Hold...";
             } else {
                 // Proximity feedback
                 if (angle < config.down + 20) feedback = "Go lower...";
             }
        } else if (this.state.currentState === RepState.DOWN) {
             if (angle > config.up) {
                 this.state.currentState = RepState.UP;
                 this.state.count++;
                 isRep = true;
                 feedback = "Up!";
             } else {
                 if (angle > config.up - 20) feedback = "Extend fully...";
             }
        }
    }

    // Only update feedback if meaningful change to avoid flickering
    if (feedback) this.state.feedback = feedback;
    
    return { 
        count: this.state.count, 
        feedback: this.state.feedback, 
        isRep, 
        currentAngle: angle,
        repState: this.state.currentState
    };
  }

  public reset() {
    this.state = {
        count: 0,
        currentState: RepState.UP,
        lastAngle: 180,
        confidence: 0,
        feedback: "Get Ready"
    };
    this.angleBuffer = [];
    if (this.exerciseType === 'OVERHEAD_PRESS') {
        this.state.currentState = RepState.DOWN;
    }
  }

  private getPoint(landmarks: Keypoint[], name: string): Keypoint | undefined {
    // Try to find exact match or partial match
    // Check score if available
    const point = landmarks.find(l => l.name === name || l.name.includes(name));
    if (point && (point.score === undefined || point.score > this.MIN_CONFIDENCE)) {
        return point;
    }
    return undefined;
  }
}