function(doc){
	function countLetters(string){
		if(typeof string === "string") {
			return string.length;
		} else {
			return 0;
		}		
	}
	
	doc.name = "The doc type is ";
		
	if(doc.type) {
		doc.lengthOfType = countLetters(doc.type);
		doc.name += doc.type;
	} else {
		doc.name += "unknown";
	}
	
	return doc;
}