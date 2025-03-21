import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./FishChart.css"; 

const FishChart = () => {
  const chartRef = useRef();  // Ref for the chart container
  const [chartData, setChartData] = useState({ species: [], acousticTag: [] });  // State to hold chart data
  const [xKey, setXKey] = useState("Species Name");  // State to toggle between "Species Name" or "Acoustic Tag" on x-axis

  // Fetching the chart data on component mount
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const speciesData = await fetch("/data/species_chart_data.json").then((res) => res.json());
        const acousticTagData = await fetch("/data/AT_chart_data.json").then((res) => res.json());
        setChartData({ species: speciesData, acousticTag: acousticTagData });
      } catch (error) {
        console.error("Error fetching chart data:", error);
      }
    };
    fetchChartData();
  }, []);

  // D3.js chart rendering logic (runs every time chartData or xKey changes)
  useEffect(() => {
    const data = xKey === "Species Name" ? chartData.species : chartData.acousticTag;
    if (!data.length) return;  // Return early if no data available

    // Chart layout configuration
    const margin = { top: 50, right: 150, bottom: 70, left: 150 };
    const width = 1100 - margin.left - margin.right;
    const height = 680 - margin.top - margin.bottom;

    // Removing any previous chart elements
    d3.select(chartRef.current).selectAll("*").remove();

    // Setting up the SVG container for D3
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

   
    const xCategories = xKey === "Species Name" ? ["Chinook", "Coho", "Cutthroat Trout", "Steelhead"] : [true, false];

    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("visibility", "hidden");

    // Calculating total count for percentage calculation on tooltip
    const totalCount = d3.sum(data, (d) => d.Count);

    // Setting up scales for the x-axis (categorical) and y-axis (linear)
    const xScale = d3.scaleBand().domain(xCategories).range([0, width]).padding(0.2);
    const yScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.Count)]).nice().range([height, 0]);
    const barWidth = xScale.bandwidth() / 2;

    // Color scale for differentiating collected vs. not collected (blue for collected, orange for not)
    const colorScale = d3.scaleOrdinal().domain([true, false]).range(["steelblue", "orange"]);

    // Grouping data by category and organizing collected vs not collected
    const groupedData = xCategories.map((category) => ({
      category,
      collected: data.find((d) => d[xKey] === category && d.Collected) || { Count: 0 },
      notCollected: data.find((d) => d[xKey] === category && !d.Collected) || { Count: 0 },
    }));

    

    // Creating bars for each category (collected vs not collected)
    groupedData.forEach((d) => {
      const xPos = xScale(d.category);
      [true, false].forEach((collected, i) => {
        const count = collected ? d.collected.Count : d.notCollected.Count;

        // Appending bars on the chart
        svg.append("rect")
          .attr("x", xPos + i * barWidth)
          .attr("y", yScale(count))
          .attr("width", barWidth)
          .attr("height", height - yScale(count))
          .attr("fill", colorScale(collected))
          .on("mouseover", (event) => {
            const percentage = ((count / totalCount) * 100).toFixed(1);
            tooltip.style("visibility", "visible").html(`${percentage}% of released fish`);
          })
          .on("mousemove", (event) => {
            tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);  // Tooltip follows mouse
          })
          .on("mouseout", () => tooltip.style("visibility", "hidden"));

        // Adding text labels above each bar to show the count
        svg.append("text")
          .attr("x", xPos + i * barWidth + barWidth / 2)
          .attr("y", yScale(count) - 5)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("fill", "black")
          .text(count);
      });
    });

    // Adding axes to the chart (bottom for x-axis and left for y-axis)
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale))
      .style("font-size", "20px");
    svg.append("g").call(d3.axisLeft(yScale))
      .style("font-size", "20px");

    // Adding chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 60)
      .attr("text-anchor", "middle")
      .style("font-size", "24px")
      .text(`${xKey === "Species Name" ? "Species Type" : "Has an Acoustic Tag"}`);

    // Adding y-axis label (rotated)
    svg
      .append("text")
      .attr("x", -height / 2)
      .attr("y", -80) // Adjusted space from the axis
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "24px")
      .text("Fish Count");
  }, [chartData, xKey]);  // Runs every time chartData or xKey changes

  return (
    <div className="chart-container">
      <div className="chart-title">Fish Collection Analysis by {xKey === "Species Name" ? "Species Type" : "Acoustic Tag Status"}</div>
      <div className="controls-container">
        <div ref={chartRef} className="map-container chart-area"></div>
        {/* Sidebar with dropdown to select data type (species or acoustic tag) */}
        <div className="chart-sidebar">
          <label className="dropdown-label">Filter X-Axis By:</label>
          <select className="dropdown" onChange={(e) => setXKey(e.target.value)} value={xKey}>
            <option value="Species Name">Species Type</option>
            <option value="Has_Acoustic_Tag">Acoustic Tag Status</option>
          </select>
          {/* Color legend for collected vs. not collected */}
          <div className="color-key">
            <div className="legend-title">Key</div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "steelblue" }}></span> Collected
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "orange" }}></span> Not Collected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishChart;