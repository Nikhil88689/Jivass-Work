import os
import cv2
import numpy as np
import logging
from accounts.face_recognition_utils import get_face_encoding, compare_faces, verify_face

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('face_recognition_test')

def test_face_recognition():
    # Path to test images
    # Replace these with actual paths to test images
    test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_images')
    
    # Create test directory if it doesn't exist
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
        logger.info(f"Created test directory at {test_dir}")
        logger.info("Please add test images to this directory and run the script again.")
        return
    
    # Get all image files in the test directory
    image_files = [f for f in os.listdir(test_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if len(image_files) < 2:
        logger.info("Need at least 2 images for testing. Please add more images to the test directory.")
        return
    
    # Use the first image as reference
    reference_image_path = os.path.join(test_dir, image_files[0])
    logger.info(f"Using {image_files[0]} as reference image")
    
    # Get face encoding for reference image
    reference_encoding = get_face_encoding(reference_image_path)
    
    if reference_encoding is None:
        logger.error("Could not detect face in reference image")
        return
    
    logger.info("Reference face encoding obtained successfully")
    
    # Test with other images
    for i in range(1, len(image_files)):
        test_image_path = os.path.join(test_dir, image_files[i])
        logger.info(f"\nTesting with {image_files[i]}")
        
        # Get face encoding for test image
        test_encoding = get_face_encoding(test_image_path)
        
        if test_encoding is None:
            logger.error(f"Could not detect face in {image_files[i]}")
            continue
        
        # Compare faces
        similarity, threshold = compare_faces(reference_encoding, test_encoding)
        
        logger.info(f"Similarity score: {similarity:.4f}, Threshold: {threshold:.4f}")
        logger.info(f"Match result: {'MATCH' if similarity >= threshold else 'NO MATCH'}")
        
        # Also test the verify_face function
        verification_result = verify_face(reference_image_path, test_image_path)
        logger.info(f"verify_face result: {verification_result}")

if __name__ == "__main__":
    logger.info("Starting face recognition test")
    test_face_recognition()
    logger.info("Face recognition test completed")