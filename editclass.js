$(function(){

	//globals
	var memberlist = [];
	var myuserdata;
	var table;
	var me;

	//mvc
	var campaigns = [];
	var userrows = {};

	//progress bar stuff
	var n = 0;
	var m = 0;
	function updateProgress(){
		$(".progress-bar").css("width", (m/n) * 100 + "%");
		if(m < n){
			$(".progress").show();
		} else {
			$(".progress").hide();
		}	
	}

	function progressStart(){
		n++;
		updateProgress()
	}

	function progressDone(){
		m++;
		updateProgress()
	}

	//get urn from param
	var urn = location.search.replace(/^[?]/, "");
	if(!urn.match(/^urn/)){
        location.replace(".")
        return;
    }

    //initiate the client
    var oh = Ohmage("/app", "class-manager")

    //global error handler. In ohmage 200 means unauthenticated
    oh.callback("error", function(msg, code, req){
        (code == 200) ? window.location.replace("/#login") : message("<strong>Error! </strong>" + msg);
    });

    //prevent timeout
    oh.keepalive();

	function td(x){
		return($("<td>").text(x).attr("data-value", x || 0));
	}

    //add a user to the table row
	function addrow(userdata, highlight){

		//create the new row
		var mytr = $("<tr />").appendTo("#usertable tbody");
		userrows[userdata["username"]] = mytr;

		//newly added user
		if(highlight){
			mytr.addClass("success")
		}

		//fill in the fields
		td(userdata["personal_id"]).appendTo(mytr);
		td(userdata["first_name"]).appendTo(mytr);
		td(userdata["last_name"]).appendTo(mytr);
		td(userdata["username"]).appendTo(mytr);
		td(userdata["role"]).addClass("noprint").appendTo(mytr);

		//password field
		var pwfield = td("").appendTo(mytr);
		var password = userdata.password;

		//delete and change button fields
		var changetd = $("<td>").addClass("noprint").appendTo(mytr);
		var deltd = $("<td>").addClass("noprint").appendTo(mytr);

		//add the deletebutton
		var delbtn = $('<button class="btn btn-danger btn-sm"><span class="glyphicon glyphicon-remove"></span> Remove </button>').on("click", function(){
			if(!confirm("Are you sure you want to remove user " + userdata["username"] + " from this class?")) return;
			delbtn.attr("disabled", "disabled");
			oh.class.removeuser(urn, userdata["username"]).done(function(){
				var index = memberlist.indexOf(userdata["username"]);
				if (index > -1) {
				    memberlist.splice(index, 1);
				} else {
					console.log("removed member not found in memberlist?!?")
				}				
				mytr.fadeOut();
			}).always(function(){
				delbtn.removeAttr("disabled");
			});
		}).appendTo(deltd);

		//can't delte yourself
		if(userdata["username"] == me){
			delbtn.attr("disabled", "disabled").off("click");
		}

		//there are not user-setup accounts (or ACL problem)
		if(!password){
			pwfield.text("—")
			return;		
		}

		//only display the initial password if new_account is true
		if(userdata.permissions && userdata.permissions.new_account){
			pwfield.text(password).data("password", password);
		} else {
			pwfield.text("<activated>");
		}

		//add the reset password button
		var resetbtn = $('<button class="btn btn-default btn-sm"> <span class="glyphicon glyphicon-edit"></span> Change Passwd </button>').on("click", function(){

			$('#myModal').modal('show');
			$("#updatepasswordbtn").off("click").on("click", function(e){
				var btn = $(this);
				e.preventDefault();
				if(!$("#yourpassword").val()){
					alert("You must enter your password for authentication.");
					return;
				}				
				if($("#newpassword").val().length < 8){
					alert("Student password must be at least 8 characters.");
					return;
				}
				btn.attr("disabled", "disabled")
				oh.user.change_password({
					user : me,
					password : $("#yourpassword").val(),
					username : userdata["username"],
					new_password : $("#newpassword").val()
				}).done(function(){
					pwfield.text("<changed>");
					mytr.addClass("success");
				}).always(function(){
					$('#myModal').modal('hide');
					btn.removeAttr("disabled")
				});
			});
			//reset form state
			$("#newpassword").val("");
		}).appendTo(changetd);
	}

	//initial table population
	function buildusertable(){
		$("#usertable tbody").empty();
		oh.class.read({
			class_urn_list : urn
		}).done(function(classlist){
			classdata = classlist[urn];
			if(!classdata){
				alert("Class " + urn + " does not exist!!");
				location.replace(".");
			}
			$("#maintitle").text(classdata.name);
			$("#subtitle").text(classdata.role);
			oh.user.read({
				user_list : Object.keys(classdata.users).toString()
			}).done(function(userlist){
				var requests = [];
				$.each(userlist, function(id, rec){

					//store role and username in record
					rec.role = classdata.users[id];
					rec.username = id;

					//add it to the global list
					memberlist.push(id);

					//call user setup for each user to get the initial password
					if(!(rec["first_name"] && rec["last_name"] && rec["personal_id"] && rec["organization"])){
						addrow(rec, false);
						return;
					}

					//try to lookup the initial password (activation)
					progressStart();
					var req = oh.user.setup({
						first_name : rec["first_name"],
						last_name : rec["last_name"],
						organization : rec["organization"],
						personal_id : rec["personal_id"]
					}).done(function(data){
						if(data.username != rec.username){
							alert("Username collision detected: " + data.username + ", " + rec.username);
						} else {
							rec.password = data.password;
						}
					}).always(function(){
						progressDone();
						addrow(rec, false);
					});

					//keep track of requests
					requests.push(req);
				});

				//after all requests are done
				$.when.apply($, requests).always(function() {
					initTable();
					updateProgress()
				});
			}).always(function(){
				updateProgress()
			});
		}).always(function(){
			updateProgress()
		});
	}

	function buildcampaigntable(){
		oh.campaign.readall({
			class_urn_list : urn
		}).done(function(campaignlist){
			//add row for each campaign
			$.each(campaignlist, function(campaign_urn, campaigndata){
				var count;
				var mytr = $("<tr />").appendTo("#campaigntable tbody");
				td(campaigndata["name"]).appendTo(mytr);
				td(campaigndata["creation_timestamp"]).appendTo(mytr);
				td(campaigndata["classes"].length).appendTo(mytr);
				var restd = td("").appendTo(mytr);
				var deltd = td("").appendTo(mytr);

				campaigns.push({
					urn : campaign_urn,
					classlen : campaigndata["classes"].length,
					tr : mytr
				});

				progressStart();
                oh.survey.count(campaign_urn).done(function(counts){
                    if(!Object.keys(counts).length){
                        //no existing responses found
                        count = 0;
                    } else {
                        count = $.map(counts, function(val, key) {
                            return val[0].count;
                        }).reduce(function(previousValue, currentValue) {
                            return previousValue + currentValue;
                        });
                    }
                    restd.text(count)
                }).always(function(){
                	progressDone();
                });

                //add detach or delete button
                if(campaigndata["classes"].length > 1){
					var detachbtn = $('<button class="btn btn-warning btn-sm"><span class="glyphicon glyphicon-minus"></span> Detach </button>').on("click", function(){
						detachbtn.attr("disabled", "disabled");
						oh.campaign.removeclass(campaign_urn, urn).done(function(){
							mytr.fadeOut();
						}).always(function(){
							detachbtn.removeAttr("disabled");
						});
					}).appendTo(deltd);
                } else {
					var delbtn = $('<button class="btn btn-danger btn-sm"><span class="glyphicon glyphicon-remove"></span> Delete </button>').on("click", function(){
						if(count && !confirm("Are you sure? This will delete all " + count + " responses!")) return;
						delbtn.attr("disabled", "disabled");
						oh.campaign.delete({
							campaign_urn : campaign_urn
						}).done(function(){
							mytr.fadeOut();
						}).always(function(){
							delbtn.removeAttr("disabled");
						});
					}).appendTo(deltd);                	
                }
			});
		});
	}

	//data tables widget
	function initTable(){
		table = $('#usertable').DataTable( {
			"dom" : '<"pull-right"l><"pull-left"f>tip',
			"lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
			"aoColumnDefs": [
			{ 'bSortable': false, 'aTargets': [ 6, 7 ] },
			{ 'bSearchable': false, 'aTargets': [ 6, 7 ] },
			{ 'bVisible' : false, 'aTargets' : [  ] } 				
			]
		});
	}

	function message(msg, type){
		// type must be one of success, info, warning, danger
		type = type || "danger"
		$("#errordiv").append('<div class="alert alert-' + type + '"><a href="#" class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
		$('html, body').animate({
			scrollTop: 100
		}, 200);
	}

	//init page
	oh.user.whoami().done(function(username){

		//get the current user name and organization
		oh.user.read({user:username}).done(function(data){
			me = username;
			myuserdata = data[username];
		});

		//get the classes that the user has access to
		buildusertable();
		buildcampaigntable();
	});

	$("#randompasswordbtn").click(function(e){
		var btn = $(this);
		e.preventDefault();
		btn.attr("disabled", "disabled");
		$.get("/password/simple/", function(data){
			$("#newpassword").val(data);
		}).always(function(){
			btn.removeAttr("disabled")
		}).fail(function(){
			alert("Failed to generate random password.")
		});
	});

	//read csv from file (file input is async)
	function parse_file(file, cb){
		Papa.parse(file,{
			header:true, 
			skipEmptyLines:true,
			complete: function(results) {
				if(results.errors.length){
					message(results.errors)
				}
				cb(results);
			}
		});
	}

	var importdata;
	$('#input-csv').on('fileloaded', function(event, file, previewId, index, reader) {
		parse_file(file, function(results){
			importdata = results.data;
			var fields = results.meta.fields;
			$("select.import_field").empty();
			$("#import_email").append($("<option />"));
			$.each(fields, function(i, field){
				$("select.import_field").append($("<option />").text(field).val(field));						
			});
			$("select.import_field").val("");
			$(".import_field").removeAttr("disabled");
			$("#importform").css('opacity', '1');
		});
	}).on('fileclear', function(e){
		importdata = undefined;
		$("select.import_field").empty();
		$("#importform").css('opacity', '0.3');
		$(".import_field").attr("disabled", "disabled");
	}).fileinput({
		allowedFileExtensions: ["csv", "CSV"], 
		browseLabel : "Select CSV file",
		showUpload : false,
		showPreview : true	
	});

	function validate(x){
		var val = x.val()
		if(!val){
			x.parent().parent().addClass("has-error");
			return null;
		} else {
			x.parent().parent().removeClass("has-error");			
			return val;
		}
	}

	$("#importbutton").click(function(e){
		e.preventDefault();
		var btn = $(this)
		var id_var = validate($("#import_id"));
		var first_name_var = validate($("#import_first_name"));
		var last_name_var = validate($("#import_last_name"));
		var organization_var = validate($("#import_organization"));
		if(!id_var || !first_name_var || !last_name_var || !organization_var) return;
		var email_address_var = $("#import_email").val();
		var prefix = $("#import_prefix").val();
		btn.attr("disabled", "disabled")
		n = 0;
		m = 0;
		var new_user_count = 0;
		var requests = $.map(importdata, function(rec){
			var first_name = rec[first_name_var];
			var last_name = rec[last_name_var];
			var organization = rec[organization_var];
			var personal_id = rec[id_var];
			var email_address = email_address_var ? rec[email_address_var] : undefined;
			progressStart();
			return oh.user.setup({
				class_urn_list : urn,
				first_name : first_name,
				last_name : last_name,
				personal_id : personal_id,
				organization : organization,
				email_address : email_address,
				username_prefix : prefix
			}).done(function(setupdata){
				progressDone();
				var newuser = setupdata.username;
				var password = setupdata.password;

				//existing user
				if(memberlist.indexOf(newuser) > -1){
					userrows[newuser].addClass("info");
					return;
				};

				//new user
				new_user_count++;
				memberlist.push(newuser);
				addrow({
					personal_id : personal_id,
					first_name : first_name,
					last_name : last_name,
					organization : organization,
					password : password,
					username : newuser,
					role : "restricted",
					permissions : {
						new_account : true
					}
				}, true);
			});
		});

		//after all requests are done
		$.when.apply($, requests).always(function() {
			$('#input-csv').fileinput("clear");
			message("All done! Added " + new_user_count + " new users.", "success");
		});
	});

	$("#class_delete_button").click(function(e){
		e.preventDefault();
		$(this).blur();

		//check campaigns
		var errorlen = 0;
		$.each(campaigns, function(i, doc){
			if(doc.classlen == 1) {
				doc.tr.addClass("danger").hide().show( "slow", function(){
					doc.tr.removeClass("danger");
				});
				errorlen++
			}
		});
		if(errorlen) {
			message("This class has campaigns in it. You need to delete your campagins first.");
			return;
		}

		if(!confirm("Are you sure you want to delete the class? You cannot undo this.")) return;

		oh.class.delete({
			class_urn: urn,
			no_orphan_campaigns: true
		}).done(function(){
			alert("Class " + urn + " deleted!");
			location.replace(".");
		});
	});

	var import_fields = $(".import_field").change(function(){
		var me = this;
		$(me).parent().parent().removeClass("has-error");
		$.each(import_fields, function(i, you){
			if((me != you) && ($(me).val() == $(you).val())){
				$(you).val("");
			}
		});
	});
});
