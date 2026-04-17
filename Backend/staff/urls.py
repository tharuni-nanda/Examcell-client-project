
from . import views
from django.urls import path
from .views import send_otp, verify_otp, faculty_login
from .views import add_batch, promote_batch, list_batches
from .views import (
    list_marks,
    save_marks,
    calculate_results
)
from .views import setup_semester
from .dashboard_views import dashboard_data, activate_exam, get_notifications, deactivate_exam, get_active_exam
from .analytics_views import analytics_dashboard

urlpatterns = [
    path('test/', views.test_connection, name='test_connection'),
    path('coe/send-otp/', send_otp),
    path('coe/verify-otp/', verify_otp),
    path('faculty/login/', faculty_login),

    path("batches/add/", add_batch),# POST create batch + upload initial CSV
    path("batches/", list_batches),  
    path("upload-sections/", views.upload_sections),#uplode sections csv 
    path("sections/", views.get_sections),   
    #academic management elective students list uplode
    path("electives/upload/", views.upload_elective_students),                     
      # GET list
    path("batches/<str:batch_id>/promote/", promote_batch),
    #marks entry
    path("marks/", list_marks),
    path("marks/save/", save_marks),
    path("results/calculate/", calculate_results),
    path("semester/setup/", setup_semester),
    #marksentry export pdf
    path("marks/export/pdf/", views.export_marks_pdf),
    #marks entry bulk uplode marks
    path("marks/bulk-upload/", views.bulk_upload_marks),
    #new marks entry
    path("subjects/", views.list_subjects),
    path("marks/history/", views.marks_history),
    #batchmanagement api url for edits done in front end
    path("batches/<str:batch_id>/", views.update_batch),
    #Academic Management set create subject 
    path("subjects/create/", views.create_subject),
    #Academic management , for deleting the subject
    path("subjects/delete/<int:subject_id>/", views.delete_subject),
    #academic management for update the subject 
    path("subjects/update/<int:subject_id>/", views.update_subject),
    #dashboard both faculty and coe
    path("dashboard/", dashboard_data),
    #analytics for dashboard but may be use in future to create reports
    path("analytics/", analytics_dashboard),
    path("notifications/", get_notifications),
    path("batches/<str:batch_id>/promote-sem", views.promote_semester),
    path("activate-exam/", activate_exam),
    path("deactivate-exam/", deactivate_exam),
    path("active-exam/<str:batch_id>/", get_active_exam),
    path("promote-semester/", views.promote_semester)
]
