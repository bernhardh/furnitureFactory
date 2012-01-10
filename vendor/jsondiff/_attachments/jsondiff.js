/*
 * JSON-Diff extracted from http://tlrobinson.net/projects/javascript-fun/jsondiff/
 * 2006-2010 Thomas Robinson
 * Licence: http://creativecommons.org/licenses/by-nc/3.0/us/
 * Date of extraction: 2011-05-01
 */
var testVar = 0;

function startCompare(){
	var objA, objB;
	
	jsonBoxA.style.backgroundColor = "";
	jsonBoxB.style.backgroundColor = "";
	
	try { objA = eval("("+jsonBoxA.value+")"); } catch(e) { jsonBoxA.style.backgroundColor = "rgba(255,0,0,0.5)"; }
	try { objB = eval("("+jsonBoxB.value+")"); } catch(e) { jsonBoxB.style.backgroundColor = "rgba(255,0,0,0.5)"; }
	
	results = document.getElementById("results");
	while (results.firstChild)
		results.removeChild(results.firstChild);
		
	compareTree(objA, objB, "root", results);
}

function compareTree(a, b, name, results){
	var typeA = typeofReal(a);
	var typeB = typeofReal(b);
	
	var typeSpanA = document.createElement("span");
	typeSpanA.appendChild(document.createTextNode("("+typeA+")"))
	typeSpanA.setAttribute("class", "typeName");

	var typeSpanB = document.createElement("span");
	typeSpanB.appendChild(document.createTextNode("("+typeB+")"))
	typeSpanB.setAttribute("class", "typeName");
	
	var aString = (typeA === "object" || typeA === "array") ? "" : String(a) + " ";
	var bString = (typeB === "object" || typeB === "array") ? "" : String(b) + " ";
	
	var leafNode = document.createElement("span");
	leafNode.appendChild(document.createTextNode(name));
	if (a === undefined)
	{
		leafNode.setAttribute("class", "added");
		leafNode.appendChild(document.createTextNode(": " + bString));
		leafNode.appendChild(typeSpanB);
	}
	else if (b === undefined)
	{
		leafNode.setAttribute("class", "removed");
		leafNode.appendChild(document.createTextNode(": " + aString));
		leafNode.appendChild(typeSpanA);
	}
	else if (typeA !== typeB || (typeA !== "object" && typeA !== "array" && a !== b))
	{
		leafNode.setAttribute("class", "changed");
		leafNode.appendChild(document.createTextNode(": " + aString));
		leafNode.appendChild(typeSpanA);
		leafNode.appendChild(document.createTextNode(" => "+ bString));
		leafNode.appendChild(typeSpanB);
	}
	else
	{
		leafNode.appendChild(document.createTextNode(": " + aString));
		leafNode.appendChild(typeSpanA);
	}
	
	if (typeA === "object" || typeA === "array" || typeB === "object" || typeB === "array")
	{
		var keys = [];
		for (var i in a) keys.push(i);				
		for (var i in b) keys.push(i);
		keys.sort();
		
		var listNode = document.createElement("ul");
		listNode.appendChild(leafNode);
		
		for (var i = 0; i < keys.length; i++)
		{
			if (keys[i] === keys[i-1])
				continue;
				
			var li = document.createElement("li");
			listNode.appendChild(li);
			
			compareTree(a && a[keys[i]], b && b[keys[i]], keys[i], li);
		}
		
		results.appendChild(listNode);
	}	
	else
	{
		results.appendChild(leafNode);
	}
		
}

function isArray(value) { return value && typeof value === "object" && value.constructor === Array; }
function typeofReal(value) { return isArray(value) ? "array" : typeof value; }

function clickHandler(e){
	var e = e || window.event;
	if(e.target.nodeName.toUpperCase() === "UL")
	{
		if (e.target.getAttribute("closed") === "yes")
			e.target.setAttribute("closed", "no");
		else
			e.target.setAttribute("closed", "yes");
	}
}