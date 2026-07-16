# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document


class StudentAttendanceTool(Document):
	pass


@frappe.whitelist()
def get_student_attendance_records(
	based_on, date=None, student_group=None, course_schedule=None
):
	student_list = []
	student_attendance_list = []

	if based_on == "Course Schedule":
		student_group = frappe.db.get_value(
			"Course Schedule", course_schedule, "student_group"
		)
		if student_group:
			student_list = frappe.get_all(
				"Student Group Student",
				fields=["student", "student_name", "group_roll_number"],
				filters={"parent": student_group, "active": 1},
				order_by="group_roll_number",
			)

	if not student_list:
		student_list = frappe.get_all(
			"Student Group Student",
			fields=["student", "student_name", "group_roll_number"],
			filters={"parent": student_group, "active": 1},
			order_by="group_roll_number",
		)

	StudentAttendance = frappe.qb.DocType("Student Attendance")

	if course_schedule:
		student_attendance_list = (
			frappe.qb.from_(StudentAttendance)
			.select(StudentAttendance.student, StudentAttendance.status)
			.where((StudentAttendance.course_schedule == course_schedule))
		).run(as_dict=True)
	else:
		student_attendance_list = (
			frappe.qb.from_(StudentAttendance)
			.select(StudentAttendance.student, StudentAttendance.status)
			.where(
				(StudentAttendance.student_group == student_group)
				& (StudentAttendance.date == date)
				& (
					(StudentAttendance.course_schedule == "")
					| (StudentAttendance.course_schedule.isnull())
				)
			)
		).run(as_dict=True)

	for attendance in student_attendance_list:
		for student in student_list:
			if student.student == attendance.student:
				student.status = attendance.status

	return student_list

@frappe.whitelist()
def get_teacher(user):
	return frappe.db.get_value("User Permission",{'user': user,'allow': "Instructor"},["for_value"])

@frappe.whitelist()
def student_group_query(doctype, txt, searchfield, start, page_len, filters):
	if filters.get("custom_instructor"):
		return frappe.db.sql(f"""
			SELECT
				name,
				program,batch,course
			FROM `tabStudent Group`
			WHERE
				custom_instructor = %s and (name LIKE %s or program LIKE %s or batch LIKE %s or course LIKE %s)
		""", (
			filters.get("custom_instructor"), "%"+txt+"%","%"+txt+"%","%"+txt+"%","%"+txt+"%"
		))
	else:
		return frappe.db.sql(f"""
			SELECT
				name,
				program,batch,course
			FROM `tabStudent Group`
			WHERE
				(name LIKE %s or program LIKE %s or batch LIKE %s or course LIKE %s)
		""", (
			"%"+txt+"%","%"+txt+"%","%"+txt+"%","%"+txt+"%"
		))