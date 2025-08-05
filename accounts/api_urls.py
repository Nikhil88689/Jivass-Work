from django.urls import path
from .api_views import (
    RegisterView, CustomAuthToken, LogoutView, 
    UserProfileView, ChangePasswordView,
    AdminUserListView, AdminUserDetailView,
    LocationListCreateView, LocationDetailView,
    AttendanceListView, AttendanceDetailView,
    AttendanceCheckInView, AttendanceCheckOutView,
    UserAttendanceSummaryView, FaceImageUploadView,
    FaceRecognitionAttendanceView, FaceCheckView, FaceHistoryView,
    MultiFaceImageUploadView
)

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomAuthToken.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # User profile endpoints
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Admin endpoints
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    
    # Location endpoints
    path('locations/', LocationListCreateView.as_view(), name='location-list'),
    path('locations/<int:pk>/', LocationDetailView.as_view(), name='location-detail'),
    
    # Attendance endpoints
    path('attendance/', AttendanceListView.as_view(), name='attendance-list'),
    path('attendance/<int:pk>/', AttendanceDetailView.as_view(), name='attendance-detail'),
    path('attendance/check-in/', AttendanceCheckInView.as_view(), name='attendance-check-in'),
    path('attendance/check-out/', AttendanceCheckOutView.as_view(), name='attendance-check-out'),
    path('attendance/summary/', UserAttendanceSummaryView.as_view(), name='attendance-summary'),
    
    # Face recognition endpoints
    path('face/upload/', FaceImageUploadView.as_view(), name='face-upload'),
    path('face/admin-upload/', FaceImageUploadView.as_view(), name='face-admin-upload'),
    path('face/multi-upload/', MultiFaceImageUploadView.as_view(), name='face-multi-upload'),
    path('face/admin-multi-upload/', MultiFaceImageUploadView.as_view(), name='face-admin-multi-upload'),
    path('face/check-in/', FaceRecognitionAttendanceView.as_view(), name='face-check-in'),
    path('face/check/', FaceCheckView.as_view(), name='face-check'),
    path('face/history/', FaceHistoryView.as_view(), name='face-history'),
]