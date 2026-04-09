from django.shortcuts import render

# Create your views here.
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from .models import Batch, Student
from .serializers import BatchSerializer, StudentSerializer
from .serializers import (
    BatchSerializer,
    StudentSerializer,
    SubjectSerializer,
    MarksSerializer,
)
from .models import *

import csv, io
from django.db.models import Count, Sum, Avg
'''--------------------------------------------------------------'''
from .serializers import BatchSerializer
from django.core.mail import send_mail
from django.utils import timezone
from django.contrib.auth import authenticate
from .models import CustomUser
import random
#from staff.marks_calculation import 
#from staff.services.marks_calculation import calculate_internal
from staff.services.marks_calculation import (
    best_of_two,
    calculate_internal,
    calculate_sgpa
)
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from rest_framework.permissions import AllowAny
from .models import ExamStatus, ActivityLog
from .permissions import IsCOE
from rest_framework_simplejwt.tokens import RefreshToken



'''-----------------------------------------------------------'''
#------------- role names for coe and faculty for active log-------------------
def get_user_label(user):
    if not user:
        return "System"

    if user.role == "coe":
        return "COE"

    if user.role == "faculty":
        faculty = Faculty.objects.filter(user=user).first()
        if faculty:
            return f"{faculty.level} Faculty"
        return "Faculty"

    return "User"


#------------------------------------------------------------------------------
# order of progression
LEVEL_ORDER = ["PUC1", "PUC2", "E1", "E2", "E3", "E4"]

def compute_academic_year(start_year: int, level: str) -> str:
    """
    Given batch start_year and current level, compute academic year string.
    Example: start_year=2020, level="E3" -> base = 2020 + 4 -> "2024–2025"
    """
    idx = LEVEL_ORDER.index(level)
    base = start_year + idx
    return f"{base}–{base + 1}"


@api_view(["GET"])
def list_batches(request):
    """
    GET /api/batches/
    Return list of batches including students (read_only in serializer).
    """
    qs = Batch.objects.all().order_by("-start_year", "batch_id")
    serializer = BatchSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsCOE])
def add_batch(request):
    """
    POST /api/batches/add/
    Create a new batch (always starts as PUC1).
    Required multipart/form-data fields:
      - batch_id
      - name
      - start_year (int)
      - file (CSV) required: id,name,course (course ignored; saved as PUC)
    """
    try:
        batch_id = request.data.get("batch_id") or request.data.get("id") or request.data.get("batchId")
        name = request.data.get("name")
        start_year_raw = request.data.get("start_year") or request.data.get("startYear")
        if not batch_id or not name or not start_year_raw:
            return Response({"error": "batch_id, name and start_year are required"}, status=400)

        start_year = int(start_year_raw)
        end_year = start_year + 6
        initial_level = "PUC1"
        current_academic_year = compute_academic_year(start_year, initial_level)

        # create batch
        batch = Batch.objects.create(
            batch_id=batch_id,
            name=name,
            start_year=start_year,
            end_year=end_year,
            current_level=initial_level,
            current_academic_year=current_academic_year,
            status="Active"
        )

        # initial CSV required
        if "file" not in request.FILES:
            return Response({"error": "Initial students CSV file is required"}, status=400)

        f = request.FILES["file"]
        text = f.read().decode("utf-8")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        # detect header row: if first cell contains 'id' or 'student'
        if rows and rows[0] and rows[0][0].lower().startswith(("id", "student")):
            rows = rows[1:]

        created = 0
        for row in rows:
            if len(row) < 2:
                continue
            sid = row[0].strip()
            sname = row[1].strip()
            # create student under this batch with course=PUC; branch empty
            Student.objects.create(batch=batch, student_id=sid, name=sname, course="PUC", branch="")
            created += 1
        # Activity Log
        ActivityLog.objects.create(
            action_type="BATCH_CREATE",
            description=f"{batch.batch_id} batch created with {created} students",
            batch=batch,
            level=initial_level,
            created_by=request.user
        )

        # Notification
        Notification.objects.create(
            title="New Batch Created",
            message=f"{batch.batch_id} created at {initial_level} - Sem1. Please create subjects.",
            batch=batch,
            level=initial_level
        )

        return Response({"message": f"Batch {batch_id} created with {created} students", "batch_id": batch.batch_id})

    except Exception as e:
        return Response({"error": str(e)}, status=400)



@api_view(["POST"])
@permission_classes([IsAuthenticated, IsCOE])

def promote_batch(request, batch_id):
    """
    POST /api/batches/<batch_id>/promote/
    Promote batch one level forward. Rules:
      - PUC1 -> PUC2  (no file)
      - PUC2 -> E1   (file required: id,name,branch) -> match by student_id and update branch & course="ENGG"
      - E1 -> E2 -> E3 -> E4 (no file)
      - E4 -> Completed
    If PUC2->E1 CSV contains an id not present, we create a new Student (optional behavior).
    """
    try:
        try:
            batch = Batch.objects.get(batch_id=batch_id)
        except Batch.DoesNotExist:
            return Response({"error": "Batch not found"}, status=404)

        current = batch.current_level

        # PUC1 -> PUC2
        if current == "PUC1":
            batch.current_level = "PUC2"
            batch.current_semester = "Sem1"
            batch.current_academic_year = compute_academic_year(batch.start_year, "PUC2")
            batch.save()
            #active exams kill after batch promotion 
            ExamStatus.objects.filter(batch=batch, is_active=True).update(is_active=False)
            # activity shows after promotions 
            ActivityLog.objects.create(
                action_type="BATCH_PROMOTE",
                description=f"{batch.batch_id} promoted to PUC2",
                batch=batch,
                level="PUC2",
                created_by=request.user
            )
            Notification.objects.create(
                title="Batch Promoted",
                message=f"{batch.batch_id} promoted to PUC2 - Sem1. Please create subjects.",
                batch=batch,
                level=next_level
            )
            return Response({"message": "Promoted to PUC2 (no CSV required)"})

        # PUC2 -> E1 (requires file)
        if current == "PUC2":
            if "file" not in request.FILES:
                return Response({"error": "CSV file required for PUC2 -> E1 (id,name,branch)"}, status=400)

            f = request.FILES["file"]
            text = f.read().decode("utf-8")
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)

            # skip header if present
            if rows and rows[0] and rows[0][0].lower().startswith(("id", "student")):
                rows = rows[1:]

            matched = 0
            updated = 0
            created_new = 0

            for row in rows:
                if len(row) < 3:
                    continue
                sid = row[0].strip()
                sname = row[1].strip()
                branch = row[2].strip()

                try:
                    student = Student.objects.get(batch=batch, student_id=sid)
                    matched += 1
                    student.branch = branch
                    student.course = "ENGG"
                    if sname:
                        student.name = sname
                    student.save()
                    updated += 1
                except Student.DoesNotExist:
                    # create new student record if id not present (optional; you can change to skip/raise)
                    Student.objects.create(batch=batch, student_id=sid, name=sname, course="ENGG", branch=branch)
                    created_new += 1

            # set to E1
            batch.current_level = "E1"
            batch.current_semester = "Sem1"
            batch.current_academic_year = compute_academic_year(batch.start_year, "E1")
            batch.save()
            #active exams kill after batch promotion 
            ExamStatus.objects.filter(batch=batch, is_active=True).update(is_active=False)
            # activity shows after promotions 
            ActivityLog.objects.create(
                action_type="BATCH_PROMOTE",
                description=f"{batch.batch_id} promoted to E1",
                batch=batch,
                level="E1",
                created_by=request.user
            )
            Notification.objects.create(
                title="Batch Promoted",
                message=f"{batch.batch_id} promoted to E1 - Sem1. Please create subjects.",
                batch=batch,
                level=next_level
            )
            return Response({
                "message": "Promoted to E1",
                "matched": matched,
                "updated": updated,
                "created_new": created_new
            })

        # Engineering promotions E1 -> E2 -> E3 -> E4
        if current in ["E1", "E2", "E3"]:
            idx = LEVEL_ORDER.index(current)
            next_level = LEVEL_ORDER[idx + 1]
            batch.current_level = next_level
            batch.current_semester = "Sem1"
            batch.current_academic_year = compute_academic_year(batch.start_year, next_level)
            batch.save()
            #active exams kill after batch promotion 
            ExamStatus.objects.filter(batch=batch, is_active=True).update(is_active=False)
            # activity shows after promotions 
            ActivityLog.objects.create(
                action_type="BATCH_PROMOTE",
                description=f"{batch.batch_id} promoted to {next_level}",
                batch=batch,
                level=next_level,
                created_by=request.user
            ) 
            Notification.objects.create(
                title="Batch Promoted",
                message=f"{batch.batch_id} promoted to {next_level} - Sem1. Please create subjects.",
                batch=batch,
                level=next_level
            )           
            return Response({"message": f"Promoted to {next_level}"})

        # E4 Sem2 -> Completed
        if current == "E4" and batch.current_semester == "Sem2":

            batch.status = "Completed"
            batch.current_academic_year = compute_academic_year(batch.start_year, "E4")
            batch.save()

            # deactivate active exams
            ExamStatus.objects.filter(batch=batch, is_active=True).update(is_active=False)

            # activity log
            ActivityLog.objects.create(
                action_type="BATCH_COMPLETE",
                description=f"{batch.batch_id} marked completed",
                batch=batch,
                level=batch.current_level,   # keep E4
                semester=batch.current_semester,
                created_by=request.user
            )

            # notification
            Notification.objects.create(
                title="Batch Completed",
                message=f"{batch.batch_id} marked as Completed.",
                batch=batch,
                level=batch.current_level   # VERY IMPORTANT
            )

            return Response({"message": "Batch marked Completed"})

        return Response({"error": "Invalid promotion state"}, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

#----------------------------------------------------
#       SEMISTER PROMOTION FROM SEM1 TO SEM2 ONLY COE
#---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsCOE])
def promote_semester(request):

    batch_id = request.data.get("batch_id")

    try:
        batch = Batch.objects.get(batch_id=batch_id)
    except Batch.DoesNotExist:
        return Response({"error": "Batch not found"}, status=404)

    if batch.current_semester == "Sem1":
        batch.current_semester = "Sem2"

        # deactivate any active exams
        ExamStatus.objects.filter(batch=batch, is_active=True).update(is_active=False)

    else:
        return Response({"error": "Already in final semester"}, status=400)

    batch.save()

    # Notification
    Notification.objects.create(
        title="Semester Promoted",
        message=f"{batch.batch_id} promoted to {batch.current_level} - {batch.current_semester}.Please create subjects.",
        batch=batch,
        level=batch.current_level
    )

    # Activity Log
    ActivityLog.objects.create(
        action_type="SEM_PROMOTE",
        description=f"{batch.batch_id} semester promoted to {batch.current_semester}",
        batch=batch,
        level=batch.current_level,
        created_by=request.user
    )

    return Response({
        "message": "Semester promoted successfully",
        "current_semester": batch.current_semester
    })
'''------------------------------------------------------------'''

@api_view(['GET'])
def test_connection(request):
    return Response({"message": "Hello from Django backend!"})


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    email = request.data.get('email')
    if not email.endswith("@rguktrkv.ac.in"):
        return Response({"error": "Use college domain email"}, status=400)
    try:
        user = CustomUser.objects.get(college_email=email, role='coe')
        otp = str(random.randint(100000, 999999))
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()

        send_mail(
            'Exam Cell OTP Verification',
            f'Your OTP is {otp}',
            settings.EMAIL_HOST_USER,#'noreply@examcell.com',
            [email],
            fail_silently=False,
        )

        return Response({'message': 'OTP sent successfully'})
    except CustomUser.DoesNotExist:
        return Response({'error': 'COE not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    try:
        user = CustomUser.objects.get(college_email=email, otp=otp, role='coe')
        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "role": "coe"
        })
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def faculty_login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    if not email.endswith("@rguktrkv.ac.in"):
        return Response({"error": "Use college domain email"}, status=400)

    try:
        user = CustomUser.objects.get(college_email=email, role='faculty')
        if user.check_password(password):
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            faculty = Faculty.objects.filter(user=user).first()
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "role": "faculty",
                "level": faculty.level if faculty else None
            })
        else:
            return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid email'}, status=status.HTTP_404_NOT_FOUND)


'''
# ---------- BATCHES ----------
@api_view(['GET'])
def get_batches(request):
    batches = Batch.objects.all().order_by('-year')
    serializer = BatchSerializer(batches, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def add_batch(request):
    serializer = BatchSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        ActivityLog.objects.create(action="Batch Added", details=f"Added batch {serializer.data['name']}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def promote_batch(request, batch_id):
    try:
        batch = Batch.objects.get(batch_id=batch_id)
    except Batch.DoesNotExist:
        return Response({"error": "Batch not found"}, status=404)
    
    next_section = request.data.get("next_section", "")
    batch.section = next_section
    batch.status = "Active"
    batch.save()
    ActivityLog.objects.create(action="Batch Promoted", details=f"Batch {batch.name} promoted to {next_section}")
    return Response({"message": "Batch promoted successfully"}, status=200)

# ---------- STUDENTS ----------
@api_view(['POST'])
def upload_students(request, batch_id):
    file = request.FILES['file']
    batch = Batch.objects.get(batch_id=batch_id)

    decoded_file = file.read().decode('utf-8').splitlines()
    reader = csv.DictReader(decoded_file)
    for row in reader:
        Student.objects.create(
            roll_no=row['RollNo'],
            name=row['Name'],
            branch=row['Branch'],
            semester=row['Semester'],
            marks=row.get('Marks', 0),
            batch=batch,
            status="Entered"
        )
    batch.total_students = batch.students.count()
    batch.save()
    ActivityLog.objects.create(
        action="Student Upload",
        details=f"Uploaded {batch.students.count()} students to batch {batch.name}"
    )
    return Response({"message": "Students uploaded successfully"})


# ---------- DASHBOARD STATS ----------
@api_view(['GET'])
def dashboard_stats(request):
    total_students = Student.objects.count()
    active_batches = Batch.objects.filter(status="Active").count()
    completed_batches = Batch.objects.filter(status="Completed").count()
    pending_marks = Student.objects.filter(status="Pending").count()
    avg_marks = Student.objects.aggregate(avg=Avg('marks'))['avg'] or 0

    stats = {
        "total_students": total_students,
        "active_batches": active_batches,
        "completed_batches": completed_batches,
        "pending_marks": pending_marks,
        "completed_exams_percent": round((100 - (pending_marks / total_students * 100)) if total_students else 0, 2),
        "average_marks": round(avg_marks, 2)
    }
    return Response(stats)

# ---------- ACTIVITY LOG ----------
@api_view(['GET'])
def get_activity_log(request):
    logs = ActivityLog.objects.all().order_by('-timestamp')[:20]
    serializer = ActivityLogSerializer(logs, many=True)
    return Response(serializer.data)
'''

#----------------------- MARKS ENTRY ------------------------------------------
#internal = calculate_internal(marks)
#sgpa = calculate_sgpa(subjects)

from staff.services.marks_calculation import calculate_internal
from .models import Marks, Enrollment
from .serializers import MarksSerializer
from staff.services.marks_calculation import calculate_sgpa
from .models import Result, Subject

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_marks(request):
    batch_id = request.GET.get("batch")
    semester = request.GET.get("semester")
    level = request.GET.get("level")
    subject_code = request.GET.get("subject")
    section = request.GET.get("section")

    qs = Marks.objects.select_related(
        "enrollment__student",
        "enrollment__subject",
        "entered_by"
    ).order_by("enrollment__student__student_id")

    if batch_id:
        qs = qs.filter(enrollment__batch__batch_id=batch_id)

    if semester:
        qs = qs.filter(enrollment__semester=semester)

    if level:
        qs = qs.filter(enrollment__subject__level=level)

    if subject_code:
        qs = qs.filter(enrollment__subject__code=subject_code)
    
        subject_obj = Subject.objects.filter(code=subject_code).first()
        if subject_obj and subject_obj.branch:
            qs = qs.filter(enrollment__student__branch=subject_obj.branch)
    
    if section:
        qs = qs.filter(enrollment__student__section=section)

    data = []

    for m in qs:
        subject_type = m.enrollment.subject.subject_type

        if subject_type == "THEORY":
            internal_marks = calculate_internal(m)
            total = internal_marks + (m.est or 0)

        elif subject_type in ["LAB", "PROJECT", "ELECTIVE"]:
            total = (m.internal or 0) + (m.external or 0)

        elif subject_type == "INTERNSHIP":
            total = m.external or 0

        else:
            total = 0

        #grade = marks_to_grade(total)
        credits = m.enrollment.subject.credits
        grade = marks_to_grade(total, credits)


        data.append({
            "marks_id": m.id,
            "student_id": m.enrollment.student.student_id,
            "name": m.enrollment.student.name,
            "branch": m.enrollment.student.branch,
            "semester": m.enrollment.semester,
            "section": m.enrollment.student.section,
            "subject_type": m.enrollment.subject.subject_type,
            "exam_scheme": m.enrollment.subject.exam_scheme,
            "credits": m.enrollment.subject.credits,
            "level": m.enrollment.subject.level,

            # THEORY FIELDS
            "mid1": m.mid1,
            "mid2": m.mid2,
            "mid3": m.mid3,
            "at1": m.at1,
            "at2": m.at2,
            "at3": m.at3,
            "at4": m.at4,
            "est": m.est,

            # LAB / PROJECT / ELECTIVE FIELDS
            "internal": m.internal,
            "external": m.external,

            "subject_type": subject_type,

            "total": round(total, 2),
            "grade": grade,

            "updated_at": m.updated_at,
            "entered_by": m.entered_by.college_email if m.entered_by else None
        })
    return Response({"students": data})




GRADE_MAP = {
    "EX": 10,
    "A": 9,
    "B": 8,
    "C": 7,
    "D": 6,
    "E": 5,
    "F": 0
}

def marks_to_grade(total, credits):
    if credits == 0:
        return "P" if total >= 40 else "F"

    if total >= 92: return "EX"
    if total >= 82: return "A"
    if total >= 72: return "B"
    if total >= 62: return "C"
    if total >= 52: return "D"
    if total >= 42: return "E"
    return "F"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calculate_results(request):
    """
    Calculate SGPA & CGPA for a student
    """
    student_id = request.data.get("student_id")
    semester = request.data.get("semester")

    enrollments = Enrollment.objects.filter(
        student__student_id=student_id,
        semester=semester
    ).select_related("subject")

    subjects_data = []

    for enr in enrollments:
        marks = Marks.objects.get(enrollment=enr)

        internal = calculate_internal(marks)
        total = internal + marks.est

        #grade = marks_to_grade(total)
        credits = m.enrollment.subject.credits
        grade = marks_to_grade(total, credits)

        grade_point = GRADE_MAP[grade]

        subjects_data.append(
            type("obj", (), {
                "grade_point": grade_point,
                "credits": enr.subject.credits
            })
        )

    sgpa = calculate_sgpa(subjects_data)

    prev = Result.objects.filter(student__student_id=student_id)
    cgpa = round(
        (sum(r.sgpa for r in prev) + sgpa) / (prev.count() + 1),
        2
    )

    Result.objects.create(
        student_id=student_id,
        semester=semester,
        sgpa=sgpa,
        cgpa=cgpa
    )

    return Response({
        "sgpa": sgpa,
        "cgpa": cgpa
    })

from .models import Enrollment, Marks, Subject

def create_enrollments_and_marks(batch):
    students = batch.students.all()
    subjects = Subject.objects.filter(level=batch.current_level)

    for student in students:
        for subject in subjects:
            enrollment, created = Enrollment.objects.get_or_create(
                student=student,
                subject=subject,
                batch=batch,
                defaults={"semester": "Sem1"}
            )

            Marks.objects.get_or_create(
                enrollment=enrollment
            )

# for list of sunbjects in marks entry
@api_view(["GET"])
def list_subjects(request):
    level = request.GET.get("level")
    semester = request.GET.get("semester")
    branch = request.GET.get("branch")
    regulation = request.GET.get("batch")


    qs = Subject.objects.all()

    if level:
        qs = qs.filter(level=level)

    if semester:
        qs = qs.filter(semester=semester)

    if branch and branch.strip() != "": #it avoids empty string of branch
        qs = qs.filter(branch=branch)
    
    if regulation:
        qs = qs.filter(regulation=regulation)


    serializer = SubjectSerializer(qs, many=True)
    return Response(serializer.data)



#history api
@api_view(["GET"])
#@permission_classes([IsAuthenticated])
def marks_history(request):
    marks_id = request.GET.get("marks_id")

    history = MarksHistory.objects.filter(marks_id=marks_id).order_by("-changed_at")

    return Response([
        {
            "field": h.field,
            "old": h.old_value,
            "new": h.new_value,
            "by": h.changed_by.college_email if h.changed_by else None,
            "role": h.changed_by.role if h.changed_by else None,
            "at": h.changed_at
        }
        for h in history
    ])


#---------------------- enrollement of the subjects for the batch of the students---------------
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Batch, Subject, Enrollment, Marks


@api_view(["POST"])
def setup_semester(request):

    batch_id = request.data.get("batch_id")
    semester = request.data.get("semester")

    if not batch_id or not semester:
        return Response(
            {"error": "batch_id and semester are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        batch = Batch.objects.get(batch_id=batch_id)
    except Batch.DoesNotExist:
        return Response(
            {"error": "Batch not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get subjects for this batch level + regulation + semester
    subjects = Subject.objects.filter(
        level=batch.current_level,
        regulation=batch.batch_id,
        semester=semester
    )

    created_count = 0

    for subject in subjects:

        #  CRITICAL FIX — Branch Filtering
        if subject.branch:
            students = batch.students.filter(branch=subject.branch)
        else:
            students = batch.students.all()

        for student in students:

            enrollment, created = Enrollment.objects.get_or_create(
                student=student,
                subject=subject,
                batch=batch,
                defaults={"semester": semester}
            )

            if created:
                Marks.objects.get_or_create(enrollment=enrollment)
                created_count += 1

    return Response({
        "message": "Semester initialized successfully",
        "batch": batch_id,
        "semester": semester,
        "enrollments_created": created_count
    })


#marks history save marks
from .models import MarksHistory
from .permissions import IsFaculty

@api_view(["POST"])
@permission_classes([IsAuthenticated])

def save_marks(request):
    marks_id = request.data.get("marks_id")
   
    if not marks_id:
        return Response({"error": "marks_id is required"}, status=400)

    try:
        marks = Marks.objects.get(id=marks_id)
        # FACULTY EDIT RESTRICTION
        if request.user.role == "faculty":
            faculty = Faculty.objects.filter(user=request.user).first()
            if not faculty:
                return Responce({"error":"Faculty profile not configured"}, status=403)

            # Restrict level
            if marks.enrollment.batch.current_level != faculty.level:
                return Response({"error": "You cannot edit this level"}, status=403)

            # Restrict branch (only for engineering)
            #if faculty.branch and marks.enrollment.student.branch != faculty.branch:
                #return Response({"error": "You cannot edit this branch"}, status=403)

    except Marks.DoesNotExist:
        return Response({"error": "Marks not found"}, status=404)

     # Lock Completed Batch which means can't be editable for the completed ones
    batch = marks.enrollment.batch
    if batch.status == "Completed":
        return Response({"error": "Cannot edit completed batch"}, status=403)

    for field in ["mid1", "mid2", "mid3", "at1", "at2", "at3", "at4", "est","internal","external"]:
        if field in request.data:
            old = getattr(marks, field)
            new = float(request.data[field])

            if old != new:
                MarksHistory.objects.create(
                    marks=marks,
                    field=field,
                    old_value=old,
                    new_value=new,
                    changed_by=request.user if request.user.is_authenticated else None
                )

                setattr(marks, field, new)

    if request.user.is_authenticated:
        marks.entered_by = request.user

    marks.save()
    subject = marks.enrollment.subject
    student = marks.enrollment.student
    batch = marks.enrollment.batch
    semester = marks.enrollment.semester

    user_label = get_user_label(request.user)
    ActivityLog.objects.create(
        action_type="MARK_UPDATE",
        description=f"{batch.current_level} {semester} {subject.code} {subject.name} marks updated by {user_label}",
        batch=batch,
        subject=subject,
        level=batch.current_level,
        semester=semester,
        branch=student.branch,
        section=student.section,
        created_by=request.user
    )

    return Response({"message": "Marks updated"})


#---------------- for the batchmangement edits to save in db------------------
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Batch
from .serializers import BatchUpdateSerializer


@api_view(["PATCH"])
def update_batch(request, batch_id):
    """
    PATCH /batches/<batch_id>/
    Update batch details from UI
    """
    try:
        batch = Batch.objects.get(batch_id=batch_id)
    except Batch.DoesNotExist:
        return Response(
            {"error": "Batch not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # DEBUG (you can remove later)
    print("UPDATE BATCH DATA:", request.data)

    serializer = BatchUpdateSerializer(
        batch,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "Batch updated successfully",
                "batch": serializer.data
            },
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#-------------export as pdf or csv of marks in marks entry page--------------
from django.http import HttpResponse
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4

#@api_view(["GET"])
@api_view(["GET"])
def export_marks_pdf(request):

    batch_id = request.GET.get("batch")
    semester = request.GET.get("semester")
    level = request.GET.get("level")
    subject_code = request.GET.get("subject")
    exam_type = request.GET.get("exam_type", "ALL")

    # ---------------- SUBJECT ----------------
    subject = None
    subject_name = None
    if subject_code:
        subject = Subject.objects.filter(code=subject_code).first()
        if subject:
            subject_name = subject.name

    # ---------------- BATCH ----------------
    batch = None
    if batch_id:
        batch = Batch.objects.filter(batch_id=batch_id).first()

    # ---------------- QUERYSET ----------------
    qs = Marks.objects.select_related(
        "enrollment__student",
        "enrollment__subject",
        "enrollment__batch"
    )

    if batch_id:
        qs = qs.filter(enrollment__batch__batch_id=batch_id)

    if semester:
        qs = qs.filter(enrollment__semester=semester)

    if level:
        qs = qs.filter(enrollment__subject__level=level)

    if subject_code:
        qs = qs.filter(enrollment__subject__code=subject_code)

        subject_obj = Subject.objects.filter(code=subject_code).first()
        if subject_obj and subject_obj.branch:
            qs = qs.filter(enrollment__student__branch=subject_obj.branch)


    qs = qs.order_by("enrollment__student__student_id")

    # ---------------- PDF SETUP ----------------
    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="marks_export.pdf"'

    doc = SimpleDocTemplate(response, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    # ---------------- HEADER ----------------
    elements.append(Paragraph("Exam Cell - Marks Report", styles["Title"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph(f"Batch: {batch_id or '-'}", styles["Normal"]))
    elements.append(Paragraph(f"Level: {level or '-'}", styles["Normal"]))
    elements.append(
        Paragraph(
            f"Semester: {semester or (qs.first().enrollment.semester if qs.exists() else '-')}",
            styles["Normal"]
        )
    )

    if subject_name:
        elements.append(Paragraph(f"Subject: {subject_name} ({subject_code})", styles["Normal"]))
    else:
        elements.append(Paragraph(f"Subject Code: {subject_code or '-'}", styles["Normal"]))

    elements.append(Paragraph(f"Exam Type: {exam_type}", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    # ---------------- DETECT MODE ----------------
    #is_puc = batch and batch.current_level.startswith("PUC")
    is_puc = False
    if level and level.startswith("PUC"):
        is_puc = True



    subject_type = None
    if qs.exists():
        subject_type = qs.first().enrollment.subject.subject_type
    
    # Disable exam_type filter for non-theory subjects
    if subject_type != "THEORY" or subject.exam_scheme in ["ZERO_CREDIT"]:
        exam_type = "ALL"

    # ---------------- HEADER ROW BUILD ----------------

    base_columns = ["Roll No", "Name"]

    if is_puc:
        base_columns.append("Section")
    else:
        base_columns.extend(["Branch", "Section"])

    base_columns.append("Sem")

    # -------- ALL --------
    if exam_type == "ALL":

        scheme = subject.exam_scheme if subject else None
        
        if subject_type == "THEORY":

            if scheme == "MID15_AT4":
                header = base_columns + [
                    "MID1","MID2","MID3",
                    "AT1","AT2","AT3","AT4",
                    "EST","Internal","Total","Grade"
                ]

            elif scheme == "MID20":
                header = base_columns + [
                    "MID1","MID2","MID3",
                    "EST","Internal","Total","Grade"
                ]

            elif scheme == "MID40":
                header = base_columns + [
                    "MID1","MID2",
                    "EST","Internal","Total","Grade"
                ]

            elif scheme == "ZERO_CREDIT":
                header = base_columns + [
                    "EST","Total","Grade"
                ]
        #hi
        else:
            header = base_columns + [
                "Internal", "External", "Total", "Grade"
            ]

    # -------- ATS --------
    elif exam_type == "ATS":
        header = base_columns + ["AT1", "AT2", "AT3", "AT4"]

    # -------- TOTAL --------
    elif exam_type == "TOTAL":
        header = base_columns + ["Total", "Grade"]

    # -------- INTERNAL --------
    elif exam_type == "INTERNAL":
        header = base_columns + ["Internal"]

    # -------- MID / EST --------
    else:
        header = base_columns + [exam_type]

    data = [header]

    # ---------------- LOOP ----------------
    for m in qs:

        student = m.enrollment.student
        subject = m.enrollment.subject

        if subject.subject_type == "THEORY":
            internal = calculate_internal(m)
        else:
            internal = m.internal or 0


        if subject_type == "THEORY":
            total = internal + (m.est or 0)
        elif subject_type in ["LAB", "PROJECT", "ELECTIVE"]:
            total = (m.internal or 0) + (m.external or 0)
        elif subject_type == "INTERNSHIP":
            total = m.external or 0
        else:
            total = 0

        grade = marks_to_grade(total, subject.credits)

        # ---- Base row ----
        row = [student.student_id, student.name]

        if is_puc:
            row.append(student.section or "-")
        else:
            row.extend([student.branch or "-", student.section or "-"])

        row.append(m.enrollment.semester)

        # ---- Exam Logic row building ----
        if exam_type == "ALL":

            if subject_type == "THEORY":

                scheme = subject.exam_scheme

                if scheme == "MID15_AT4":
                    row.extend([
                        m.mid1, m.mid2, m.mid3,
                        m.at1, m.at2, m.at3, m.at4,
                        m.est,
                        round(internal, 2),
                        round(total, 2),
                        grade
                    ])

                elif scheme == "MID20":
                    row.extend([
                        m.mid1, m.mid2, m.mid3,
                        m.est,
                        round(internal, 2),
                        round(total, 2),
                        grade
                    ])

                elif scheme == "MID40":
                    row.extend([
                        m.mid1, m.mid2,
                        m.est,
                        round(internal, 2),
                        round(total, 2),
                        grade
                    ])

                elif scheme == "ZERO_CREDIT":
                    row.extend([
                        m.est,
                        round(total, 2),
                        grade
                    ])

            else:
                row.extend([
                    m.internal,
                    m.external,
                    round(total, 2),
                    grade
                ])
        elif exam_type == "MID1":
            row.append(m.mid1)

        elif exam_type == "MID2":
            row.append(m.mid2)

        elif exam_type == "MID3":
            if subject.exam_scheme in ["MID15_AT4", "MID20"]:
                row.append(m.mid3)
            else:
                row.append("-")

        elif exam_type == "ATS":
            if subject.exam_scheme == "MID15_AT4":
                row.extend([m.at1, m.at2, m.at3, m.at4])
            else:
                row.extend(["-", "-", "-", "-"])

        elif exam_type == "EST":
            row.append(m.est)

        elif exam_type == "INTERNAL":
            row.append(round(internal, 2))

        elif exam_type == "TOTAL":
            row.extend([round(total, 2), grade])

        else:
            row.append("-")

        data.append(row)

    # ---------------- TABLE ----------------
    table = Table(data, repeatRows=1)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(table)
    doc.build(elements)
    ActivityLog.objects.create(
        action_type="PDF_EXPORT",
        description=f"{level} {semester} {subject_code} exported as PDF",
        batch=batch,
        level=level,
        semester=semester,
        subject=subject,
        created_by=request.user
    )

    return response




#----------- ACADEMIC MANAGEMENT page--------------------------------------------------------------

#--------- CREATE SUBJECT SETUP-----------------

@api_view(["POST"])
def create_subject(request):
    print("REQUEST DATA:", request.data)
    data = request.data.copy()

    code = data.get("code")
    subject_type = data.get("subject_type")

    if not code:
        return Response({"error": "Code is required"}, status=400)

    # BETTER DUPLICATE CHECK
    if Subject.objects.filter(
        code=code,
        regulation=data.get("regulation"),
        level=data.get("level"),
        semester=data.get("semester"),
        branch=data.get("branch")
    ).exists():
        return Response(
            {"error": "Subject already exists for this Regulation / Level / Semester / Branch"},
            status=400
        )

    # Engineering must have branch
    if data.get("level", "").startswith("E") and not data.get("branch"):
        return Response({"error": "Branch is required for Engineering subjects"}, status=400)

    # Remove scheme for non-theory
    if subject_type != "THEORY":
        data["exam_scheme"] = None

    serializer = SubjectSerializer(data=data)

    if serializer.is_valid():
        serializer.save()
        subject = serializer.instance
        ActivityLog.objects.create(
            action_type="SUBJECT_CREATE",
            description=f"{subject.level} {subject.semester} {subject.code} created",
            subject=subject,
            level=subject.level,
            semester=subject.semester,
            branch=subject.branch,
            created_by=request.user
        )
        return Response(serializer.data, status=201)
    print("SERIALIZER ERRORS:", serializer.errors) 
    return Response(serializer.errors, status=400)


#------------ delete subjects in academic management page-------------
@api_view(["DELETE"])
def delete_subject(request, subject_id):
    try:
        subject = Subject.objects.get(id=subject_id)
        subject.delete()
        return Response({"message": "Subject deleted successfully"})
    except Subject.DoesNotExist:
        return Response({"error": "Subject not found"}, status=404)

#----------------UPDATE SUBJECT SCHEME---------------
@api_view(["PATCH"])
def update_subject_scheme(request, subject_id):
    try:
        subject = Subject.objects.get(id=subject_id)
    except Subject.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    subject.exam_scheme = request.data.get("exam_scheme", subject.exam_scheme)
    subject.save()

    return Response({"message": "Scheme updated"})

#---------------- EDIT OR UPDATE SUBJECT ---------------------------
@api_view(["PATCH"])
def update_subject(request, subject_id):
    try:
        subject = Subject.objects.get(id=subject_id)
    except Subject.DoesNotExist:
        return Response({"error": "Subject not found"}, status=404)

    name = request.data.get("name")
    credits = request.data.get("credits")
    subject_type = request.data.get("subject_type")
    exam_scheme = request.data.get("exam_scheme")
    branch = request.data.get("branch")
    semester = request.data.get("semester")

    if name is not None:
        subject.name = name

    if credits is not None:
        subject.credits = credits

    if subject_type is not None:
        subject.subject_type = subject_type

        # If not THEORY → remove scheme
        if subject_type != "THEORY":
            subject.exam_scheme = "NONE"

    # Only allow scheme change if THEORY
    if subject_type == "THEORY" and exam_scheme:
        subject.exam_scheme = exam_scheme

    if branch is not None:
        subject.branch = branch

    if semester is not None:
        subject.semester = semester

    subject.save()

    return Response({"message": "Subject updated successfully"})

#----------------BULK UPLODE FUNCTION FOR THE MARKS ENTRY-------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_upload_marks(request):
    import csv

    file = request.FILES.get("file")
    subject_code = request.data.get("subject")
    semester = request.data.get("semester")
    batch_id = request.data.get("batch")

    subject = Subject.objects.filter(code=subject_code).first()

    if not file:
        return Response({"error": "File required"}, status=400)

    # Read CSV
    #decoded = file.read().decode("utf-8").splitlines()
    decoded = file.read().decode("utf-8-sig").splitlines()
    reader = csv.DictReader(decoded)

    # Clean column names
    reader.fieldnames = [field.strip() for field in reader.fieldnames]

    # Detect student_id column flexibly
    student_key = None

    for key in reader.fieldnames:
        cleaned = key.strip().lower().replace(" ", "").replace("_", "")
        if cleaned == "studentid":
            student_key = key
            break

    if not student_key:
        return Response({
            "error": "Missing column: student_id"
        }, status=400)

    updated = 0
    errors = []

    for row in reader:
        # Clean row (keys + values)
        row = {
            k.strip(): (v.strip() if isinstance(v, str) else v)
            for k, v in row.items()
        }

        student_id = row.get(student_key)

        if not student_id:
            errors.append("Row skipped: missing student_id")
            continue

        try:
            enrollment = Enrollment.objects.get(
                student__student_id=student_id,
                subject__code=subject_code,
                semester=semester,
                batch__batch_id=batch_id
            )

            # Create marks if not exists
            marks, created = Marks.objects.get_or_create(enrollment=enrollment)

            # Process marks fields
            for key, value in row.items():
                if key != "student_id" and value != "":
                    try:
                        num_value = float(value)
                    except:
                        errors.append(f"{student_id}: invalid value '{value}' for {key}")
                        continue

                    old = getattr(marks, key, None)

                    if old != num_value:
                        MarksHistory.objects.create(
                            marks=marks,
                            field=key,
                            old_value=old,
                            new_value=num_value,
                            changed_by=request.user
                        )

                    setattr(marks, key, num_value)

            marks.entered_by = request.user
            marks.save()

        except Enrollment.DoesNotExist:
            errors.append(f"{student_id} enrollment not found")

        except Exception as e:
            errors.append(f"{student_id}: {str(e)}")
    
    # Create ONLY ONE activity log
    if updated > 0:
        from .models import Batch  # if not already imported

        batch = Batch.objects.filter(batch_id=batch_id).first()
        user_label = get_user_label(request.user)

        ActivityLog.objects.create(
            action_type="BULK_UPLOAD",
            description=f"{updated} students updated → {batch.current_level} {semester} {subject_code} {subject.name} by {user_label}",
            batch=batch,
            subject=subject,
            level=batch.current_level if batch else "",
            semester=semester,
            created_by=request.user
    )
    return Response({
        "updated": updated,
        "errors": errors
    })

#--------------- uplode section in batch management section in student tab---------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_sections(request):
    import csv

    file = request.FILES.get("file")
    batch_id = request.data.get("batch")   # IMPORTANT
    semester = request.data.get("semester") 

    if not file:
        return Response({"error": "File required"}, status=400)

    decoded = file.read().decode("utf-8-sig").splitlines()
    reader = csv.DictReader(decoded)

    updated = 0
    errors = []

    for row in reader:
        student_id = row.get("student_id")
        section = row.get("section")

        if not student_id or not section:
            errors.append("Missing data")
            continue

        try:
            student = Student.objects.filter(
                student_id=student_id,
                batch__batch_id=batch_id
            ).first()

            if not student:
                errors.append(f"{student_id} not found in batch {batch_id}")
                continue

            student.section = section.strip().upper()
            student.save()
            updated += 1

        except Student.DoesNotExist:
            errors.append(f"{student_id} not found")

    #  Activity Log (ONLY ONCE)
    if updated > 0:
        batch = Batch.objects.filter(batch_id=batch_id).first()
        user_label = get_user_label(request.user)

        ActivityLog.objects.create(
            action_type="UPLOAD_SECTIONS",
            description=f"{updated} students assigned sections for {batch_id} by {user_label}",
            batch=batch,
            level=batch.current_level if batch else "",
            semester=batch.current_semester if batch else "",
            created_by=request.user
        )

    return Response({
        "updated": updated,
        "errors": errors
    })
#get sections from enrollments
'''@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sections(request):
    batch = request.GET.get("batch")
    semester = request.GET.get("semester")

    enrollments = Enrollment.objects.filter(
        batch__batch_id=batch,
        semester=semester,
        section__isnull=False   #IMPORTANT
    ).exclude(section="")       #IMPORTANT

    sections = enrollments.values_list("section", flat=True).distinct()

    return Response(sorted(sections))'''
#get sections from the students
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sections(request):
    batch = request.GET.get("batch")

    students = Student.objects.filter(
        batch__batch_id=batch,
        section__isnull=False
    ).exclude(section="")

    sections = students.values_list("section", flat=True).distinct()

    return Response(sorted(sections))