CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`service_type` text NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quotes_created_at` ON `quotes` (`created_at`);