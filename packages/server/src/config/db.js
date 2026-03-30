const { PrismaClient } = require('@prisma/client');

const basePrisma = new PrismaClient();

// Soft delete: findMany/findFirst에서 자동으로 deletedAt IS NULL 필터
const prisma = basePrisma.$extends({
  query: {
    post: {
      async findMany({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) args.where.deletedAt = null;
        return query(args);
      },
      async findFirst({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) args.where.deletedAt = null;
        return query(args);
      },
    },
    comment: {
      async findMany({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) args.where.deletedAt = null;
        return query(args);
      },
      async findFirst({ args, query }) {
        if (!args.where) args.where = {};
        if (args.where.deletedAt === undefined) args.where.deletedAt = null;
        return query(args);
      },
    },
  },
});

module.exports = prisma;
