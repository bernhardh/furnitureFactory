#furnitureFactory
[furnitureFactory](http://github.com/bernhardh/furnitureFactory) is an improved userinterface for bulk editing CouchDB documents based on [costco](http://harthur.github.com/costco).

The main improvments are:
* show differences between old version and the new version of the docs
* possibility to use stored functions for frequently-used tasks
* prettier gui
* use of JSON.stringify to find changes even if a reference has changed

#install
furnitureFactory is a [couchapp](http://couchapp.org), you can push it to any CouchDB database:

	git clone http://github.com/bernhardh/furnitureFactory.git
	cd costco
	couchapp push . http://hostname:5984/mydatabase

#usage

There are two main possibilities to use furnitureFactory: JSON and map function

##Create new documents
You can write a JSON object to create a new document to your database:

	{
		"type": "document-type",
		"name": "my document name"
	}

To create several documents, use a comma between the JSON's:

	{"type": "document-type", "name": "my document name"},
	{"type": "document-type", "name": "my second document name"}
	
##Change / edit existing docs
furnitureFactory takes a map function and executes it on all the docs in the database. The map function should return the new doc that you'd like to replace the old one, or null if it should be deleted. Returning nothing or "undefined" does nothing to that doc.

An example map function that increments a field in all the docs and deletes some docs based on another field:

	function(doc) {
	  if(doc.text.length > 200)
	    return null; //delete the doc

	  doc.count++;
	  return doc;
	}

##Using stored functions (furnitureFunctions)
You can use furnitureFactory functions (both, JSON and map functions as well) by tipping in the code into the textarea or by saving the function/JSON into a new file in the furnitureFunctions/ directory. These stored furnitureFunctions can be reused by loading it into the textarea.

	
Find more examples in the furnitureFunctions directory
