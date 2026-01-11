ALTER TABLE `places` ADD `status` enum('none','want_to_go','visited') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `userRating` int;--> statement-breakpoint
ALTER TABLE `places` ADD `userNote` text;--> statement-breakpoint
ALTER TABLE `places` ADD `visitedAt` timestamp;