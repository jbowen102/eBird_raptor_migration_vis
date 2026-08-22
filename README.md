# eBird Raptor Migration Visualizer

This repository contains data preparation and visualization code for exploring American raptor migration trends, including the eBird data-extraction notebooks and the webpage with D3.js code.  

My visualization uses eBird data ([eBird Basic Dataset](https://science.ebird.org/en/use-ebird-data/download-ebird-data-products)) to illustrate the different migration paths that raptors use, allowing users to view a guided comparison of the Mississippi Kite and Osprey or freely explore any pair of migratory raptors. I extracted, preprocessed, and aggregated the data using R ([auk library](https://cornelllabofornithology.github.io/auk/)), similarly to how I did it for my [STAT 420 Statistical Modeling final project](https://github.com/jbowen102/STAT_420_Final_Project) that analyzed Pileated Woodpecker observations and habitat covariates. 

The webpage is hosted on my personal website at [InfiniteIteration.com/ebird-raptor-migration-vis](https://infiniteiteration.com/ebird-raptor-migration-vis).

I built [the original visualization](https://github.com/jbowen102/CS416_Narrative_Vis_project) as my final project for the CS 416 Data Visualization course at The University of Illinois at Urbana-Champaign during my Master of Computer Science in Data Science studies. It uses the D3.js library, a commonly-used tool for creating interactive data visualizations on the web. A few examples from the New York Times:

- [Budget Forecasts, Compared With Reality (Porcupine Graphic)](https://archive.nytimes.com/www.nytimes.com/interactive/2010/02/02/us/politics/20100201-budget-porcupine-graphic.html)
- [How a Nation of Immigrants Traces its Roots](https://www.nytimes.com/interactive/2026/07/01/us/america-identity-ancestry-census.html)


## eBird Data Extraction/Processing Workflow

Extract data using `eBird_data_extract_ad_hoc.ipynb`, outputting to `output/auk` dir.

1. Extract all species at once and split into separate files by species.
2. If needed, split each species file by date range into multiple files so sampling-data file is small enough to not fill up RAM during subsequent processing. Seems it needs to be <3GB.

Transcribe final extraction and splitting code to `eBird_data_extract.ipynb` then further process data there.

4. Zero-fill and clean each file (possibly multiple per species if splitting was needed)
5. Aggregate each file (possibly multiple per species) into hex cells (essentially do "group by" to assign each checklist to a hex cell and week of the year). Compute checklist count, detections, total observations, and detection frequency for each hex cell/bin. Write out resulting data structure to CSV.
6. Re-combine each species' split files if needed
7. Export cleaned and aggregated CSV files into `output` dir.
8. Stage the output files you want to upload by creating symlinks in `source_data_upload` dir.
9. Run the upload rsync script from separate `Custom_pages` repository.


## Data Visualization webpage (D3.js)

The data visualization is implemented in D3.js and is contained in the `page-full-width-ebird-raptor-vis.php` file.  
The `dev_page.html` file is a development version of the visualization page to use for testing and debugging. Make changes to both files before committing. Update website with Git via remote repository.  
Use a separate branch to develop breaking changes, then merge into main branch when ready.