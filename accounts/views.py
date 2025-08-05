from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.sites.shortcuts import get_current_site
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.urls import reverse_lazy
from django.views.generic import UpdateView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import (
    PasswordChangeView, PasswordResetView, 
    PasswordResetConfirmView, PasswordResetCompleteView,
    PasswordResetDoneView
)

from .forms import (
    CustomUserCreationForm, CustomAuthenticationForm, 
    CustomPasswordResetForm, CustomSetPasswordForm, 
    CustomPasswordChangeForm, UserProfileForm, UserUpdateForm
)
from .models import CustomUser, UserProfile
from .tokens import account_activation_token

User = get_user_model()

def home(request):
    """Home page view"""
    return render(request, 'users/home.html')

def register(request):
    """User registration view"""
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_active = True  # Changed to True for easier testing, change back to False for production
            user.save()
            
            # Create user profile
            UserProfile.objects.get_or_create(user=user)
            
            # For easier testing, we'll skip email verification and just log the user in
            login(request, user)
            messages.success(request, f'Account created successfully! Welcome, {user.first_name}!')
            return redirect('home')
            
            # Uncomment this for email verification in production
            '''
            # Send activation email
            current_site = get_current_site(request)
            mail_subject = 'Activate your account'
            message = render_to_string('users/account_activation_email.html', {
                'user': user,
                'domain': current_site.domain,
                'uid': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': account_activation_token.make_token(user),
            })
            to_email = form.cleaned_data.get('email')
            email = EmailMessage(mail_subject, message, to=[to_email])
            email.send()
            
            messages.success(request, 'Please confirm your email address to complete the registration.')
            return redirect('login')
            '''
    else:
        form = CustomUserCreationForm()
    
    return render(request, 'users/register.html', {'form': form})

def activate_account(request, uidb64, token):
    """Account activation view"""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    
    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.is_verified = True
        user.save()
        login(request, user)
        messages.success(request, 'Your account has been activated successfully!')
        return redirect('home')
    else:
        messages.error(request, 'Activation link is invalid!')
        return redirect('login')

def user_login(request):
    """User login view"""
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('username')  # The field is named 'username' in the form but contains email
            password = form.cleaned_data.get('password')
            remember_me = form.cleaned_data.get('remember_me')
            
            # Use email instead of username for authentication
            user = authenticate(request, email=email, password=password)
            if user is not None:
                login(request, user)
                
                if not remember_me:
                    # Session expires when the user closes the browser
                    request.session.set_expiry(0)
                
                messages.success(request, f'Welcome back, {user.first_name if user.first_name else user.email}!')
                return redirect('home')
            else:
                messages.error(request, 'Invalid email or password.')
        else:
            messages.error(request, 'Invalid email or password.')
    else:
        form = CustomAuthenticationForm()
    
    return render(request, 'users/login.html', {'form': form})

@login_required
def user_logout(request):
    """User logout view"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('login')

@login_required
def profile(request):
    """User profile view"""
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, request.FILES, instance=request.user.profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile has been updated successfully!')
            return redirect('profile')
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = UserProfileForm(instance=request.user.profile)
    
    context = {
        'user_form': user_form,
        'profile_form': profile_form
    }
    
    return render(request, 'users/profile.html', context)

class CustomPasswordChangeView(LoginRequiredMixin, PasswordChangeView):
    """Custom password change view"""
    form_class = CustomPasswordChangeForm
    template_name = 'users/password_change.html'
    success_url = reverse_lazy('password_change_done')

class CustomPasswordResetView(PasswordResetView):
    """Custom password reset view"""
    form_class = CustomPasswordResetForm
    template_name = 'users/password_reset.html'
    email_template_name = 'users/password_reset_email.html'
    success_url = reverse_lazy('password_reset_done')

class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    """Custom password reset confirm view"""
    form_class = CustomSetPasswordForm
    template_name = 'users/password_reset_confirm.html'
    success_url = reverse_lazy('password_reset_complete')

@login_required
def admin_dashboard(request):
    """Admin dashboard view"""
    if not request.user.is_staff:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('home')
    
    users = User.objects.all()
    context = {
        'users': users
    }
    
    return render(request, 'users/admin_dashboard.html', context)

@login_required
def user_detail(request, user_id):
    """User detail view for admins"""
    if not request.user.is_staff:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('home')
    
    user = get_object_or_404(User, id=user_id)
    context = {
        'user_detail': user
    }
    
    return render(request, 'users/user_detail.html', context)