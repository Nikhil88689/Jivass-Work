from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, Location, Attendance, UserFaceImage
import math
import base64
import io
from PIL import Image
import numpy as np

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['bio', 'profile_picture', 'address', 'face_image']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone_number', 
                  'date_of_birth', 'is_verified', 'is_staff', 'is_supervisor', 'profile',
                  'date_joined', 'last_login']
        read_only_fields = ['is_verified', 'is_staff', 'is_supervisor', 'date_joined', 'last_login']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'first_name', 'last_name', 
                  'phone_number', 'date_of_birth']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

class UpdateUserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number', 'date_of_birth', 'profile']
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'latitude', 'longitude', 'radius', 'is_active']

class AttendanceSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    location_name = serializers.CharField(source='location.name', read_only=True)
    duration = serializers.FloatField(read_only=True)
    is_absent = serializers.BooleanField(required=False)
    attendance_status = serializers.CharField(required=False)
    
    class Meta:
        model = Attendance
        fields = ['id', 'user', 'user_email', 'user_name', 'location', 'location_name',
                  'check_in_time', 'check_out_time', 'check_in_latitude', 'check_in_longitude',
                  'check_out_latitude', 'check_out_longitude', 'is_verified', 'is_absent',
                  'verification_method', 'notes', 'duration', 'attendance_status']
        read_only_fields = ['is_verified', 'user']
    
    def get_user_name(self, obj):
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.email
        
    def update(self, instance, validated_data):
        # Handle attendance status updates
        if 'attendance_status' in validated_data:
            status_value = validated_data.pop('attendance_status')
            # Update is_absent based on attendance_status
            if status_value == 'Absent':
                instance.is_absent = True
            elif status_value == 'Present':
                instance.is_absent = False
                
        # Handle direct is_absent updates
        if 'is_absent' in validated_data:
            instance.is_absent = validated_data.pop('is_absent')
        
        # Update other fields normally
        return super().update(instance, validated_data)

class AttendanceCheckInSerializer(serializers.Serializer):
    latitude = serializers.FloatField(
        required=True,
        min_value=-90,
        max_value=90,
        error_messages={
            'min_value': 'Latitude must be between -90 and 90 degrees.',
            'max_value': 'Latitude must be between -90 and 90 degrees.',
        }
    )
    longitude = serializers.FloatField(
        required=True,
        min_value=-180,
        max_value=180,
        error_messages={
            'min_value': 'Longitude must be between -180 and 180 degrees.',
            'max_value': 'Longitude must be between -180 and 180 degrees.',
        }
    )
    
    def validate(self, data):
        """
        Validate if the user is within range of any authorized location
        """
        # Round coordinates to 6 decimal places
        latitude = round(float(data['latitude']), 6)
        longitude = round(float(data['longitude']), 6)
        
        # Get all active locations
        locations = Location.objects.filter(is_active=True)
        
        if not locations.exists():
            raise serializers.ValidationError("No authorized locations found for attendance.")
        
        # Check if user is within range of any location
        for location in locations:
            distance = self.calculate_distance(
                latitude, longitude,
                location.latitude, location.longitude
            )
            if distance <= location.radius:
                return data
        
        raise serializers.ValidationError("You are not within range of any authorized location.")
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate the distance between two points using the Haversine formula
        """
        R = 6371000  # Earth's radius in meters
        
        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlon = lon2_rad - lon1_rad
        dlat = lat2_rad - lat1_rad
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return distance

class AttendanceCheckOutSerializer(serializers.Serializer):
    latitude = serializers.FloatField(
        required=True,
        min_value=-90,
        max_value=90,
        error_messages={
            'min_value': 'Latitude must be between -90 and 90 degrees.',
            'max_value': 'Latitude must be between -90 and 90 degrees.',
        }
    )
    longitude = serializers.FloatField(
        required=True,
        min_value=-180,
        max_value=180,
        error_messages={
            'min_value': 'Longitude must be between -180 and 180 degrees.',
            'max_value': 'Longitude must be between -180 and 180 degrees.',
        }
    )
    attendance_id = serializers.IntegerField()
    
    def validate(self, data):
        # Round coordinates to 6 decimal places
        data['latitude'] = round(float(data['latitude']), 6)
        data['longitude'] = round(float(data['longitude']), 6)
        return data 

class FaceRecognitionSerializer(serializers.Serializer):
    face_image = serializers.ImageField(required=True)
    latitude = serializers.FloatField(
        required=True,
        min_value=-90,
        max_value=90,
        error_messages={
            'min_value': 'Latitude must be between -90 and 90 degrees.',
            'max_value': 'Latitude must be between -90 and 90 degrees.',
        }
    )
    longitude = serializers.FloatField(
        required=True,
        min_value=-180,
        max_value=180,
        error_messages={
            'min_value': 'Longitude must be between -180 and 180 degrees.',
            'max_value': 'Longitude must be between -180 and 180 degrees.',
        }
    )
    
    def validate(self, data):
        # Round coordinates to 6 decimal places
        data['latitude'] = round(float(data['latitude']), 6)
        data['longitude'] = round(float(data['longitude']), 6)
        return data

class FaceImageUploadSerializer(serializers.Serializer):
    face_image = serializers.ImageField(
        required=True,
        error_messages={
            'required': 'A face image file is required.',
            'invalid': 'The uploaded file is not a valid image.',
            'empty': 'The uploaded image file is empty.',
            'invalid_image': 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.'
        }
    )
    user_id = serializers.IntegerField(required=False)
    
    def validate_face_image(self, value):
        # Check if the image is valid
        if not value:
            raise serializers.ValidationError('Face image is required')
            
        # Check file size (limit to 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Image file too large. Maximum size is 5MB.')
            
        # Check file extension
        valid_extensions = ['jpg', 'jpeg', 'png']
        ext = value.name.split('.')[-1].lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError(f'Unsupported file extension. Supported formats: {", ".join(valid_extensions)}')
            
        return value

class MultiFaceImageUploadSerializer(serializers.Serializer):
    face_image = serializers.ImageField(
        required=True,
        error_messages={
            'required': 'A face image file is required.',
            'invalid': 'The uploaded file is not a valid image.',
            'empty': 'The uploaded image file is empty.',
            'invalid_image': 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.'
        }
    )
    user_id = serializers.IntegerField(required=False)
    angle_index = serializers.IntegerField(
        required=True,
        min_value=0,
        max_value=9,
        error_messages={
            'required': 'Angle index is required.',
            'min_value': 'Angle index must be between 0 and 9.',
            'max_value': 'Angle index must be between 0 and 9.'
        }
    )
    
    def validate_face_image(self, value):
        # Check if the image is valid
        if not value:
            raise serializers.ValidationError('Face image is required')
            
        # Check file size (limit to 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Image file too large. Maximum size is 5MB.')
            
        # Check file extension
        valid_extensions = ['jpg', 'jpeg', 'png']
        ext = value.name.split('.')[-1].lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError(f'Unsupported file extension. Supported formats: {", ".join(valid_extensions)}')
            
        return value

class UserFaceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFaceImage
        fields = ['id', 'user', 'image', 'angle_index', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']