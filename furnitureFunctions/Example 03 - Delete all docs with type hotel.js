function(doc) {
	if(doc.type && doc.type === "hotel") {
		return null; // = delete doc
	} else {
		return doc;
	}
}