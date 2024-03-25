
/* CONSTANTS AND GLOBALS */
const width = window.innerWidth*0.8;
const height = 500;
const margin = 100;

/* LOAD DATA */
d3.csv('../data/MoMA_topTenNationalities.csv', d3.autoType)
  .then(data => {
    console.log("data", data)

    /* COLORS */
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.Nationality))
      /*.range(d3.schemeCategory10);*/ // Using D3 categorical color scheme
      .range([`#FF0000`, `#00A08A`, `#F2AD00`, `#F98400`, `#5BBCD6`, `#ECCBAE`, `#046C9A`, `#D69C4E`, `#ABDDDE`, `#000000`])

    /* SCALES */
    const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

    const yScale = d3.scaleBand()
    .domain(data.map(d=>d.Nationality))
    .range([0, height-margin])
    .paddingInner(0.1)
    .paddingOuter(0.2)

    const xScale = d3.scaleLinear()
    .domain([0, Math.max(...data.map(d=>d.Count + 500))]) /*+500 due to height*/
    .range([margin, width])


    /* HTML ELEMENTS */
    /** Select your container and append the visual elements to it */
    const yAxis = d3.axisLeft(yScale)
    svg.append("g")
    .attr("transform", `translate(${margin}, 0)`)
    .call(yAxis)
    .style("font-size", "16px")
    .style("font-family","Limelight")
    .attr("color", "navy")

    const xAxis = d3.axisBottom(xScale)
    svg.append("g")
    /*.attr("transform", `translate(0, ${height-margin})`)
    .call(xAxis)*/
    .attr("transform", `translate(0, ${height-margin})`)
    .call(xAxis)
    .style("font-size", "16px")
    .style("font-family","Limelight")
    .attr("color", "navy")

    svg.selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d=>xScale(0))
    .attr("y", d=>yScale(d.Nationality))
    .attr("width", d=>xScale(d.Count)-margin) /*add -margin so that the bars are actually aligning with the correct value along the x-axis*/
    .attr("height", yScale.bandwidth)
    .attr("fill", d => colorScale(d.Nationality))
    
    /* adding text to bars */ 
    var text = svg.selectAll(".text")
    .data(data)
    .enter().append("text")
    .attr("class","text")
    .attr("x", d=> xScale(d.Count))
    .attr("y", d=> yScale(d.Nationality) + yScale.bandwidth()/2)
    .text(d => d.Count)
    .style("fill", "navy")
})