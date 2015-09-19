$(function(){

	//globals
	var userdata;
	var table;

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

	//find the campaign name
	$("#subtitle").text(urn)

	//init page
	oh.user.whoami().done(function(username){

		//get the users name and organization
		oh.user.read({user:username}).done(function(data){
			userdata = data[username];
		});

		//get the classes that the user has access to
		$("#usertable tbody").empty();
		oh.class.read({}).done(function(classdata){
			$.each(classdata, function(urn, value){
				//addrow(urn, value)
			});
			initTable();
		});
	});
});
