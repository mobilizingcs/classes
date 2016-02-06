$(function(){

	//these should correspond to name.xml files in the xml dir
	var subjectcampaigns = {
	    "science" : ["Trash", "TrashWarmUp"],
	    "math" : ["Nutrition_v2", "Snack", "Height"],
	    "ecs" : ["Media", "Snack"],
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

	$("#inputSubject").change(function(){
		var curriculum = $(this).val();
		if(curriculum == "demo") {
			$("#inputDemoCampaigns").show();
			$("#subjectCampaignList").hide();
		} else {
			$("#inputDemoCampaigns").hide();
			$("#subjectCampaignList").show();
			$("#subjectCampaignList").html(subjectcampaigns[curriculum].join(", "));			
		}
	});

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

	//suggest URN
	$("#inputClassName").on("keyup", function(){
		var x = $(this).val();
		var org = userdata.organization ? urnify(userdata.organization + ":") : "";
		var lastname = userdata.last_name ? urnify(userdata.last_name + ":") : "";
		var year = (new Date).getFullYear() + ":";
		$("#inputClassUrn").val("urn:class:" + org + year + lastname + urnify(x));
	});

	//validator
	$("#inputClassUrn").on("keyup", function(){
		var urn = urnify($(this).val());
		$(this).val(urn);
	});

	$('[data-toggle="tooltip"]').tooltip()

	$("#createbutton").on("click", function createclass(e){
		var btn = $(this)
		e.preventDefault();
		var class_name = $("#inputClassName").val();
		var class_urn = $("#inputClassUrn").val();
		var curriculum = $("#inputSubject").val();

		class_name ?
			$("#class-name-group").removeClass("has-error") :
			$("#class-name-group").addClass("has-error");

		curriculum ?
			$("#curriculum-name-group").removeClass("has-error") :
			$("#curriculum-name-group").addClass("has-error");

		if(!class_name || !curriculum) return;
		
		var campaigns = (curriculum == "demo") ?
			$.map($("#inputDemoCampaigns input:checked"), function(x){ return $(x).val()}) :	
			$.map(subjectcampaigns[curriculum], function(x){return x + ".xml"});

		//try to create the new class
		btn.attr("disabled", "disabled")
		oh.class.create({
			class_urn : class_urn, 
			class_name : class_name
		}).done(function(){
			//adding campaigns
			createCampaigns(class_urn, campaigns)
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

	function createCampaigns(class_urn, campaigns){
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
						campaign_name : prettyname,
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
			$("#subtitle").text(userdata.first_name + " " + userdata.last_name)

			if(!(userdata.permissions.admin || userdata.permissions.can_setup_users)){
				//message("You do not have user/setup privileges!")
			}

			if((userdata.permissions.admin || userdata.permissions.can_create_classes)){
				$("#new_class_button").removeAttr("disabled");
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
