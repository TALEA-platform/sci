# Urban Shadow Extraction Pipeline

## Overview and Scope

This reference details the core **urban shadow extraction pipeline**. It explains how shadow are physically modeled from co-registered Digital Terrain Models (DTM) and Digital Surface Models (DSM). The rationale behind the 3-bit encoding, and how to correctly interpret the master output rasters.

This document is bounded to the initial extraction stage.\
Downstream workflows, such as temporal aggregations and city-level zonal statistics are covered in separate documentation.

**Related Documentation:**

- [Temporal Aggregation Documentation](/sci/documentation/Shadow_Aggregation_doc.md)
- [Post-processing and Zonal Analysis Documentation](/sci/documentation/Shadow_PostProcessing_doc.md)

---

## 1. Input Data and Requirements

The pipeline relies on two foundational input rasters that must be perfectly co-registered (sharing the exact **same projected CRS**, spatial resolution, matrix shape, and affine transform). They play distinctly different roles during the simulation:

- **The DTM (Digital Terrain Model) establishes the baseline:** It represents the bare-earth elevation needed to accurately place the "observer" at a specific height above street level (e.g. a pedestrian at 1.5 meters)
- **The DSM (Digital Surface Model) provides the obstacles:** It captures the terrain alongside all elevated physical features (building, trees, infrastructure) that intersect and block the solar rays.

---

## 2. Temporal Logic of the Extraction Stage

The extraction stage computes **one independent raster per timestamp**. It does not perform any temporal aggregation; its sole purpose is to generate the raw, snapshot-like master rasters.

In a standard production run, the temporal engine operates with the following parameters:

- **Timezone and Resolution:** Localized time (e.g. `Europe/Rome`) with a granular temporal step (typically 15 minutes).
- **Solar Geometry:** Exact solar altitude and azimuth are computed dynamically for each timestamp based on geographic coordinated using `pvlib`.
- **Low-Sun Filtering (optional):** Timestamps with a solar altitude less that a value (e.g. <= 5°) are optionally excluded to prevent excessive buffer requirements and edge-effect errors.

---

## 3. Core Capabilities and Physical Rationale

A conventional shadow model typically answers a single question: *is the ground in shadow?* Reducing reality to a single true/false flag results in a critical loss of information.

Instead, this pipeline computes three physically distinct layers for each pixel and packs them into a single encoded raster:

- `G_h` (**Ground / Pedestrian Shadow**): Answer whether the sun's rays are blocked for a point located at a specific height **h** above the bare terrain. This is the essential metric for evaluating pedestrian thermal comfort and mapping shade on open ground.
- `S_h` (**Elevated Surface Shadow**): Evaluates whether the upper surface of the DMS itself is shaded. This captures the reality of the urban canopy and is crucial for analyzing roof solar exposure and understanding how tall structures cast shadows on one another.
- `M_h` (**Object-Above-Height Mask**): A static geometric condition confirming whether a physical object (like a building or tree) already exists above the chosen analysis height at that exact pixel. It sis fundamental for distinguishing open ground from occupied space.

By separating these overlapping conditions, the output becomes a highly versatile **master product**, serving as the foundational data for a wide range of downstream applications (e.g. pedestrian shade frequencies, solar panel positioning).

---

## 4. The 3-Bit Shadow Model and Decoding

Generating three distinct physical states (`G_h`, `S_h`, `M_h`) for every single pixel at every timestamp creates a significant data volume challenge. Storing these as three separate boolean rasters would be highly inefficient for both disk space and I/O operation during downstream analysis.

To solve this, the pipeline employs a **bitwise encoding strategy**. The three boolean states evaluated at a user-defined analysis height **h**, are packed into a single 8-bit unsigned integer (`UInt8`) raster. This approach reduces storage requirements while preserving the independent physical conditions.

### 4.1 Bit Allocation Logic

Each physical state is assigned a specific bit position within the integer. A value of `1` means the condition is **True**, while `0` means the conditions is False. All conditions are intrinsically tied to the chosen height **h** (e.g *h = 1.5 meters* for pedestrians).

- **Bit 0 (Value 1)** → `G_h`
- **Bit 1 (Value 2)** → `S_h`
- **Bit 2 (Value 4)** → `M_h`

The final pixel value is simply the sum of its active bits, represented by the following equation:

**$$Pixel\_Value = (G_h \cdot 2^0) + (S_h \cdot 2^1) + (M_h \cdot 2^2)$$**
**$$Pixel\_Value = (G_h \cdot 1) + (S_h \cdot 2) + (M_h \cdot 4)$$**

### 4.2 Value Interpretation Table

Because we are using 3 bits, the resulting raster will only contain integer values ranging from **0 to 7**. Each number represents a unique decodable physical state of that specific pixel.

| Pixel Value | `M_h` (Bit 2) | `S_h` (Bit 1) | `G_h` (Bit 0) | Physical Interpretation in the Urban Environment                                                                                                                             |
|-------------|---------------|---------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **0**       | 0             | 0             | 0             | **Open Sunlit Ground:** No objects above height, both surface and ground are fully exposed to the sun.                                                                       |
| **1**       | 0             | 0             | 1             | **Standard Ground Shadow:** Open ground shaded by a distant obstacle (e.g., a building casting a shadow on a square).                                                        |
| **2**       | 0             | 1             | 0             | **Impossible Value:** Surface is shaded but the ground is sunlit.                                                                                                            |
| **3**       | 0             | 1             | 1             | **Impossible Value** Both the ground and the surface are in shadow, but no object exists exactly here.                                                                       |
| **4**       | 1             | 0             | 0             | **Sunlit Roof / Canopy (Rare):** An object exists, and its top surface is exposed to the sun. Ground shadow is marked false.                                                 |
| **5**       | 1             | 0             | 1             | **Sunlit Canopy over Shade:** An object exists with a sunlit top, but the ground beneath it is shaded (common for trees).                                                    |
| **6**       | 1             | 1             | 0             | **Shaded Roof / Canopy (Rare):** An object exists, and its top surface is shaded by a taller adjacent structure.                                                             |
| **7**       | 1             | 1             | 1             | **Fully Shaded Object:** An object exists, and both its top surface and the ground beneath it are entirely in shadow.                                                        |

### 4.3 Decoding in Downstream Workflows

To extract a specific layer from the master raster during post-processing, it is necessary to use **bitwise AND operations** rather than simple equality checks.

For example, to isolate *only* the Ground Shadow (`G_h`), apply a bitwise AND with `1`. This returns a pure binary mask, completely ignoring the states of `S_h` and `M_h`.

- Extract Ground Shadow: `Mask = (Raster & 1) > 0`
- Extract Surface Shadow: `Mask = (Raster & 2) > 0`
- Extract Object Presence: `Mask = (Raster & 4) > 0`
- Total Shadow: `Mask = (Raster & 1) > 0 OR (Raster & 4) > 0`
- Hybrid layer: `Mask = (Raster & 2) > 0 OR (((Raster & 1) > 0) AND ((Raster & 4) == 0))`

This ensures that the master product can be easily unpacked into its constituent parts for specialized zonal statistics or temporal aggregation.

---

## 5. Computational Architecture: GPU and Tiling

To handle high-resolution, city-scale rasters across multiple timestamps, the pipeline utilizes a custom **CUDA kernel** (via `cupy`) to perform parallel ray-tracing (ray-marching) at the pixel level.

### 5.1 Why GPU-Accelerated Ray Tracing?

Standard shadow models often simplify geometry to save time. This pipeline, however, performs a physically explicit **ray-marching** for every single pixel.\
The GPU allows the system to:

- Sample the DSM repeatedly along the sun's path with adaptive interpolation.
- Execute early-stop logic as soon as a ray is obstructed, optimizing performance.
- Process millions of pixels simultaneously.

### 5.2 Tiling and Directional Buffering

Urban rasters are often too large to fit into GPU VRAM in their entirety. The pipeline solves this by processing the area in **tiles**.

To ensure that shadows from tall buildings outside a specific tile are correctly captured, the system applies **Directional Buffering**:

- Each tile is expanded on the sun-facing side (depending on solar azimuth)
- The buffer size is dynamically calculated based on the **solar altitude** and the **maximum expected height** of urban features.
- This prevents "shadow truncation" at tile boundaries, ensuring that a building in one tile can correctly cast a shadow into the next.

### 5.3 Low-Sun Angle Constraints

As the sun approaches the horizon (low solar altitude), shadow lengths increase exponentially, requiring a massive directional buffers that would overwhelm GPU memory.\
For this reason, the pipeline typically excludes timestamps where the **solar altitude is** <= than a optional customized value. This maintains a balance between physical accuracy and computational stability.

---

## 6. Model Assumptions and Known Limitations

To maintain computational efficiency and consistency, the extraction pipeline operates under specific physical assumptions. Understanding this is vital for the correct interpretation of the results.

### 6.1 Opaque Canopy Assumption

The model treats all elevated objects in the DSM as **fully opaque**.

- While this is appropriate for buildings, it represents a conservative "worst-case" scenario for vegetation.
- The pipeline does not currently model partial light transmittance through tree crows (porosity).

### 6.2 Transient Object in the DSM

The ray-tracing kernel does not distinguish between permanent structures and temporary features present in the input DSM at the time of capture.

- **Vehicles:** Parked cars or trucks captured in the DSM will cast shadows and be marked as object (`M_h`).
- **Temporary Structures:** Scaffolding, cranes, or construction sites are treated as solid obstructions.
- Users should be aware that the resulting shadow maps are a reflection of the **geometric state of the city** when the DSM was generated.

### 6.3 Multi-Level Infrastructure and Hydrography

Urban environments ofter feature complex vertical or spectral geometries that can challenge a 2D raster output.

- **Vertical Collapse:** Multiple vertical levels (e.g. bridges, overpasses, porticos) at the same XY coordinates are collapsed into a single value. Interpreting shade under these structures may require additional contextual masking.
- **Water Bodies:** Rivers, lakes, and other water surfaces can introduce geometric errors or "noise" in the input DSM. Due to the reflection or absorptive nature of the water during LIDAR acquisition, the resulting shadow object mask (`M_h`) in these areas may be unstable or inaccurate.

### 6.4 Near-Horizon Thresholds

As detailed in the computational section, the simulation is restricted to solar altitudes above a selected optional value.

- This means the data describes the "**operational daylight** window rather than the full astronomical day.
- Shadows at dawn and dusk, which are often extremely elongated and diffuse, are intentionally excluded to ensure the stability and reliability of the master rasters.

---

## 7. Execution Outputs and Archival Strategy

The extraction pipeline is designed to produce a self-contained dataset for each simulation run.

### 7.1 Generated File Types

A standard execution typically populates an output directory with the following components:

- **Master Encoded Rasters (`.tif`):** One 8-bit GeoTIFF per timestamp and analysis height (e.g. `shadow_20240621_1200_h1p5m.tif`). These are the primary products containing the encoded `G_h`, `S_h` and `M_h` layers.
- **Manifest CSV:** A comprehensive index listing every generated raster alongside its local datetime, solar altitude, solar azimuth and file path.
- **Configuration Snapshot (`.json`):** A record if all input parameters used during the run, including study area coordinates, timezone, analysis heights, and tile/buffer settings.
- **Quality Assurance (QA) Logs:** Summary tables reporting pixel value counts and confirming the absence of impossible geometric values (e.g. values 2 or 3).
- **Input Grid Metadata:** A small reference file storing the exact CRS, transform, and dimensions of the input DTM/DSM to ensure perfect alignment in future re-runs.

### 7.2 Archival and Reproducibility

To maintain the integrity of the "master product", the following archival rules should be followed:

- **Treat TIFFs as Read-Only:** The raw encoded rasters should never be manually edited or re-saved. Any thematic interpretation or filtering must occur during the decoding or aggregation phase.
- **Bundle Metadata:** The Manifest and Configurations files must always be stored alongside the rasters. Without them, the physical context (the exact time and sun position) of the shadow is lost.

---

## 8. Downstream Workflows: From Master Rasters to Urban Metrics

The value of the extraction pipeline lies in the versatility of its 3-bit encoded output. Because the master rasters preserve three independent physical state, they serve as the foundational data for diverse analytical applications.

- **Temporal Aggregation (Shade Duration):** By processing a chronological stack of timestamped rasters, it is possible to calculate cumulative duration of specific conditions over any given period (e.g. a summer day, a month, a season).

- **Zonal Statistics:** Pixel-level information is aggregated into vector geometries such as street segments, green zones, etc.
- **Hybrid Products and Visualization**, for example:

  - **Total Effective Shadow:** A combination of `G_h | S_h` provides a comprehensive view of all genuinely shaded surfaces, capturing both the shadows falling on the open ground (`G_h`) and those cast onto elevated structures and roofs (`S_h`).

> These are few example of the usages, more information in [Temporal Aggregation doc](/sci/documentation/Shadow_Aggregation_doc.md) and [Post-processing doc](/sci/documentation/Shadow_PostProcessing_doc.md)

---
