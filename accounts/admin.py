from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser, UserProfile, Location, Attendance, UserFaceImage

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'
    fk_name = 'user'

class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_verified')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'phone_number', 'date_of_birth')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified',
                                       'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__email',)
    list_filter = ('user__is_active',)

class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'latitude', 'longitude', 'radius', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'check_in_time', 'check_out_time', 'duration')
    list_filter = ('check_in_time', 'check_out_time')
    search_fields = ('user__email',)
    readonly_fields = ('duration',)

class UserFaceImageAdmin(admin.ModelAdmin):
    list_display = ('user', 'angle_index', 'created_at', 'updated_at')
    list_filter = ('angle_index', 'created_at', 'updated_at')
    search_fields = ('user__email',)
    ordering = ('user', 'angle_index')

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Location, LocationAdmin)
admin.site.register(Attendance, AttendanceAdmin)
admin.site.register(UserFaceImage, UserFaceImageAdmin)
