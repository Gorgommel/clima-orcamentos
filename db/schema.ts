import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  serviceType: text("service_type").notNull(),
  total: real("total").notNull().default(0),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_quotes_created_at").on(table.createdAt)]);
