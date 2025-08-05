from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
import os

from .serializers import (
    UserSerializer, UserRegistrationSerializer, 
    ChangePasswordSerializer, UpdateUserSerializer,
    LocationSerializer, AttendanceSerializer,
    AttendanceCheckInSerializer, AttendanceCheckOutSerializer,
    FaceRecognitionSerializer, FaceImageUploadSerializer,
    MultiFaceImageUploadSerializer, UserFaceImageSerializer
)
from .models import UserProfile, Location, Attendance, UserFaceImage
from .face_recognition_utils import verify_face

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """API view for user registration"""
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        # Check if the user is authenticated and is a supervisor
        if request.user.is_authenticated and request.user.is_supervisor:
            return Response({
                'message': 'Supervisors are not allowed to register new users'
            }, status=status.HTTP_403_FORBIDDEN)
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create token for the new user
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'token': token.key,
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)

class CustomAuthToken(ObtainAuthToken):
    """API view for token-based authentication"""
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_supervisor': user.is_supervisor,
            'message': 'Login successful'
        })

class LogoutView(APIView):
    """API view for user logout"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Delete the user's token to logout
        request.user.auth_token.delete()
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)

class UserProfileView(generics.RetrieveUpdateAPIView):
    """API view for retrieving and updating user profile"""
    serializer_class = UpdateUserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UserSerializer(instance)
        return Response(serializer.data)

class ChangePasswordView(generics.UpdateAPIView):
    """API view for changing password"""
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        user = request.user
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Check old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Update token
            user.auth_token.delete()
            token = Token.objects.create(user=user)
            
            return Response({
                'message': 'Password updated successfully',
                'token': token.key,
            }, status=status.HTTP_200_OK)
        
        # Log validation errors for debugging
        print("FaceImageUploadView - Validation errors:", serializer.errors)
        
        # Return a more detailed error response
        error_response = {
            'error': 'Invalid data provided',
            'details': serializer.errors,
            'received_data': {
                'data_keys': list(request.data.keys()) if hasattr(request.data, 'keys') else 'No data keys',
                'files_keys': list(request.FILES.keys()) if request.FILES else 'No files received'
            }
        }
        return Response(error_response, status=status.HTTP_400_BAD_REQUEST)

class AdminUserListView(generics.ListAPIView):
    """API view for admin and supervisor to list all users"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_supervisor:
            return User.objects.all()
        return User.objects.none()
    
    def list(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_supervisor):
            return Response({'message': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API view for admin and supervisor to manage users"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_supervisor:
            return User.objects.all()
        return User.objects.none()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        if not (request.user.is_staff or request.user.is_supervisor):
            self.permission_denied(request, message='Permission denied')
            
    def update(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_supervisor):
            return Response({'message': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        # Only admins can delete users, supervisors cannot
        if not request.user.is_staff:
            return Response({'message': 'Permission denied. Only administrators can delete users.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

# Location Management Views
class LocationListCreateView(generics.ListCreateAPIView):
    """API view for listing and creating locations"""
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Location.objects.all()
        return Location.objects.filter(is_active=True)
    
    def perform_create(self, serializer):
        if not self.request.user.is_staff:
            return Response({'message': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()

class LocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API view for retrieving, updating and deleting locations"""
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Location.objects.all()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.is_staff and request.method != 'GET':
            self.permission_denied(request, message='Permission denied')

# Attendance Management Views
class AttendanceListView(generics.ListAPIView):
    """API view for listing attendance records"""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            # Admins can see all attendance records
            return Attendance.objects.all()
        # Regular users can only see their own attendance records
        return Attendance.objects.filter(user=user)

class AttendanceDetailView(generics.RetrieveUpdateAPIView):
    """API view for retrieving and updating attendance details"""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Attendance.objects.all()
        return Attendance.objects.filter(user=user)
        
    def update(self, request, *args, **kwargs):
        """Handle PATCH requests to update attendance status"""
        # Only allow admin users to update attendance records
        if not request.user.is_staff:
            return Response({
                'error': 'You do not have permission to update attendance records.'
            }, status=status.HTTP_403_FORBIDDEN)
            
        # Get the attendance record
        instance = self.get_object()
        
        # Perform partial update
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log the update
        print(f"Attendance record {instance.id} updated by admin {request.user.email}")
        print(f"New data: {request.data}")
        
        return Response(serializer.data)

class AttendanceCheckInView(APIView):
    """API view for checking in attendance with location verification"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = AttendanceCheckInSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check if the check-in is late (after 9:10 AM)
            now = timezone.now()
            check_in_hour = now.hour
            check_in_minute = now.minute
            
            # Define expected check-in time and grace period
            expected_hour = 9  # 9 AM
            expected_minute = 0
            grace_period_minutes = 10
            
            # Convert to total minutes for easier comparison
            check_in_time_in_minutes = check_in_hour * 60 + check_in_minute
            expected_time_in_minutes = expected_hour * 60 + expected_minute
            grace_time_in_minutes = expected_time_in_minutes + grace_period_minutes
            
            # Determine if the check-in is late
            # Use the is_late flag from the request if provided, otherwise calculate it
            is_late = serializer.validated_data.get('is_late')
            if is_late is None:  # Only calculate if not explicitly provided
                is_late = check_in_time_in_minutes > grace_time_in_minutes
            
            # Create attendance record with the is_late flag
            attendance = Attendance.objects.create(
                user=request.user,
                location_id=serializer.validated_data.get('location_id'),
                check_in_latitude=serializer.validated_data['latitude'],
                check_in_longitude=serializer.validated_data['longitude'],
                is_verified=serializer.validated_data.get('is_verified', False),
                is_late=is_late
            )
            
            return Response({
                'message': 'Check-in successful',
                'attendance': AttendanceSerializer(attendance).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AttendanceCheckOutView(APIView):
    """API view for checking out attendance"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = AttendanceCheckOutSerializer(data=request.data)
        
        if serializer.is_valid():
            attendance_id = serializer.validated_data['attendance_id']
            
            # Get the attendance record
            try:
                attendance = Attendance.objects.get(id=attendance_id, user=request.user, check_out_time=None)
            except Attendance.DoesNotExist:
                return Response({
                    'error': 'No active check-in found with this ID'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Update check-out details
            attendance.check_out_time = timezone.now()
            attendance.check_out_latitude = serializer.validated_data['latitude']
            attendance.check_out_longitude = serializer.validated_data['longitude']
            attendance.save()
            
            return Response({
                'message': 'Check-out successful',
                'attendance': AttendanceSerializer(attendance).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserAttendanceSummaryView(APIView):
    """API view for getting attendance summary for a user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get attendance records for the current month
        current_month = timezone.now().month
        current_year = timezone.now().year
        
        attendances = Attendance.objects.filter(
            user=user,
            check_in_time__month=current_month,
            check_in_time__year=current_year
        )
        
        # Calculate total hours
        total_hours = sum(attendance.duration or 0 for attendance in attendances if attendance.check_out_time)
        
        # Count days present
        days_present = attendances.values('check_in_time__date').distinct().count()
        
        return Response({
            'user_id': user.id,
            'user_email': user.email,
            'month': current_month,
            'year': current_year,
            'days_present': days_present,
            'total_hours': round(total_hours, 2),
            'attendance_count': attendances.count()
        }, status=status.HTTP_200_OK)

class FaceImageUploadView(APIView):
    """API view for uploading a reference face image for the user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Log the request data for debugging
        print("FaceImageUploadView - Request data:", request.data)
        print("FaceImageUploadView - Request FILES:", request.FILES)
        print("FaceImageUploadView - Content-Type:", request.META.get('CONTENT_TYPE', 'Not provided'))
        
        # Check if there's a file in the request
        if not request.FILES:
            print("FaceImageUploadView - No files found in request")
            
            # Try to get raw data if available
            if hasattr(request, '_body'):
                print("FaceImageUploadView - Raw request body length:", len(request._body))
                if len(request._body) < 1000:  # Only print if not too large
                    print("FaceImageUploadView - Raw request body:", request._body)
        
        serializer = FaceImageUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check if this is an admin upload for another user
            user_id = request.data.get('user_id')
            
            if user_id and (request.user.is_staff or request.user.is_supervisor):
                # Admin is uploading for another user
                try:
                    target_user = User.objects.get(id=user_id)
                    profile = target_user.profile
                except User.DoesNotExist:
                    return Response({
                        'error': 'User not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # User is uploading their own image
                profile = request.user.profile
            
            # Save face image
            profile.face_image = serializer.validated_data['face_image']
            profile.save()
            
            # Ensure the directory exists with proper permissions
            email = profile.user.email
            safe_email = email.replace('@', '_at_').replace('.', '_dot_')
            face_dir = os.path.join(settings.MEDIA_ROOT, 'face_recognition', safe_email)
            os.makedirs(face_dir, exist_ok=True)
            
            return Response({
                'message': 'Face image uploaded successfully',
                'face_image_url': request.build_absolute_uri(profile.face_image.url) if profile.face_image else None
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MultiFaceImageUploadView(APIView):
    """API view for uploading multiple face images with different angles"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = MultiFaceImageUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            face_image = serializer.validated_data.get('face_image')
            angle_index = serializer.validated_data.get('angle_index')
            user_id = request.data.get('user_id')
            
            # Check if this is an admin upload for another user
            if user_id and (request.user.is_staff or request.user.is_supervisor):
                # Admin is uploading for another user
                try:
                    target_user = User.objects.get(id=user_id)
                    user = target_user
                except User.DoesNotExist:
                    return Response({
                        'error': 'User not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # User is uploading their own image
                user = request.user
            
            # Check if an image with this angle_index already exists for this user
            try:
                existing_image = UserFaceImage.objects.get(user=user, angle_index=angle_index)
                # Update the existing image
                existing_image.image = face_image
                existing_image.save()
                message = 'Face image updated successfully'
            except UserFaceImage.DoesNotExist:
                # Create a new image entry
                user_face_image = UserFaceImage.objects.create(
                    user=user,
                    image=face_image,
                    angle_index=angle_index
                )
                message = 'Face image uploaded successfully'
            
            # Get all face images for this user
            face_images = UserFaceImage.objects.filter(user=user)
            face_image_urls = []
            for img in face_images:
                face_image_urls.append({
                    'url': request.build_absolute_uri(img.image.url),
                    'angle_index': img.angle_index,
                    'created_at': img.created_at.isoformat(),
                    'updated_at': img.updated_at.isoformat()
                })
            
            return Response({
                'message': message,
                'face_image_count': face_images.count(),
                'face_image_urls': face_image_urls
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def get(self, request):
        # Check if this is an admin request for another user
        user_id = request.query_params.get('user_id')
        
        if user_id and (request.user.is_staff or request.user.is_supervisor):
            # Admin is requesting another user's images
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # User is requesting their own images
            user = request.user
        
        # Get all face images for this user
        face_images = UserFaceImage.objects.filter(user=user)
        serializer = UserFaceImageSerializer(face_images, many=True, context={'request': request})
        
        return Response({
            'face_image_count': face_images.count(),
            'face_images': serializer.data
        }, status=status.HTTP_200_OK)

class FaceCheckView(APIView):
    """API view for checking if a user has a reference face image"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        profile = user.profile
        
        # Check for single face image in profile
        has_face_image = bool(profile.face_image)
        
        # Check for multiple face images
        face_images = UserFaceImage.objects.filter(user=user)
        has_multiple_images = face_images.exists()
        
        # Get the count of face images
        face_image_count = face_images.count()
        
        # Get URLs for all face images
        face_image_urls = []
        if has_multiple_images:
            for img in face_images:
                face_image_urls.append({
                    'url': request.build_absolute_uri(img.image.url),
                    'angle_index': img.angle_index,
                    'created_at': img.created_at.isoformat(),
                    'updated_at': img.updated_at.isoformat()
                })
        
        return Response({
            'has_face_image': has_face_image,
            'has_multiple_images': has_multiple_images,
            'face_image_count': face_image_count,
            'face_image_url': request.build_absolute_uri(profile.face_image.url) if has_face_image else None,
            'face_image_urls': face_image_urls
        }, status=status.HTTP_200_OK)


class FaceHistoryView(APIView):
    """API view for checking face image upload history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        profile = user.profile
        
        # Check for single face image in profile
        has_face_image = bool(profile.face_image)
        
        # Check for multiple face images
        face_images = UserFaceImage.objects.filter(user=user)
        has_multiple_images = face_images.exists()
        
        # Get the count of face images
        face_image_count = face_images.count()
        
        # Get the latest upload date
        latest_upload = None
        if has_multiple_images:
            latest_image = face_images.order_by('-updated_at').first()
            if latest_image:
                latest_upload = latest_image.updated_at.isoformat()
        
        return Response({
            'has_uploads': has_face_image or has_multiple_images,
            'has_single_image': has_face_image,
            'has_multiple_images': has_multiple_images,
            'face_image_count': face_image_count,
            'last_upload': profile.face_image.name if has_face_image else None,
            'latest_upload_date': latest_upload or (profile.updated_at.isoformat() if hasattr(profile, 'updated_at') and has_face_image else None)
        }, status=status.HTTP_200_OK)


class FaceRecognitionAttendanceView(APIView):
    """API view for checking in attendance with face recognition and location verification"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = FaceRecognitionSerializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            profile = user.profile
            
            # Check if user has a reference face image (either single or multiple)
            has_single_image = bool(profile.face_image)
            has_multiple_images = UserFaceImage.objects.filter(user=user).exists()
            
            if not has_single_image and not has_multiple_images:
                return Response({
                    'error': 'No reference face images found. Please upload at least one face image first.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify location
            latitude = serializer.validated_data['latitude']
            longitude = serializer.validated_data['longitude']
            
            # Get all active locations
            locations = Location.objects.filter(is_active=True)
            
            if not locations.exists():
                return Response({
                    'error': 'No authorized locations found for attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user is within range of any location
            location_verified = False
            location_id = None
            
            for location in locations:
                distance = AttendanceCheckInSerializer().calculate_distance(
                    latitude, longitude,
                    location.latitude, location.longitude
                )
                if distance <= location.radius:
                    location_verified = True
                    location_id = location.id
                    break
            
            if not location_verified:
                return Response({
                    'error': 'You are not within range of any authorized location.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify face
            face_image = serializer.validated_data['face_image']
            
            # Initialize variables for verification
            verification_result = None
            best_match_score = 0
            best_verification_result = None
            
            # Check multiple face images first if available
            if has_multiple_images:
                multi_face_images = UserFaceImage.objects.filter(user=user)
                
                # Try to match against each reference image
                for ref_image in multi_face_images:
                    # Get the full path to the reference image
                    reference_image_path = os.path.join(settings.MEDIA_ROOT, ref_image.image.name)
                    
                    # Ensure the reference image path exists
                    if not os.path.exists(reference_image_path):
                        continue  # Skip this reference image if it doesn't exist
                    
                    # Verify against this reference image
                    current_result = verify_face(reference_image_path, face_image)
                    
                    # Keep track of the best match
                    current_score = current_result.get('similarity', 0)
                    if current_result['match'] or (current_score > best_match_score):
                        best_match_score = current_score
                        best_verification_result = current_result
                        
                        # If we found a match, we can stop checking
                        if current_result['match']:
                            break
                
                # Use the best result from multiple images
                if best_verification_result:
                    verification_result = best_verification_result
            
            # If no match found with multiple images or no multiple images available, try the single image
            if (not verification_result or not verification_result['match']) and has_single_image:
                # Get the full path to the reference image
                reference_image_path = os.path.join(settings.MEDIA_ROOT, profile.face_image.name)
                
                # Ensure the reference image path exists
                if not os.path.exists(reference_image_path):
                    return Response({
                        'error': f'Reference face image not found at path: {reference_image_path}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                single_image_result = verify_face(reference_image_path, face_image)
                
                # Use the single image result if it's better than the multiple image result
                if not verification_result or single_image_result.get('similarity', 0) > best_match_score:
                    verification_result = single_image_result
            
            # If we still don't have a verification result, return an error
            if not verification_result:
                return Response({
                    'error': 'Failed to verify face against any reference images.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # DEVELOPMENT MODE: Allow lower confidence scores for testing
            DEVELOPMENT_MODE = True  # Set to False in production
            
            if not verification_result['match']:
                # In development mode, check if score is above minimum threshold
                if DEVELOPMENT_MODE and verification_result.get('similarity', 0) * 100 >= 25.0:
                    # For development, we'll force match if similarity is at least 25%
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"DEVELOPMENT MODE: Forcing face match despite low score: {verification_result.get('similarity', 0) * 100:.2f}%")
                    
                    # Override the verification result
                    verification_result['match'] = True
                    verification_result['confidence'] = max(verification_result.get('confidence', 0), 60.0)  # Minimum 60% confidence
                    verification_result['development_override'] = True
                    verification_result['original_match'] = False
                else:
                    # Not in development mode or score too low even for development
                    return Response({
                        'error': 'Face verification failed. Please try again.',
                        'details': verification_result
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create attendance record
            attendance = Attendance.objects.create(
                user=user,
                location_id=location_id,
                check_in_latitude=latitude,
                check_in_longitude=longitude,
                is_verified=True,
                verification_method="FACE_GPS"
            )
            
            return Response({
                'message': 'Check-in successful with face verification',
                'attendance': AttendanceSerializer(attendance).data,
                'face_verification': verification_result
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)