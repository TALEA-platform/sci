# Urban Shadow Temporal Aggregation and Delivery Pipeline

## Overview and Scope

This documentation describes the **next stage** after shadow extraction: uploading the 3-bit master raster to Google Earth Engine, aggregating them over time, and delivering the resulting files to local storage through Google Drive.

This part of the pipeline provides three separate notebooks:

1. **Upload notebook:** upload local TIFFs to Google Earth Engine.
2. **Aggregation notebook:** run temporal aggregation on Google Earth Engine and export the outputs to Google Drive.
3. **Download notebook:** download the exported results from Google Drive to a local folder.

**Related Documentation:**

- [Shadow Extraction Documetation](/sci/Documentation/Shadow_Extraction_doc.md)
- [Post-processing and Zonal Analysis (to update)]()

---

## 1. Input Data and Requirements

The aggregation pipeline starts from rasters that have already been produced from the extraction stage.\
These rasters are **3-bit encoded GeoTIFFs** and represent independent temporal snapshot.

### 1.2 Source rasters requirements

The rasters must:

- be consistent in grid, CRS, resolution, and alignment
- use `255` as the NoData value
- have filenames that can be interpreted temporally, preferably in the format:

    `shadow_YYYYMMDD_HHMM_hXpYm.tif`

Legacy format are also supported:

`shadow_YYYYMMDD_HHMM_.tif`
`shadow_YYYYMMDD_HHMM_ped.tif`

### 1.2 Google Earth Engine requirements

The aggregation stage requires:

- an active Earth Engine account
- a Google Cloud Project enabled for Earth Engine
- a destination `ImageCollection` for the uploaded rasters
- working authentication for:

  - Earth Engine Python API
  - `geeup` authentication/coockie setup

### 1.3 Google Drive requirements

The export/download stage requires:

- a Google Drive folder used as the destination for GEE exports
- permission to download files through the Google Drive API
- an OAuth client JSON file for the local download stage

---

## 2. Temporal Logic of the Aggregation Stage

The aggregation stage read the chronological collection of master rasters and summarizes them into more compact temporal subsets.

### 2.1 From absolute time to local time

Each image uploaded to GEE must have a correct UTC `system:time_start`.\
During aggregation, the pipeline converts this timestamp into local properties using the project timezone (for example `Europe/Rome`), producing:

- `local_year`
- `local_month`
- `local_hour`
- `local_day_key`
- `local_month_key`

These properties are the basis for all subsequent temporal filters.

### 2.2 Time-band logic

Time bands are defined as **half-open intervals**: inclusive start, exclusive end.

Example:

- `early_morning = (6, 9)` → includes images with `local_hour >= 6` and `local_hour < 9`
- `morning = (9, 12)` → includes images with `local_hour >= 9` and `local_hour < 12`

### 2.3 Temporal level produces

The pipeline builds several aggregation levels:

- **global across the full available period**
- **global by single local hour**
- **global by time band**
- **monthly**, including:

  - month total
  - hourly detail for the hours present in that month
  - time-band detail for the time bands present in that month

---

## 3. Aggregated Data Model

The aggregation stage works on rasters derived from the 3-bit encoding of the original physical model.

(More info in [Shadow Extraction Documentation](/sci/Documentation/Shadow_Extraction_doc.md)).

The three fundamental physical states are:

- `G_h` - ground/pedestrian shadow
- `S_h` - elevated surface shadow
- `M_h` - object-above-height mask

During aggregation, the final analytical products are no longer single 0-7 values per timestamp. Instead, the workflow sums the counts of specific conditions over time, calculating cumulative temporal metrics.

### 3.1 Exported counts

To maximize flexibility and keep the exported files lightweight, the pipeline does not directly export pre-calculated percentages. Instead, it exports the absolute occurrence counts for each pixel:

- `valid_count` → The total number of valid observations.
- `count_G` → number of valid observation where `G_h = True`. This represents the cumulative time the open ground or pedestrian level is in shadow.
- `count_S` → number of valid observation where `S_h = True`. This represents the cumulative time the upper surface of an elevated object (like a roof or canopy) is in shadow.

From these raw counts, downstream post-processing can accurately derive temporal frequencies:

- `freq_G = count_G / valid_count` (*Pedestrian shade frequency*)
- `freq_S = count_S / valid_count` (*Surface shade frequency*)

### 3.2 Exported bundles

The pipeline organizes these counts into specific temporal "bundles" (multi-band GeoTIFFs) to support different layers of analysis:

1. `static_masks`: Represents the static geometric state of a city at the chosen analysis height.

    - `structure_mask` → Identifies pixels physically occupied by and object (`DSM > DTM + h + epsilon`)
    - `open_ground_mask` → Identifies open terrain (`DSM <= DTM + h + epsilon`)

2. `global_core_stats`: Contains aggregation `valid count`, `count_G` and `count_S` aggregated over the entire available simulation period

3. `global_hourly_core_stats` → aggregation all timestamps grouped by their specific local hour.

   - Includes band groups such as `h06_valid_count`, `h06_count_G`, `h06_count_S`, ...

4. `global_timeband_core_stats` → Groups timestamps into broader, policy-relevant periods (e.g. early morning (6-9), peak thermal (12-15), evening (18-21)).

   - Includes band groups such as `early_morning_valid_count`, `early_morning_count_G`, `early_morning_count_S`, ...

5. `monthly_bundle_YYYYMM`: Generates a self-contained bundle for each individual month. Each monthly bundle includes:

    - Monthly total counts.
    - Hourly counts specific to that month.
    - Time-band counts specific to that month.

---

## 4. Pipeline Execution and Data Routing

A description of the data state transition across the three execution environments.

### 4.1 Ingestion (Local → GEE)

The upload stage manages the complete ingestion of local TIFFs into the cloud environment. It scans the local directory, validates and parses the filenames, and optionally sanitizes them. It utilizes `geeup` to upload the rasters directly to the target `ImageCollection`. Following the upload, it dynamically patches the essential Earth Engine metadata (`system:time_start` in UTC, `height_tagv`, `observer_height_m`, `local_time`) required by the downstram aggregation logic.

See [Shadow Upload Notebook](/sci/code/02_shadow_aggregation_upload_gee.ipynb).

### 4.2 Cloud Computation (GEE → Drive)

The core aggregation logic runs entirely server-side. The script dynamically assigns local time properties to compensate for project timezone, applies the half-open interval filters, and computes the statistical bundles. Outputs are asynchronously dispatched as batch export tasks to Google Drive.

See [Shadow Aggregate Notebook](/sci/code/03_shadow_aggregation_aggreate_gee.ipynb).

### 4.3 Retrieval (Drive → Local Disk)

The final step manages authentication via the Google Drive API. It locates the specific export folder matching the GEE task, verifying file completeness before downloading the GeoTIFF bundles back to local storage for subsequent operations.

See [Shadow Download Notebook](/sci/code/04_shadow_aggregation_downaload.ipynb).

---

## 5. Operational Assumptions and Known limits

The temporal logic relies on strict assumptions. Deviations from these parameters will impact the downstream data.

### 5.1 Metadata Dependency

Accurate temporal subsets rely entirely on correct `system:time_start` and timezone configurations during the upload stage. Missing or shifted UTC tags will result in empty or misaligned aggregations.

### 5.2 Integer Time-Banding

The `local_hour` property is calculated as an integer. Consequently, all timestamps falling between `09:00` and `09:59` belong strictly to hour `9`. The pipeline does not support sub-hourly fractional time bands.

### 5.3 Interval Bounds Exclusions

Because time bands are defined as right-exclusive intervals, a band set to `(18, 21)` will process hours 18, 19, and 20. Timestamp from `21:00` onward are excluded from that specific band, though they remain accounted for in monthly totals.

### 5.4 Anomaly Detections

The pipeline treats physical state values `2` and `3` as geometric anomalies. If the strict validation check is enabled, encountering these values will automatically stop the execution to prevent corrupted aggregations.

### 5.5 Asynchronous Latency

Using Google Drive as an intermediate buffer introduces latency. There in a mandatory waiting period between task submission on Earth Engine and the physical availability of the files for download.

---

## 6. Next Steps: Post-Processing

The temporal bundles generated by this pipeline act as a raw statistical bridge. They provide absolute pixel-level counts but are not yet finalized thematic maps.

The conversion of these counts into readable frequency percentages, the extraction of specific geometric layers (e.g. roofs vs ground), and the calculation of zonal statistics are handled entirely in the next stage.

See [Shadow PostProcessing Documentation](/sci/documentation/Shadow_PostProcessing_doc.md) and [Shadow PostProcessing Notebook](/sci/code/05_shadow_postprocessing.ipynb).

---
