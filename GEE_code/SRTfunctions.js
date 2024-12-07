/////////////////////////////////////////////////////////////reduction

var f = function (image, collection, scale) {
  return image.reduceRegions({
    collection: collection,
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.stdDev(),
      sharedInputs: true,
    }),
    scale: scale,
  });
};

var iter = function (var1, layer, collection, scale) {
  var gridcoll = f(layer, collection, scale);

  gridcoll = gridcoll.map(function (feature) {
    return feature.set(var1.concat("_mean"), feature.get("mean"));
  });

  return gridcoll.map(function (feature) {
    return feature.set(var1.concat("_std"), feature.get("stdDev"));
  });
};

/////////////////////////////////////////////////////////////////core function

exports.SRTgeomorphometry = function (table, RadiusInMeters, scale) {
  //Safanelli, J.L.; Poppiel, R.R.; Ruiz, L.F.C.; Bonfatti, B.R.; Mello, F.A.O.; Rizzo, R.; Demattê, J.A.M.
  //Terrain Analysis in Google Earth Engine: A Method Adapted for High-Performance Global-Scale Analysis.
  //ISPRS Int. J. Geo-Inf. 2020, 9, 400. DOI: https://doi.org/10.3390/ijgi9060400
  //GitHub: https://github.com/zecojls/tagee
  var TAGEE = require("users/zecojls/TAGEE:TAGEE-functions");

  //var id=table2.filter(ee.Filter.eq("id",numero)).geometry();
  var id = table.geometry().bounds(); //null,table.geometry().projection()););
  var gridcoll = ee.FeatureCollection(table).filterBounds(id);

  /////////////////////////////////////////////////////////////topo

  var demSRTM1 = ee.Image("USGS/SRTMGL1_003");
  var demSRTM = demSRTM1.rename("DEM");
  var DEMAttributes = TAGEE.terrainAnalysis(TAGEE, demSRTM, id, scale);
  //var scale=DEMAttributes.select('Elevation').projection().nominalScale();
  //var maschera = DEMAttributes.select('Slope').gte(10);
  //var DEMAttributes = DEMAttributes.updateMask(maschera);

  ///////////////////////////////////////////////////////////////relief

  var reduced = DEMAttributes.select("Elevation").projection().atScale(scale);
  var dem = DEMAttributes.select("Elevation").reproject(reduced);
  var k1 = dem.focal_max(RadiusInMeters, "square", "meters", 1);
  var k2 = dem.focal_min(RadiusInMeters, "square", "meters", 1); //1km di raggio
  var range = k1.subtract(k2);

  ////////////////////////////////////////////////////////////slope, hcv, vcv
  var gridcoll = iter("Slope", DEMAttributes.select("Slope"), gridcoll, scale);
  var gridcoll = iter(
    "Elev",
    DEMAttributes.select("Elevation"),
    gridcoll,
    scale
  );
  var gridcoll = iter("Asp", DEMAttributes.select("Aspect"), gridcoll, scale);
  var gridcoll = iter(
    "Hill",
    DEMAttributes.select("Hillshade"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "Nss",
    DEMAttributes.select("Northness"),
    gridcoll,
    scale
  );
  var gridcoll = iter("Ess", DEMAttributes.select("Eastness"), gridcoll, scale);
  var gridcoll = iter(
    "SIdx",
    DEMAttributes.select("ShapeIndex"),
    gridcoll,
    scale
  );
  var gridcoll = iter("Rlf", range, gridcoll, scale);

  /*var gridcoll = iter('MCv',DEMAttributes.select('MeanCurvature'),gridcoll);
    var gridcoll = iter('GCv',DEMAttributes.select('GaussianCurvature'),gridcoll);
    var gridcoll = iter('MinCv',DEMAttributes.select('MinimalCurvature'),gridcoll);
    var gridcoll = iter('MaxCv',DEMAttributes.select('MaximalCurvature'),gridcoll);
    var gridcoll = iter('HCv',DEMAttributes.select('HorizontalCurvature'),gridcoll);
    var gridcoll = iter('VCv',DEMAttributes.select('VerticalCurvature'),gridcoll);*/
  return gridcoll;
};

exports.SRTcurvature = function (table, scale) {
  //Safanelli, J.L.; Poppiel, R.R.; Ruiz, L.F.C.; Bonfatti, B.R.; Mello, F.A.O.; Rizzo, R.; Demattê, J.A.M.
  //Terrain Analysis in Google Earth Engine: A Method Adapted for High-Performance Global-Scale Analysis.
  //ISPRS Int. J. Geo-Inf. 2020, 9, 400. DOI: https://doi.org/10.3390/ijgi9060400
  //GitHub: https://github.com/zecojls/tagee
  var TAGEE = require("users/zecojls/TAGEE:TAGEE-functions");

  //var id=table2.filter(ee.Filter.eq("id",numero)).geometry();
  var id = table.geometry().bounds(); //null,table.geometry().projection());
  var gridcoll = ee.FeatureCollection(table).filterBounds(id);

  /////////////////////////////////////////////////////////////topo

  var demSRTM1 = ee.Image("USGS/SRTMGL1_003");
  var demSRTM = demSRTM1.rename("DEM");
  var DEMAttributes = TAGEE.terrainAnalysis(TAGEE, demSRTM, id);
  //var scale=DEMAttributes.select('Elevation').projection().nominalScale();
  //var maschera = DEMAttributes.select('Slope').gte(10);
  //var DEMAttributes = DEMAttributes.updateMask(maschera);

  ////////////////////////////////////////////////////////////curvature
  var gridcoll = iter(
    "MCv",
    DEMAttributes.select("MeanCurvature"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "GCv",
    DEMAttributes.select("GaussianCurvature"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "MinCv",
    DEMAttributes.select("MinimalCurvature"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "MaxCv",
    DEMAttributes.select("MaximalCurvature"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "HCv",
    DEMAttributes.select("HorizontalCurvature"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "VCv",
    DEMAttributes.select("VerticalCurvature"),
    gridcoll,
    scale
  );
  return gridcoll;
};

///////////////////////////////////////////////////////////////core function

exports.SRTprecipitation = function (table, start, end, scale) {
  var id = table.geometry(); //.bounds(table.geometry().projection());
  var gridcoll = ee.FeatureCollection(table).filterBounds(id);

  /////////////////////////////////////////////////////////////////precipitation

  var pioggia = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterBounds(id);
  var years = ee.List.sequence(start, end);
  var precip = years.map(function (m) {
    var precip_y = pioggia.filter(ee.Filter.calendarRange(m, m, "year"));
    var precip_x = precip_y.reduce({
      reducer: ee.Reducer.sum()
        .combine({
          reducer2: ee.Reducer.stdDev(),
          sharedInputs: true,
        })
        .combine({
          reducer2: ee.Reducer.max(),
          sharedInputs: true,
        })
        .combine({
          reducer2: ee.Reducer.median(),
          sharedInputs: true,
        }),
    });
    return precip_x;
  });
  var precip_sum = ee.ImageCollection(precip);
  var cumPrec = precip_sum.reduce(ee.Reducer.median()).resample("bicubic");
  //var scale=cumPrec.select('precipitation_sum_median').projection().nominalScale();

  /////////////////////////////////////////////////////////////////reduction
  var gridcoll = iter(
    "RnSum",
    cumPrec.select("precipitation_sum_median"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "RnMax",
    cumPrec.select("precipitation_max_median"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "RnStd",
    cumPrec.select("precipitation_stdDev_median"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "RnMed",
    cumPrec.select("precipitation_median_median"),
    gridcoll,
    scale
  );
  return gridcoll;
};

///////////////////////////////////////////////////////////////////core function
exports.SRTtemperature = function (table, start, end, scale) {
  var id = table.geometry(); //.bounds(table.geometry().projection());
  var gridcoll = ee.FeatureCollection(table).filterBounds(id);

  ////////////////////////////////////////////////////////////Temp

  var dataset = ee.ImageCollection("MODIS/006/MOD11A1").filterBounds(id);
  var landSurfaceTemperature = dataset.select("LST_Day_1km");
  var yearst = ee.List.sequence(start, end);
  var temp = yearst.map(function (m) {
    var temp_y = landSurfaceTemperature.filter(
      ee.Filter.calendarRange(m, m, "year")
    );
    var temp_x = temp_y.reduce({
      reducer: ee.Reducer.median()
        .combine({
          reducer2: ee.Reducer.stdDev(),
          sharedInputs: true,
        })
        .combine({
          reducer2: ee.Reducer.max(),
          sharedInputs: true,
        }),
    });
    return temp_x;
  });
  var temp_sum = ee.ImageCollection(temp);
  var cumTemp = temp_sum.reduce(ee.Reducer.median()).resample("bicubic");
  //var scale=cumTemp.select('LST_Day_1km_median_median').projection().nominalScale();

  //print(cumTemp,'cum')

  var gridcoll = iter(
    "TMed",
    cumTemp.select("LST_Day_1km_median_median"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "TStd",
    cumTemp.select("LST_Day_1km_stdDev_median"),
    gridcoll,
    scale
  );
  var gridcoll = iter(
    "TMax",
    cumTemp.select("LST_Day_1km_max_median"),
    gridcoll,
    scale
  );
  return gridcoll;
};

////////////////////////////////////////////////////////////////////core function
exports.SRTndvi = function (table, start, end, scale) {
  var id = table.geometry(); //.bounds(table.geometry().projection());
  var gridcoll = ee.FeatureCollection(table).filterBounds(id);

  /////////////////////////////////////////////////////////////////NDVI Sentinel 2

  // Create image collection of S-2 imagery for the perdiod 2016-2018
  var S2 = ee
    .ImageCollection("COPERNICUS/S2_HARMONIZED")
    //filter start and end date
    .filterDate("2015-06-23", "2020-12-31")
    //filter according to drawn boundary
    .filterBounds(id);
  // Function to mask cloud from built-in quality band
  // information on cloud
  // Function to calculate and add an NDVI band
  var addNDVI = function (image) {
    var QA60 = image.select(["QA60"]);
    var masked = image.updateMask(QA60.lt(1));
    var ndvi = masked.normalizedDifference(["B8", "B4"]).rename("NDVI");
    return ndvi;
    // return image.addBands(masked.normalizedDifference(["B8", "B4"]));
  };
  // Add NDVI band to image collection
  var NDVI = S2.map(addNDVI);
  // Extract NDVI band and create NDVI median composite image
  NDVI = NDVI.reduce(ee.Reducer.median());

  ////////////////////////////////////////////////////////////NDVI Landsat 7
  // var a = start;
  // var b = end;
  // var datasetndvi = ee
  //   .ImageCollection("LANDSAT/LE07/C01/T1_32DAY_NDVI")
  //   .filterDate(a.toString(), b.toString())
  //   .filterBounds(id);
  // var NDVI = datasetndvi.reduce(ee.Reducer.median());
  //var scale=NDVI.select('NDVI_median').projection().nominalScale();
  //Map.addLayer(NDVI,{},'ndvi')

  //var L8 = ee.ImageCollection("LANDSAT/LE07/C01/T1_TOA")
  //.filterDate('2011-01-01', '2020-12-31').filterBounds(id);

  //var cloudlessNDVI = L8.map(function(image) {
  // Get a cloud score in [0, 100].
  //var cloud = ee.Algorithms.Landsat.simpleCloudScore(image).select('cloud');

  // Create a mask of cloudy pixels from an arbitrary threshold.
  //var mask = cloud.lt(1);

  // Compute NDVI.
  //var ndvi = image.normalizedDifference(['B4', 'B3']).rename('NDVI');

  // Return the masked image with an NDVI band.
  //return image.addBands(ndvi).updateMask(mask);
  //});

  //var NDVI = cloudlessNDVI.reduce(ee.Reducer.median());
  //print(NDVI)

  //////////////////////////////////////////////////////////////////////reduction
  var gridcoll = iter("NDVI", NDVI.select("NDVI_median"), gridcoll, scale); //landsat*/
  //var gridcoll = iter('NDVI',NDVImed.select('nd'));//sentinel
  return gridcoll;
};
/////////////////////////////////////////////Export the FeatureCollection to a KML file.

/*Export.table.toDrive({
    collection: griglia,
    description:'SU',
    fileFormat: 'SHP'
  });*/
