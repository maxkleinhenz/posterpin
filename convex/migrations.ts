import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

// npx convex dev
//  npx convex run migrations:run '{fn: "migrations:addTookDownAtColumn"}'
export const addTookDownAtColumn = migrations.define({
  table: "pins",
  migrateOne: async (ctx, doc) => {
    // Add tookDownAt field if it doesn't exist
    if (doc.tookDownAt === undefined)  {
      await ctx.db.patch(doc._id, { tookDownAt: null });
    }
  },
});

// npx convex dev
// npx convex run migrations:run '{fn: "migrations:addHangAtColumn"}'
export const addHangAtColumn = migrations.define({
  table: "pins",
  migrateOne: async (ctx, doc) => {
    // Add tookDownAt field if it doesn't exist
    if (doc.hangAt === undefined)  {
      await ctx.db.patch(doc._id, { hangAt: doc._creationTime });
    }
  },
});

export const run = migrations.runner();
