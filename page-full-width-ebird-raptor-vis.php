<?php
/**
 * Template Name: eBird Raptor Migration Vis
 *               [ ^ name that appears in WP interface for selecting page template ]
 *
 *
 *
 */


get_header(); ?>
	<div id="primary" class="content-area grid-100 tablet-grid-100 mobile-grid-100">
		<main id="main" class="site-main" role="main">
			<?php while ( have_posts() ) : the_post(); ?>
			<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <link rel="stylesheet" href="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/ebird-raptor-vis.css' ); ?>">

			<header class="entry-header">
				<?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
			</header><!-- .entry-header -->

			<div class="entry-content special-page-content">

				<!-- custom HTML starts here -->

                <script src="https://d3js.org/d3.v7.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/d3-annotation/2.5.1/d3-annotation.min.js" integrity="sha512-iBAeBWWWFb8HqSBcrqcz98iIpuVH1la39dEYHtyQ/pGpeCQTQVvLJOWAuhv2Q7JSHp9k7hWA7sGxU3hHJe+tFg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
                <script src='https://unpkg.com/topojson-client@3'></script>

				<p>Comparing Raptor Fall Migration Preferences</p>

                <div id="viz-wrapper">
                    <button id="narr-forward" class="narrative-button-fwd" type="button">
                        Start the Tour
                    </button>
                    <button id="narr-free" class="narrative-button-free" type="button">
                        Free Explore
                    </button>
                    <button id="narr-reset" class="narrative-button-reset is-disabled" type="button" disabled>
                        Reset
                    </button>

                    <div class="control-wrap" id="week-slider-wrap">
                        <!-- <input id="week-slider" type="range" min="31" max="43" value="31"> -->
                        <input id="week-slider" type="range" min="27" max="52" value="27">
                    </div>
                    <!-- <span id="week-label">Week 27</span> -->
                    <span id="week-label">Week 31</span>

                    <div id="species-pick">
                        <span class="control-wrap" id="chk-msk-wrap" style="display: inline-block;">
                            <label style="margin-right:12px; color:#12eb1f;"><input type="checkbox" id="chk-msk" checked> <span id="lbl-msk">Mississippi Kite</span></label>
                            <select id="sel-msk" class="species-select" disabled aria-label="Species slot A"></select>
                        </span>
                        <span class="control-wrap" id="chk-osp-wrap" style="display: inline-block;">
                            <label style="color:#926fff;"><input type="checkbox" id="chk-osp" checked> <span id="lbl-osp">Osprey</span></label>
                            <select id="sel-osp" class="species-select" disabled aria-label="Species slot B"></select>
                        </span>
                    </div>
                    </br>

                    <div id="tooltip" class="tooltip"></div>
                    <svg id="map"></svg>
                    <script>
                        window.EBIRD_VIS_CONFIG = {
                            dataDir: "/data/eBird_raptor_migration_vis",
                            // pass parameters here to the visualization script if needed
                        };
                    </script>
                    <script src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/ebird-raptor-vis.js' ); ?>"></script>
				</div> <!-- viz-wrapper -->
                <div id="commentary" class="commentary-section">
                    </br>
                    </br>
                    <hr style="border: 1px solid #cccccc96; margin: 20px 0;">
                    <p>
                    Use this visualization tool to explore American raptor migration trends based on eBird observations. I built the original visualization as my final project for the CS 416 Data Visualization course at The University of Illinois at Urbana-Champaign during my Master of Computer Science in Data Science studies. It uses the <a href="https://idl.uw.edu/papers/d3">D3.js library</a>, a commonly-used tool for creating interactive data visualizations on the web. A few examples from the New York Times:
                    <ul>
                        <li><a href="https://archive.nytimes.com/www.nytimes.com/interactive/2010/02/02/us/politics/20100201-budget-porcupine-graphic.html">Budget Forecasts, Compared With Reality (Porcupine Graphic)</a></li>
                        <li><a href="https://www.nytimes.com/interactive/2026/07/01/us/america-identity-ancestry-census.html">How a Nation of Immigrants Traces its Roots</a></li>
                    </ul>
                    <br>
                    My visualization uses eBird data (<a href="https://science.ebird.org/en/use-ebird-data/download-ebird-data-products">eBird Basic Dataset</a>) to illustrate
                    the different migration paths that American birds of prey use, and allows the users to freely explore or follow a guided tour focused on the Mississippi Kite and Osprey.
                    I extracted, preprocessed, and aggregated the data using R
                    (<a href="https://cornelllabofornithology.github.io/auk">auk library</a>),
                    similarly to how I did it for my
                    <a href="https://infiniteiteration.com/woodpecker-population-modeling">STAT 420 Statistical Modeling final project</a>
                    that analyzed Pileated Woodpecker observations and habitat covariates.
                    <br>
                    <br>
                    Visit the <a href="https://github.com/jbowen102/eBird_raptor_migration_vis">GitHub repository</a>
                    to view this project's source code.
                    <br>
                    <br>
                    See the original, narrative-focused version I submitted (with a few follow-up tweaks) here:
                    <a href="https://infiniteiteration.com/ebird-narrative-visualization-project">eBird Narrative Visualization Project</a>.
                    <br>
                    <br>
                    </p>
                </div>

				<!-- custom HTML ends here -->

			</div><!-- .entry-content -->
			</article><!-- #post-<?php the_ID(); ?> -->
			<?php
				// If comments are open or we have at least one comment, load up the comment template
				if ( comments_open() || get_comments_number() ) :
					comments_template();
				endif;
			?>
			<?php endwhile; // end of the loop. ?>
		</main><!-- #main -->
	</div><!-- #primary -->
<?php get_footer(); ?>
