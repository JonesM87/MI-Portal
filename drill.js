
var width = (parseInt($(window).width()) * 0.75) - 8,
	height = parseInt($(window).height()) * 0.87;

var	root = [];
var nodes = [];
var links = [];
var container; 
var	rect; 
var	zoom; 
var	drag; 
var initialDraw = 1;
var fixOverride = 0;
var drillLevel;
var tempNodeData = [];
var filteredNodes = [];
var statNodeCnt = 0;
var statRepCnt = 0;
var statMetricCnt = 0;
var statSystemCnt = 0;
var statAreaCnt = 0;
var unDrillRecursion = true;
var unDrillRecursion2 = 2;
var universe = ($("#filter").val());
var searchLoop = false;

var x = d3.scale.linear()
    .domain([0.4, width])
    .range([0.4, width]);

var y = d3.scale.linear()
    .domain([0.4, height]) 
    .range([height, 0.4]);

var zoom = d3.behavior.zoom() 
		.x(x).y(y)
		.scaleExtent([0.1, 1.5]) // limits zoom level
		.on("zoom", zoomed2);
	
var force = d3.layout.force()
    .linkDistance(150)
	.charge(-2000)
	//.chargeDistance(200) // Doesn't work?!
    .gravity(0.1)
    .size([width, height])
    .friction(0.85) // 0.9 default
	.theta(1) // 0.8 default
	.linkStrength(0.8) // 1 by default
	.on("tick", tick);

var svg = d3.select("#vizchart").append("svg")
    .attr("width", width)
    .attr("height", height)
	.append("g") 
	.call(zoom)
	.on("dblclick.zoom", null); 
	
drag = d3.behavior.drag() 
	.origin(function(d) { return d; })
	.on("dragstart", dragstarted)
	.on("drag", dragged)
	.on("dragend", dragended);

rect = svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.attr("id","pancontrol")
		.attr("class","controlrect")
		.style("fill", "none")
		.style("pointer-events", "all");
	
container = svg.append("g");

var link = container.append("g").selectAll(".link");
var node = container.append("g").selectAll(".node");

function load(){	
	d3.json("data/newJson.json", function(error, json) {
		if (error) throw error;
	root = json;
	
	// runtime embed children in parent as a string for search function
	// should embed this in source data for performance
	$.each(root.children, function(i, s){
		var sChildCollection = "";
			if(s.children != null){
				var rChildCollection = "";
				$.each(s.children, function(i, a){	
					sChildCollection = sChildCollection + a.name;
					var aChildCollection = "";
					$.each(a.children, function(i,r){
						aChildCollection = aChildCollection + r.name;
					});
				a["childCollection"] = aChildCollection;
				rChildCollection = rChildCollection + aChildCollection;				
				});
			} 	
		s["childCollection"] = sChildCollection + rChildCollection;
	});
	
	
	update(0);
	});
}

function NodeFilter(){
		
	links = [];
	var tLD = [];
	tempNodeData = flatten(root);
	
	// get filter option value
	universe = ($("#filter").val());	
	//console.log("NodeFilter called");
	// FILTER LOGIC
	if (universe === "All"){
		filteredNodes = tempNodeData
    } else if(universe === "No B&Q"){
		filteredNodes = tempNodeData.filter(function(el){return el.type !== "BQ";});
	} else if(universe === "Commercial"){
		filteredNodes = tempNodeData.filter(function(el){return el.commercial === "y";});
    } else if(universe === "Finance"){
		filteredNodes = tempNodeData.filter(function(el){return el.finance === "y";});
    } else if(universe === "Stores"){
		filteredNodes = tempNodeData.filter(function(el){return el.stores === "y";});
	}

	nodes = filteredNodes;
	
		tLD = d3.layout.tree().links(nodes);
		
		// loop through and dynamically generate links based on nodes
		tLD.forEach(function(e){
			
			var sourceNode = nodes.filter(function(n){
				return n.id === e.source.id;
			})[0];
			
			var	targetNode = nodes.filter(function(n){
				return n.id === e.target.id;
			})[0];	
				
			// do not push undefined links
			if(typeof sourceNode === "undefined"){
				} else if (typeof targetNode === "undefined"){
				} else {
					links.push({
						source: sourceNode, 
						target: targetNode, 
					});
				};
		});
	
	// loop through, centre and remove B&Q node from force calculations	
	nodes.forEach(function(d){
		if(d.type === "BQ"){
			d.fixed = true; // unlinks first node from force calculations
			d.x = width / 2; // positions in centre of div
			d.y = height / 2;
		} 
	});
	// console.log("Nodes:"+universe,nodes);
	
}

function update(click) {

	unDrillRecursion = true;
	unDrillRecursion2 = 2;
	drillLevel = $("#slider").slider("values", "ui-values[0]");
	
	NodeFilter();

	
	if (initialDraw == 1){ // first draw only
		unDrill(root, drillLevel);
		// restate nodes & links based on children
		nodes = flatten(root);	
		links = d3.layout.tree().links(nodes);

	}
	initialDraw = 0;
	
	if (click === 0 && initialDraw === 0){ 

		unDrill(root, drillLevel);
		NodeFilter();
		// restate nodes & links based on children
		nodes = flatten(root);
		links = d3.layout.tree().links(nodes);
		

	}
	// update links
	try {
		link = link.data(links, function(d) { return d.target.id; });
	}
	catch(err) {
		//console.log(err);
	}
	
	link.enter()
		.insert("line", ".node")
		.attr("class", "link")
		.attr("data-targetchildren", function(d){return d.target.childCollection;})
		.attr("target", function(d){return d.target.name})
		;
	link.exit().remove();
	
	node = node.data(nodes, function(d) {return d.id;});	
	var nodeEnter = node.selectAll(".node");
	nodeEnter = node.exit().remove();
	nodeEnter = node
		.enter()
		.append("g")
		.attr("class", function(d){
			if(d.type == "report") {
				return "inactiveNodeReport";
			} else {
				return "inactiveNode";
			} 
		})
		.attr("id", function(d){
			if(d.type === "BQ"){
				return "cNodeParent";
			}
		})
		.attr("data-children", function(d){ return d.childCollection;})
		.on("click", function(d){nodeClick(this, d);})
		.call(force.drag);
	
	nodeEnter.append("circle")
		.attr("r", function(d){
			if(d.type == "area" || d.type == "system"){	
				return 16;
			} else if (d.type === "metric"){
				return 8;
			} else if (d.type == "report") {
				return 17;
			}
		});
	
	nodeEnter.append("image")
		.attr("xlink:href", function(d){
			var system = "images/server.png";
			var metric = "images/metric.png";
			var report = "images/report.png";
			var reportRed = "images/ReportRed.png";
			var reportAmber = "images/ReportAmber.png";
			var reportGreen = "images/ReportGreen.png";
			var reportGrey = "images/ReportGrey.png";
			var reportBlue = "images/ReportBlue.png";
			var BQ = "images/BQLogo.png";
			var area = "images/area.png";
			var cube = "images/cube.png";
			
			if (d.type === "BQ"){
				if(universe === "All"){
					return BQ;
				} else {
					return area;
				}
			} else if (d.type == "report"){
				// overwritten at runtime?
				if($('#overlayRisk').prop('checked')){
					if(d.risk === "Red"){
						return reportRed;
					} else if(d.risk === "Green"){
						return reportGreen;
					} else if(d.risk === "Amber") {
						return reportAmber;
					} else {
						return report;
					}
				} else if($('#overlayStatus').prop('checked')){
					if(d.status === "live_decom"){
						return reportAmber;
					} else if(d.status === "live_transit"){
						return reportBlue;
					} else if(d.status === "live_easier"){
						return reportGreen;
					} else if(d.status === "decom"){
						return reportGrey;
					} else {
						return report;
					}
				} else {
					return report;
				}
			} 
		})
		.attr("x", function(d){
			if (d.type === "metric"){
				return -4;
			} else if (d.type === "BQ"){
				return -24;
			} else if (d.type ==="report") {
				return -15;
			} else {
				return -10;
			}
		})
		.attr("id", function(d){ if(d.type==="BQ")  return "cNode"})
		.attr("y", function(d){
			if (d.type === "metric"){
				return -8;
			} else if (d.type === "BQ"){
				return -24;
			} else if (d.type ==="report") {
				return -15;
			} else {
			return -12;
			}
		})
		.attr("width", function(d){
			if (d.type === "metric"){
				return 12;
			} else if (d.type === "BQ") {
				return 48;
			} else if (d.type ==="report") {
				return 29;
			} else {
				return 24;
			}
		})
		.attr("height", function(d){
			if (d.type === "metric"){
				return 12;
			} else if (d.type === "BQ") {
				return 48;
			} else if (d.type ==="report") {
				return 29;
			} else {
				return 24;
			}
		});
	// end of image append
	
	nodeEnter.append("text")
		.attr("dy", function(d){
			if(d.type == "metric"){
				return "19px";
			} else {
				return "29px";
			}
		})
		.text(function(d) {
			if (d.type === "BQ"){
				if(universe !== "All"){
					return d.name;
				}
			} else {
				return d.name;
			}
		});
		
	node.select("circle")
		.style("fill", color);
	
	// Swap center image and text to match universe
	d3.select("#cNode").attr("xlink:href", function(d){
			var system = "images/server.png";
			var metric = "images/metric.png";
			var report = "images/report.png";
			var reportRed = "images/ReportRed.png";
			var reportGreen = "images/ReportGreen.png";
			var BQ = "images/BQLogo.png";
			var area = "images/area.png";
			var cube = "images/cube.png";
			
			
			if (d.type === "BQ"){
				if(universe === "All"){
					return BQ;
				} else {
					return area;
				}
			} else if (d.type == "report"){
				if(d.risk === "Red"){
					return reportRed;
				} else if(d.risk === "Green"){
					return reportGreen;
				} else {
					return report;
				}
			}
		});
	d3.select("#cNodeParent").selectAll("text").remove();
	d3.select("#cNodeParent").append("text")
		.attr("dy", function(d){
				if(d.type == "metric"){
					return "15px";
				} else {
					return "27px";
				}
			})
		.text(function(d) {
			if (d.type === "BQ"){
				if(universe !== "All"){
					return universe;
				}
			} else {
				return d.name;
			}
		});
	
	force.nodes(nodes)
			.links(links)
			.start();
	
	updateStats(nodes);	

}

function overlayRisk(){
d3.select("#cNodeParent").append("text")
		.attr("dy", function(d){
				if(d.type == "metric"){
					return "15px";
				} else {
					return "25px";
				}
			})
		.text(function(d) {
			if (d.type === "BQ"){
				if(universe !== "All"){
					return universe;
				}
			} else {
				return d.name;
			}
		});
}


function updateStats(nodes){
	
	statTotal = 0;
	
	statMetricCnt = 0;
	statNodeCnt = 0;
	statRepCnt = 0;
	statAreaCnt = 0;
	statSystemCnt = 0;
	
	statDecom = 0;
	statLiveDecom = 0;
	statLiveTransit = 0;
	statLiveEasier = 0;
	statStatusUnknown = 0;
	
	statRed = 0;
	statAmber = 0;
	statGreen = 0;
	statRiskUnknown = 0;
	
	nodes.forEach(function(d){
	
		if(d.type !== "BQ") {
			statTotal += 1;
		}
	
		if(d.type === "metric") statMetricCnt += 1;
		if(d.type === "report") statRepCnt += 1;
		if(d.type === "system") statSystemCnt += 1;
		if(d.type === "area")   statAreaCnt += 1;
		
		if(d.status === "decom") statDecom += 1;
		if(d.status === "live_decom") statLiveDecom += 1;
		if(d.status === "live_transit") statLiveTransit += 1;
		if(d.status === "live_easier")   statLiveEasier += 1;
		
		statStatusUnknown = statTotal - statDecom - statLiveDecom - statLiveTransit - statLiveEasier;
		
		if(d.risk === "Red") statRed += 1;
		if(d.risk === "Amber") statAmber += 1;
		if(d.risk === "Green") statGreen += 1;
		
		statRiskUnknown = statTotal - statRed - statAmber - statGreen;

	});
	
	$("#vizstats").html(
		"<div class='statTitle'>Displaying</div><br>"+
		"<div class='statLabel'>Systems:</div><div class='statNum'>"+statSystemCnt+"</div><br>"+
		"<div class='statLabel'>Reporting Areas:</div><div class='statNum'>"+statAreaCnt+"</div><br>"+
		"<div class='statLabel'>Reports:</div><div class='statNum'>"+statRepCnt+"</div><br>"+
		"<div class='statLabel'>Metrics:</div><div class='statNum'>"+statMetricCnt+"</div><br>"
	);
	
	if($('#overlayStatus').prop('checked')){
		
		if(statStatusUnknown > 0) {
			$("#vizstats").html(
				"<div class='statTitle'>Displaying</div><br>"+
				"<div class='statLabel'><div class='legend_decom'></div>Decom:</div><div class='statNum'>"+statDecom+"</div><br>"+
				"<div class='statLabel'><div class='legend_live_decom'></div>Live Decom:</div><div class='statNum'>"+statLiveDecom+"</div><br>"+
				"<div class='statLabel'><div class='legend_live_transit'></div>Live Transit:</div><div class='statNum'>"+statLiveTransit+"</div><br>"+
				"<div class='statLabel'><div class='legend_live_easier'></div>Live Easier:</div><div class='statNum'>"+statLiveEasier+"</div><br>"+
				"<div class='statLabel'><div class='legend_unknown'></div>Unknown:</div><div class='statNum'>"+statStatusUnknown+"</div><br>"
			);
		} else {
			$("#vizstats").html(
				"<div class='statTitle'>Displaying</div><br>"+
				"<div class='statLabel'><div class='legend_decom'></div>Decom:</div><div class='statNum'>"+statDecom+"</div><br>"+
				"<div class='statLabel'><div class='legend_live_decom'></div>Live Decom:</div><div class='statNum'>"+statLiveDecom+"</div><br>"+
				"<div class='statLabel'><div class='legend_live_transit'></div>Live Transit:</div><div class='statNum'>"+statLiveTransit+"</div><br>"+
				"<div class='statLabel'><div class='legend_live_easier'></div>Live Easier:</div><div class='statNum'>"+statLiveEasier+"</div><br>"
			);
		}
		
		
	}
	
	if($('#overlayRisk').prop('checked')){
		if(statRiskUnknown > 0){
			$("#vizstats").html(
				"<div class='statTitle'>Displaying</div><br>"+
				"<div class='statLabel'><div class='legend_red'></div>High:</div><div class='statNum'>"+statRed+"</div><br>"+
				"<div class='statLabel'><div class='legend_amber'></div>Medium:</div><div class='statNum'>"+statAmber+"</div><br>"+
				"<div class='statLabel'><div class='legend_green'></div>Low:</div><div class='statNum'>"+statGreen+"</div><br>"+
				"<div class='statLabel'><div class='legend_unknown'></div>Unknown:</div><div class='statNum'>"+statRiskUnknown+"</div><br>"
			);
		} else {
			$("#vizstats").html(
				"<div class='statTitle'>Displaying</div><br>"+
				"<div class='statLabel'><div class='legend_red'></div>High:</div><div class='statNum'>"+statRed+"</div><br>"+
				"<div class='statLabel'><div class='legend_amber'></div>Medium:</div><div class='statNum'>"+statAmber+"</div><br>"+
				"<div class='statLabel'><div class='legend_green'></div>Low:</div><div class='statNum'>"+statGreen+"</div><br>"
			);
		}
			
	}
	
}

// on tick update positions
function tick() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });
  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    
}

// node colour - use classes instead?
function color(d) {
	if($('#overlayRisk').prop('checked')){
		if(d.risk === "Red") return "#C61A27";
		if(d.risk === "Amber") return "#FFA100";
		if(d.risk === "Green") return "#288C08";
			
	} else if ($('#overlayStatus').prop('checked')){
		if(d.status === "live_decom") return "#FFA100"; // amber
		if(d.status === "live_transit") return "#3962D4"; // blue
		if(d.status === "live_easier") return "#009900"; //green
		if(d.status === "decom") {
			return "#888888"; // 
		} else {
			return "#333333"; // (catch all nodes with no status)
		}		
	} else {
	 return d._children ? "#3182bd" // collapsed package
		  : d.children ? "#c6dbef" // expanded package
		  : "#fd8d3c"; // leaf node
	}
}


// removes child nodes for initial draw call
function unDrill(root,level){
	//console.log("unDrill");
	//$("#filter").val("All");
	//nodes = flatten(root);
	//nodes = filteredNodes; // does not drill correctly
	//console.log("predrill",nodes);
		if(level == 1){
			//console.log("level 1 undrill");
			nodes.forEach(function(d) {
				if(d.type == "system"){
					if(d.children){
						d._children = d.children;
						d.children = null;
					}
				}	
				if(d.type == "area"){
					if(d.children){
						d._children = d.children;
						d.children = null;
					}
				}
				if(d.type == "report"){
					if(d.children){
						d._children = d.children;
						d.children = null;
					}
				}
			});
		}
		if(level == 2){
			//console.log("level 2 undrill");
			nodes.forEach(function(d) {
				if(d.type == "report"){
					if(d.children){
						d._children = d.children;
						d.children = null;
					}
				}	
				if(d.type == "area"){
					if(d.children){
						d._children = d.children;
						d.children = null;
					}
				}
				if(d.type == "system"){
					if(d._children){
						d.children = d._children;
						d._children = null;
					}
				}			
			});
		}
		if(level == 3){
			//console.log("level 3 undrill");
			nodes.forEach(function(d) {
				if(d.type == "area"){
					if(d._children){
						d.children = d._children;
						d._children = null;
					}
				}
				if(d.type == "report"){
					if(d.children){
						d._children = d.children;
						d.children = null;
					}
				}	
				if(d.type == "system"){
					if(d._children){
						d.children = d._children;
						d._children = null;
					}
				}			
			});
		}
		if(level == 4){
			//console.log("level 4 undrill");
			nodes.forEach(function(d) {
				if(d.type == "report"){ // report children
					if(d._children){
						d.children = d._children;
						d._children = null;
					}
				}	
				if(d.type == "area"){ // area children
					if(d._children){
						d.children = d._children;
						d._children = null;
					}
				}
				if(d.type == "system"){ // system children
					if(d._children){
						d.children = d._children;
						d._children = null;
					}
				}
			});
		
		}

		
// recursive fix -- not efficient but works
if(level === 1 && unDrillRecursion === true){
	//console.log("unDrill recursion");
	unDrillRecursion = false;
	unDrill(root, 1);	
}
if(level === 2 && unDrillRecursion === true){
	//console.log("unDrill recursion");
	unDrillRecursion = false;
	unDrill(root, 2);	
}
if(level === 3 && unDrillRecursion === true){
	//console.log("unDrill recursion");
	unDrillRecursion = false;
	unDrill(root, 3);	
}
if(level === 4 && unDrillRecursion2 > 0){
	unDrillRecursion2 -= 1;
	unDrill(root, 4);	
}

//return nodes;

}


// returns a list of all nodes under the root.
function flatten(root) {
	var nodes = [], i = 0;
	function recurse(node) {
		if (node.children) node.children.forEach(recurse);
		if (!node.id) node.id = ++i;
		nodes.push(node);
	}
recurse(root);
return nodes;
}

function reset(){
	//console.log("reset called");
	initialDraw = 1;
	$("#filter").val("All");
	$("#slider").slider('value',1);
	load();
	
	// reset classes
	$("g").each(function(i,o){
		// nodes
		if( $(this).attr("class") == "found" || $(this).attr("class") == "notFound" ){	
			if( $(this).find("image").attr("href") != "images/report.png" ){
				$(this).attr("class", "inactiveNode");
			} else {
				$(this).attr("class", "inactiveNodeReport");
			}
		}
		// reports
		if($(this).attr("class") == "activeNodeReport" || $(this).attr("class") == "inactiveNodeReport"){	
			$(this).find("image").attr("href", "images/report.png");
		}
		// links
		$("line").each(function(i,o){	
			$(this).attr("class", "link");
		});
	});
	
	$("g").each(function(i,o){
		if( $(this).attr("class") == "found" || $(this).attr("class") == "notFound" ){	
			if( $(this).find("image").attr("href") != "images/report.png" ){
				$(this).attr("class", "inactiveNode");
			} else {
				$(this).attr("class", "inactiveNodeReport");
			}
		}
		if($(this).attr("class") == "activeNodeReport" || $(this).attr("class") == "inactiveNodeReport"){	
			//$(this).find("image").attr("href", "images/report.png");
		}
	});
	$("#searchInput").val("");
	
	updateStats(nodes);
}

function showAll(){
	//console.log("show all called");
	initialDraw = 0;
	$("#slider").slider('value',4);
	load();
	container.transition().duration(750)
		.call(zoom.translate(200, 200).scale(0.3));
}

// load data and draw layout	
load();

var aNode; // last node
function nodeClick(node, d) {

// reset classes
$("g").each(function(i,o){
	if( $(this).attr("class") == "found" || $(this).attr("class") == "notFound" ){	
		$(this).attr("class", "inactiveNode");
	}
	if($(this).attr("class") == "activeNodeReport" || $(this).attr("class") == "inactiveNodeReport"){
		//console.log("report img reset");
		//$(this).find("image").attr("href", "images/report.png");
	}
});

d.fixed = true; // pin current node


if(node !== aNode) {
	//console.log("node !== aNode");
	var imgCount;
	var ajaxurl = 'check_file.php';
	var data =  {"node" : d.name};
	$.ajax({
		async: false //<- this is bad practice
		, type: "POST"
		, url: ajaxurl
		, data: data
		, complete: function(data){
			imgCount = data.responseText;
		}  
		, error: function(req, status, error) {
			alert(req.responseText);      
		}
	});
	
	var content = "<div id='righttitlediv'>"+d.name+"</div>" 	
				+"<div class='nodecard'><div id='nodeinfoheader'>Description</div>"
					+"<div id='nodedesc'>"+d.description+"</div>"
					+"<div id='nodethumb'>";

	switch (true) {
		case imgCount == "0":
			content = content + "<a href='images/No Image Available.png' data-lightbox='1' data-title='No Image Available'><img src='images/No Image Available.png'></a>";		
			break;
		case imgCount == "1":
			content = content + "<a href='images/"+d.name+".png' data-lightbox='1' data-title='"+d.name+"'><img src='images/"+d.name+".png'></a>";
			break;
		case imgCount == "2":
			content = content + "<a href='images/"+d.name+".png' data-lightbox='1' data-title='"+d.name+"'><img src='images/"+d.name+".png'></a>"		
							  +"<a href='images/"+d.name+"_2.png' data-lightbox='1' data-title='"+d.name+"'></a>";
			break;
		case imgCount == "3":
			content = content + "<a href='images/"+d.name+".png' data-lightbox='1' data-title='"+d.name+"'><img src='images/"+d.name+".png'></a>"		
							  +"<a href='images/"+d.name+"_2.png' data-lightbox='1' data-title='"+d.name+"'></a>"
							  +"<a href='images/"+d.name+"_3.png' data-lightbox='1' data-title='"+d.name+"'></a>";
			break;
		case imgCount == "4":
			content = content + "<a href='images/"+d.name+".png' data-lightbox='1' data-title='"+d.name+"'><img src='images/"+d.name+".png'></a>"		
							  +"<a href='images/"+d.name+"_2.png' data-lightbox='1' data-title='"+d.name+"'></a>"
							  +"<a href='images/"+d.name+"_3.png' data-lightbox='1' data-title='"+d.name+"'></a>"
							  +"<a href='images/"+d.name+"_4.png' data-lightbox='1' data-title='"+d.name+"'></a>";
			break;
		case imgCount == "5":
			content = content + "<a href='images/"+d.name+".png' data-lightbox='1' data-title='"+d.name+"'><img src='images/"+d.name+".png'></a>"		
							  +"<a href='images/"+d.name+"_2.png' data-lightbox='1' data-title='"+d.name+"'></a>"
							  +"<a href='images/"+d.name+"_3.png' data-lightbox='1' data-title='"+d.name+"'></a>"
							  +"<a href='images/"+d.name+"_4.png' data-lightbox='1' data-title='"+d.name+"'></a>"
							  +"<a href='images/"+d.name+"_5.png' data-lightbox='1' data-title='"+d.name+"'></a>";
			break;
	}
					
			
				content = content +"</div>"
					+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
				/*
				+"<div class='nodecard'><div id='nodeinfoheader'>Data</div>"
				+"<div id='nodetext'>Details on KPIs, metrics and measures</div>"
				+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
				*/
				+"<div class='nodecard'><div id='nodeinfoheader'>Migration Plan</div>";
				
				if(d.status == "decom"){
					content = content + "Current status: Decomissioned";
				} else if(d.status == "live_decom") {
					content = content + "Current status: Live in legacy";
				} else if(d.status == "live_transit") {
					content = content + "Current status: Live in legacy";
				} else if(d.status == "live_easier") {
					content = content + "Current status: Live in Easier";
				} else {
					content = content + "No transition status yet assigned";
				}
				
				
				content = content +"<table class='table tableCondensed'>"
					+"<thead>"
						+"<tr>"
							+"<th>Status</th>"
							+"<th>Date</th>"
						+"</tr>"
						+"<tr>"
							+"<td>Legacy</td>"
							+"<td>-</td>"
						+"</tr>"
						+"<tr>"
							+"<td>Migration Start</td>"
							+"<td>";
							if(d.migration_start){content = content + d.migration_start} else {content = content + "TBC"}
							
				content = content + "</td>"
						+"</tr>"
						+"<tr>"
							+"<td>New Platform</td>"
							+"<td>";
							if(d.migration_start){content = content + d.migration_end} else {content = content + "TBC"}							d.migration_end +"</td>"
				content = content +"</tr>"	
					+"</thead>"
				+"</table></div>"
				+"<div class='nodecard'><div id='nodeinfoheader'>Risk</div>";
				
				if(d.risk == "Green" || d.risk == "green"){
					content = content +"<div id='nodetext'><img class='statusimage' src='images/green.png'>Current risk status green</div>"
				} else if(d.risk == "Amber" || d.risk == "amber"){
					content = content +"<div id='nodetext'><img class='statusimage' src='images/amber.png'>Current risk status amber</div>"
				} else if(d.risk == "Red" || d.risk == "red"){
					content = content +"<div id='nodetext'><img class='statusimage' src='images/red.png'>Current risk status red </div>"
				} 
				
				content = content +"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
				+"<div class='nodecard'><div id='nodeinfoheader'>Migration Contact</div>"
				+"<div id='nodetext'>Migration assigned to Mark Jones "
				+"(<a href='mailto:mark.jones@b-and-q.co.uk?Subject="+d.name+" Migration' target='_top'>email</a>)</div>"
				+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
		;
		
	if(aNode === undefined) {
			aNode = node; // log this node as aNode if first click
		} else if (node !== aNode){
			if( $(aNode).attr("class") == "activeNode"){
				$(aNode).attr("class","inactiveNode"); // deactivate aNode
			} else if( $(aNode).attr("class") == "activeNodeReport" ){
				$(aNode).attr("class","inactiveNodeReport"); // deactivate aNode
			} else {
				//$(aNode).attr("class","activeNodeReport"); // deactivate aNode
			}
			aNode = node; // if different, log node as aNode
		}
	
		
	$("#rightdiv").hide();
	$("#rightdiv").html(content);
	$("#rightdiv").show("clip", 100);	
		
} else {
		//console.log("node === aNode");
		var content = "<div id='righttitlediv'>Instructions</div>" 
		+"<div class='nodecard'>"
			+"Click on a node for more information, this also expands any child nodes, click again to collapse<br>"
		+"</div>"
		+"<div class='nodecard'>"
			+"Nodes can be dragged around to untangle the visualization <br>"
		+"</div>"
		+"<div class='nodecard'>"
			+"Click and drag to pan<br>"
		+"</div>"
		+"<div class='nodecard'>"
			+"Use mousewheel to zoom in and out<br>"
		+"</div>";
		$("#rightdiv").hide();
		$("#rightdiv").html(content);
		$("#rightdiv").show("clip", 100);	
		

	}
	
	// NODE
	if(d._children && $(node).attr("class") === "inactiveNode"){ // stored children & inactive
		nodeDrill(d); 
		$(node).attr("class","activeNode");
		//console.log("1");		
	} else if (d._children && $(node).attr("class") === "activeNode"){ // stored children & active
		nodeDrill(d); 
		$(node).attr("class","activeNode")
		//console.log("2");			
	} else if(d.children && $(node).attr("class") === "activeNode"){
		nodeDrill(d); 	
		$(node).attr("class","activeNode");	
		d.fixed = false;
		//console.log("3");
	} else if(d.children && $(node).attr("class") === "inactiveNode"){
		$(node).attr("class","activeNode");
		//console.log("4");
	} 
	// REPORT
	if(d._children && $(node).attr("class") === "inactiveNodeReport"){ // stored children & inactive
		nodeDrill(d); 
		$(node).attr("class","activeNodeReport");
		//console.log("5");
	} else if (d._children && $(node).attr("class") === "activeNodeReport"){ // stored children & active
		nodeDrill(d); 
		$(node).attr("class","activeNodeReport");
		//console.log("6");		
	} else if(d.children && $(node).attr("class") === "activeNodeReport"){
		nodeDrill(d); 		
		$(node).attr("class","inactiveNodeReport");	
		d.fixed = false;
		//console.log("7");
	} else if(d.children && $(node).attr("class") === "inactiveNodeReport"){
		$(node).attr("class","activeNodeReport")
		//console.log("8");
	} 

	// SEARCH HIGHLIGHT
	var searchText = $("#searchInput").val();
	if(searchText != ""){
		$("g").each(function(i,o){
			// nodes
			if($(this).attr("class") == "activeNode" || $(this).attr("class") == "inactiveNode" || $(this).attr("class") == "found" || $(this).attr("class") == "notFound"){	
				if($(this).find("text").text().search(new RegExp(searchText, "i")) >= 0 ){
					$(this).attr("class", "found");
					$(this).find("circle").attr("style","fill:rgb(255,102,0);");
				} else {
					$(this).attr("class", "notFound");
					$(this).find("circle").attr("style","fill:rgb(220,220,220);");
				}	
			}
			// if children have match
			var childCollection = $(this).attr("data-children");
			if(childCollection){
				if(childCollection.search(new RegExp(searchText, "i")) >= 0 ){
					$(this).attr("class", "found");
					$(this).find("circle").attr("style","fill:rgb(255,102,0);");
				}
			}
			// reports
			if($(this).attr("class") == "activeNodeReport" || $(this).attr("class") == "inactiveNodeReport"){	
				if($(this).find("text").text().search(new RegExp(searchText, "i")) >= 0 ){
					$(this).find("image").attr("href", "images/ReportOrange.png");
				} else {
					$(this).find("image").attr("href", "images/ReportGrey.png");					
				}	
			}
			// links
			$("line").each(function(i,o){
				var linkTargetChildren = $(this).attr("data-targetchildren");
				var linkTarget = $(this).attr("target");
				if(linkTargetChildren != null && linkTarget != null){
					if(linkTarget.search(new RegExp(searchText, "i")) >= 0 || linkTargetChildren.search(new RegExp(searchText, "i")) >= 0 ){
						$(this).attr("class", "linkFound");
					} else {
						$(this).attr("class", "linkNotFound");
					}	
				} else if(linkTargetChildren != null){
					if(linkTargetChildren.search(new RegExp(searchText, "i")) >= 0 ){
						$(this).attr("class", "linkFound");
					} else {
						$(this).attr("class", "linkNotFound");
					}
				} else if(linkTarget != null){
						if(linkTarget.search(new RegExp(searchText, "i")) >= 0 ){
							$(this).attr("class", "linkFound");
						} else {
							$(this).attr("class", "linkNotFound");
						}	
				}
			});
		});
	} 	
}

// extended click
function nodeDrill(d) {
	//console.log("node drill");
	
	// delay enable node force calc for more stable drill animation
	//setTimeout(function(){
	//		d.fixed=false;
	//}, 1050);
	
	if (d3.event.defaultPrevented) return; // ignore drag
	if (d.children) {
		d._children = d.children;
		d.children = null;
		
	} else {
		d.children = d._children;
		d._children = null;
	}
	update(1); // redraw graph
}

function zoomed() {
	svg.attr("transform", "translate(" + zoom.translate + ")scale(" + zoom.scale + ")");
} 

function zoomed2() {
	container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
} 

function dragstarted(d) {
	d3.event.sourceEvent.stopPropagation();
	d3.select(this).classed("dragging", true);
 }
function dragged(d) {
	d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}
function dragended(d) {
	d3.select(this).classed("dragging", false);	
}

// new zoom buttons
function interpolateZoom (translate, scale) {
    var self = this;
    return d3.transition().duration(350).tween("zoom", function () {
        var iTranslate = d3.interpolate(zoom.translate(), translate),
            iScale = d3.interpolate(zoom.scale(), scale);
        return function (t) {
            zoom
                .scale(iScale(t))
                .translate(iTranslate(t));
            zoomed();
        };
    });
}

function zoomClick() {
    var clicked = d3.event.target,
        direction = 1,
        factor = 0.2,
        target_zoom = 1,
        center = [width / 2, height / 2],
        extent = zoom.scaleExtent(),
        translate = zoom.translate(),
        translate0 = [],
        l = [],
        view = {x: translate[0], y: translate[1], k: zoom.scale()};

    d3.event.preventDefault();
    direction = (this.id === 'zoom_in') ? 1 : -1;
    target_zoom = zoom.scale() * (1 + factor * direction);

    if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }

    translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
    view.k = target_zoom;
    l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

    view.x += center[0] - l[0];
    view.y += center[1] - l[1];
	//console.log(view.x, view.y, view.k);
    interpolateZoom([view.x, view.y], view.k);
}

d3.select("#zoombuttons").selectAll("button").on('click', zoomClick);


