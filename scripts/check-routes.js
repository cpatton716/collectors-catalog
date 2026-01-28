#!/usr/bin/env node

/**
 * Check for conflicting dynamic route parameter names in Next.js App Router
 *
 * Next.js doesn't allow different parameter names at the same path level:
 * - /api/messages/[conversationId] and /api/messages/[messageId] will conflict
 *
 * Run: node scripts/check-routes.js
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

function findDynamicRoutes(dir, basePath = '') {
  const routes = [];

  if (!fs.existsSync(dir)) return routes;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);
    const routePath = basePath + '/' + entry.name;

    // Check if this is a dynamic segment
    if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
      const paramName = entry.name.slice(1, -1);
      routes.push({
        path: routePath,
        dir: fullPath,
        paramName,
        parent: basePath,
      });
    }

    // Recurse into subdirectories
    routes.push(...findDynamicRoutes(fullPath, routePath));
  }

  return routes;
}

function checkForConflicts(routes) {
  const conflicts = [];
  const byParent = {};

  // Group routes by parent path
  for (const route of routes) {
    if (!byParent[route.parent]) {
      byParent[route.parent] = [];
    }
    byParent[route.parent].push(route);
  }

  // Check each parent for conflicting parameter names
  for (const [parent, siblings] of Object.entries(byParent)) {
    if (siblings.length < 2) continue;

    const paramNames = new Set(siblings.map(r => r.paramName));

    if (paramNames.size > 1) {
      conflicts.push({
        parent,
        routes: siblings,
        paramNames: Array.from(paramNames),
      });
    }
  }

  return conflicts;
}

// Main
const routes = findDynamicRoutes(APP_DIR);
const conflicts = checkForConflicts(routes);

if (conflicts.length > 0) {
  console.error('\n❌ DYNAMIC ROUTE CONFLICTS DETECTED\n');
  console.error('Next.js does not allow different parameter names at the same path level.\n');

  for (const conflict of conflicts) {
    console.error(`At path: ${conflict.parent || '/'}`);
    console.error(`Conflicting parameters: ${conflict.paramNames.join(' vs ')}`);
    console.error('Routes:');
    for (const route of conflict.routes) {
      console.error(`  - ${route.path}`);
    }
    console.error('');
  }

  console.error('Fix: Use the same parameter name, or restructure the routes.\n');
  process.exit(1);
} else {
  console.log('✓ No dynamic route conflicts found');
  process.exit(0);
}
