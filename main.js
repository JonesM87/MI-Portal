function zoomed() {
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

// GLOBALS
var container;
var	rect;
var	zoom;
var	drag;
var	svg;
var filePath = "data/force_all.json";	
//var nodeData = [0];
//var linkData = [0];
	
//clear chart area

//declare size based on window
var width = (parseInt($(window).width()) * 0.6) -8,
	height = parseInt($(window).height()) * 0.85;

zoom = d3.behavior.zoom()
		.scaleExtent([0, 10])
		.on("zoom", zoomed);

drag = d3.behavior.drag()
		.origin(function(d) { return d; })
		.on("dragstart", dragstarted)
		.on("drag", dragged)
		.on("dragend", dragended);

svg = d3.select("#vizchart").append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.call(zoom);

rect = svg.append("rect")
		.attr("width", width)
		.attr("height", height)
		.attr("id","pancontrol")
		.attr("class","controlrect")
		.style("fill", "none")
		.style("pointer-events", "all");
	
container = svg.append("g");
	
var force = d3.layout.force()
	.gravity(0.8) //0.04 previous
	.linkDistance(function(d){
		return d.length;
		//return 100;
	})
	.charge(function(d){
		return d.charge;
		//return -500;
	})
	.size([width, height]);

	

// data load and filter
d3.json(filePath, function(error, file) {
	
	if (error) throw error;
	json = file;
  
  	var tempLinkData = [];
	var tempNodeData = [];
	var tLD = [];
	var tND = [];
	var universe = ($("#filter").val());	
	
	tND = json.nodes.filter(function(el){return el.node_type !== "metric"});
	tLD = json.links.filter(function(el){return el.metric_link === 0});
	
	//FILTER LOGIC
	if (universe === "All"){
		tempNodeData = tND;
    } else if(universe === "NoB&Q"){
		tempNodeData = tND.filter(function(el){return el.name !== "B&Q";});
    }else if(universe === "Commercial"){
		tempNodeData = tND.filter(function(el){return el.commercial_universe === "X";});
    } else if(universe === "Finance"){
		tempNodeData = tND.filter(function(el){return el.finance_universe === "X";});
    } else if(universe === "Stores"){
		tempNodeData = tND.filter(function(el){return el.stores_universe === "X";});	
	}
	
	
	//loop through and dynamically generate links based on nodes
	tLD.forEach(function(e){
		
		var sourceNode = tempNodeData.filter(function(n){return n.id == e.source;})[0];
		var	targetNode = tempNodeData.filter(function(n){return n.id == e.target;})[0];	
		
		// do not push undefined links
		if(typeof sourceNode === "undefined"){
				//console.log("undefined");
			} else if (typeof targetNode === "undefined"){
				//console.log("undefined");
			} else {
			// build new links array
				tempLinkData.push({
					source: sourceNode, 
					target: targetNode, 
					metric_link: e.metric_link,
					length: e.length,
					length: e.length
				});
			};
	});
	
	//no metric filter
	nodeData = tempNodeData;
	linkData = tempLinkData;
	
	nodeData[0].fixed = true; // unlinks first node from force calculations
    nodeData[0].x = width / 2; // positions in centre of div
    nodeData[0].y = height / 2;
  
	/* DEBUG FOR INALID LINKS  
	linkData.forEach(function(link) {
        if (typeof nodeData[link.source] === "undefined") {
            console.log("undefined source:", link);
        }
        if (typeof nodeData[link.target] === "undefined") {
            console.log("undefined target:", link);
        } else {
			console.log("link check success");
		}
    });
	*/	
  
  update();
});

function drillControl(drillLevel){
	console.log(drillLevel);
}


function update(){	
//d3.select("#vizchart").selectAll(".link").remove(); 
//d3.select("#vizchart").selectAll(".node").remove();

force.nodes(nodeData)
	.links(linkData)
	.friction(0.9) // 0.9 default
	.theta(0.9) // 0.8 default
	.linkStrength(0.9) // 1 by default
	.start();	


//Update Links
var link = container.append("g")
	  .attr("class", "links")
	  .selectAll(".link");
	  
link = link.data(linkData);
link.exit().remove();

link.enter().append("line")
      .attr("class", "link");
	  
//Update Nodes
var	node = container.append("g")
	  .attr("class", "nodes")
	  .selectAll(".node");
node = node.data(nodeData, function(d){ return d.id;});
node.exit().remove();
node.enter().append("g")
      .attr("class", "node")
	  .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .call(force.drag);

node.append("image")

	.attr("xlink:href", function(d){
	var system = "images/server.png";
	var metric = "images/metric.png";
	var report = "images/report.png";
	var BQ = "images/BQLogo.png";
	var area = "images/area.png";
	var cube = "images/cube.png";
		
		if (d.node_type === "system"){
			return system;
		} else if (d.node_type === "metric"){
			return metric;
		} else if (d.node_type === "report"){
			return report;
		} else if (d.node_type === "BQ"){
			return BQ;
		} else if (d.node_type === "function"){
			return area;
		} else if (d.node_type === "report_area"){
			return cube;
		}
	  })
	  
	  .attr("x", function(d){
		if (d.node_type === "metric"){
			return -4;
		} else if (d.node_type === "BQ"){
			return -15;
		} else {
			return -10;
		}
	  })
	  
	  .attr("y", function(d){
		if (d.node_type === "metric"){
			return -4;
		} else if (d.node_type === "BQ"){
			return -15;
		} else {
			return -10;
		}
	  })
	  
	  .attr("width", function(d){
		if (d.node_type === "metric"){
			return 8;
		} else if (d.node_type === "BQ") {
			return 30;
		} else {
			return 20;
		} 
	  })
	  
	  .attr("height", function(d){
		if (d.node_type === "metric"){
			return 8;
		} else if (d.node_type === "BQ") {
			return 30;
		} else {
			return 20;
		} 
	  });
	  
	node.append("circle")
		.attr("r",16)
		.attr("class","inactiveNode")
		.on("click", function(d){nodeClick(this, d);});
		//.on("click", function(d){click(d);});
	
	node.append("text")
	.attr("dx", function(d){
		if (d.node_type === "metric"){
			return 5;
		} else {return 11;}
	})
	.attr("dy", ".35em")
	.text(function(d) {
		if (d.name !== "B&Q"){return d.name} 
	});
	
	
	
    // loading text
	container.append("text")
		.text("Loading...")
		.attr("x", width/2)			 
		.attr("y", height/2)
		.attr("class", "loading")
		;
	
	// ON TICK FUNCTION
	var tickLimit = 200;
	var ticks = 0;
	var gravDelta = 0.005;
	var gravCurrent = 0.7;
	var gravLimit = 0.04;
	var opacityCurrent = 0;
	var opacityDelta = 1.04; //opacity non linear gradient
	var initial = 1;
	force.on("tick", function(e) {
		
		
		node.attr("transform", function(d){
			if(d.index==0){
				damper = 0.5;
				d.x = d.x + (width / 2 - d.x) * (damper + 0.71) * e.alpha;
				d.y = d.y + (height / 2 - d.y) * (damper + 0.71) * e.alpha;
			}
		});
  
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	
		ticks = ticks + 1;	
		
		if (gravCurrent > gravLimit){
			gravCurrent = gravCurrent - (gravDelta);
		}
		opacityCurrent = opacityCurrent + (Math.pow(opacityDelta,ticks)/100000);
		
		//re-heat physics simulation after time delay
		if(ticks < tickLimit){
			force.gravity(gravCurrent);
			force.resume();
			d3.selectAll(".node").style("opacity", opacityCurrent);
			d3.selectAll(".link").style("opacity", opacityCurrent);
			d3.selectAll(".loading").style("opacity", 1 - opacityCurrent);
		} else {
			d3.selectAll(".node").style("opacity", 1);
			d3.selectAll(".link").style("opacity", 1);
			d3.selectAll(".loading").style("opacity", 1 - opacityCurrent);
		}
	
	if(ticks == 250){
		initial = 0;
		d3.selectAll(".loading").remove();
	}

	});

} //end of update()

// NODE CLICK
var aNode;
function nodeClick(node, d) {

if(node !== aNode) {

	var content = "<div id='righttitlediv'>"+d.name+"</div>" 	
				+"<div class='nodecard'><div id='nodeinfoheader'>Description</div>"
					+"<div id='nodedesc'>"+d.desc+"</div>"
					+"<div id='nodethumb'>"
						+"<a href='images/"+d.name+".png' data-lightbox='1' data-title='"+d.name+"'><img src='images/"+d.name+".png'></a>"
						+"<a href='images/"+d.name+"_2.png' data-lightbox='1' data-title='"+d.name+"'></a>"
						+"<a href='images/"+d.name+"_3.png' data-lightbox='1' data-title='"+d.name+"'></a>"
						+"<a href='images/"+d.name+"_4.png' data-lightbox='1' data-title='"+d.name+"'></a>"
						+"<a href='images/"+d.name+"_5.png' data-lightbox='1' data-title='"+d.name+"'></a>"
					+"</div>"
					+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
				+"<div class='nodecard'><div id='nodeinfoheader'>Data</div>"
				+"<div id='nodetext'>Details on KPIs, metrics and measures</div>"
				+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
				+"<div class='nodecard'><div id='nodeinfoheader'>Migration Plan</div>"
				+"<table class='table tableCondensed'>"
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
							+"<td>"+d.migration_start+"</td>"
						+"</tr>"
						+"<tr>"
							+"<td>New Platform</td>"
							+"<td>"+ d.migration_end +"</td>"
						+"</tr>"	
					+"</thead>"
				+"</table></div>"
				+"<div class='nodecard'><div id='nodeinfoheader'>Risk</div>"
				+"<div id='nodetext'><img class='statusimage' src='images/green.png'>Current risk status green, awaiting migration start</div>"
				+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
				+"<div class='nodecard'><div id='nodeinfoheader'>Migration Contact</div>"
				+"<div id='nodetext'>Migration assigned to Mark Jones "
				+"(<a href='mailto:mark.jones@b-and-q.co.uk?Subject="+d.name+" Migration' target='_top'>email</a>)</div>"
				+"<div class='spacer' style='clear: both;'></div>"
				+"</div>"
		;
	if(aNode === undefined) {
			aNode = node;
		} else if (node !== aNode){
			$(aNode).attr("class","inactiveNode");
			aNode = node;
		}
		$(node).attr("class","activeNode");	
		$("#rightdiv").hide();
		$("#rightdiv").html(content);
		$("#rightdiv").show("clip", 100);	
	} else {
		var content = "<div id='righttitlediv'>Instructions</div>" 
		+"<div class='nodecard'>"
			+"Click to select a node for more information, <br>"
		+"</div>"
		+"<div class='nodecard'>"
			+"Nodes can be dragged around to untangle the visualization<br>"
		+"</div>"
		+"<div class='nodecard'>"
			+"Click, hold and drag in white space to pan around<br>"
		+"</div>"
		+"<div class='nodecard'>"
			+"Use the mousewheel to zoom in and out<br>"
		+"</div>";
		$("#rightdiv").hide();
		$("#rightdiv").html(content);
		$("#rightdiv").show("clip", 100);	
		$(aNode).attr("class","inactiveNode");
		aNode = undefined;
	}
};


