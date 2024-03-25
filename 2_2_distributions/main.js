/* CONSTANTS AND GLOBALS */
const width = window.innerWidth*0.8;
const height = window.innerHeight*0.8;
const margin=100;

/* VERSION 1 */
d3.csv("../data/MoMA_distributions.csv", d3.autoType)
  .then(data => {
    console.log(data)

    var noWeirdAges = data.filter(function(d) { return d["Artist Lifespan"] !== 0 && d["Artist Lifespan"] <= 200; }); /*the reason for doing this is to remove people with a lifespan of 0, but also to remove people with an absurd lifespan, such as the 1947 that exists in the dataset. I did <=200 in the hypthotical case that additional data is added to this dataset and their are folks who live over the max of 97. <=200 was decided on since I don't think there is any one who has lived over the age of 200 (I'm being very generous).*/
    console.log(noWeirdAges); /*checking to make sure filtered dataset created*/
    console.log(d3.min(noWeirdAges.map(d=>d["Artist Lifespan"]))) /*checking to make sure 0 was filtered out*/
    console.log(d3.max(noWeirdAges.map(d=>d["Artist Lifespan"]))) /*checking to make sure that 1947 was filtered out*/

    var ages = noWeirdAges.map(function(d) {
      return d["Artist Lifespan"];
    });
    console.log(ages); /*purpose of creating an array of just the ages is for styling purposes. this is an array of the ages from the filter dataset that excluded the weird ages.*/

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data.map(d=>d["Width (cm)"]))])
      .range([margin, width - margin]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data.map(d=>d["Length (cm)"]))])
      .range([height - margin, margin]);

    const zScale = d3.scaleLinear()
      .domain([d3.min(noWeirdAges.map(d=>d["Artist Lifespan"])), d3.max(noWeirdAges.map(d=>d["Artist Lifespan"]))]) /*the size of the circles will not be determined from the min and max lifespan that is in the original data - remember there are weird ages in therelike 0 (woah, a prodigy artist) and 1947 (what in the world). we will determine the size of the cirlces based on reasonable ages that are present in the filtered data set. The reason why I didn't use the filtered dataset for the xScale and yScale is because I do want to plot the lengths and widths for all the art work in the dataset. We will just use styling to make the weirdo ages less noticable.*/
      .range([3,9])
    
    const svg = d3.select("#container")
      .append('svg')
      .attr("width", width)
      .attr("height", height)
      .style("overflow", "visible")

    const xAxis = d3.axisBottom(xScale)
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin})`)
      .call(xAxis)
    
    const yAxis = d3.axisLeft(yScale)
    svg.append("g")
      .attr("transform", `translate(${margin}, 0)`)
      .call(yAxis)
    
    svg.append("text")             
      .attr("x", width / 2)
      .attr("y",  height - (margin/4))
      .attr("font-family", "Monofett")
      .attr("font-size", "32px")
      .style("text-anchor", "middle")
      .text("Width (cm)");

    svg.append("text")             
      .attr("x", -(height/2))
      .attr("y",  margin/4)
      .attr("transform", "rotate(-90)")
      .attr("font-family", "Monofett")
      .attr("font-size", "32px")
      .style("text-anchor", "middle")
      .text("Length (cm)");

    var div = d3.select("#container").append("div")   
      .attr("class", "tooltip")               
      .style("opacity", 0);

    const circles = svg.selectAll('.circle')
      .data(data)
      .join("circle")
      .attr("class", "circle")
      .attr("cx", (d, i) => xScale(d["Width (cm)"]))
      .attr("cy", (d, i) => yScale(d["Length (cm)"]))
      .attr("r", function (d) {
        if(ages.includes(d["Artist Lifespan"])) {
          return zScale(d["Artist Lifespan"]);
        }
        else {
          return 1.5;
        }
      })/*if the age of the artist is not in the array of reasonable ages, they will get a radius of 1. if it is in the array of reasonable ages, the zScale will be applied to determine the radius of the circle. a radius of 1 for the weird ages (0 and 1947) will still plot them on the graph, but make them barely noticeable.*/
      .style("opacity", function(d) {
        if(ages.includes(d["Artist Lifespan"]) == false) {
          return 0.4;
        }
        else {
          return 0.5;
        }
      }) /*if the age of the artist is not in the array of reasonable ages, they will have a lighter opacity, again to still include them in our scatterplot, but to make them unnoticeable. We want to plot the weirdo data points, but not bring attention to them.*/
      .style("stroke", function(d) {
        if(ages.includes(d["Artist Lifespan"]) == false) {
          return;
        }
        else {
          return "black";
        }
      }) /*if the age of the artist is in the array of reasonable ages, we will outline the circle to make them pop out more and render the weirdo data points even more unnoticeable.*/
      .style("fill", function(d) {
        if(ages.includes(d["Artist Lifespan"]) == false) {
          return "gray";
        }
        else if(d["Gender"]=="(Male)") {
          return "orange";
        }
        else if(d["Gender"]=="(Female)") {
          return "purple";
        }
        else {
          return "green";
        }
      })
      /*below code is to add tooltips. disclaimer - I asked chatGPT how to add tooltips to a d3 scatterplot. chatGPT outputted an example on how to do that. used those steps to implement with my own data and code.*/
      .on('mouseover', (event, d) => {
        if(ages.includes(d["Artist Lifespan"]) == true){
          tooltip.style.opacity = 1;
          tooltip.style.left = `${event.pageX}px`;
          tooltip.style.top = `${event.pageY}px`;
          tooltip.innerHTML = "<u>About the Artist</u>" + "<br>" + "Name: " + d.Artist + "<br>" + "Lifespan: " + d["Artist Lifespan"] + "<br><br>" + "<u>About the Artwork</u>" + "<br>" + "Title: " + d.Title + "<br>" + "Year: " + d.Date + "<br>" + "Width: " + d["Width (cm)"] + "cm"+ "<br>" + "Length: " + d["Length (cm)"] + "cm";
        }
        else {
          return;
        }
      })
      .on('mouseout', () => {
        // Hide tooltip on mouseout
        tooltip.style.opacity = 0;
      });

    const tooltip = document.getElementById('tooltip');
});




  