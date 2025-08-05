import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth_project.settings')
django.setup()

from django.core.files.base import ContentFile
from accounts.models import SequentialFileStorage, CustomUser, UserFaceImage

# Test script for SequentialFileStorage

def test_sequential_storage():
    # Create a test storage instance
    storage = SequentialFileStorage(location=os.path.abspath('media'))
    
    # Create a test directory
    test_dir = 'test_sequential'
    test_path = os.path.join(test_dir, 'test_file.txt')
    
    # Delete any existing test files to start fresh
    if os.path.exists(os.path.join('media', test_dir)):
        for f in os.listdir(os.path.join('media', test_dir)):
            os.remove(os.path.join('media', test_dir, f))
    
    # Create test content
    content1 = b'Test content 1'
    content2 = b'Test content 2'
    content3 = b'Test content 3'
    content4 = b'Test content 4'
    
    # Save the first file using storage
    print(f"Creating first file: {test_path}")
    storage.save(test_path, ContentFile(content1))
    
    # Try to save a second file with the same name
    # This should create test_file_1.txt
    print(f"Creating second file with same name")
    new_name = storage.save(test_path, ContentFile(content2))
    print(f"New name for duplicate file: {new_name}")
    
    # Try to save a third file with the same name
    # This should create test_file_2.txt
    print(f"Creating third file with same name")
    new_name2 = storage.save(test_path, ContentFile(content3))
    print(f"New name for second duplicate file: {new_name2}")
    
    # Try to save a fourth file with the same name
    # This should create test_file_3.txt
    print(f"Creating fourth file with same name")
    new_name3 = storage.save(test_path, ContentFile(content4))
    print(f"New name for third duplicate file: {new_name3}")
    
    # List all files in the test directory
    print("\nFiles in test directory:")
    full_test_dir = os.path.join('media', test_dir)
    for f in os.listdir(full_test_dir):
        file_path = os.path.join(full_test_dir, f)
        with open(file_path, 'r') as file:
            content = file.read()
        print(f"- {f}: {content}")
    
    print("\nTest completed. Check the media/test_sequential directory for the created files.")

if __name__ == "__main__":
    test_sequential_storage()