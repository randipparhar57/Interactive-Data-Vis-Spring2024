/* CONSTANTS AND GLOBALS */
const width = window.innerWidth * 0.9,
height = window.innerHeight * 0.9,
margin = { top: 20, bottom: 50, left: 60, right: 40 };

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
 Promise.all([
  d3.json("../data/world.json"),
  d3.csv("../data/MoMA_nationalities.csv", d3.autoType),
  ]).then(([geojson, nationalities]) => {
  console.log(geojson)
  console.log(nationalities)


  const countByCountry = new Map();
  nationalities.forEach(d => {
    const { Country, Count } = d;
    if (countByCountry.has(Country)) {
        // If the country exists, add to the existing count
        countByCountry.set(Country, countByCountry.get(Country) + Count);
    } else {
        // Otherwise, initialize the count
        countByCountry.set(Country, Count);
    }
  }); /*got this from chatGPT so that countries that show up twice (i.e. USA), the counts are added and displayed on the map as one*/
  console.log(countByCountry)

  const svg = d3 
    .select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  // SPECIFY PROJECTION
  const projection = d3.geoMercator()
  .fitSize([
    width-margin.left-margin.right,
    height-margin.top-margin.bottom
  ], geojson);
 
  // DEFINE PATH FUNCTION
  const geoPathGen = d3.geoPath(projection)

  // COLOR SCALE
  const colorScale = d3.scaleSequentialLog(d3.interpolatePuBuGn).domain([1e-8, 1e8]);
  const maxArtCount = d3.max(nationalities, d => +d.Count);
  colorScale.domain([1, maxArtCount]);

  // APPEND GEOJSON PATH  
  svg.selectAll("path")
  .data(geojson.features)
  .enter()
  .append("path")
  .attr("d", geoPathGen)
  .attr("stroke", "black")
  .attr("stroke-width", "0.5px")
  .attr("fill", d => {
      /* color based on count */
      const count = countByCountry.get(d.properties.name);
      return count ? colorScale(count) : "#D3D3D3"; /*missing data will be light gray*/
  })
  // TOOL TIP
  .on("mouseover", (event, d) => {
    /*show tooltip*/
    const count = countByCountry.get(d.properties.name) || 0;
    tooltip.style("opacity", 1);
    tooltip.html(`<strong>${d.properties.name}</strong><br>Artwork Count: ${count}`) // Customize with your data
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
  .on("mouseout", () => {
        /*hide tooltip*/
        tooltip.style("opacity", 0);
    });
    // TOOL TIP ELEMENT
    const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  // APPEND DATA AS SHAPE

});