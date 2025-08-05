from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.files.storage import FileSystemStorage
import os

class SequentialFileStorage(FileSystemStorage):
    """Custom storage class that ensures files are stored sequentially with numeric suffixes"""
    # This class overrides the default Django behavior of using random strings
    # for duplicate filenames, using sequential numbers instead (1, 2, 3, etc.)
        
    def get_available_name(self, name, max_length=None):
        """
        Returns a filename that's available in the storage system.
        If the filename exists, appends a numeric suffix instead of a random string.
        """
        # First, check if the file exists
        if not self.exists(name):
            return name
            
        # If it exists, we need to find an available name with a numeric suffix
        dir_name, file_name = os.path.split(name)
        file_root, file_ext = os.path.splitext(file_name)
        
        # Start with suffix _1 and increment until we find an available name
        counter = 1
        while True:
            new_name = os.path.join(dir_name, f"{file_root}_{counter}{file_ext}")
            
            # If this name is available, return it
            if not self.exists(new_name):
                # Handle max_length if specified
                if max_length and len(new_name) > max_length:
                    # Truncate the file_root to make room for the counter and extension
                    truncation = len(new_name) - max_length
                    file_root = file_root[:-truncation]
                    new_name = os.path.join(dir_name, f"{file_root}_{counter}{file_ext}")
                    
                    # Double-check that the truncated name is available
                    if not self.exists(new_name):
                        return new_name
                else:
                    return new_name
            
            # If not available, increment counter and try again
            counter += 1

def user_face_image_path(instance, filename):
    """
    Function to generate upload path for user face images
    Returns a path like: face_recognition/user_email/filename
    """
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a new filename with user id
    new_filename = f"{instance.user.id}.{ext}"
    # Get user email and convert to a safe path
    email = instance.user.email
    safe_email = email.replace('@', '_at_').replace('.', '_dot_')
    # Return the path
    return os.path.join('face_recognition', safe_email, new_filename)

def user_face_images_path(instance, filename):
    """
    Function to generate upload path for multiple user face images
    Returns a path like: face_recognition/user_email/angle_index.ext
    """
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a new filename with angle index
    new_filename = f"angle_{instance.angle_index}.{ext}"
    # Get user email and convert to a safe path
    email = instance.user.email
    safe_email = email.replace('@', '_at_').replace('.', '_dot_')
    # Return the path
    return os.path.join('face_recognition', safe_email, new_filename)

class CustomUserManager(BaseUserManager):
    """Define a model manager for User model with no username field."""

    def _create_user(self, email, password=None, **extra_fields):
        """Create and save a User with the given email and password."""
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    """Custom User Model that uses email as the unique identifier instead of username"""
    username = None
    email = models.EmailField(_('email address'), unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    is_supervisor = models.BooleanField(default=False, help_text="Designates whether the user is a supervisor with admin-like permissions but cannot register or delete users")
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

class UserProfile(models.Model):
    """Extended profile model for additional user information"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    face_image = models.ImageField(upload_to=user_face_image_path, blank=True, null=True, storage=SequentialFileStorage())
    address = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return f"{self.user.email}'s profile"

class UserFaceImage(models.Model):
    """Model for storing multiple face images for a user from different angles"""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='face_images')
    image = models.ImageField(upload_to=user_face_images_path, storage=SequentialFileStorage())
    angle_index = models.IntegerField(help_text="Index representing the angle of the face image (0-9)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'angle_index']
        ordering = ['angle_index']
    
    def __str__(self):
        return f"{self.user.email}'s face image {self.angle_index}"

class Location(models.Model):
    """Model for storing authorized locations for attendance verification"""
    name = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    radius = models.IntegerField(default=100)  # Radius in meters
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class Attendance(models.Model):
    """Model for tracking user attendance with location verification"""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='attendances')
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    check_in_time = models.DateTimeField(default=timezone.now)
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    check_in_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    check_out_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_absent = models.BooleanField(default=False, help_text="Marks whether this attendance is considered absent")
    verification_method = models.CharField(max_length=20, default="GPS")
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-check_in_time']
    
    def __str__(self):
        return f"{self.user.email} - {self.check_in_time.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def duration(self):
        """Calculate duration of attendance in hours"""
        if self.check_out_time and self.check_in_time:
            duration = self.check_out_time - self.check_in_time
            return round(duration.total_seconds() / 3600, 2)  # Convert to hours
        return None
