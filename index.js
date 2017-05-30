$(function(){

	//these should correspond to name.xml files in the xml dir
	var subjectcampaigns = {
	    "ids" : ["FoodHabits", "PersonalityColor", "StressChill", "TimeUse", "TimePerception"]
	};

	//demo campaigns
	var democampaigns = {
		"Snack.xml" : "Snack",
		"Nutrition.xml" : "Nutrition",
		"StressChill.xml" : "Stress and Chill",
		"Trash.xml" : "Trash",
		"Media.xml" : "Advertisement",
	};

	//add the democampaigns
	$.each(democampaigns, function(xml, name){
		var input = $("<input>").attr("type", "checkbox").attr("value", xml)
		var label = $("<label />").addClass("checkbox-inline").append(input).append(name).appendTo("#inputDemoCampaigns");
	});

	//reset the curriculum select
	$("#inputSubject").prop('selectedIndex',0).change(updateFormFields);

	//globals
	var userdata;
	var table;
	var user_campaigns = [];

	//to lookup campaigns for a class
	var class_campaigns = {};

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

	function toTitleCase(str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	function first(obj) {
		for (var a in obj) return a;
	}

	function addrow(urn, classdata){
		var name = classdata.name;
		var role = classdata.role;
		var users = classdata.users
		var count = Object.keys(users).length;

		classdata.urn = urn;
		var mytr = $("<tr />").data("classdata", classdata).appendTo("#classtable tbody");
		td(name).appendTo(mytr);
		td(urn).appendTo(mytr);
		td(count).appendTo(mytr);
		td(role || "-").appendTo(mytr);

		var mybtn = $('<a class="btn btn-sm btn-default"><i class="glyphicon glyphicon-edit"></i> Manage</a>')
		.attr("href", "editclass.html#" + urn).appendTo($("<td>").addClass("buttontd").appendTo(mytr));

		if(!(role == "privileged" || userdata.permissions.admin)){
			mybtn.attr("disabled", "disabled");
			mybtn.click(function(e){
				e.preventDefault();
			})
		}

		td(Object.keys(users).join(", ")).appendTo(mytr);
	}

	function expand(rowdata, classdata) {
		var row = $('<div/>').addClass('row').addClass("response-row");
		var col1 = $("<div />").addClass("col-md-3").appendTo(row);
		var col2 = $("<div />").addClass("col-md-3").appendTo(row);

		var h1 = $("<h4 />").appendTo(col1);
		var h2 = $("<h4 />").appendTo(col2);

		var ul1 = $("<ul />").appendTo(col1)
		var ul2 = $("<ul />").appendTo(col2)

		var count_privileged = 0;
		var count_restricted = 0;
		$.each(classdata.users, function(name, role){
			$("<li/>").text(name).appendTo(role == "privileged" ? ul1 : ul2);
			if(role == "privileged"){
				count_privileged++
			} else {
				count_restricted++;
			}
		});

		h1.text("Privileged Users (" + count_privileged + ")");
		h2.text("Restricted Users (" + count_restricted + ")");

		var clen = class_campaigns[classdata.urn] ? class_campaigns[classdata.urn].length : 0;
		var col3 = $("<div />").addClass("col-md-6").appendTo(row).append($("<h4 />").text("Campaigns (" + clen + ")"));
		var ul3 = $("<ul />").appendTo(col3)
		if(class_campaigns[classdata.urn]){
			$.each(class_campaigns[classdata.urn], function(i, campaign_name){
				$("<li/>").text(campaign_name).appendTo(ul3)
			});
		}

		return row;
	}

	//data tables widget
	function initTable(){
		table = $('#classtable').DataTable( {
			"dom" : '<"pull-right"l><"pull-left"f>tip',
			"lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
			"aoColumnDefs": [
			{ 'bSortable': false, 'aTargets': [ 4, 5 ] },
			{ 'bSearchable': false, 'aTargets': [ 4 ] },
			{ 'bVisible' : false, 'aTargets' : [ 5 ] }
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

	function generateURN(name){
		"urn:class:" + utf2ascii(name.toLowerCase().replace(/\W/g, ''));
	}

	function urnify(str){
		return str.toLowerCase().replace(/\s/g, "_").replace(/[^a-z0-9:_]/gi,'');
	}

	function idify(str){
		return str.toLowerCase().replace(/[^a-z0-9]/gi,'');
	}

	function makeURN(){
		var curriculum = $("#inputSubject").val();
		if(!curriculum) return "";
		var org = userdata.organization ? urnify(userdata.organization + ":") : "";
		var lastname = userdata.last_name ? urnify(userdata.last_name + ":") : "";
		if(curriculum == "demo") {
			var classname = $("#inputClassName").val();
			var year = (new Date).getFullYear() + ":";
			return "urn:class:" + org + year + lastname + urnify(classname);
		} else {
			var semester = $("#inputQuarter").val().toLowerCase() + ":";
			var period = $("#inputPeriod").val().toLowerCase();
			var subject = curriculum + ":"
			return "urn:class:" + org + semester + lastname + subject + period;
		}
	}

	function updateFormFields(){
		$("#curriculum-name-group").removeClass("has-error");
		var curriculum = $("#inputSubject").val();
		if(!curriculum){
			$(".form-generic-only").hide();
			$(".form-mobilize-only").hide();
			return;
		} else if(curriculum == "demo") {
			$(".form-generic-only").show();
			$(".form-mobilize-only").hide();
		} else {
			$(".form-generic-only").hide();
			$(".form-mobilize-only").show();
			$("#subjectCampaignList").html(subjectcampaigns[curriculum].join(", "));
		}
		updateURN();
	}

	function updateURN(){
		$("#inputClassUrn").val(makeURN());
	}

	//suggest URN
	$("#inputClassName").on("keyup", function(){
		updateURN();
		if($(this).val()) $("#class-name-group").removeClass("has-error");
	});
	$(".form-mobilize-only").change(updateURN)

	//validator
	$("#inputClassUrn").on("keyup", function(){
		var urn = urnify($(this).val());
		$(this).val(urn);
	});

	$('[data-toggle="tooltip"]').tooltip()

	$("#createbutton").on("click", function createclass(e){
		var btn = $(this)
		e.preventDefault();
		updateURN();
		var class_urn = $("#inputClassUrn").val();
		var curriculum = $("#inputSubject").val();

		if(!curriculum)
			return $("#curriculum-name-group").addClass("has-error");

		var campaign_name_suffix = '';

		if(curriculum == "demo"){
			var campaigns = $.map($("#inputDemoCampaigns input:checked"), function(x){ return $(x).val()});
			var class_name = $("#inputClassName").val();
			if(!class_name){
				$("#class-name-group").addClass("has-error");
				return;
			}
		} else {
			var campaigns = $.map(subjectcampaigns[curriculum], function(x){return x + ".xml"});
			var subject = toTitleCase(curriculum);
			var semester = $("#inputQuarter").val();
			var period = $("#inputPeriod").val();
			var lastname = toTitleCase(userdata.last_name);
			var class_name = subject + " " + period + " " + lastname + " " + semester.replace(":", " ");
			campaign_name_suffix = " - " + class_name;
		}

		//try to create the new class
		btn.attr("disabled", "disabled")
		oh.class.create({
			class_urn : class_urn,
			class_name : class_name
		}).done(function(){
			//adding campaigns
			createCampaigns(class_urn, campaigns, campaign_name_suffix)
		}).always(function(){
			$('#myModal').modal('hide');
			btn.removeAttr("disabled")
		});
	});

	//downloads a campaign.xml file
	function download_file(url){
		return $.ajax({
			url: url,
			data: {},
			dataType: "text"
		}).fail(function() {
			message("Failed to download: " + url);
		});
	}

	function createCampaigns(class_urn, campaigns, campaign_name_suffix){
		//download the xml files
		var requests = $.map(campaigns, function(xmlfile){
			return download_file("xml/" + xmlfile);
		});

		//after all xml files are in
		$.when.apply($, requests).done(function() {
			var xmlstrings = $.map(requests, function(x){
				return x.responseText;
			});
			var requests2 = $.map(campaigns, function(val, i){
				var prettyname = democampaigns[val] || val.replace(".xml", "");
				var xmlstr = xmlstrings[i];
				var campaign_urn = class_urn.replace("urn:class", "urn:campaign") + ":" + urnify(val.replace(".xml", ""));

				//create new capaign unless it exists
				if(user_campaigns.indexOf(campaign_urn) < 0){
					return oh.campaign.create({
						privacy_state : "shared",
						running_state : "running",
						class_urn_list : class_urn,
						campaign_urn : campaign_urn,
						campaign_name : prettyname + campaign_name_suffix,
						xml : xmlstr
					});
				} else {
					return oh.campaign.addClass(campaign_urn, class_urn).done(function(){
						message("Campaign already exists. Adding class " + class_urn + " to campaign " + campaign_urn, "warning");
					});
				}
			});
			$.when.apply($, requests2).always(function() {
				window.location.href = 'editclass.html#' + class_urn;
			});
		});
	}

	//init page
	oh.user.whoami().done(function(username){

		//get the user campaigns and their associated classes
		oh.campaign.readall().done(function(res){
			user_campaigns = Object.keys(res);
			$.each(res, function(campaign_urn, campaign_data){
				if(!campaign_data.classes) return;
				$.each(campaign_data.classes, function(i, class_urn){
					if(!class_campaigns[class_urn]) class_campaigns[class_urn] = [];
					class_campaigns[class_urn].push(campaign_data.name);
				});
			});
		});

		//get the users name and organization
		oh.user.read({user:username}).done(function(data){
			userdata = data[username];
			updateFormFields();
			$("#subtitle").text(userdata.first_name + " " + userdata.last_name)

			var can_create = userdata.permissions.admin || (userdata.permissions.can_setup_users && userdata.permissions.can_create_classes);
			$("#new_class_button").removeAttr("disabled")
			if(!can_create){
				$("#new_class_button").click(function(e){
					e.preventDefault()
					e.stopPropagation();
					if(confirm("You currently do not have privileges to create new classes/users. Would you like to request such privileges?")){
						window.location.replace("../request");
					}
				});
			}

			//get the classes that the user has access to
			$("#classtable tbody").empty();
			oh.class.read({}).done(function(classdata){
				$.each(classdata, function(urn, value){
					addrow(urn, value)
				});
				initTable();
				//expand function
				$('#classtable').on('click', "tbody td:not('.buttontd')", function () {
					var tr = $(this).parent()
					var row = table.row(tr);
					if(tr.attr("role") != "row") return;
					if ( row.child.isShown() ) {
						// This row is already open - close it
						row.child.hide();
						tr.removeClass('shown');
					} else {
						// Open this row
						row.child( expand(row.data(), tr.data("classdata"))).show();
						tr.addClass('shown');
					}
				});
			});
		});
	});
});

$(function(){
	//Months range from 0 to 11 in javascript!
	var month = (new Date()).getMonth();
	var day = (new Date()).getDate();
	var year = (new Date()).getFullYear();

	if(month < 5 || (month == 5 && day < 16)){
		//up till June 15
		$("#inputQuarter")
			.append($("<option />").attr("value", year + ":Spring").text("Spring " + year))
			.append($("<option />").attr("value", year + ":Summer").text("Summer " + year))
			.append($("<option />").attr("value", year + ":Fall").text("Fall " + year));
	} else if(month < 7){
		//up till July 31
		$("#inputQuarter")
			.append($("<option />").attr("value", year + ":Summer").text("Summer " + year))
			.append($("<option />").attr("value", year + ":Fall").text("Fall " + year))
			.append($("<option />").attr("value", (year+1) + ":Spring").text("Spring " + (year+1)));
	} else {
		//rest of the year
		$("#inputQuarter")
			.append($("<option />").attr("value", year + ":Fall").text("Fall " + year))
			.append($("<option />").attr("value", (year+1) + ":Spring").text("Spring " + (year+1)))
			.append($("<option />").attr("value", (year+1) + ":Summer").text("Summer " + (year+1)));
	}
});
