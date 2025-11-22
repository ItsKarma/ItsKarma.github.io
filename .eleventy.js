module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("keybase.txt");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy(".nojekyll");

  // Add a collection for blog posts
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("_posts/*.md").reverse();
  });

  // Create redirect pages for old URLs
  eleventyConfig.addCollection("redirects", function(collectionApi) {
    const posts = collectionApi.getFilteredByGlob("_posts/*.md");
    return posts.map(post => {
      const slug = post.fileSlug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      return {
        oldUrl: `/${slug}/`,
        newUrl: `/writing/${slug}/`,
        slug: slug
      };
    });
  });

  // Add date filter for formatting
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return new Date(dateObj).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      layouts: "_layouts"
    },
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
};
