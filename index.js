$(function(){

	//globals
	var userdata;
	var table;

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

		var mytr = $("<tr />").data("classdata", classdata).appendTo("#classtable tbody");
		td(name).appendTo(mytr);
		td(urn).appendTo(mytr);
		td(count).appendTo(mytr);
		td(role || "-").appendTo(mytr);

		var mybtn = $('<a class="btn btn-sm btn-default"><i class="glyphicon glyphicon-edit"></i> Manage</a>')
		.attr("href", "editclass.html?class=" + urn).appendTo($("<td>").addClass("buttontd").appendTo(mytr));

		if(role != "privileged"){
			mybtn.attr("disabled", "disabled");
			mybtn.click(function(e){
				e.preventDefault();
			})
		}

		td(Object.keys(users).join(", ")).appendTo(mytr);
	}

	function expand(rowdata, classdata) {
		var row = $('<div/>').addClass('row').addClass("response-row");
		var col1 = $("<div />").addClass("col-md-6").appendTo(row).append($("<h4 />").text("privileged"));
		var col2 = $("<div />").addClass("col-md-6").appendTo(row).append($("<h4 />").text("restricted"));
		var ul1 = $("<ul />").appendTo(col1)
		var ul2 = $("<ul />").appendTo(col2)

		$.each(classdata.users, function(name, role){
			$("<li/>").text(name).appendTo(role == "privileged" ? ul1 : ul2)
		});
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
		"urn:class:" + utf2ascii(name.toLowerCase().replace(/\W/g, ''))
	}

	function urnify(str){
		return str.toLowerCase().replace(/\s/g, "_").replace(/[^a-z0-9:_]/gi,'')
	}	

	//suggest URN
	$("#inputClassName").on("keyup", function(){
		var x = $(this).val();
		var org = userdata.organization ? urnify(userdata.organization + ":") : "";
		var lastname = userdata.last_name ? urnify(userdata.last_name + ":") : "";
		$("#inputClassUrn").val("urn:class:" + org + lastname + urnify(x));
	});

	//validator
	$("#inputClassUrn").on("keyup", function(){
		var urn = urnify($(this).val());
		$(this).val(urn);
	});

	$("#createbutton").on("click", function createclass(e){
		e.preventDefault();
		class_name = $("#inputClassName").val();
		class_urn = $("#inputClassUrn").val();

		//try to create the new class
		oh.class.create(class_urn, class_name, function(){
			$('#myModal').modal('hide');
			window.location.href = 'editclass.html?class=' + class_urn;
		});
	});

	//init page
	oh.user.whoami(function(username){
		oh.keepalive();

		//get the users name and organization
		oh.user.read(username, function(data){
			userdata = data[username];
		});

		//get the classes that the user has access to
		$("#classtable tbody").empty();
		oh.class.read({}, function(classdata){
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
