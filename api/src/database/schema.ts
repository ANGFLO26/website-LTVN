import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  check,
  index,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// ============================================================================
// Types & Enums for JSONB Content Format
// ============================================================================
export type ContentBlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'bullet_list'
  | 'numbered_list'
  | 'table'
  | 'quote'
  | 'video'
  | 'button';

export interface ContentBlock {
  type: ContentBlockType;
  data: Record<string, unknown>;
}

export interface ContentJsonb {
  version: number;
  blocks: ContentBlock[];
}

// ============================================================================
// 1. users — Tài khoản Admin & Biên tập viên
// ============================================================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 30 }).notNull(), // admin / editor
    status: varchar('status', { length: 30 }).default('active').notNull(), // active / inactive
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('users_role_check', sql`${table.role} in ('admin', 'editor')`),
    check('users_status_check', sql`${table.status} in ('active', 'inactive')`),
    index('users_status_idx').on(table.status),
    index('users_deleted_at_idx').on(table.deletedAt),
  ]
);

// ============================================================================
// 2. media_assets — Quản lý hình ảnh tập trung
// ============================================================================
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    storageKey: text('storage_key').notNull(),
    publicUrl: text('public_url').notNull(),
    altText: varchar('alt_text', { length: 255 }),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('media_assets_uploaded_by_idx').on(table.uploadedBy),
    index('media_assets_deleted_at_idx').on(table.deletedAt),
  ]
);

// ============================================================================
// 3. machines — Thông tin chính của máy PAC
// ============================================================================
export const machines = pgTable(
  'machines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    model: varchar('model', { length: 255 }),
    shortDescription: text('short_description'),
    description: text('description'),
    mainImageId: uuid('main_image_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 30 }).default('draft').notNull(), // draft / published / archived
    sortOrder: integer('sort_order').default(0).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('machines_status_check', sql`${table.status} in ('draft', 'published', 'archived')`),
    index('machines_status_idx').on(table.status),
    index('machines_published_at_idx').on(table.publishedAt),
    index('machines_sort_order_idx').on(table.sortOrder),
    index('machines_deleted_at_idx').on(table.deletedAt),
    index('machines_created_by_idx').on(table.createdBy),
  ]
);

// ============================================================================
// 4. machine_images — Hình ảnh bổ sung (Gallery)
// ============================================================================
export const machineImages = pgTable(
  'machine_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    imageId: uuid('image_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    caption: varchar('caption', { length: 255 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    unique('machine_images_machine_image_unique').on(table.machineId, table.imageId),
    index('machine_images_machine_id_idx').on(table.machineId),
    index('machine_images_image_id_idx').on(table.imageId),
  ]
);

// ============================================================================
// 5. machine_applications — Ứng dụng của máy
// ============================================================================
export const machineApplications = pgTable(
  'machine_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [index('machine_applications_machine_id_idx').on(table.machineId)]
);

// ============================================================================
// 6. machine_highlights — Điểm nổi bật
// ============================================================================
export const machineHighlights = pgTable(
  'machine_highlights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 255 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [index('machine_highlights_machine_id_idx').on(table.machineId)]
);

// ============================================================================
// 7. machine_specs — Thông tin kỹ thuật
// ============================================================================
export const machineSpecs = pgTable(
  'machine_specs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    groupName: varchar('group_name', { length: 255 }).notNull(),
    specName: varchar('spec_name', { length: 255 }).notNull(),
    specValue: text('spec_value').notNull(),
    unit: varchar('unit', { length: 100 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('machine_specs_machine_id_idx').on(table.machineId),
    index('machine_specs_group_name_idx').on(table.groupName),
  ]
);

// ============================================================================
// 8. standards — Danh mục tiêu chuẩn
// ============================================================================
export const standards = pgTable(
  'standards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 150 }).notNull().unique(),
    organization: varchar('organization', { length: 50 }).notNull(),
    year: integer('year'),
    title: varchar('title', { length: 500 }),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('standards_organization_idx').on(table.organization),
    index('standards_code_idx').on(table.code),
  ]
);

// ============================================================================
// 9. machine_standards — Bảng trung gian Máy ↔ Tiêu chuẩn (N ↔ N)
// ============================================================================
export const machineStandards = pgTable(
  'machine_standards',
  {
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machines.id, { onDelete: 'cascade' }),
    standardId: uuid('standard_id')
      .notNull()
      .references(() => standards.id, { onDelete: 'restrict' }),
    note: text('note'),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.machineId, table.standardId] }),
    index('machine_standards_machine_id_idx').on(table.machineId),
    index('machine_standards_standard_id_idx').on(table.standardId),
  ]
);

// ============================================================================
// 10. news_events — Tin tức & Sự kiện
// ============================================================================
export const newsEvents = pgTable(
  'news_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 20 }).notNull(), // news / event
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    shortDescription: text('short_description'),
    thumbnailImageId: uuid('thumbnail_image_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    content: jsonb('content').$type<ContentJsonb>(),
    status: varchar('status', { length: 30 }).default('draft').notNull(), // draft / published / archived
    publishedAt: timestamp('published_at', { withTimezone: true }),
    eventStartAt: timestamp('event_start_at', { withTimezone: true }),
    eventEndAt: timestamp('event_end_at', { withTimezone: true }),
    location: varchar('location', { length: 500 }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check('news_events_type_check', sql`${table.type} in ('news', 'event')`),
    check('news_events_status_check', sql`${table.status} in ('draft', 'published', 'archived')`),
    index('news_events_type_idx').on(table.type),
    index('news_events_status_idx').on(table.status),
    index('news_events_published_at_idx').on(table.publishedAt),
    index('news_events_event_start_at_idx').on(table.eventStartAt),
    index('news_events_author_id_idx').on(table.authorId),
    index('news_events_deleted_at_idx').on(table.deletedAt),
  ]
);

// ============================================================================
// 11. contacts — Contact form
// ============================================================================
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    subject: varchar('subject', { length: 255 }),
    message: text('message').notNull(),
    status: varchar('status', { length: 30 }).default('new').notNull(), // new / processing / resolved / spam
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    adminNote: text('admin_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'contacts_status_check',
      sql`${table.status} in ('new', 'processing', 'resolved', 'spam')`
    ),
    index('contacts_status_idx').on(table.status),
    index('contacts_created_at_idx').on(table.createdAt),
    index('contacts_assigned_to_idx').on(table.assignedTo),
  ]
);

// ============================================================================
// Drizzle Relations Definitions
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  mediaAssets: many(mediaAssets),
  createdMachines: many(machines, { relationName: 'created_by_user' }),
  updatedMachines: many(machines, { relationName: 'updated_by_user' }),
  newsEvents: many(newsEvents),
  assignedContacts: many(contacts),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [mediaAssets.uploadedBy],
    references: [users.id],
  }),
  mainMachineImages: many(machines),
  machineImages: many(machineImages),
  newsEventsThumbnails: many(newsEvents),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  mainImage: one(mediaAssets, {
    fields: [machines.mainImageId],
    references: [mediaAssets.id],
  }),
  createdByUser: one(users, {
    fields: [machines.createdBy],
    references: [users.id],
    relationName: 'created_by_user',
  }),
  updatedByUser: one(users, {
    fields: [machines.updatedBy],
    references: [users.id],
    relationName: 'updated_by_user',
  }),
  images: many(machineImages),
  applications: many(machineApplications),
  highlights: many(machineHighlights),
  specs: many(machineSpecs),
  standards: many(machineStandards),
}));

export const machineImagesRelations = relations(machineImages, ({ one }) => ({
  machine: one(machines, {
    fields: [machineImages.machineId],
    references: [machines.id],
  }),
  image: one(mediaAssets, {
    fields: [machineImages.imageId],
    references: [mediaAssets.id],
  }),
}));

export const machineApplicationsRelations = relations(machineApplications, ({ one }) => ({
  machine: one(machines, {
    fields: [machineApplications.machineId],
    references: [machines.id],
  }),
}));

export const machineHighlightsRelations = relations(machineHighlights, ({ one }) => ({
  machine: one(machines, {
    fields: [machineHighlights.machineId],
    references: [machines.id],
  }),
}));

export const machineSpecsRelations = relations(machineSpecs, ({ one }) => ({
  machine: one(machines, {
    fields: [machineSpecs.machineId],
    references: [machines.id],
  }),
}));

export const standardsRelations = relations(standards, ({ many }) => ({
  machineStandards: many(machineStandards),
}));

export const machineStandardsRelations = relations(machineStandards, ({ one }) => ({
  machine: one(machines, {
    fields: [machineStandards.machineId],
    references: [machines.id],
  }),
  standard: one(standards, {
    fields: [machineStandards.standardId],
    references: [standards.id],
  }),
}));

export const newsEventsRelations = relations(newsEvents, ({ one }) => ({
  thumbnailImage: one(mediaAssets, {
    fields: [newsEvents.thumbnailImageId],
    references: [mediaAssets.id],
  }),
  author: one(users, {
    fields: [newsEvents.authorId],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  assignedUser: one(users, {
    fields: [contacts.assignedTo],
    references: [users.id],
  }),
}));

// ============================================================================
// Infer Models for Typescript Type Safety
// ============================================================================
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type MediaAsset = InferSelectModel<typeof mediaAssets>;
export type NewMediaAsset = InferInsertModel<typeof mediaAssets>;

export type Machine = InferSelectModel<typeof machines>;
export type NewMachine = InferInsertModel<typeof machines>;

export type MachineImage = InferSelectModel<typeof machineImages>;
export type NewMachineImage = InferInsertModel<typeof machineImages>;

export type MachineApplication = InferSelectModel<typeof machineApplications>;
export type NewMachineApplication = InferInsertModel<typeof machineApplications>;

export type MachineHighlight = InferSelectModel<typeof machineHighlights>;
export type NewMachineHighlight = InferInsertModel<typeof machineHighlights>;

export type MachineSpec = InferSelectModel<typeof machineSpecs>;
export type NewMachineSpec = InferInsertModel<typeof machineSpecs>;

export type Standard = InferSelectModel<typeof standards>;
export type NewStandard = InferInsertModel<typeof standards>;

export type MachineStandard = InferSelectModel<typeof machineStandards>;
export type NewMachineStandard = InferInsertModel<typeof machineStandards>;

export type NewsEvent = InferSelectModel<typeof newsEvents>;
export type NewNewsEvent = InferInsertModel<typeof newsEvents>;

export type Contact = InferSelectModel<typeof contacts>;
export type NewContact = InferInsertModel<typeof contacts>;
