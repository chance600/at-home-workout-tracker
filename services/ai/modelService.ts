import { Keypoint } from '../../types';

declare global {
  interface Window {
    poseDetection: any;
    tf: any;
  }
}

export class ModelService {
  private static detector: any = null;
  private static modelLoading = false;

  static async initialize() {
    if (this.detector || this.modelLoading) return;
    
    this.modelLoading = true;
    try {
      // 1. Wait for scripts to load
      let attempts = 0;
      while (!window.poseDetection && attempts < 20) {
        console.warn("Waiting for PoseDetection library...");
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.poseDetection) {
        throw new Error("PoseDetection library failed to load");
      }

      // 2. Initialize TensorFlow Backend
      await window.tf.ready();
      console.log("TensorFlow Backend:", window.tf.getBackend());

      // 3. Create Detector
      const model = window.poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      };
      
      this.detector = await window.poseDetection.createDetector(model, detectorConfig);
      console.log("MoveNet Model Loaded Successfully");
    } catch (error) {
      console.error("Failed to load MoveNet:", error);
    } finally {
      this.modelLoading = false;
    }
  }

  static async estimatePoses(video: HTMLVideoElement): Promise<Keypoint[]> {
    if (!this.detector) return [];

    try {
      // Ensure video is actually ready for processing
      if (video.readyState < 2) return [];

      const poses = await this.detector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false // We flip via CSS/Canvas context
      });

      if (poses && poses.length > 0) {
        return poses[0].keypoints;
      }
    } catch (error) {
      // Suppress frequent errors during initialization frame skips
      // console.error("Pose estimation error:", error);
    }

    return [];
  }
}