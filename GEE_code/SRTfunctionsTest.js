var MapUnit = ee.FeatureCollection(); // replace with your feature collection

// //generate table
Map.addLayer(MapUnit, {}, "units");

//import tool
var SRT = require("users/teksondada/SRT:SRTfunctions");

//geomorphometry
var geomorphometry = SRT.SRTgeomorphometry(MapUnit, 1000, 100); //mapping unit, buffer radius for relief, scale
print(geomorphometry, "geomorphometry");

// precipitation
var precipitation = SRT.SRTprecipitation(MapUnit, 1991, 2015, 500); //mapping unit, start date, end date, scale
print(precipitation, "precipitation");

//ndvi
var ndvi = SRT.SRTndvi(MapUnit, 2011, 2020, 100); //mapping unit, start date, end date, scale
print(ndvi, "ndvi");

//Display
Map.centerObject(MapUnit, 10);

var display = function (collection, name) {
  var imaged = collection.reduceToImage({
    properties: [name],
    reducer: ee.Reducer.first(),
  });
  Map.addLayer(imaged, {}, name);
};

display(ndvi, "NDVI_mean");
display(geomorphometry, "Slope_mean");
display(precipitation, "RnMax_mean");

function exportToDrive(collection, description) {
  // Set the folder to export to
  var folder = "SZ_SRT_SLanka";

  // Export the collection
  Export.table.toDrive({
    collection: collection,
    description: description,
    fileFormat: "SHP",
    folder: folder,
  });
}

exportToDrive(ndvi, "ndviB");
exportToDrive(geomorphometry, "geomorphometryB");
exportToDrive(precipitation, "precipitationB");
