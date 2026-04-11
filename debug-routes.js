const express = require('express');

// Load the app to check routes
require('dotenv').config();
const app = require('./server.js');

// List all registered routes
console.log('📋 Checking registered routes...\n');

function getRoutes(stack, prefix = '') {
  const routes = [];
  stack.forEach(middleware => {
    if (middleware.route) {
      const path = prefix + middleware.route.path;
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      routes.push({ path, methods: methods.join(',') });
    } else if (middleware.name === 'router') {
      const routerPrefix = prefix + (middleware.regexp.source.replace(/\\/g, '').split('|')[0] || '');
      if (middleware.handle.stack) {
        routes.push(...getRoutes(middleware.handle.stack, routerPrefix));
      }
    }
  });
  return routes;
}

try {
  const routes = getRoutes(app._router.stack);
  console.log('Routes found:');
  routes.forEach(r => console.log(`  ${r.methods.padEnd(6)} ${r.path}`));
} catch (e) {
  console.error('Error listing routes:', e.message);
}
