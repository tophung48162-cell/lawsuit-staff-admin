import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const cases = sqliteTable('cases', {
 id:text('id').primaryKey(),name:text('name').notNull(),phone:text('phone').notNull().default(''),scene:text('scene').notNull(),staff:text('staff').notNull(),status:text('status').notNull().default('待处理'),note:text('note').notNull().default(''),createdAt:text('created_at').notNull(),actor:text('actor').notNull()
});
export const ledger = sqliteTable('ledger', {
 id:text('id').primaryKey(),caseId:text('case_id').notNull().references(()=>cases.id),kind:text('kind').notNull(),cents:integer('cents').notNull(),date:text('date').notNull(),channel:text('channel').notNull(),parentId:text('parent_id'),reference:text('reference').notNull().default(''),note:text('note').notNull().default(''),staff:text('staff').notNull(),actor:text('actor').notNull(),createdAt:text('created_at').notNull()
});
export const audit = sqliteTable('audit', {id:text('id').primaryKey(),action:text('action').notNull(),target:text('target').notNull(),actor:text('actor').notNull(),detail:text('detail').notNull(),createdAt:text('created_at').notNull()});
