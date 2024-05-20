/* CONSTANTS AND GLOBALS */
const width = window.innerWidth *.3;
const height = window.innerHeight *.3;
let svg_viz1a, xScale_viz1a, yScale_viz1a,
svg_viz2, xScale_viz2, yScale_viz2, yAxis_viz2, xAxis_viz2, area_viz2;

/*******************************************************************************************/

/* APPLICATION STATE */
let state = {
  data: [], //original data
  listOfClass: [], //complete list of classifications (repeating)
  uniqueListOfClass: [], //unique list of classifications for drop down menu
  listOfClass100: [],
  listofClass100All: [],
  definitions: [], // definitions by classifications
  countsByClass: [], // counts by classifications to create bar chart (viz 1)
  countsByYearClass: [], // counts by year and class for bubble chart (viz 2)
  classImageURL: [], //image URLs by classifications for image gallery (columns are classifications, row for each url)
  nestedData: []
}

/*******************************************************************************************/

/* LOAD DATA */
d3.csv('./project_data/Artworks_copy1.csv', d3.autoType)
  .then(raw_data => {
    console.log("original data", raw_data);

    //save original data to application state
    state.data = raw_data;

    //save list of classification data to application state (repeating)
    state.listOfClass = d3.map(state.data, d => d.Classification);
    console.log("listOfClass - list of classifications (repeating)", state.listOfClass);

    //save list of class data (unique) to application state. this will be used to create drop-down menu.
    /*state.uniqueListOfClass = Array.from(new Set(state.listOfClass));
    console.log("uniqueListOfClass - for drop down menu", state.uniqueListOfClass);*/
    state.uniqueListOfClass = ["All"].concat(Array.from(new Set(state.listOfClass)));
    console.log("uniqueListOfClass - for drop down menu", state.uniqueListOfClass);

    //save list of urls by class to application state. this is for the image gallery.
    state.classImageURL = state.data.reduce((acc, curr) => {
      const classification = curr.Classification;
      const imageURL = curr.ImageURL;
      if(imageURL !== null && imageURL !== undefined) {
        //add image url to "All" key
        if(!acc["All"]) {
          acc["All"] = [];
        }
        acc["All"].push(imageURL);

        // add image url to each classification key
        if(acc[classification]) {
          acc[classification].push(imageURL);
        }
        else {
          acc[classification] = [imageURL];
        } 
      }
      return acc;
    }, {});
    console.log("classImageURL - urls by classification for image gallery", state.classImageURL);

    //save counts by class to application state. this is for the bar chart (viz1).
    state.countsByClass = state.data.reduce((acc, curr) => {
      const classification= curr.Classification;
      /*// increment count for "All"
      if(!acc["All"]) {
        acc["All"] = 0;
      }
      acc["All"]++;*/

      // increment count for each classification
      if(!acc[classification]){
        acc[classification]=0
      }
      acc[classification]++;
      return acc;
    }, {})
    console.log("counts by class", state.countsByClass);

    state.countsByClass = Object.keys(state.countsByClass).map(classification => ({
      Classification: classification,
      count: state.countsByClass[classification]
    }));
    console.log("counts by class", state.countsByClass);

    state.countsByClass = state.countsByClass.filter(d => d.count >= 100) // only include classifications with greater than 100 count
    console.log("counts by class, greater than 100", state.countsByClass);

    // new dropdown list, this will only include classifications with count greater than or equal to 100
    state.listOfClass100 = d3.map(state.countsByClass, d => d.Classification);
    console.log("list of classifications > 100", state.listOfClass100);
    state.listofClass100All = ["All"].concat(Array.from(new Set(state.listOfClass100)));
    console.log("list of classifications > 100 for drop down menu", state.listofClass100All);

    // definitions dataset
    state.definitions = state.data.reduce((acc, curr) => {
      const key = curr.Classification + '|' + curr.Classification_Definitions_Calc;
      if (!acc.some(item => item.key === key)) {
          acc.push({ key: key, Classification: curr.Classification, Classification_Definitions_Calc: curr.Classification_Definitions_Calc });
      }
      return acc;
    }, []);
    state.definitions = state.definitions.map(({key, ...rest }) => rest);
    console.log("definitions", state.definitions);

    //save counts by year and class to application state. this is for bubble chart (viz 2)
    const groupedData = d3.group(state.data, d=> d.Classification, d=>d.Date_Cleaned_Hardcoded);
    groupedData.forEach((classificationData, Classification)=> {
      classificationData.forEach((yearData, Date_Cleaned_Hardcoded) => {
        state.countsByYearClass.push({
          Date_Cleaned_Hardcoded: Date_Cleaned_Hardcoded,
          Classification: Classification,
          Count: yearData.length
        });
      });
    });
    console.log('counts by class and year', state.countsByYearClass);

    // NESTING countsByYearClass dataset for bar chart
    state.nestedData = d3.group(state.countsByYearClass, d => d.Classification, d => d.Date_Cleaned_Hardcoded);

    // Ensure all possible classifications and years are included in the nested structure
    const classifications = Array.from(new Set(state.countsByYearClass.map(d => d.Classification)));
    const years = Array.from(new Set(state.countsByYearClass.map(d => d.Date_Cleaned_Hardcoded)));

    classifications.forEach(classification => {
      if (!state.nestedData.has(classification)) {
        state.nestedData.set(classification, new Map());
      }
      years.forEach(year => {
        if (!state.nestedData.get(classification).has(year)) {
          state.nestedData.get(classification).set(year, []);
        }
      });
    });

    console.log('nested data', state.nestedData);

    init();
})

/*******************************************************************************************/

/* THE ART (aka visualizations) */
function init(){
  console.log("we're init");

  // DROPDOWN MENU: will work for all visualizations on the page simultaneously ------------------
  const master_dropdown = d3.select("#master_dropdown_menu"); //create drop-down menu
  master_dropdown.selectAll("option")
    .data(state.listofClass100All /*state.uniqueListOfClass*/)
    .enter()
    .append("option")
    .text(d => d)
  master_dropdown.on("change", function() {
    const classSelected = d3.select(this).property("value");
    const filteredData = state.data.filter(d => d.Classification === classSelected);

    // update defintions
    updateDefinitions(classSelected);

    // update viz 1a
    updateViz1a(classSelected);

    // update viz 2
    updateViz2(classSelected);

    // update photo gallery
    updatePhotoGallery(classSelected);
  })

  // Definitions Viz
  svg_definitions = d3.select("#definitions")
  .append("g");

  // VIZ 1, version 2 (viz 1a): SVG FOR BAR CHART - COUNTS BY CLASSIFICATION ----------------------------
  svg_viz1a = d3.select("#viz1a_container")
  .append("svg")
  .attr("class", "data_viz")
  .attr("width", width)
  .attr("height", height)
  .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")") // to center the circle chart
  .append("g");

  // VIZ 2: SVG FOR COUNTS BY YEAR/CLASS (STACKED LINE CHART) ----------------------------------
  svg_viz2 = d3.select("#viz2_container")
  .append("svg")
  .attr("class", "data_viz")
  .attr("width", width)
  .attr("height", height)
  .append("g");

  //update definitions with "All"
  updateDefinitions("All");

  // update viz 1a with "All" initially
  updateViz1a("All");

  // update viz 2 with "All" initially
  updateViz2("All");

  // update photo gallery with "All" initially
  updatePhotoGallery("All");
}

/*******************************************************************************************/
const colorScale = d3.scaleOrdinal()
.domain(d3.map(state.listofClass100All, d=> d))
.range(['#2f4f4f', '#a52a2a', '#006400', '#9acd32', '#00008b', '#ff0000',
  '#ff8c00', '#ffd700', '#40e0d0', '#00ff00', '#ba55d3', '#00fa9a', '#0000ff',
  '#ff00ff', '#1e90ff', '#eee8aa', '#dda0dd', '#ff1493', '#ffa07a', '#87cefa'
]);

/* FUNCTIONS TO CREATE VISUALIZATIONS */
function updateDefinitions(classification) {
  // filter chart based on classification selected
  const filteredData = state.definitions.filter(d => d.Classification === classification);

  // render definitions
  renderDefinitions(filteredData);
}
function renderDefinitions(classification) {
  // clear previous definition
  svg_definitions.selectAll("*").remove();

  // show definitions
  svg_definitions
  .selectAll("text")
  .data(classification)
  .enter()
  .append("text")
  .attr("class", "definitions")
  .text(d=> d.Classification_Definitions_Calc);
}


function updateViz1a(classification){
  // filter chart based on classification selected
  const filteredData = state.countsByClass.filter(d => d.Classification === classification || classification === "All");  

  // scales
  xScale_viz1a = d3.scaleBand()
  .domain(filteredData.map(d=>d.Classification))
  .range([0, 2*Math.PI])
  .align(0);

  yScale_viz1a = d3.scaleRadial()
  .domain([0, d3.max(filteredData, d => d.count)])
  .range([90 /*inner radius*/, Math.min(width, height)/2 /*outer radius*/]);

  // render viz 1a
  renderViz1a(filteredData);
}
function renderViz1a(classification) {
  // clear previous chart
  svg_viz1a.selectAll("*").remove();  

  const tooltip = d3.select("#viz1a_container") // tooltip element
  .append("div")
  .attr("id", "tooltip_viz1a")
  .style("position", "absolute")
  .style("opacity", 0);

  // Add the bars
  svg_viz1a
  .selectAll("path")
  .data(classification)
  .enter()
  .append("path")
  .attr("fill", d=>colorScale(d.Classification))
  .attr("d", d3.arc()     // imagine your doing a part of a donut plot
    .innerRadius(90)
    .outerRadius(d=>yScale_viz1a(d.count))
    .startAngle(d=>xScale_viz1a(d.Classification))
    .endAngle(d=>xScale_viz1a(d.Classification)+xScale_viz1a.bandwidth())
    .padAngle(0.01)
    .padRadius(90)
  )  
  .on("mouseover", (event, d) => {
    const tooltip = d3.select("#tooltip_viz1a");
    tooltip
      .html(`<center><strong>${d.Classification}</strong><br>${d.count}</center>`)
      .style("opacity", 1)
      .style("display", "block");

    // Get the bounding rectangle of the donut chart
    const donutChartRect = d3.select("#viz1a_container").node().getBoundingClientRect();
    const donutChartX = donutChartRect.left + window.scrollX;
    const donutChartY = donutChartRect.top + window.scrollY;
    const donutChartCenterX = donutChartX + donutChartRect.width / 2;
    const donutChartCenterY = donutChartY + donutChartRect.height / 2;

    // Update the tooltip's position
    tooltip
      .style("left", `${donutChartCenterX - tooltip.node().offsetWidth / 2}px`)
      .style("top", `${donutChartCenterY - tooltip.node().offsetHeight / 2}px`);
  })
  .on("mouseout", () => {
    // hide tooltip
    d3.select("#tooltip_viz1a").style("opacity", 0)
  });

  // Add the labels
  svg_viz1a
  .selectAll("g")
  .data(classification)
  .enter()
  .append("g")
  .attr("text-anchor", function(d) { return (xScale_viz1a(d.Classification) + xScale_viz1a.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start"; })
  .attr("transform", function(d) { return "rotate(" + ((xScale_viz1a(d.Classification) + xScale_viz1a.bandwidth() / 2) * 180 / Math.PI - 90) + ")"+"translate(" + (yScale_viz1a(d.count)+10) + ",0)"; })
  .append("text")
  .text(d=>d.Classification)
  .attr("transform", function(d) { return (xScale_viz1a(d.Classification) + xScale_viz1a.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)"; })
  .style("font-size", "12px")
  .attr("alignment-baseline", "middle");

    // Add the chart title
    svg_viz1a.append("text")
    .attr("class", "chart-title")
    .attr("x", 0)
    .attr("y", -height / 2 - 45)
    .style("text-anchor", "middle")
    .text("Total Count of Artwork by Classification");
}


function updateViz2(classification){
  let filteredData;
  if (classification === "All") {
    // Prepare data for all classifications
    filteredData = prepareDataForAllClassifications();
  } else {
    // Filter chart based on selected classification
    const classificationData = state.nestedData.get(classification) || new Map();
    const years = Array.from(new Set(Array.from(classificationData.keys()).flat()));
    const parseYear = d3.timeParse("%Y");
    filteredData = years.flatMap(year =>
      classificationData.get(year).map(d => ({
        Date_Cleaned_Hardcoded: parseYear(d.Date_Cleaned_Hardcoded),
        Count: d.Count,
        Classification: d.Classification
      }))
    );
  }

  // x scale
  xScale_viz2 = d3.scaleTime()
    .domain(d3.extent(filteredData, d => d.Date_Cleaned_Hardcoded))
    .range([0, width]);

  // x axis
  xAxis_viz2 = d3.axisBottom(xScale_viz2);

  // y scale
  yScale_viz2 = d3.scaleLinear()
  .domain([0, d3.max(filteredData, d => d.Count)]) 
  .range([height, 0]);

  // y axis
  yAxis_viz2 = d3.axisLeft(yScale_viz2);

  // render viz 2
  renderViz2(filteredData, classification);
}
function renderViz2(filteredData, selectedClassification) {
  // clear previous chart
  svg_viz2.selectAll("*").remove();  

  // create x axis
  svg_viz2.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(xAxis_viz2)
    .selectAll("text")
    .style("fill", "black")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

  // x axis label  
  svg_viz2.append("text")
  .attr("class", "x-axis-label")
  .attr("x", width / 2)
  .attr("y", height * 1.2)
  .style("text-anchor", "middle")
  .text("Year Artwork Created");
  
  // create y axis
  svg_viz2.append("g")
    .attr("class", "y-axis")
    .call(yAxis_viz2)
    .selectAll("text")
    .style("fill", "black")
    .style("font-size", "12");

  // y axis label
  svg_viz2.append("text")
  .attr("class", "y-axis-label")
  .attr("transform", "rotate(0)")
  .attr("x", -10)
  .attr("y", -height * 0.05)
  .style("text-anchor", "middle")
  .text("Count");

    // create chart title
    svg_viz2.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -height * 0.1)
    .style("text-anchor", "middle")
    .text("Artworks Count Over Time");

  // line generator
  const line = d3.line()
    .x(d => xScale_viz2(d.Date_Cleaned_Hardcoded))
    .y(d => yScale_viz2(d.Count));

  // If "All" is selected, draw lines for each classification
  if (selectedClassification === "All") {
    const nestedData = d3.group(filteredData, d => d.Classification);
    nestedData.forEach((data, classification) => {
      svg_viz2.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line)
        .style("stroke", colorScale(classification))
        .style("stroke-width", 2)
        .style("fill", "none");
    });
  } else {
    svg_viz2.append("path")
      .datum(filteredData)
      .attr("class", "line")
      .attr("d", line)
      .style("stroke", colorScale(selectedClassification))
      .style("stroke-width", 2)
      .style("fill", "none");
  }
}
function prepareDataForAllClassifications() {
  const allData = [];
  state.nestedData.forEach((classificationData, classification) => {
    const parseYear = d3.timeParse("%Y");
    classificationData.forEach((yearData, year) => {
      yearData.forEach(item => {
        allData.push({
          Date_Cleaned_Hardcoded: parseYear(item.Date_Cleaned_Hardcoded),
          Count: item.Count,
          Classification: item.Classification
        });
      });
    });
  });
  return allData;
}


function updatePhotoGallery(classification) {
  console.log('Rendering photo gallery for:', classification);
  const imageURLs = state.classImageURL[classification] || [];
  console.log('Image URLs:', imageURLs);

  const randomImages = selectRandomImages(imageURLs, 20); // select 20 random images
  console.log('20 Random Image URLs:', randomImages)

  const photoGallery = d3.select("#photos_class");

  photoGallery.selectAll("img").remove(); //remove existing photo gallery

  photoGallery.selectAll("img") //showcase new photo gallery
    .data(randomImages /*imageURLs*/)
    .enter()
    .append("img")
    .attr("src", ImageURL => ImageURL)
    .attr("class", "photograph") //adding class to customize in css
    .on("click", function() {
      const clickedImageURL = d3.select(this).attr("src");
      showImagePopup(clickedImageURL);
    });
}
function selectRandomImages(imageURLs, count) {
  const shuffledURLs = imageURLs.slice().sort(() => 0.5 - Math.random()); // imageURLs.slice() creates a copy of the imageURLs so original array not changed or modified. .sort(() => 0.5 - Math.random()) generates a random number between -0.5 and 0.5 for each URL, then sorts the array.
  return shuffledURLs.slice(0, count); // this creates a new array containing imageURLs for 0 to however many images you want to display (count)
}
function showImagePopup(imageURL) {
  const popupContainer = document.getElementById("image-popup"); //grabbing div with id image-popup, popup image will be displayed here
  const popupImg = popupContainer.querySelector(".popup-img"); // querySelector grabs the first element within document with class popup-img
  const closeBtn = popupContainer.querySelector(".close-btn"); // querySelector grabs the first element within document with class close-btn

  popupImg.src = imageURL; //setting src attributed for image in popup to the image URL

  popupContainer.style.display = "block"; // setting style of popup container to block, which means visible

  closeBtn.onclick = function() {
    popupContainer.style.display = "none";
  } // if click on close button, sets style of popup container to none which means no longer display the block

  window.onclick = function(event) {
    if (event.target === popupContainer) {
      popupContainer.style.display = "none";
    }
  } //if click anywhere within the popup container, will close the popup
}

