module.exports = {
  layout: "base.html",
  permalink: function(data) {
    // Remove date prefix from filename (YYYY-MM-DD-)
    const slug = data.page.fileSlug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return `/writing/${slug}/`;
  }
};
