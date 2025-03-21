import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useMemo } from "react";
import './FishMap.css';

// Define species and collection colors
const speciesList = ["Chinook", "Coho", "Steelhead"];

// Colors chosen with consideration for fish coloring as well as color-blindness as
// all colors have blue or orange undertones
const speciesColors = {
  Chinook: "#38a575", // Blueish-green like their ocean phase
  Coho: "#fe5023", // Bright orangish-red like their spawning phase
  Steelhead: "#6c6e74", // Silver like their ocean phase
};

// Color-blindness accessible colors for collection status
const collectionColors = {
  true: "blue", // Collected
  false: "orange", // Not Collected
};

const FishMap = () => {
  const [fishData, setFishData] = useState([]);
  const [allDays, setAllDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [timeIndex, setTimeIndex] = useState(0);
  const [filteredData, setFilteredData] = useState([]);
  const [colorBy, setColorBy] = useState("species");
  const [filterValue, setFilterValue] = useState("collected");

  // Load fish tracking data from NDJSON file
  useEffect(() => {
    fetch("/data/fish_map_data.ndjson")
      .then((response) => response.text())
      .then((text) => {
        const parsedData = text
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));

        setFishData(parsedData);

        // Extract unique days from dataset
        const uniqueDays = [...new Set(parsedData.map((fish) => fish.Date_Time.split(" ")[0]))];
        setAllDays(uniqueDays);
        setSelectedDay(uniqueDays[0] || ""); // Default to first available day
      })
      .catch((error) => console.error("Error loading NDJSON:", error));
  }, []);

  // Extract unique times for the selected day
  const timesForDay = useMemo(() => {
    if (!selectedDay) return [];
  
    return [...new Set(
      fishData
        .filter((fish) => fish.Date_Time.startsWith(selectedDay))
        .map((fish) => fish.Date_Time)
    )].sort();
  }, [fishData, selectedDay]);

  // Update filtered data when date or time changes
  useEffect(() => {
    if (!timesForDay.length) return;
    const selectedTime = timesForDay[timeIndex] || "";
    setFilteredData(fishData.filter((fish) => fish.Date_Time === selectedTime));
  }, [selectedDay, timeIndex, fishData, timesForDay]);

  // Apply filtering based on user selection
  const filteredFishData = useMemo(() => {
    return filteredData.filter((fish) => {
      if (colorBy === "collection") {
        return fish.Species_Name === filterValue;
      } else {
        return filterValue === "collected" ? fish.Collected : !fish.Collected;
      }
    });
  }, [filteredData, colorBy, filterValue]);

  useEffect(() => {
    console.log("Selected Filter:", filterValue);
    console.log("Color By:", colorBy);
    console.log("Filtered Fish Data Before:", filteredFishData);
  }, [filterValue, colorBy, filteredFishData]);
  

  return (
    <div className="container">
      <h1 className="title">Map of Tracked Fish Behavior Over Time </h1>
      <div className="controls-container">
        <div className="sidebar-container">
          {/* Sidebar for Color By and Filter dropdowns */}
          <div className="sidebar">
            <label className="dropdown-label">Color By:</label>
            <select className="dropdown" onChange={(e) => setColorBy(e.target.value)} value={colorBy}>
              <option value="species">Color by Species Type</option>
              <option value="collection">Color by Collection Status</option>
            </select>

            <label className="dropdown-label">Filter:</label>
            {colorBy === "collection" ? (
              <select className="dropdown" onChange={(e) => setFilterValue(e.target.value)} value={filterValue}>
                {speciesList.map((species) => (
                  <option key={species} value={species}>
                    {species}
                  </option>
                ))}
              </select>
            ) : (
              <select className="dropdown" onChange={(e) => setFilterValue(e.target.value)} value={filterValue}>
                <option value="collected">Collected</option>
                <option value="not_collected">Not Collected</option>
              </select>
            )}
            <div className="color-key">
              <p className="legend-title">Color Key:</p>
              {colorBy === "collection"
                ? Object.entries(collectionColors).map(([key, color]) => (
                    <div key={key} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: color }}></span>
                      {key === "true" ? "Collected" : "Not Collected"}
                    </div>
                  ))
                : Object.entries(speciesColors).map(([species, color]) => (
                    <div key={species} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: color }}></span>
                      {species}
                    </div>
                  ))}
            </div>
          </div>
          <div className="notes-sidebar">
             <h2>Notes</h2>
             <ul>
               <li>Size is proportional to MSE where higher confidence is a smaller point</li>
               <li>Depth is in meters where surface is 0 and down is positive, negatives can occur as uncertainties</li>
               <li>No released Cutthroat Trout had Acoustic Tags, so no location data exists</li>
             </ul>
          </div>
        </div>
        
        <div className="map-container">
          <MapContainer center={[48.3107754, -120.2785910]} zoom={17.45} maxZoom={21} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

            {filteredFishData.map((fish, index) => {
              if (!fish) return null;
              const minSize = 5,
                maxSize = 20;

              // Size is proportional to MSE (higher confidence = smaller point)
              const size = Math.max(minSize, Math.min(maxSize, fish.MSE * 5));

              const color = colorBy === "collection" ? collectionColors[fish.Collected] : speciesColors[fish.Species_Name];

              return (
                <CircleMarker
                  key={`${fish.Acoustic_Tag}-${fish.Date_Time}-${index}`}
                  center={[fish.Lat, fish.Lng]}
                  radius={size}
                  color={color}
                  opacity={1}
                >
                  <Popup>
                    <strong>Species:</strong> {fish.Species_Name} <br />
                    <strong>Depth:</strong> {fish.Z} m<br />
                    <strong>Collected:</strong> {fish.Collected ? "Yes" : "No"} <br />
                    <strong>Confidence (MSE):</strong> {fish.MSE} 
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
      
      {/* Controls below the map */}
      <div className="date-time-controls">
        <label className="dropdown-label">Select Day:</label>
        <select
          className="dropdown"
          onChange={(e) => {
            setSelectedDay(e.target.value);
            setTimeIndex(0); // Reset slider when changing day
          }}
          value={selectedDay}
        >
          {allDays.sort().map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>

        <label className="dropdown-label">Select Time:</label>
        <input
          className="slider"
          type="range"
          min="0"
          max={Math.max(0, timesForDay.length - 1)}
          value={timeIndex}
          onChange={(e) => setTimeIndex(Number(e.target.value))}
          disabled={timesForDay.length === 0}
        />
        <div className="selected-time">Selected Time: {timesForDay[timeIndex]?.split(" ")[1] || "Data Loading..."}</div>
      </div>
    </div>
  );
};

export default FishMap;
