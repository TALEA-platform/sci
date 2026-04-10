# Urban Shadow Post-Processing Pipeline

## Overview and Scope

This documentation describes the **final stage** of the Shadow Coverage Index workflow. It starts from the compact temporal aggregation bundles exported from Google Earth Engine and transforms them into finalized raster variants and polygon-based spatial summaries.

This stage is structured around three dedicated notebooks:

1. **Merge notebook:** merge GeoTIFF tiles when a single Earth Engine export product was split into multiple files.
2. **Variant Extraction notebook:** derives readable, specific thematic shadow frequency rasters from the raw statistical counts.
3. **Zonal Analysis notebook:** aggregates the post-processed raster frequencies within urban vector layers (e.g. street segments, green areas and statistical zones)

**Related Documentation:**

- [Shadow Extraction Documentation](/sci/documentation/Shadow_Extraction_doc.md)
- [Shadow Aggregation Documentation](/sci/documentation/Shadow_Aggregation_doc.md)

---

## 1. Input Data and Requirements

The post-processing stage assumes that the temporal aggregation computation has successfully completed on Google Earth Engine and that the resulting GeoTIFF bundles have been downloaded to local storage.

### 1.1 Source Bundles Requirements

The pipeline operates on multi-band integer GeoTIFFs containing absolute cumulative counts. Typical expected inputs include:

- `static_masks.tif` (mandatory baseline)
- `global_core_stats.tif`
- `global_hourly_core_stats.tif`
- `global_timeband_core_stats.tif`
- one or more `monthly_bundle_YYYYMM.tif`

These rasters must share the exact same grid, CRS (e.g. EPSG:32632), and alignment.

### 1.2 Tiled vs. Single-File Inputs

Depending on the size of the export region and the Earth Engine `MaxPixels` parameters, the bundles might be downloaded as:

- **Single files:** One complete .tif per product.
- **Tiled outputs:** A directory containing spatial chunks (e.g. `global_core_stats-0000000000-0000000000.tif`). Tiled exports must be merged before variant extraction can occur.

### 1.3 Local Environment

Unlike the extraction (GPU) or aggregation (Cloud) stages, the post-processing stage runs entirely on the CPU.

---

## 2. Tile Merging Strategy

Before extraction specific thematic variants, the downloaded tiles must be seamlessly merges together to reconstruct the full area of interest.

This operation is performed in [Merging Notebook 05](/sci/code/05_shadow_postprocessing_merge_tiles.ipynb).

### 2.1 Execution Modes

To accommodate different export directory structures, the merge pipeline supports two operational modes:

- **Single-folder mode:** Targets a specific directory containing tiles for a single product (e.g. merging only the tiles belonging to `global_hourly_core_stats`).
- **Batch mode:** Automatically scans a root directory, identifies subfolders containing tiled products, and merges each group sequentially.

### 2.2 Technical and Memory Considerations

The merging process (`rasterio.merge`) is highly memory-intensive when dealing with heavy multi-band rasters. The pipeline is designed with several safety parameters:

- **Memort Management:** Explicit limits on RAM usage (`read_all_bands_limit_mb` and `gdal_cachemax_mb`) prevent out-of-memory crashes during the reconstruction of the arrays.
- **NoData Preservation:** Strict enforcement of the NoData value (e.g. `255`) prevents interpolation artifacts at tile seams. For complex overlapping bounds, the `prefill_output_nodata=True` parameter ensures the output canvas is correctly initialized before data is written.
- **Compression:** The final stitched outputs are compressed to optimize local disk space without losing analytical precision.

---

## 3. Shadow Variants and Frequency Derivation

The raw bundles exported from Earth Engine are optimized for storage, containing only absolute counts (e.g `valid_count`, `count_G`, `count_s`). To be used in downstream analysis or visualization, these counts must be normalized into readable frequency percentages (0.0 to 1.0) adn separated into specific thematic layers.

This operation is performed by the [Extract Shadow Variants Notebook 06](/sci/code/06_shadow_postprocessing_shadow_variants.ipynb).

### 3.1 Thematic Variants Generated

For every temporal prefix found in the input bundles (e.g. global, hourly, time-bands, or monthly), the pipeline uses the `static_masks.tif` baseline to calculate and export four distinct single-band GeoTIFFs:

1. `GOUND` **(Open-ground shadow frequency):** -Logic: `count_G / valid_count`, masked to include strictly non-build terrain.

   - *Use case:* Evaluating thermal comfort in parks, plazas, and open streets.

2. `ROOF_SURFACE` **(High-surface shadow frequency):** -Logic: `count_S / valid_count`, masked to include strictly elevated surfaces.

   - *Use case:* Assessing rooftop solar panel potential or canopy shading.

3. `TOTAL` **(Total pedestrian shadow frequency):** -Logic: `(count_G + count_S) / valid_count`.

   - *Use case:* A comprehensive view of shade, representing both shadows falling on the ground and shadows cast onto elevated structures.

4. `FOOTPRINT` **(Binary structure mask):** -Logic: A static 0/1 mask distinguishing built volumes from open ground.

   - *Use case:* Used as a strict boundary reference.

### 3.2 Block-Processing Logic

To handle high-resolution rasters without exceeding system memory limits, the extraction logic operates using a moving window approach (`block_size`, e.g. 1024x1024 px). This ensures that even massive rasters can be safely processed.

---

## 4. Spatial and Zonal Analysis

This final stage of the post-processing pipeline intersects the continuous shadow frequency rasters (`shadow_*.tif`) with vector geometries to calculate zonal statistics (e.g. mean, median, standard deviation).

This operation is executed by the [Zonal analysis notebook 07](/sci/code/07_shadow_postprocessing_bologna_zonal_analysis.ipynb).

**Note on Geographic Portability and Data Sources:** The spatial analysis logic is universally applicable, but this specific notebook is currently tailored to the **City of Bologna**. It dynamically fetches vector layers (pedestrian networks, green areas, and statistical zones) directly from the [Open Data Portal of the Municipality of Bologna](https://www.google.com/search?q=https://opendata.comune.bologna.it/).

**To apply this pipeline to a different municipality**, users must update the data ingestion block within the notebook provide local vector polygons (via WFS or local files) and update the corresponding unique ID columns used for grouping.

### 4.1 Output Generation

The notebook is designed to automatically detect all generalized post-processed variants (e.g `GROUND`, `TOTAL`, `ROOF_SURFACE`) across all temporal frames (global, hourly, monthly). For each raster and vector layer combination, it generates a comprehensive analytical suite:

- **Tabular Data:** Granular CSV files containing the statistical summary for every polygon.
- **Geospatial Vectors:** GeoPackages (.gpkg) containing the original geometries enriched with the calculated shadow statistics.
- **Aggregated Summaries:** Cross-layer comparison tables to evaluate, for example, the shade disparity between different neighborhoods or street hierarchies.
- **Analysis Manifest:** A JSON file logging the exact rasters and layers processed, ensuring reproducibility.
- **Markdown Report:** A text report summarizing the execution.

---
