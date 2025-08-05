# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_alter_userfaceimage_image_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userfaceimage',
            name='angle_index',
            field=models.IntegerField(default=0, help_text='Index representing the angle of the face image (0-9)'),
            preserve_default=False,
        ),
    ]