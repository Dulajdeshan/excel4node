var WorkSheet = require('./WorkSheet.js'),
style = require('./Style.js'),
xml = require('xmlbuilder'),
jszip = require('jszip'),
xml = require('xmlbuilder');
fs = require('fs');

function setWSOpts(thisWS){
	// Set Margins
	if(thisWS.opts.margins){
		thisWS.margins.bottom = thisWS.opts.margins.bottom?thisWS.opts.margins.bottom:1.0;
		thisWS.margins.footer = thisWS.opts.margins.footer?thisWS.opts.margins.footer:.5;
		thisWS.margins.header = thisWS.opts.margins.header?thisWS.opts.margins.header:.5;
		thisWS.margins.left = thisWS.opts.margins.left?thisWS.opts.margins.left:.75;
		thisWS.margins.right = thisWS.opts.margins.right?thisWS.opts.margins.right:.75;
		thisWS.margins.top = thisWS.opts.margins.top?thisWS.opts.margins.top:1.0;
	}
	Object.keys(thisWS.margins).forEach(function(k){
		var margin = {};
		margin['@'+k] = thisWS.margins[k];
		thisWS.sheet.pageMargins.push(margin);
	});

	// Set Print Options
	if(thisWS.opts.printOptions){
		thisWS.printOptions.centerHorizontal = thisWS.opts.printOptions.centerHorizontal?thisWS.opts.printOptions.centerHorizontal:false;
		thisWS.printOptions.centerVertical = thisWS.opts.printOptions.centerVertical?thisWS.opts.printOptions.centerVertical:false;
	}
	thisWS.sheet.printOptions.push({'@horizontalCentered':thisWS.printOptions.centerHorizontal?1:0});
	thisWS.sheet.printOptions.push({'@verticalCentered':thisWS.printOptions.centerVertical?1:0});

	// Set Page View options
	var thisView = thisWS.sheet.sheetViews[0].sheetView;
	if(thisWS.opts.view){
		if(parseInt(thisWS.opts.view.zoom) != thisWS.opts.view.zoom){
			console.log("invalid value for zoom. value must be an integer. value was %s",thisWS.opts.view.zoom);
			thisWS.opts.view.zoom = 100;
		}
		thisWS.sheetView.zoomScale = thisWS.opts.view.zoom?thisWS.opts.view.zoom:100;
		thisWS.sheetView.zoomScaleNormal = thisWS.opts.view.zoom?thisWS.opts.view.zoom:100;
		thisWS.sheetView.zoomScalePageLayoutView = thisWS.opts.view.zoom?thisWS.opts.view.zoom:100;
	}

	thisView.push({'@workbookViewId':thisWS.sheetView.workbookViewId?thisWS.sheetView.workbookViewId:0});
	thisView.push({'@zoomScale':thisWS.sheetView.zoomScale?thisWS.sheetView.zoomScale:100});
	thisView.push({'@zoomScaleNormal':thisWS.sheetView.zoomScaleNormal?thisWS.sheetView.zoomScaleNormal:100});
	thisView.push({'@zoomScalePageLayoutView':thisWS.sheetView.zoomScalePageLayoutView?thisWS.sheetView.zoomScalePageLayoutView:100});
}


var xmlOutVars = {};
var xmlDebugVars = { pretty: true, indent: '  ',newline: '\n' };

exports.WorkBook = function(opts){
	var opts = opts?opts:{};

	var thisWB = {};
	thisWB.opts = {};
	thisWB.opts.jszip = {};
	thisWB.opts.jszip.compression = 'DEFLATE';
	if(opts.jszip){
		Object.keys(opts.jszip).forEach(function(k){
			thisWB.opts.jszip[k] = opts.jszip.compression;
		});
	};

	thisWB.defaults={
		colWidth:opts.colWidth?opts.colWidth:15
	};
	thisWB.styleData={
		numFmts:[],
		fonts:[],
		fills:[],
		borders:[],
		//cellStyleXfs:[],
		cellXfs:[]
	};
	thisWB.workbook = {
		WorkSheets:[],
		workbook:{
			'@xmlns:r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
			'@xmlns':'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
			bookViews:[
				{
					workbookView:{
						'@tabRatio':'600',
						'@windowHeight':'14980',
						'@windowWidth':'25600',
						'@xWindow':'0',
						'@yWindow':'1080'
					}
				}
			],
			sheets:[]
		},
		strings : {
			sst:[
				{
					'@count':0,
					'@uniqueCount':0,
					'@xmlns':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
				}
			]
		},
		workbook_xml_rels:{
			Relationships:[
				{
					'@xmlns':'http://schemas.openxmlformats.org/package/2006/relationships'
				},
				{
					Relationship:{
						'@Id':generateRId(),
						'@Target':'sharedStrings.xml',
						'@Type':'http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings'
					}
				},
				{
					Relationship:{
						'@Id':generateRId(),
						'@Target':'styles.xml',
						'@Type':'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles'
					}
				}
			]
		},
		global_rels:{
			Relationships:[
				{
					'@xmlns':'http://schemas.openxmlformats.org/package/2006/relationships'
				},
				{
					Relationship:{
						'@Id':generateRId(),
						'@Target':'xl/workbook.xml',
						'@Type':'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument'
					}
				}
			]
		},
		Content_Types:{
			Types:[
				{
					'@xmlns':'http://schemas.openxmlformats.org/package/2006/content-types'
				},
				{
					Default:{
						'@ContentType':'application/xml',
						'@Extension':'xml'
					}
				},
				{
					Default:{
						'@ContentType':'application/vnd.openxmlformats-package.relationships+xml',
						'@Extension':'rels'
					} 
				},
				{
					Override:{
						'@ContentType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
						'@PartName':'/xl/workbook.xml'
					}
				},
				{
					Override:{
						'@ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
						'@PartName':'/xl/styles.xml'
					}
				},
				{
					Override:{
						'@ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
						'@PartName':'/xl/sharedStrings.xml'
					}
				}
			]
		},
		sharedStrings:[],
		debug:false
	}

	if(thisWB.styleData.cellXfs.length == 0){
		var defaultStyle = thisWB.Style();
	}

	thisWB.Style = style.Style;
	thisWB.writeToBuffer = function(){
		var xlsx = new jszip();
		var that = this;
		var sheetCount = 1;
		thisWB.workbook.WorkSheets.forEach(function(sheet){
			var thisRId = generateRId();
			var sheetExists = false;

			that.workbook.workbook.sheets.forEach(function(s){
				if(s.sheet['@sheetId'] == sheetCount){
					sheetExists = true;
				}
			});
			if(!sheetExists){
				that.workbook.workbook_xml_rels.Relationships.push({
					Relationship:{
						'@Id':thisRId,
						'@Target':'worksheets/sheet'+sheetCount+'.xml',
						'@Type':'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'
					}
				})
				that.workbook.workbook.sheets.push({
					sheet:{
						'@name':sheet.name,
						'@sheetId':sheetCount,
						'@r:id':thisRId
					}
				});			
				that.workbook.Content_Types.Types.push({
					Override:{
						'@ContentType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
						'@PartName':'/xl/worksheets/sheet'+sheetCount+'.xml'
					}
				});
				if(that.debug){
					console.log("\n\r###### Sheet XML XML #####\n\r");
					//console.log(xmlStr.end(xmlDebugVars))
				};
			}
		
			if(sheet.drawings){
				if(that.debug){
					console.log("\n\r########  Drawings found ########\n\r")
				}
				var drawingRelsXML = xml.create(sheet.drawings.rels);
				if(that.debug){
					console.log("\n\r###### Drawings Rels XML #####\n\r");
					console.log(drawingRelsXML.end(xmlDebugVars))
				};
				xlsx.folder("xl").folder("drawings").folder("_rels").file("drawing"+sheet.sheetId+".xml.rels",drawingRelsXML.end(xmlOutVars));

				sheet.drawings.drawings.forEach(function(d){
					sheet.drawings.xml['xdr:wsDr'].push(d.xml);
					xlsx.folder("xl").folder("media").file('image'+d.props.imageId+'.'+d.props.extension,fs.readFileSync(d.props.image));
					if(that.debug){
						console.log("\n\r###### Drawing image data #####\n\r");
						console.log(fs.statSync(d.props.image))
					};
				});

				var drawingXML = xml.create(sheet.drawings.xml);
				xlsx.folder("xl").folder("drawings").file("drawing"+sheet.sheetId+".xml",drawingXML.end(xmlOutVars));
				if(thisWB.debug){
					console.log("\n\r###### Drawings XML #####\n\r");
					console.log(drawingXML.end(xmlDebugVars))
				};

				that.workbook.Content_Types.Types.push({
					Override:{
						'@ContentType': 'application/vnd.openxmlformats-officedocument.drawing+xml',
						'@PartName':'/xl/drawings/drawing'+sheet.sheetId+'.xml'
					}
				});
			}
			
			if(sheet.rels){
				var sheetRelsXML = xml.create(sheet.rels);
				if(thisWB.debug){console.log(sheetRelsXML.end(xmlDebugVars))};
				xlsx.folder("xl").folder("worksheets").folder("_rels").file("sheet"+sheet.sheetId+".xml.rels",sheetRelsXML.end(xmlOutVars));
			}


			//var wsObj = {'worksheet':JSON.parse(JSON.stringify(sheet.sheet))};
			//var xmlStr = xml.create(wsObj);
			var xmlStr = sheet.toXML();
			xlsx.folder("xl").folder("worksheets").file('sheet'+sheetCount+'.xml',xmlStr);
			
			if(that.debug){
				console.log("\n\r###### SHEET "+sheetCount+" XML #####\n\r");
				console.log(xmlStr)
			};
			sheetCount+=1;
		});

		thisWB.workbook.sharedStrings.forEach(function(s){
			that.workbook.strings.sst.push({'si':{'t':s}});
		});
		
		thisWB.workbook.strings.sst[0]['@uniqueCount']=thisWB.workbook.sharedStrings.length;


		var wbXML = xml.create({workbook:JSON.parse(JSON.stringify(thisWB.workbook.workbook))});
		if(thisWB.debug){
			console.log("\n\r###### WorkBook XML #####\n\r");
			console.log(wbXML.end(xmlDebugVars));
		};

		//var styleXML = xml.create(JSON.parse(JSON.stringify(thisWB.workbook.styles)));
		var styleXMLStr = thisWB.createStyleSheetXML();	
		//console.log(styleXMLStr);

		if(thisWB.debug){
			console.log("\n\r###### Style XML #####\n\r");
			console.log(styleXMLStr);
		};

		var relsXML = xml.create(thisWB.workbook.workbook_xml_rels);
		if(thisWB.debug){
			console.log("\n\r###### WorkBook Rels XML #####\n\r");
			console.log(relsXML.end(xmlDebugVars))
		};

		var Content_TypesXML = xml.create(thisWB.workbook.Content_Types);
		if(thisWB.debug){
			console.log("\n\r###### Content Types XML #####\n\r");
			console.log(Content_TypesXML.end(xmlDebugVars))
		};

		var globalRelsXML = xml.create(thisWB.workbook.global_rels);
		if(thisWB.debug){
			console.log("\n\r###### Globals Rels XML #####\n\r");
			console.log(globalRelsXML.end(xmlDebugVars))
		};

		var stringsXML = xml.create(thisWB.workbook.strings);
		if(thisWB.debug){
			console.log("\n\r###### Shared Strings XML #####\n\r");
			console.log(stringsXML.end(xmlDebugVars))
		};

		xlsx.file("[Content_Types].xml",Content_TypesXML.end(xmlOutVars));
		xlsx.folder("_rels").file(".rels",globalRelsXML.end(xmlOutVars));
		xlsx.folder("xl").file("sharedStrings.xml",stringsXML.end(xmlOutVars));
		xlsx.folder("xl").file("styles.xml",styleXMLStr);
		xlsx.folder("xl").file("workbook.xml",wbXML.end(xmlOutVars));
		xlsx.folder("xl").folder("_rels").file("workbook.xml.rels",relsXML.end(xmlOutVars));

		return xlsx.generate({type:"nodebuffer",compression:thisWB.opts.jszip.compression});
	}

	thisWB.write = function(fileName, response){
		var buffer = thisWB.writeToBuffer();

		thisWB = {};
		// If `response` is an object (a node response object)
		if(typeof response === "object"){
			response.writeHead(200,{
				'Content-Length':buffer.length,
				'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition':'attachment; filename='+fileName,
			});
			response.end(buffer);
		}

		// Else if `response` is a function, use it as a callback
		else if(typeof response === "function"){
			fs.writeFile(fileName, buffer, function(err) {
				response(err);
			});
		}

		// Else response wasn't specified
		else {
			fs.writeFile(fileName, buffer, function(err) {
				if (err) throw err;
			});
		}
	}

	thisWB.WorkSheet = function(name, opts){
		var opts = opts?opts:{};
		var newWS = new WorkSheet(name, opts);
		newWS.wb = thisWB;
		console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(newWS)));
		newWS.Cell(1,1).String('');
		var sheetId = thisWB.workbook.WorkSheets.push(newWS);
		newWS.sheetId = sheetId;
		return newWS;
	}

	thisWB.createStyleSheetXML = function(){
		var data={
				styleSheet:{
					'@xmlns':'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
					'@mc:Ignorable':'x14ac',
					'@xmlns:mc':'http://schemas.openxmlformats.org/markup-compatibility/2006',
					'@xmlns:x14ac':'http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac',
					numFmts:[],
					fonts:[],
					fills:[],
					borders:[],
					cellXfs:[]
				}
			}


		var items = [
			'numFmts',
			'fonts',
			'fills',
			'borders',
			'cellXfs'
		];
		
		var thisWb = this;
		items.forEach(function(i){
			data.styleSheet[i].push({'@count':thisWb.styleData[i].length});
			thisWb.styleData[i].forEach(function(d){
				data.styleSheet[i].push(d.generateXMLObj());
			});
		});

		var styleXML = xml.create(data);
		return styleXML.end(xmlOutVars);
	}

	thisWB.getStringIndex = function(val){
		if(thisWB.workbook.sharedStrings.indexOf(val) < 0){
			thisWB.workbook.sharedStrings.push(val)
		};
		return thisWB.workbook.sharedStrings.indexOf(val);
	}

	return thisWB;
}



function generateRId(){
    var text = "R";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 16; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}