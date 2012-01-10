/*
 * FurnitureFactory 0.5 (version from 2001-01-10)
 * Based on costco fork (version from 2011-01-18)
 * https://github.com/harthur/costco
 */

$(document).ready(function() {
	$("#map-function").val("function(doc) {\n\treturn doc;\n}");
	
	$(".update-button").click(costco.computeChanges);
	$("#update-container").hide();
	
	$("#continue-button").click(function() {
		$("#statusText").html("updating docs").removeClass().addClass("process");
		costco.updateDocs(function() {
			$("#statusText").html("Docs successfully updated").removeClass().addClass("success");
		});
		$("#update-container").hide();
		$("#resultSet").hide();
		delete(costco.changes);
	});
	
	$("#cancel-button").click(function() {
		$('#update-container').hide();
		$('#statusText').empty();
		$("#status-box").hide();
		$("#resultSet").hide();
		delete(costco.changes);
	});
	
	$("#new-db-option").click(function() {
		$("#create-box").show();
	});
	
	$("#existing-dbs").click(function(){
		$("#create-box").hide();
	});
	
	$("#create-box").hide();
	$("#create-db").click(costco.createDb);
	
	$.couch.allDbs({
		success: function(dbs) {
			$("#existing-dbs option").remove();
			dbs.forEach(function(db){
				$("<option></option>").val(db).html(db).appendTo("#existing-dbs");
			});
			$.couch.app(function(app) {
				$('#db-select').val(app.db.name);
			});
		},
		error: function(req, status, err) {
			$("#statusText").html("Error fetching dbs: " + err).removeClass().addClass("error");
		}
	});
	
	$("#results").click(function(e) {
		var e = e || window.event;
		if(e.target.nodeName.toUpperCase() === "UL") {
			if (e.target.getAttribute("closed") === "yes")
				e.target.setAttribute("closed", "no");
			else
				e.target.setAttribute("closed", "yes");
		}
	});
});

var costco = {
		
	getDb : function() {
		return $.couch.db($("#db-select").val());
	},
	
	createDb : function() {
		var dbname = $("#new-db-name").val();
		$.couch.db(dbname).create({
			success: function() {
				$("<option></option>").val(dbname).html(dbname).appendTo("#existing-dbs")
				$("#db-select").val(dbname);
				$("#create-box").hide();
				$("#status-box").show();
				$("#statusText").html("Database creation successful").removeClass().addClass("success");
			},
			error: function(req, status, err) {
				$("#statusText").html("Could not create db: " + err).removeClass().addClass("error");
			}
		});
	},
	
	computeChanges : function() {
		$("#status-box").show();
		$("#statusText").html("Computing changes").removeClass().addClass("process");
		$("#resultSet").hide();
		var text, docs;
		
		text = $("#map-function").val();
				
		try {
			docs = JSON.parse(text);
		} catch(e) {
			try {
				docs = JSON.parse("[" + text + "]");
			} catch(e) {
				// not JSON, must be an edit function
				return costco.mapDocs(text);
			}
		}
		if(!docs.length) docs = [docs];
		
		costco.resultSet = {
			updatedDocs: docs
		}
		
		$("#statusText").html("About to add " + docs.length + " docs to " + costco.getDb().name).removeClass().addClass("warning");
		$("#update-container").show();		
	},
	
	mapDocs : function(funcString) {
		try {
			eval("var editFunc = " + funcString);
		} catch(e) {
			$("#statusText").html("Error evaluating function: "	+ e).removeClass().addClass("error");
			return;
		}
		
		costco.resultSet = {
			unchangedDocs: [],
			updatedDocs: [],
			failedDocs: [],
			deletedDocs: []
		}
		costco.failureDocsMsg = [];
		var deletedCounter = 0, editedCounter = 0, failedCounter = 0;
		
		costco.getDocs(function(data) {
			var rows = data.rows;
			var oldRows = JSON.parse(JSON.stringify(rows));
			
			var naviNrDocs = 0;
			rows.forEach(function(row, key) {
				var doc = row.doc;
				var oldDoc = oldRows[key].doc;
				try {
					var updated = editFunc(doc, oldRows);
				} catch(e) {					
					costco.resultSet.failedDocs.push(doc);
					costco.failureDocsMsg.push(e);
					failedCounter++; // ignore if it throws on this doc
					return;
				}
				if(updated === null) {
					doc = {
						_id: doc._id,
						_rev: doc._rev,
						type: doc.type,
						_deleted: true
					};
					
					costco.resultSet.deletedDocs.push(doc);
					deletedCounter++;
				}
				else if(updated && !_.isEqual(updated, oldDoc)) {
					costco.resultSet.updatedDocs.push(updated);							
					costco.resultSet.unchangedDocs.push(oldDoc);
					editedCounter++;						
				}
			});		
			
			$(".resultsLeiste").children().remove(); // Clear resultNavigation
			$("#resultsHeader").html('<div><span class="tab activeTab">Results</span></div>');			
			
			if (failedCounter || deletedCounter || editedCounter) {
				$("#resultSet").show();
				$("#resultsHeader").empty();
				$("#statusText").html("The following changes can be made:<ul></ul>").removeClass().addClass("warning");
				
				if (editedCounter) { //Do we have Docs to update
					$("#statusText ul").append("<li>Edit " + editedCounter + " docs from " + costco.getDb().name + "</li>").removeClass().addClass("warning");
					$("#resultsHeader").append("<a id='nChanged' href='#' data-whichresultset='updatedDocs' class='tab'>CHANGED</a>");
				}				
				if (failedCounter) { //Are there any Docs which failed?
					$("#statusText ul").append("<li>Edit function threw on " + failedCounter + " doc</li>").removeClass().addClass("warning");
					$("#resultsHeader").append("<a id='nFailed' href='#' data-whichresultset='failedDocs' class='tab'>FAILED</a>");					
				}
				if (deletedCounter) { //Do we have Docs to delete
					$("#statusText ul").append("<li>Delete " + deletedCounter + " docs from " + costco.getDb().name + "</li>").removeClass().addClass("warning");
					$("#resultsHeader").append("<a id='nDeleted' href='#' data-whichresultset='deletedDocs' class='tab'>DELETE</a>");
				}
				
				$("#update-container").show();
				
				if(editedCounter) {
					costco.compareBase = costco.resultSet.unchangedDocs;	
					costco.showResultBar(editedCounter);
					costco.showDiff(0, "updatedDocs");
					$("#nChanged").addClass("activeTab");
					$("#results").data("whichresultset","changedDocs").addClass("showChanges");									
				} else if(failedCounter){
					costco.compareBase = costco.resultSet.failedDocs;
					costco.showResultBar(failedCounter);
					costco.showDiff(0, "failedDocs");
					$("#nFailed").addClass("activeTab");
					$("#results").data("whichresultset","failedDocs");					
				} else if(deletedCounter) {
					costco.compareBase = costco.resultSet.deletedDocs;
					costco.showResultBar(deletedCounter);
					costco.showDiff(0, "deletedDocs");
					$("#nDeleted").addClass("activeTab");
					$("#results").data("whichresultset","deletedDocs");					
				}	
						
				$("#results").focus();				
			} else {
				$('#statusText').empty();
				$("#statusText").append("No changes can be made").removeClass().addClass("warning");
			}				
		});
	},
	
	updateDocs : function(callback) {
		var updateOrChange = [];
		
		if(costco.resultSet.updatedDocs.length) {
			updateOrChange = updateOrChange.concat(costco.resultSet.updatedDocs);
		} 
		if(costco.resultSet.deletedDocs){
			updateOrChange = updateOrChange.concat(costco.resultSet.deletedDocs);
		}
		
		if(!updateOrChange.length)	return callback();
		
		costco.getDb().bulkSave({docs: updateOrChange}, {
			success: callback,
			error: function(req, status, err) {
				$("#statusText").html("Error updating docs: " + err).removeClass().addClass("error");
			}
		});
	},
	
	getDocs : function(callback) {
		costco.getDb().allDocs({
			include_docs : true,
			success : callback,
			error: function(req, status, err) {
				$("#statusText").html("Error retrieving docs: " + err).removeClass().addClass("error");
			}
		});
	},
	
	/*
	 * Result-div Functions
	 */	
	showResultBar: function(naviNrDocs) {
		if (naviNrDocs > 1) { //Back
			$(".resultsLeiste").html("<a href='#' class='firstPageButton'><img src='img/first.png' alt='|- First' /></a> <a href='#' class='previousPageButton'><img src='img/back.png' alt='&laquo; Back' /></a>");
		}					
		$(".resultsLeiste").append(" <span class='docNr'>1</span> <span>of " + naviNrDocs + " </span> ");
		if (naviNrDocs > 1) { //Next
			$(".resultsLeiste").append("<a href='#' class='nextPageButton'><img src='img/next.png' alt='Next &raquo;' /></a> <a href='#' class='lastPageButton'><img src='img/last.png' alt='Last -|' /></a>")
		}
	},
	
	/**	 * 
	 * @param {int} index
	 * @param {string} docType ("changedDocs" | "failedDocs" | "deletedDocs")
	 */	
	showDiff: function(index, docType) {
		var msg = "", baseSet, resultSet;
				
		$("#results").html("");		
		$("#results").data("nr", index);
		$(".docNr").text(index + 1);
		
		switch(docType) {
			case "updatedDocs": 
				baseSet = costco.resultSet.unchangedDocs;
				resultSet = costco.resultSet.updatedDocs;
				break;
			case "failedDocs": 
				baseSet = costco.resultSet.failedDocs;
				resultSet = costco.resultSet.failedDocs;
				msg = costco.failureDocsMsg[index];
				break;
			case "deletedDocs": 
				baseSet = costco.resultSet.deletedDocs;
				resultSet = costco.resultSet.deletedDocs;
				break;
		}
		
		compareTree(baseSet[index], resultSet[index], "Dokument-Root (" + resultSet[index].type +")", document.getElementById("results"));
		if(msg) $("#results").prepend("<div class='failureMsg'>" + msg + "</div>");			
	},
			
	gotoNextPage: function() {
		var i = parseInt($("#results").data("nr")) + 1 || 1;
		var docType = $("#resultsHeader .activeTab").attr("data-whichresultset");
		if(i >= costco.resultSet[docType].length) i = 0;				
		costco.showDiff(i, docType);				
		return false;
	},
	
	gotoPreviousPage: function(){
		var i = parseInt($("#results").data("nr")) - 1 || 0;
		var docType = $("#resultsHeader .activeTab").attr("data-whichresultset"); 
		if (i == -1) i = costco.resultSet[docType].length - 1;				
		costco.showDiff(i, docType);				
		return false;
	},
	
	gotoFirstPage: function() {
		var docType = $("#resultsHeader .activeTab").attr("data-whichresultset");
		costco.showDiff(0, docType);
		return false;
	},
	
	gotoLastPage: function() {
		var docType = $("#resultsHeader .activeTab").attr("data-whichresultset");
		costco.showDiff(costco.resultSet[docType].length - 1, docType);
		return false;
	}
}

/**
 * Event-Listener
 */
$(".nextPageButton").live("click", costco.gotoNextPage);
$(".previousPageButton").live("click", costco.gotoPreviousPage);
$(".firstPageButton").live("click", costco.gotoFirstPage);
$(".lastPageButton").live("click", costco.gotoLastPage);
$("#resultsHeader a").live("click",function(event){
	var docType = $(this).attr("data-whichresultset");
	$("#resultsHeader").children().removeClass("activeTab");
	$(this).addClass("activeTab");
	
	if(docType == "toUpdate" ) {
		costco.compareBase = costco.resultSet.updatedDocs;
		$("#results").addClass("showChanges");
	} else {		
		$("#results").removeClass("showChanges");
		if(docType == "failedDocs") {
			costco.compareBase = costco.resultSet.failedDocs;
		} else {
			costco.compareBase = costco.resultSet.deletedDocs;
		}		
	}	
	
	costco.showResultBar(costco.resultSet[docType].length);
	costco.showDiff(0, docType);
});	

$.couch.app(function(app) {
	var ff = app.ddoc.furnitureFunctions, $ffList = $("#furnitureFunctions");
	var func = _.keys(ff);
	func.sort(function(a,b) {
		return a < b ? -1 : 1; //ascending
	});
	
	$ffList.attr("size", func.length > 15 ? 15 : func.length);
	
	for(var i in func) {
		$ffList.append('<option value="' + func[i]  + '">' + func[i] + '</option>');
	}
	
	//Load stored functions
	$("#loadStoredFunctions-button").click(function(){
		$("#resultSet").hide();
		$("#status-box").hide();
		if ($("#furnitureFunctions option:selected").length > 0) {			
			var funcName = $("#furnitureFunctions option:selected").val();
			
			furnitureFunction = ff[funcName].trim();			
			$("#map-function-box .title").text("Stored functions");
			$("#map-function").val(furnitureFunction); 
		}
	});
	
	//Create new function in textarea
	$("#newFunction-button").click(function(){
		$("#resultSet").hide();
		$("#status-box").hide();
		$("#map-function-box .title").text("New function");
		$("#map-function").val("function(doc) {\n\treturn doc;\n}").removeAttr("readonly");
	});
});