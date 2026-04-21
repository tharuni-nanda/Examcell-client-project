from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.conf import settings


# -----------------------------
#  CUSTOM USER FOR OTP LOGIN
# -----------------------------
class UserManager(BaseUserManager):
    def create_user(self, college_email, password=None, role='faculty'):
        if not college_email:
            raise ValueError("Users must have a college email")
        user = self.model(college_email=self.normalize_email(college_email), role=role)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, college_email, password):
        user = self.create_user(college_email, password=password, role='coe')
        user.is_superuser = True
        user.is_staff = True
        user.save(using=self._db)
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = None  #disable username completely

    ROLE_CHOICES = [
        ('coe', 'COE'),
        ('faculty', 'Faculty'),
    ]

    college_email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'college_email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.college_email} ({self.role})"

'''
class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('coe', 'COE'),
        ('faculty', 'Faculty'),
    ]

    college_email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'college_email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.college_email} ({self.role})"'''


# -----------------------------
#  BATCH management MODEL 
# -----------------------------
class Batch(models.Model):
    batch_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)

    start_year = models.IntegerField()
    end_year = models.IntegerField()  # start_year + 6
    current_level = models.CharField(max_length=10, default="PUC1")
    current_academic_year = models.CharField(max_length=20)
    current_semester = models.CharField(max_length=10, default="Sem1")
    status = models.CharField(max_length=20, default="Active")  # Active / Completed

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.status == "Active":
            existing = Batch.objects.filter(
                current_level=self.current_level,
                status="Active"
            ).exclude(id=self.id)

            if existing.exists():
                raise ValidationError(
                    f"Level {self.current_level} already has an active batch."
                )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.batch_id} ({self.current_level})"


# -----------------------------
#  STUDENT MODEL
# -----------------------------
class Student(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="students")

    student_id = models.CharField(max_length=40)
    name = models.CharField(max_length=200)

    course = models.CharField(max_length=20, default="PUC")  # PUC or ENGG
    branch = models.CharField(max_length=50, blank=True)      # empty for PUC
    section = models.CharField(
        max_length=5,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("batch", "student_id")

    def __str__(self):
        return f"{self.student_id} — {self.name}"


# -------------------------------------------------------------------------------------------------------
#  MARKS ENTRY  MODEL  ALSO FOR ACADEMIC MANAGEMENT PAGES MODELS
# -----------------------------------------------------------------------------------

class Subject(models.Model):

    exam_scheme = models.CharField(
        max_length=30,
        choices=[
            ("MID20", "Mid 20 (Best 2)"),
            ("MID15_AT4", "Mid 15 + AT 4"),
            ("MID40", "Mid 40 (Best 2 Avg)"),
            ("EST100", "Only EST 100"),
            ("LAB", "Internal + External"),
            ("INTERNSHIP", "External Only"),
            ("ZERO_CREDIT", "Zero Credit"), 
        ],
        blank=True,
        null=True
        #default="MID20"
    )

    SUBJECT_TYPES = [
        ("THEORY", "Theory"),
        ("LAB", "Lab"),
        ("PROJECT", "Project"),
        ("INTERNSHIP", "Internship"),
        ("ELECTIVE", "Elective"),
    ]

    SEMESTER_CHOICES = [
        ("Sem1", "Semester 1"),
        ("Sem2", "Semester 2"),
    ]

    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    credits = models.DecimalField(max_digits=3,decimal_places=1)
    level = models.CharField(max_length=20)  # PUC1, E1, E2 etc
    regulation = models.CharField(max_length=10, null=True, blank=True)

    semester = models.CharField(
        max_length=10,
        choices=SEMESTER_CHOICES,
        default="Sem1"
    )

    BRANCH_CHOICES = [
        ("CSE", "CSE"),
        ("ECE", "ECE"),
        ("EEE", "EEE"),
        ("AIML", "AIML"),
        ("MECH", "MECH"),
        ("CIVIL", "CIVIL"),
        ("CHEM", "CHEM"),
        ("MME", "MME"),
    ]

    branch = models.CharField(
        max_length=20,
        choices=BRANCH_CHOICES,
        blank=True,
        null=True
    )

    subject_type = models.CharField(
        max_length=20,
        choices=SUBJECT_TYPES,
        default="THEORY"
    )
    class Meta:
        unique_together = (
            "code",
            "regulation",
            "level",
            "semester",
            "branch",
        )


    def __str__(self):
        return f"{self.code} - {self.name}"



#subject enrollments

class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE)
    section = models.CharField(max_length=5, null=True, blank=True)
    semester = models.CharField(max_length=10)

    class Meta:
        unique_together = ("student", "subject", "semester", "batch")


# marks model
class Marks(models.Model):
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE)

    mid1 = models.FloatField(null=True, blank=True)
    mid2 = models.FloatField(null=True, blank=True)
    mid3 = models.FloatField(null=True, blank=True)

    at1 = models.FloatField(null=True, blank=True)
    at2 = models.FloatField(null=True, blank=True)
    at3 = models.FloatField(null=True, blank=True)
    at4 = models.FloatField(null=True, blank=True)

    est = models.FloatField(null=True, blank=True)
    internal = models.FloatField(null=True, blank=True)
    external = models.FloatField(null=True, blank=True)
    #handle absenties
    #is_absent = models.BooleanField(default=False)
    mid1_absent = models.BooleanField(default=False)
    mid2_absent = models.BooleanField(default=False)
    mid3_absent = models.BooleanField(default=False)
    est_absent = models.BooleanField(default=False)
    internal_absent = models.BooleanField(default=False)
    external_absent = models.BooleanField(default=False)

    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    updated_at = models.DateTimeField(auto_now=True)


#results models
class Result(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    semester = models.CharField(max_length=10)

    sgpa = models.FloatField()
    cgpa = models.FloatField()

    calculated_at = models.DateTimeField(auto_now=True)

#marksHistory
class MarksHistory(models.Model):
    marks = models.ForeignKey(Marks, on_delete=models.CASCADE, related_name="history")
    field = models.CharField(max_length=20)
    old_value = models.FloatField(null=True, blank=True)
    new_value = models.FloatField(null=True, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    was_absent = models.BooleanField(default=False)
    is_absent = models.BooleanField(default=False)


# -------------------- FOR DASHBOARD SECTION ----------------------
# exam staus which exam is active
from django.core.exceptions import ValidationError

class ExamStatus(models.Model):
    batch = models.ForeignKey("Batch", on_delete=models.CASCADE)
    level = models.CharField(max_length=20)
    semester = models.CharField(max_length=10)
    exam_type = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.batch.current_level != self.level:
            raise ValidationError("Level must match batch current level.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

# ------------------- NOTIFICATION MODELS----------------
class Notification(models.Model):
    title = models.CharField(max_length=255)
    message = models.TextField()
    level = models.CharField(max_length=20)
    batch = models.ForeignKey(Batch, null=True, blank=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

#--------------------- Activity log--------------------
class ActivityLog(models.Model):
    ACTION_TYPES = [
        ("MARK_UPDATE", "Mark Update"),
        ("BATCH_PROMOTE", "Batch Promote"),
        ("BATCH_CREATE", "Batch Create"),
        ("BATCH_COMPLETE", "Batch Complete"),
        ("SUBJECT_CREATE", "Subject Create"),
        ("PDF_EXPORT", "PDF Export"),
        ("BULK_UPLOAD", "Bulk Upload"),
        ("NOTIFICATION", "Notification"),
        ("ELECTIVE_ASSIGN", "Elective Assignment"),
        ("UPLOAD_SECTIONS", "Upload Sections"),
    ]

    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    description = models.TextField()

    batch = models.ForeignKey(Batch, null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.ForeignKey(Subject, null=True, blank=True, on_delete=models.SET_NULL)

    level = models.CharField(max_length=100, null=True, blank=True)
    semester = models.CharField(max_length=100, null=True, blank=True)
    branch = models.CharField(max_length=20, null=True, blank=True)
    section = models.CharField(max_length=5, null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)

#---------------- FACULTY ROLE BASED LOGIN OR LEVEL BAESD LOGINS-------------------
class Faculty(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    level = models.CharField(max_length=10)
    #branch = models.CharField(max_length=20, blank=True, null=True)