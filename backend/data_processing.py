import pandas as pd
import json


def load_and_wrangle_data():
    # Load only necessary columns
    use_cols = ["Date_time", "Tag_code", "X", "Y", "Z", "MSE"]
    fish_positions = pd.read_csv("data/fishPos_20190604.csv", usecols=use_cols, dtype={"Tag_code": "string"})
    
    pit_data = pd.read_excel("data/PIT_CE.xlsx", sheet_name=None)
    release_data = pit_data["Release"][["Tag Code", "Acoustic Tag", "Species Name"]].copy()
    collection_data = pit_data["Collection"][["Tag Code", "Site Name"]].copy()

    # Normalize tag codes for fast merging
    release_data["Acoustic Tag"] = release_data["Acoustic Tag"].astype(str).str.lower().str.strip()
    fish_positions["Tag_code"] = fish_positions["Tag_code"].str[3:7].str.lower().str.strip()

    # Set index on Acoustic Tag for faster lookup
    release_indexed = release_data.set_index("Acoustic Tag")

    # Merge using index-based lookup
    merged_data = fish_positions.merge(release_indexed, left_on="Tag_code", right_index=True, how="inner")

    # Convert Date_time column to datetime format for performance
    fish_positions["Date_time"] = pd.to_datetime(fish_positions["Date_time"], errors="coerce")
    
    # Mark collected fish (optimize lookup with a set)
    collection_data = collection_data[collection_data["Site Name"] == "Final Collection Point "]
    collected_fish = set(collection_data["Tag Code"].astype(str).str.lower().str.strip())
    merged_data["Collected"] = merged_data["Tag Code"].astype(str).str.lower().str.strip().isin(collected_fish)

    # Normalize coordinates to the lake region
    merged_data["X_norm"] = (merged_data["X"] - merged_data["X"].min()) / (merged_data["X"].max() - merged_data["X"].min())
    merged_data["Y_norm"] = (merged_data["Y"] - merged_data["Y"].min()) / (merged_data["Y"].max() - merged_data["Y"].min())

    # Scale to a bounding box
    # Black Pine Lake center coordinates: 48.3114238, -120.2771002
    # Other Black Pine Lake coordinates: 48.3104291, -120.2790019
    scale_lat, scale_lon = 0.002, 0.002
    lake_lat, lake_lon = 48.3114238, -120.2771002

    merged_data["Lat"] = lake_lat + (merged_data["Y_norm"] - 0.5) * scale_lat
    merged_data["Lng"] = lake_lon + (merged_data["X_norm"] - 0.5) * scale_lon

    # Keep only necessary columns and rename to standardized
    merged_data = merged_data[["Tag_code", "Date_time", "Lat", "Lng", "Z", "Species Name", "Collected", "MSE"]]
    merged_data.rename(columns={"Tag_code": "Acoustic Tag", "Species Name": "Species_Name", "Date_time": "Date_Time"}, inplace=True)

    # Reduce JSON size by rounding coordinates
    merged_data["Lat"] = merged_data["Lat"].round(6)
    merged_data["Lng"] = merged_data["Lng"].round(6)

    # Convert to dictionary for JSON export
    relevant_data = merged_data.reset_index().to_dict(orient="records")

    # Save as ndjson because best format for big data 
    with open("../public/data/fish_map_data.ndjson", "w") as f:
        for entry in relevant_data:
            f.write(json.dumps(entry) + "\n")  # Each JSON object is written as a separate line

if __name__ == "__main__":
    load_and_wrangle_data()







