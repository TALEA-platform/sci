# Shadow Coverage Index

[🇮🇹 Versione in italiano qui](#shadow-coverage-index-versione-italiana)

---

## Spatio-temporal indicator of urban shade for climate resilience

The **Shadow Coverage index** is an analytical framework and web platform developed within the Talea Project, focused on the city of Bologna. The system processes high-resolution physical shadow simulations, derived from DTM (Digital Terrain Model) and DSM (Digital Surface Model) into a set of structured spatio-temporal indicators.

The code objective of the workflow is to move beyond instantaneous shadow mapping by quantifying and visualizing:

- **Temporal Dynamics:** Tracking how shade shifts across the urban grid throughout the day.
- **Frequency and Persistence:** Measuring how often specific locations are shaded over defined periods (e.g. months or specific time bands).
- **Spatial Distribution:** Aggregating pixel-level data into functional urban units, such as street segments, green areas, and census tracts.

These derived metrics provide a standardized, readable baseline for climate adaptation studies, pedestrian thermal comfort analysis, and the evaluation of urban microclimates.

---

## 1. Analytical Capabilities and Core Indicators

The extracted and aggregated shadow data enable a multi-scale reading of the urban environment. By transitioning from instantaneous snapshots to aggregated metrics, the dataset provides actionable insights into the city's microclimate and thermal resilience.

### 1.1 Analytical Scope

The processed data allows to evaluate:

- **Thermal Exposure:** Identifying which public spaces are most exposed to direct sunlight during peak thermal hours.
- **Shade Persistence:** Mapping areas where shade is stable and continuos versus location where it is scarce or fragmented.
- **Morphological Influence:** Assessing how the physical geometry of building and tree canopies distinctly influences the spatial distribution of shades.
- **Comparative Benchmarking:** Comparing different parts of the city.

### 1.2 Core Indicators

The platform structures these insights around four primary indicators, preserving rigor of the extraction workflow while enabling macro-level interpretation:

1. **Diurnal Dynamics (Sample Days):** Tracking the sequential, step by step movement of shadows across representative days (from morning to evening) using instantaneous unaggregated snapshots.
2. **Temporal Aggregation (Frequency Pattern):** Evaluating the typical shadow frequency over selected months or specific time bands (e.g. peak thermal hours). This shifts the analysis from isolated moments to consolidated daily patterns.
3. **Zonal Aggregation Statistics:** Spatial averaging of the previously calculated temporal frequencies across urban units, such as streets segments, green areas, census zones, and neighborhoods. This translates pixel-level resolution into polygon-based urban planning metrics.
4. **Intra-Zonal Spatial Variability:** Assessment of shade distribution within a single polygon, calculated as the spatial standard deviation of the pixel-level temporal frequency. It identifies whether a specific area maintains a uniform microclimate or feature stark, coexisting contrasts between deep shade and full sun.

---

## 2. Physical Foundations: DTM, DSM and 3-bit Encoding

The shadow extraction workflow is built upon two co-registered high-resolution raster datasets:

- **DTM (Digital Terrain Model):** Represents the base earth surface.
- **DSM (Digital Surface Model):** Represents the terrain plus all elevated objects, including buildings, tree canopies, and urban infrastructures.

By evaluating the spatial relationship between the simulated solar ray, the DTM, and the DSM, the model determines three distinct physical states at a specific pedestrian or analysis height (*h*):

- `G_h`: Ground/pedestrian-level shadow.
- `S_h`: Elevated surface shadow (e.g. shade falling on roofs or tree canopies)
- `M_h`: Object mask (a geometric flag identifying where an object physically exists above height *h*)

To preserve these independent conditions efficiently without generating multiple heavy datasets, the model encodes them into a **3-bit bitwise format**, packed within a single `UInt8` raster value.

This 3-bit encoded master product serves as the strict foundation for all downstream aggregation. Subsequent phases do not operate on a generic, flat "shadow map"; rather, they derive temporal and spatial indicators from these physically distinct components.

---

## 3. Known Limitations and Boundary Conditions

While the Shadow Coverage Index provides robust and interpretable metrics, it is essential to contextualize the data within its methodological boundaries. The indicators represent a detailed geometric evaluation rather than a complete thermodynamic simulation.

When interpreting the data, the following operational limits must be considered:

- **Static Urban Geometry:** The model reflects the physical state of the city exactly as captured by the underlying DSM. Consequently, temporary objects present during aerial survey (e.g. scaffolding, cranes, parked vehicles) are treated as solid structures and will cast shadows in the simulation.
- **Canopy Opacity:** Tree canopies are currently modeled as completely opaque volumes. The workflow does not account for foliage porosity, varying degrees of light transmittance, or seasonal leaf-shedding dynamics (deciduous vs. evergreen).
- **Solar Angle Thresholds:** To prevent unstable, infinitely elongated shadow that could artificially skew the aggregated metrics, very low solar angles (typically near sunrise and sunset) are filtered out using a dedicated solar elevation threshold (>= 5 degree).
- **Geometric vs. Thermal Data:** The output maps explicitly quantify the *presence and frequency* of direct sunlight and shade. They do not measure the absolute thermal intensity of solar radiation, surface temperatures, or perceived physiological comfort (which also depends on wind, humidity, and material albedo).

---

## 4. Data Pipeline and Delivery Architectures

The transformation from raw elevation models to the final web application operates across four sequential environments:

### 4.1 Stage 1: Shadow Extraction (Physical Modeling)

The physical ray-tracing simulation produces one independent 3-bit encoded master raster for each timestamp. These files represent raw, instantaneous physical snapshots of shadow conditions before any temporal summarization.

### 4.2 Stage 2: Temporal Aggregation

The master rasters are uploaded to Google Earth Engine (GEE) and synthesized into compact statistical bundles. This stage outputs:

- Global aggregations across the entire available period.
- Hourly and time-band specific aggregations.
- Monthly bundles featuring total, hourly, and time-band breakdowns.

The exported files contain the foundational counts (`valid_count`, `coung_G`, `count_S`) required to derive all downstream shadow frequencies.

### 4.3 Stage 3: Spatial Aggregation (Zonal Statistics)

The aggregated rasters are summarized inside functional urban polygons (street segments, green areas, and census zones).

### 4.4 Stage 4: Web Application

The frontend synthesizes the process data into an accessible public interface, combining:

- Cropped raster views for detailed exploration of representative days.
- Temporal aggregation maps for selected focus area.
- Polygon-based statistics covering the entire city.

### 4.5 Dataset Temporal Scope

To balance computational efficiency with analytical depth, the extraction pipeline was executed over a targeted matrix of representative days.

For the current dataset, the data extraction covers **every Sunday of the three summer months (June, July, August) of the year 2025**.

The complete list of analyzed days mapped by the pipeline is as follows:

- **June 2025:** 1, 8, 15, 22, 29
- **July 2025:** 6, 13, 20, 27
- **August 2025:** 3, 10, 17, 24, 31

> Note: On each of these 14 days, the shadow conditions were simulated at regular 15-minutes intervals from sunrise to sunset (with sun angle >= 5 degrees)

---

## 5. Repository Structure and Technical Reference

This file provides a high-level architectural overview of the Shadow Coverage Index. For a deep dive into the methodology, computational workflow, and executional logic, refer to the detailed technical documentation and the accompanying Jupyter notebooks:

- [Shadow Extraction Documentation](/sci/documentation/Shadow_Extraction_doc.md)
- [Shadow Extraction Notebooks](/sci/code/01_shadow_raytrace_pipeline.ipynb)

---

- [Shadow Aggregation Documentation](/sci/documentation/Shadow_Aggregation_doc.md)
- [Shadow Aggregation Notebooks 1](/sci/code/02_shadow_aggregation_upload_gee.ipynb)
- [Shadow Aggregation Notebooks 2](/sci/code/03_shadow_aggregation_aggreate_gee.ipynb)
- [Shadow Aggregation Notebooks 3](/sci/code/04_shadow_aggregation_downaload.ipynb)

---

- [Shadow PostProcessing Documentation](/sci/documentation/Shadow_PostProcessing_doc.md)
- [Shadow PostProcessing Notebooks](/sci/code/05_shadow_postprocessing.ipynb)

---

# Shadow Coverage Index (Versione Italiana)

[🇬🇧 English version here](#shadow-coverage-index)

---

## Indicatore spazio-temporale dell'ombra urbana per la resilienza climatica.

Lo **Shadow Coverage index** è un framework analitico e una piattaforma web sviluppata all'interno del Progetto Talea, con un focus sulla città di Bologna. Il sistema elabora simulazioni fisiche delle ombre ad alta risoluzione, derivate da DTM (Digital Terrain Model) e DSM (Digital Surface Model), in un set di indicatori spazio-temporali strutturati.

L'obiettivo principale del flusso di lavoro è andare oltre la mappatura istantanea delle ombre, quantificando e visualizzando:

- **Dinamiche temporali:** Tracciare come l'ombra si sposta attraverso il reticolo urbano nel corso della giornata.
- **Frequenza e persistenza:** Misurare quanto spesso luoghi specifici sono in ombra in periodi definiti (es. mesi o specifiche fasce orarie).
- **Distribuzione spaziale:** Aggregare i dati a livello di pixel in unità urbane funzionali, come segmenti stradali, aree verdi e sezioni di censimento.

Queste metriche derivate forniscono una base di riferimento standardizzata e leggibile per gli studi di adattamento climatico, l'analisi del comfort termico pedonale e la valutazione dei microclimi urbani.

---

## 1. Capacità Analitiche e Indicatori Principali

I dati di ombreggiamento estratti e aggregati permettono una lettura multi-scala dell'ambiente urbano. Passando da istantanee temporali a metriche aggregate, il dataset fornisce informazioni operative sul microclima e sulla resilienza termica della città.

### 1.1 Ambito Analitico

I dati elaborati permettono di valutare:

- **Esposizione termica:** Identificare quali spazi pubblici sono più esposti alla luce solare diretta durante le ore di picco termico.

- **Persistenza dell'ombra:**: Mappare le aree dove l'ombra è stabile e continua rispetto a zone dove è scarsa o frammentata.

- **Influenza morfologica:** Valutare come la geometria fisica degli edifici e delle chiome arboree influenzi in modo distinto la distribuzione spaziale delle ombre.

- **Benchmarking comparativo:** Confrontare diverse parti della città.

### 1.2 Indicatori Principali

La piattaforma struttura queste analisi intorno a quattro indicatori primari, preservando il workflow di estrazione e consentendo al contempo un'interpretazione ad alto livello:

1. **Dinamiche diurne (Giornate esempio):** Tracciare il movimento sequenziale, passo dopo passo, delle ombre in giornate rappresentative (dalla mattina alla sera) utilizzando istantanee non aggregate.

2. **Aggregazione temporale (Pattern di frequenza):** Valutare la frequenza tipica dell'ombra in mesi selezionati o specifiche fasce orarie (es. ore di picco termico). Questo sposta l'analisi da momenti isolati a pattern giornalieri consolidati.

3. **Statistiche di aggregazione zonale:** Media spaziale delle frequenze temporali calcolate in precedenza, su unità urbane, come segmenti stradali, aree verdi, zone censuarie e quartieri. Questo passaggio traduce la risoluzione a livello di pixel in metriche basate su poligoni.

4. **Variabilità spaziale intra-zonale:** Valutazione della distribuzione dell'ombra all'interno di un singolo poligono, calcolata come deviazione standard spaziale della frequenza temporale a livello di pixel. Identifica se un'area specifica mantiene un microclima uniforme o presenta forti contrasti tra ombra profonda e pieno sole.

---

## 2. Fondamenti fisici: DTM, DSM e codifica a 3 bit

Il flusso di lavoro per l'estrazione delle ombre si basa su due dataset raster ad alta risoluzione co-registrati:

- **DTM (Digital Terrain Model):** Rappresenta la superficie base del terreno.

- **DSM (Digital Surface Model):** Rappresenta il terreno più tutti gli oggetti sopraelevati, inclusi edifici, chiome degli alberi e infrastrutture urbane.

Valutando la relazione spaziale tra il raggio solare simulato, il DTM e il DSM, il modello determina tre distinti stati fisici a una specifica altezza pedonale o di analisi (*h*):

- `G_h`: Ombra al suolo / a livello pedonale.

- `S_h`: Ombra sulle superfici elevate (es. ombra che cade su tetti o chiome degli alberi).

- `M_h`: Maschera degli oggetti (un indicatore geometrico che identifica dove un oggetto esiste fisicamente sopra l'altezza h).

Per preservare queste condizioni indipendenti in modo efficiente senza generare dataset pesanti multipli, il modello le codifica in un **formato bitwise a 3 bit**, compattato all'interno di un singolo valore raster `UInt8`.

Questo prodotto master codificato a 3 bit funge da base rigorosa per tutte le aggregazioni finali. Le fasi successive non operano su una "mappa delle ombre" generica e piatta; derivano invece indicatori temporali e spaziali a partire da queste componenti fisicamente distinte.

---

## 3. Limiti Noti e Condizioni di Validità

Sebbene lo Shadow Coverage Index fornisca metriche robuste e interpretabili, è essenziale contestualizzare i dati all'interno dei loro confini metodologici. Gli indicatori rappresentano una valutazione geometrica dettagliata piuttosto che una simulazione termodinamica completa.

Nell'interpretare i dati, devono essere considerati i seguenti limiti operativi:

- **Geometria urbana statica:** Il modello riflette lo stato fisico della città esattamente come catturato dal DSM. Di conseguenza, gli oggetti temporanei presenti durante il rilievo aereo (es. impalcature, gru, veicoli parcheggiati) vengono trattati come strutture solide e proietteranno ombre nella simulazione.

- **Opacità delle chiome:** Le chiome degli alberi sono attualmente modellate come volumi completamente opachi. Il flusso di lavoro non tiene conto della porosità del fogliame, dei diversi gradi di trasmittanza della luce o delle dinamiche stagionali di caduta delle foglie (decidue vs. sempreverdi).

- **Soglie dell'angolo solare:** Per prevenire ombre instabili e infinitamente allungate che potrebbero distorcere artificialmente le metriche aggregate, gli angoli solari molto bassi (tipicamente vicino all'alba e al tramonto) vengono filtrati utilizzando una soglia dedicata di elevazione solare (>= 5 gradi).

- **Dati geometrici vs. termici:** Le mappe di output quantificano esplicitamente la presenza e frequenza della luce solare diretta e dell'ombra. Non misurano l'intensità termica assoluta della radiazione solare, le temperature superficiali o il comfort fisiologico percepito (che dipende anche da vento, umidità e albedo dei materiali).

---

## 4. Architettura della pipeline dati e distribuzione

La trasformazione  partendo dai modelli di elevazione grezzi, all'applicazione web finale avviene attraverso quattro stadi sequenziali:

### 4.1 Stadio 1: Estrazione delle ombre (Modellazione fisica)

La simulazione fisica di ray-tracing (ray-marching) produce un raster master indipendente, codificato a 3 bit, per ogni timestamp. Questi file rappresentano istantanee fisiche grezze delle condizioni di ombreggiamento.

### 4.2 Stadio 2: Aggregazione Temporale

I raster master vengono caricati su Google Earth Engine (GEE) e sintetizzati in bundle statistici compatti. Questa fase produce:

- Aggregazioni globali sull'intero periodo disponibile.

- Aggregazioni specifiche per ora e per fascia oraria.

- Bundle mensili con dettagli totali, orari e per fascia oraria.

I file esportati contengono i conteggi fondamentali (`valid_count`, `count_G`, `count_S`) necessari per derivare tutte le frequenze d'ombra nelle fasi successive.

### 4.3 Stadio 3: Aggregazione spaziale (Statistiche zonali)

I raster aggregati vengono riassunti all'interno di poligoni urbani funzionali (segmenti stradali, aree verdi, zone censuarie e quartieri).

### 4.4 Stadio 4: Applicazione Web

Il frontend sintetizza i dati elaborati in un'interfaccia accessibile, combinando:

- Viste raster ritagliate (crop) per l'esplorazione dettagliata delle giornate rappresentative.

- Mappe di aggregazione temporale per aree di interesse selezionate.

- Statistiche basate su poligoni che coprono l'intera città.

### 4.5 Perimetro Temporale del Dataset

Per bilanciare l'efficienza computazionale con la profondità analitica, la pipeline di estrazione è stata eseguita su una matrice mirata di giornate rappresentative.

Per il dataset attuale, l'estrazione dei dati copre **ogni domenica dei tre mesi estivi (giugno, luglio, agosto) dell'anno 2025**.

La lista completa dei giorni analizzati mappati dalla pipeline è la seguente:

- **Giugno 2025:** 1, 8, 15, 22, 29

- **Luglio 2025:** 6, 13, 20, 27

- **Agosto 2025:** 3, 10, 17, 24, 31

> Nota: In ognuno di questi 14 giorni, le condizioni di ombra sono state simulate a intervalli regolari di 15 minuti dall'alba al tramonto (con angolo solare >= 5 gradi).

---

## 5. Struttura del Repository e Riferimenti Tecnici

Questo file fornisce una panoramica architetturale ad alto livello dello Shadow Coverage Index. Per un approfondimento sulla metodologia, sul flusso di lavoro computazionale e sulla logica di esecuzione, bisogna fare riferimento alla documentazione tecnica dettagliata e ai notebook Jupyter di accompagnamento:

- [Shadow Extraction Documentation](/sci/documentation/Shadow_Extraction_doc.md)
- [Shadow Extraction Notebooks](/sci/code/01_shadow_raytrace_pipeline.ipynb)

---

- [Shadow Aggregation Documentation](/sci/documentation/Shadow_Aggregation_doc.md)
- [Shadow Aggregation Notebooks 1](/sci/code/02_shadow_aggregation_upload_gee.ipynb)
- [Shadow Aggregation Notebooks 2](/sci/code/03_shadow_aggregation_aggreate_gee.ipynb)
- [Shadow Aggregation Notebooks 3](/sci/code/04_shadow_aggregation_downaload.ipynb)

---

- [Shadow PostProcessing Documentation](/sci/documentation/Shadow_PostProcessing_doc.md)
- [Shadow PostProcessing Notebooks](/sci/code/05_shadow_postprocessing.ipynb)

---