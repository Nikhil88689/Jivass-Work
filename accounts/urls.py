# accounts/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .views import CustomPasswordChangeView, CustomPasswordResetView, CustomPasswordResetConfirmView

urlpatterns = [
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('profile/', views.profile, name='profile'),
    
    # Email verification
    path('activate/<uidb64>/<token>/', views.activate_account, name='activate'),
    
    # Password change
    path('password-change/', CustomPasswordChangeView.as_view(), name='password_change'),
    path('password-change/done/', auth_views.PasswordChangeDoneView.as_view(
        template_name='users/password_change_done.html'), 
        name='password_change_done'),
    
    # Password reset
    path('password-reset/', CustomPasswordResetView.as_view(), name='password_reset'),
    path('password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='users/password_reset_done.html'), 
        name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/', 
        CustomPasswordResetConfirmView.as_view(), 
        name='password_reset_confirm'),
    path('password-reset-complete/', 
        auth_views.PasswordResetCompleteView.as_view(
            template_name='users/password_reset_complete.html'), 
        name='password_reset_complete'),
    
    # Admin views
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('user-detail/<int:user_id>/', views.user_detail, name='user_detail'),
]