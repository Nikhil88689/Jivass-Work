from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm, PasswordResetForm, SetPasswordForm, PasswordChangeForm
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from .models import UserProfile

User = get_user_model()

class CustomUserCreationForm(UserCreationForm):
    """
    A form for creating new users with email as the unique identifier
    """
    email = forms.EmailField(
        label=_("Email"),
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'})
    )
    first_name = forms.CharField(
        label=_("First Name"),
        max_length=30,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First Name'})
    )
    last_name = forms.CharField(
        label=_("Last Name"),
        max_length=30,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last Name'})
    )
    password1 = forms.CharField(
        label=_("Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password'})
    )
    password2 = forms.CharField(
        label=_("Confirm Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Confirm Password'})
    )
    phone_number = forms.CharField(
        label=_("Phone Number"),
        max_length=15,
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Phone Number'})
    )
    date_of_birth = forms.DateField(
        label=_("Date of Birth"),
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date',
            'placeholder': 'YYYY-MM-DD'
        })
    )
    terms_agreement = forms.BooleanField(
        label=_("I agree to the Terms and Conditions"),
        required=True,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'phone_number', 'date_of_birth', 'password1', 'password2')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.phone_number = self.cleaned_data['phone_number']
        user.date_of_birth = self.cleaned_data['date_of_birth']
        if commit:
            user.save()
            # Create an empty profile for the user
            UserProfile.objects.create(user=user)
        return user

class CustomAuthenticationForm(AuthenticationForm):
    """
    A form for authenticating users with styled form fields
    """
    username = forms.EmailField(
        label=_("Email"),
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'})
    )
    password = forms.CharField(
        label=_("Password"),
        strip=False,
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password'})
    )
    remember_me = forms.BooleanField(
        label=_("Remember Me"),
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )

class CustomPasswordResetForm(PasswordResetForm):
    """
    A form for resetting password with styled form fields
    """
    email = forms.EmailField(
        label=_("Email"),
        max_length=254,
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'})
    )

class CustomSetPasswordForm(SetPasswordForm):
    """
    A form for setting a new password with styled form fields
    """
    new_password1 = forms.CharField(
        label=_("New Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'New Password'})
    )
    new_password2 = forms.CharField(
        label=_("Confirm New Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Confirm New Password'})
    )

class CustomPasswordChangeForm(PasswordChangeForm):
    """
    A form for changing password with styled form fields
    """
    old_password = forms.CharField(
        label=_("Current Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Current Password'})
    )
    new_password1 = forms.CharField(
        label=_("New Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'New Password'})
    )
    new_password2 = forms.CharField(
        label=_("Confirm New Password"),
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Confirm New Password'})
    )

class UserProfileForm(forms.ModelForm):
    """
    A form for updating user profile information
    """
    class Meta:
        model = UserProfile
        fields = ('bio', 'profile_picture', 'address')
        widgets = {
            'bio': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'profile_picture': forms.FileInput(attrs={'class': 'form-control'}),
            'address': forms.TextInput(attrs={'class': 'form-control'}),
        }

class UserUpdateForm(forms.ModelForm):
    """
    A form for updating user information
    """
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone_number', 'date_of_birth')
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control'}),
            'date_of_birth': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        } 