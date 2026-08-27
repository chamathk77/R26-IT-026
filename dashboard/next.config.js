/** @type {import('next').NextConfig} */
const dashboardRoot = __dirname;

const nextConfig = {
  // Pin Turbopack root — avoids picking ~/package-lock.json as workspace root.
  turbopack: {
    root: dashboardRoot,
  },
  outputFileTracingRoot: dashboardRoot,
};

module.exports = nextConfig;
