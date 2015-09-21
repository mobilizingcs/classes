$(function(){

	//globals
	var memberlist = [];
	var userdata;
	var table;
	var me;

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
    var oh = Ohmage("/app", "campaign-manager")

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
		var mytr = userdata.tablerow = $("<tr />").appendTo("#usertable tbody");

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

		//there are not user-setup accounts (or ACL problem)
		if(!password){
			pwfield.text("—")
			return;		
		}

		//only display the initial password if new_account is true
		if(userdata.permissions.new_account){
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

				//add the deletebutton
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
			userdata = data[username];
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

	$('#input-csv').on('fileloaded', function(event, file, previewId, index, reader) {
		parse_file(file, function(results){
			var fields = results.meta.fields;
			$.each(fields, function(i, field){
				$("select.import_field").append($("<option />").text(field));						
			});
			$(".import_field").removeAttr("disabled");
		});
	}).on('fileclear', function(e){
		$("select.import_field").empty();
		$(".import_field").attr("disabled", "disabled");
	});
});
