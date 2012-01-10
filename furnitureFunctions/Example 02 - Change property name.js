function(doc){
	if(doc.oldPropertyName) {
		doc.newPropertyName = doc.oldPropertyName;
		delete doc.oldPropertyName;
	}
	return doc;
}