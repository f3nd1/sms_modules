
// Copyright (c) 2016, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt
frappe.provide("education");
frappe.ui.form.on('Student Attendance Tool', {
	// setup: (frm) => {
    //     if(frm.doc.type == "Face-to-Face") {
    //         frm.students_area = $('<div>')
    //         .appendTo(frm.fields_dict.students_html.wrapper);
	// 	} else {
    //         $(frm.fields_dict.students_html.wrapper).empty();
    //     }
	// },


    // type: function(frm) {
    //     $(frm.fields_dict.students_html.wrapper).empty();
    //     if (frm.doc.type != "Face-to-Face" && frm.doc.based_on === "Student Group") {
    //         frappe.call({
    //             method: 'education.education.api.get_students',
    //             args: {
    //                 student_group: frm.doc.student_group,
    //                 course_schedule: frm.doc.course_schedule,
    //             },
    //             callback: function(r) {
    //                 if (r.message) {
    //                     frm.events.render_table(frm, r.message);
    //                 }
    //             }
    //         });
    //     } else {
    //         frm.students_area = $('<div>').appendTo(frm.fields_dict.students_html.wrapper);
    //         if (frm.doc.student_group) {
    //             frm.trigger("student_group");
    //         }
    //     }
    // },

    render_table: function(frm, students, existing_att = null,active_leaves = null) {
        $(frm.fields_dict.students_html.wrapper).empty();
        
        // Add Mark Attendance button at the top
        let button_html = `
            <div class="row" style="margin-bottom: 15px;">
                <div class="col-sm-12">
                    <button class="btn btn-primary btn-mark-duration">
                        Mark Attendance
                    </button>
                    
                </div>
            </div>
        `;
		// ${frm.doc.type!="Face-to-Face" ? '<small class="text-muted ml-2">(Duration-based)</small>' : '<small class="text-muted ml-2">(Face-to-Face)</small>'}
        let statusSelect = function(student){



			return `<div class="control-input-wrapper">
								<div class="control-input flex align-center">
									<select type="text" autocomplete="off" class="input-with-feedback form-control ellipsis status-input" 
									data-student="${student.student}"
                            		data-student-name="${student.student_name}">
										<option value="Present">Present</option>
										<option value="Absent">Absent</option>
										<option value="Late">Late</option>
										<option value="Others">Others</option>
									</select>
									<div class="select-icon ">
									<svg class="icon  icon-sm" style="">
										<use class="" href="#icon-select"></use>
									</svg>
								</div></div>
								
							</div>`;

		}
		let remarksInput = function(student,status,onleave) {
		return `<div class="control-input-wrapper">
								<div class="control-input">
								<input type="text" autocomplete="off" class="input-with-feedback form-control bold" maxlength="140" data-fieldtype="Data" placeholder="" 
								data-student="${student.student}" data-student-name="${student.student_name}" value="${status || parseInt(onleave) ? "On leave" : ""}"></div>
								<div class="control-value like-disabled-input bold" style="display: none;"></div>
							</div>`;

		}
        let table_html = frm.doc.type!='Face-to-Face' ? `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>${frm.doc.type!='Face-to-Face' ? "Duration Attended (mins)" : "Status"}</th>
                            <th>${frm.doc.type!='Face-to-Face' ? "Expected Duration (mins)" : "Remarks"}</th>
                            ${frm.doc.type!='Face-to-Face' ? "<th>Percentage</th>" : ''}
                        </tr>
                    </thead>
                    <tbody>` : `
					<div class="table-responsive">
						<table class="table table-bordered">
							<thead>
								<tr>
									<th>Student</th>
									<th>Lesson Code</th>
									<th>Present</th>
									<th>Absent</th>
									<th>Late/Leave Early</th>
									<th>Minutes</th>
									<th>Remarks</th>
								</tr>
							</thead>
							<tbody>`;
        
		cur_frm.manageCheckboxStatus = function(e,student,status){
			if(e.checked){
				if(status=="present"){
					if(document.getElementById(student+"_minutes").value>15){
						document.getElementById(student+"_present").checked=0;
						frappe.throw("Late more than 15 minutes is considered late.");
						
					}
					document.getElementById(student+"_absent").checked=0;
				}
				if(status=="absent"){
					document.getElementById(student+"_present").checked=0;
					document.getElementById(student+"_late").checked=0;
					if(document.getElementById(student+"_minutes").value<=15){
						document.getElementById(student+"_minutes").value='';
					}
					
				}
				if(status=="late"){
					if(document.getElementById(student+"_minutes").value>15){
						document.getElementById(student+"_late").checked=0;
						frappe.throw("Late more than 15 minutes is considered late.");
						
					}
				
					document.getElementById(student+"_present").checked=1;
					document.getElementById(student+"_absent").checked=0;
				}
			}else{
				if(status=="present"){
					document.getElementById(student+"_late").checked=0;
				}
				if(status=="late"){
					document.getElementById(student+"_minutes").value='';
				}
			}
			if(document.getElementById(student+"_late").checked || document.getElementById(student+"_minutes").value){
				document.getElementById(student+"_minutes").removeAttribute("disabled");
			}else{
				document.getElementById(student+"_minutes").setAttribute("disabled", true);
			}


		}
		cur_frm.checkInput = function(e){
			if(isNaN(Number(e.value)) || Number(e.value) == 0){
				e.value="";
			}else{
				if(e.value>15){
					frappe.confirm(
						'Late more than 15 minutes is considered absent. Proceed?',
						function() {
							document.getElementById(e.getAttribute("data-student")+"_present").checked=0;
							document.getElementById(e.getAttribute("data-student")+"_late").checked=0;
							document.getElementById(e.getAttribute("data-student")+"_absent").checked=1;
							
						},
						function() {
							e.value="";
						}
					);
				}else{
					document.getElementById(e.getAttribute("data-student")+"_present").checked=1;
					document.getElementById(e.getAttribute("data-student")+"_late").checked=1;
					document.getElementById(e.getAttribute("data-student")+"_absent").checked=0;
				}
			}
		}
		
        for (let student of students) {
			
			let status = existing_att ? existing_att.find(att => att.student === student.student)?.attendance : '';
			console.log(existing_att)
			const durationAttended = student.duration_attended || 0;
			const expectedDuration = student.expected_duration || frm.doc.expected_duration || 0;
			const percentage = expectedDuration ? ((durationAttended / expectedDuration) * 100).toFixed(1) : '0.0';
			
			table_html += frm.doc.type!="Face-to-Face"? `
				<tr>
					<td>${student.student_name}</td>
					<td>
					${frm.doc.type!='Face-to-Face' ? `<input type="number" 
							class="form-control duration-input" 
							data-student="${student.student}"
							data-student-name="${student.student_name}"
							value="${durationAttended}"
							min="0"
							max="${expectedDuration}">` : statusSelect(student)}
					</td>
					<td>${frm.doc.type!="Face-to-Face" ? expectedDuration : remarksInput(student,status ? status[2] : '',active_leaves[student.student])}</td>
					${frm.doc.type!='Face-to-Face' ? `<td>${percentage}%</td>` : ''}
				</tr>`: `
						<tr class="status-check" data-student="${student.student}" data-student-name="${student.student_name}">
							<td>${student.student_name}</td>
							<td>${ status && status[3] ? status[3] : '-'}</td>
							<td><input type="checkbox" id="${student.student}_present" onchange="cur_frm.manageCheckboxStatus(this,'${student.student}','present')" value="Present" ${ status ? (status[0] == "Present" ? "checked": '') : ''}  /></td>
							<td><input type="checkbox" id="${student.student}_absent" onchange="cur_frm.manageCheckboxStatus(this,'${student.student}','absent')" value="Absent" ${status ? (status[0] == "Absent" ? "checked": '') : ''} /></td>
							<td><input type="checkbox" id="${student.student}_late" onchange="cur_frm.manageCheckboxStatus(this,'${student.student}','late')" value="Late" ${status ? (status[1] ? "checked": '') : ''}  /></td>
							<td><div class="control-input-wrapper">
								<div class="control-input">
								<input type="number" autocomplete="off" oninput="cur_frm.checkInput(this)" class="input-with-feedback form-control bold" maxlength="140" data-fieldtype="Int" placeholder="" 
								data-student="${student.student}" id="${student.student}_minutes" value="${status? status[1] : ''}" disabled></div>
								<div class="control-value like-disabled-input bold" style="display: none;"></div>
							</div></td>
							<td>${remarksInput(student,status ? status[2]: '',active_leaves[student.student])}</td>
						</tr>
				`;
		}

		table_html += `
					</tbody>
				</table>
			</div>`;
            
        // Append both button and table
        $(button_html + table_html).appendTo(frm.fields_dict.students_html.wrapper);
        // Add event listener for duration changes
        $('.duration-input').on('change', function() {
            const input = $(this);
            const row = input.closest('tr');
            const durationAttended = parseFloat(input.val()) || 0;
            const expectedDuration = parseFloat(row.find('td:eq(2)').text()) || 0;
            const percentage = expectedDuration ? ((durationAttended / expectedDuration) * 100).toFixed(1) : '0.0';
            row.find('td:eq(3)').text(percentage + '%');
        });

        // Add event listener for Mark Duration Attendance button
        $('.btn-mark-duration').on('click', function() {
            const btn = $(this);
            
            var studs = [];
            $(frm.doc.type!='Face-to-Face' ? '.duration-input': '.status-check').each(function() {
                const input = $(this);
                const durationAttended = parseFloat(input.val()) || 0;
                const expectedDuration = parseFloat(input.closest('tr').find('td:eq(2)').text()) || 0;
                if(frm.doc.type!='Face-to-Face'){
					studs.push({
						student: input.data().student,
						student_name: input.data().studentName,
						duration_attended: durationAttended,
						expected_duration: expectedDuration,
						remarks: "",
						minutes: "",
						status: durationAttended>0 ? "Present"  : "Absent"
                	});
				}else{
					const stats = ["present","absent","late"];
					let status = document.getElementById(`${input[0].getAttribute('data-student')}_present`).checked ? 'Present' : 'Absent';
					let blank = 1;
					stats.forEach((s)=>{
						if(document.getElementById(`${input[0].getAttribute('data-student')}_${s}`).checked){
							blank=0;
						}
						
					})
					if(blank){
						frappe.throw(`Attendance status for ${input[0].getAttribute('data-student-name')} is missing.`);
					}
					if (document.getElementById(`${input[0].getAttribute('data-student')}_late`).checked && !document.getElementById(`${input[0].getAttribute('data-student')}_minutes`).value){
						frappe.throw(`Please enter the number of minutes late for ${input[0].getAttribute('data-student-name')} before proceeding.`);
					}

					studs.push({
						student: input[0].getAttribute('data-student'),
						student_name: input[0].getAttribute('data-student-name'),
						status: status,
						minutes: document.getElementById(`${input[0].getAttribute('data-student')}_minutes`).value,
						remarks: $(`input[data-student="${input[0].getAttribute('data-student')}"]`)[1].value,
						late: document.getElementById(`${input[0].getAttribute('data-student')}_late`).checked
               	 	});
				}
                
            });
            var students_present = studs.filter(function(stud) {
                return frm.doc.type!='Face-to-Face' ? stud.duration_attended > 0 : stud.status=="Present";
            });

            var students_absent = studs.filter(function(stud) {
                return frm.doc.type!='Face-to-Face' ? stud.duration_attended === 0 : stud.status=="Absent";
            });

			var students_late = studs.filter(function(stud) {
                return frm.doc.type!='Face-to-Face' ? stud.duration_attended === 0 && stud.late : stud.late==1;
            });
			var stud_with_diff_status = studs.filter(function(stud){
				return stud.status!="Present" && stud.status!="Absent"
			})
            frappe.confirm(
                __("Are you sure you want to submit the attendance? <br> Present: {0} <br> Absent: {1} <br> Late: {2}",
                [students_present.length, students_absent.length, students_late.length]),
                function() {    //ifyes
					
                    if(!frappe.request.ajax_count) {
                        frappe.call({
                            method: "education.education.api.mark_attendance",
                            freeze: true,
                            freeze_message: __("Marking duration attendance"),
                            args: {
                                "students_present": frm.doc.type!="Face-to-Face" ? JSON.stringify(students_present) : students_present,
                                "students_absent": frm.doc.type!="Face-to-Face" ? JSON.stringify(students_absent) : students_absent,
                                "student_group": frm.doc.student_group,
                                "course_schedule": frm.doc.course_schedule,
                                "date": frm.doc.date,
								"stud_with_diff_status": stud_with_diff_status,
                            },
                            callback: function(r) {
                                btn.prop('disabled', false);
                                frappe.msgprint(__("Attendance has been marked successfully."));
                            }
                        });
                    }
                },
                function() {    //ifno
                    btn.prop('disabled', false);
                }
            );
        });
    },

	onload: function(frm) {


        if (!frappe.route_options) return;

        const opts = frappe.route_options;
		console.log(opts)
        if (opts.student_group) {
            frm.set_value("student_group", opts.student_group);
        }

        if (opts.course_schedule) {
            frm.set_value("course_schedule", opts.course_schedule);
        }

        // Clear after using so it doesn't re-apply unexpectedly
        frappe.route_options = null;

		
		frm.set_query("student_group", function() {
			return {
				"filters": {
					"group_based_on": frm.doc.group_based_on,
					"disabled": 0
				}
			};
		});
	},

	refresh: function(frm) {
		// if(frappe.route_options){
		// 	frm.set_value("student_group", frappe.route_options.student_group);
		// 	frm.set_value("course_schedule", frappe.route_options.course_schedule);
		// 	frappe.route_options = null;
		// }

		frm.set_df_property("based_on", "hidden", 1);
		frm.set_df_property("group_based_on", "hidden", 1);
		frm.set_df_property("date", "read_only", 1);
		frappe.call({
			method: "education.education.doctype.student_attendance_tool.student_attendance_tool.get_teacher",
			args:{
				'user': frappe.session.user
			},
			callback:function(r){
				cur_frm.instructor = r.message;
				frm.set_query("student_group", function() {
					return {
						query: "education.education.doctype.student_attendance_tool.student_attendance_tool.student_group_query",
						filters: {
							custom_instructor:	r.message,
							search: frm.doc.student_group
						}
					};
				});
			}
		})
		
		const waitForBasedOnField = () => {
			if (frm.fields_dict && frm.fields_dict.based_on) {
				frm.set_value("based_on", "Student Group");
			} else {
				setTimeout(waitForBasedOnField, 50);
			}
		};
		waitForBasedOnField();
		if (frappe.route_options) {
			// frm.set_value("based_on", frappe.route_options.based_on);
			frm.set_value("student_group", frappe.route_options.student_group);
			frm.set_value("course_schedule", frappe.route_options.course_schedule);
			setTimeout(() => { frappe.route_options = null; }, 500);
		}
		frm.disable_save();
		if (frm.doc.course_schedule && frm.doc.student_group) {
            frappe.call({
                method: 'education.education.api.get_students',
                args: {
                    student_group: frm.doc.student_group,
                    course_schedule: frm.doc.course_schedule
                },
                callback: function(r) {
					frappe.call({
						method: 'education.education.api.check_existing_attendance',
						args: {
							student_group: frm.doc.student_group,
							course_schedule: frm.doc.course_schedule
						},
						callback: function(re) {
							
							if (r.message) {
								frm.events.render_table(frm, r.message,re.message[1],re.message[2]);
							}
						}
					});
                }
            });
        }
	},

	// based_on: function(frm) {
    //     if (frm.doc.based_on == "Student Group") {
    //         frm.set_value("course_schedule", "");
    //     } else {
    //         frm.set_value("student_group", "");
    //     }
	// },

	student_group: function(frm) {
		
		// if (frm.doc.type == "Face-to-Face") {
			
		// 	if ((frm.doc.student_group && frm.doc.date) || frm.doc.course_schedule) {
		// 		frm.students_area.find('.student-attendance-checks').html(`<div style='padding: 2rem 0'>Fetching...</div>`);
		// 		var method = "education.education.doctype.student_attendance_tool.student_attendance_tool.get_student_attendance_records";

		// 		frappe.call({
		// 			method: method,
		// 			args: {
		// 				based_on: frm.doc.based_on,
		// 				student_group: frm.doc.student_group,
		// 				date: frm.doc.date,
		// 				course_schedule: frm.doc.course_schedule
		// 			},
		// 			callback: function(r) {
		// 				frm.events.get_students(frm, r.message);
		// 			}
		// 		});
		// 	}
		// } else if (frm.doc.based_on === "Course Schedule") {
        //     // Skip if triggered by course schedule change
        //     return;
        // } else 
		// 	if (frm.doc.student_group) {
		// 	frappe.call({
		// 		method: 'education.education.api.get_students',
		// 		args: {
		// 			student_group: frm.doc.student_group,
        //             course_schedule: null
		// 		},
		// 		callback: function(r) {
		// 			if (r.message) {
		// 				frm.events.render_table(frm, r.message);
		// 			}
		// 		}
		// 	});
		// }
	},

	date: function(frm) {
		if (frm.doc.date > frappe.datetime.get_today())
			frappe.throw(__("Cannot mark attendance for future dates."));
		// frm.trigger("student_group");
	},

	course_schedule: function(frm) {
        if (frm.doc.course_schedule) {
            frappe.call({
                method: 'education.education.api.get_students',
                args: {
                    student_group: frm.doc.student_group,
                    course_schedule: frm.doc.course_schedule
                },
                callback: function(r) {
					frappe.call({
						method: 'education.education.api.check_existing_attendance',
						args: {
							student_group: frm.doc.student_group,
							course_schedule: frm.doc.course_schedule
						},
						callback: function(re) {
							console.log(re.message)
							if (r.message) {
								frm.events.render_table(frm, r.message,re.message[1],re.message[2]);
							}
						}
					});
                }
            });
        }
	},

	get_students: function(frm, students) {
		students = students || [];
		frm.students_editor = new education.StudentsEditor(frm, frm.students_area, students);
	}
});


education.StudentsEditor = class StudentsEditor {
	constructor(frm, wrapper, students) {
		this.wrapper = wrapper;
		this.frm = frm;
		if(students.length > 0) {
			this.make(frm, students);
		} else {
			this.show_empty_state();
		}
	}
	make(frm, students) {
		var me = this;

		$(this.wrapper).empty();
		var student_toolbar = $('<p>\
			<button class="btn btn-default btn-add btn-xs" style="margin-right: 5px;"></button>\
			<button class="btn btn-xs btn-default btn-remove" style="margin-right: 5px;"></button>\
			<button class="btn btn-default btn-primary btn-mark-att btn-xs"></button></p>').appendTo($(this.wrapper));

		student_toolbar.find(".btn-add")
			.html(__('Check all'))
			.on("click", function() {
				$(me.wrapper).find('input[type="checkbox"]').each(function(i, check) {
					if (!$(check).prop("disabled")) {
						check.checked = true;
					}
				});
			});

		student_toolbar.find(".btn-remove")
			.html(__('Uncheck all'))
			.on("click", function() {
				$(me.wrapper).find('input[type="checkbox"]').each(function(i, check) {
					if (!$(check).prop("disabled")) {
						check.checked = false;
					}
				});
			});

		student_toolbar.find(".btn-mark-att")
			.html(__('Mark Attendance'))
			.after('<small class="text-muted ml-2">(Face-to-Face)</small>')
			.removeClass("btn-default")
			.on("click", function() {
				$(me.wrapper.find(".btn-mark-att")).attr("disabled", true);
				var studs = [];
				$(me.wrapper.find('.students-check')).each(function(i, check) {
					var $check = $(check);
					studs.push({
						student: $check.data().student,
						student_name: $check.data().studentName,
						checked: $check.prop("checked")
					});
				});

				var students_present = studs.filter(function(stud) {
					return stud.checked;
				});

				var students_absent = studs.filter(function(stud) {
					return !stud.checked;
				});

				frappe.confirm(__("Do you want to update face-to-face attendance? <br> Present: {0} <br> Absent: {1}",
					[students_present.length, students_absent.length]),
					function() {	//ifyes
						if(!frappe.request.ajax_count) {
							frappe.call({
								method: "education.education.api.mark_attendance",
								freeze: true,
								freeze_message: __("Marking face-to-face attendance"),
								args: {
									"students_present": students_present,
									"students_absent": students_absent,
									"student_group": frm.doc.student_group,
									"course_schedule": frm.doc.course_schedule,
									"date": frm.doc.date
								},
								callback: function(r) {
									$(me.wrapper.find(".btn-mark-att")).attr("disabled", false);
									frm.events.course_schedule(frm);
									frappe.msgprint(__("Face-to-face attendance has been marked successfully."));
								}
							});
						}
					},
					function() {	//ifno
						$(me.wrapper.find(".btn-mark-att")).attr("disabled", false);
					}
				);
			});

		// make html grid of students
		let student_html = '';
		for (let student of students) {
			student_html += `<div class="col-sm-3">
					<div class="checkbox">
						<label>
							<input
								type="checkbox"
								data-group_roll_number="${student.group_roll_number}"
								data-student="${student.student}"
								data-student-name="${student.student_name}"
								class="students-check"
								${student.status==='Present' ? 'checked' : ''}>
							${student.group_roll_number} - ${student.student_name}
						</label>
					</div>
				</div>`;
		}

		$(`<div class='student-attendance-checks'>${student_html}</div>`).appendTo(me.wrapper);
	}

	show_empty_state() {
		$(this.wrapper).html(
			`<div class="text-center text-muted" style="line-height: 100px;">
				${__("No Students in")} ${this.frm.doc.student_group}
			</div>`
		);
	}
};






