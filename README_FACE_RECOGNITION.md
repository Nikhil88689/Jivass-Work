# Face Recognition System Documentation

## Overview

This document provides information about the face recognition system implemented in this project. The system uses a hybrid approach combining modern deep learning techniques with traditional computer vision methods for robust face recognition.

## Features

- **Multi-method Face Recognition**: Combines multiple approaches for robust verification
- **Deep Learning with FaceNet**: Uses state-of-the-art face embeddings
- **Traditional Computer Vision Methods**: SSIM, SIFT/ORB feature matching, histogram comparison
- **Graceful Degradation**: Falls back to simpler methods when advanced ones are unavailable
- **Anti-spoofing**: Checks for the presence of eyes to prevent photo attacks

## Face Recognition Methods

### Primary Method: FaceNet Embeddings

The system now uses FaceNet (Inception-ResNet-V1 architecture) to generate 512-dimensional face embeddings. These embeddings capture facial features in a way that makes similar faces have similar embeddings, allowing for more accurate face comparison using cosine similarity.

Benefits of FaceNet:
- More robust to variations in lighting, pose, and expression
- Better at distinguishing between similar-looking individuals
- State-of-the-art accuracy in face recognition tasks

### Fallback Methods

If FaceNet is unavailable or fails, the system falls back to these traditional methods:

1. **Structural Similarity Index (SSIM)**: Compares the structural similarity between images
2. **Feature Matching**: Uses SIFT or ORB to extract and match keypoints between faces
3. **Histogram Comparison**: Compares color and intensity distributions between images

## Face Detection

The system uses a two-tier approach for face detection:

1. **RetinaFace**: Modern deep learning-based face detector (requires TensorFlow)
2. **Haar Cascade Classifier**: Traditional face detection method as a fallback

## Usage

### Testing Face Recognition

A test script is provided to verify the face recognition system:

```python
python test_face_recognition.py
```

This will create a `test_images` directory where you can place test images. The first image will be used as a reference, and all other images will be compared against it.

### Troubleshooting

- If face detection fails, try improving lighting conditions or using a clearer image
- For better accuracy, ensure the face is well-lit and directly facing the camera
- If you encounter issues with FaceNet, ensure PyTorch is properly installed

## Dependencies

The face recognition system requires the following main dependencies:

- OpenCV (cv2)
- NumPy
- PyTorch
- facenet-pytorch
- TensorFlow (optional, for RetinaFace)
- scipy

All dependencies are listed in the `requirements.txt` file.

## Implementation Details

The face recognition system is implemented in `accounts/face_recognition_utils.py` with the following key functions:

- `get_face_encoding`: Detects and preprocesses faces, extracts FaceNet embeddings and other features
- `compare_faces`: Compares two face encodings using multiple methods
- `verify_face`: High-level function that handles the entire verification process
- `get_facenet_embedding`: Generates FaceNet embeddings for a face image

## Recent Improvements

- Added FaceNet for deep learning-based face embeddings
- Improved logging to show which method contributed most to the verification
- Enhanced weighting system to prioritize more reliable methods
- Added graceful degradation when certain dependencies are unavailable